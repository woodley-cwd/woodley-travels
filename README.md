# Woodley Travels

A passport-style PWA for tracking domestic and international trips.

## Run it

```bash
npm install
npm run dev      # http://localhost:5175
```

Unlock with the PIN in `.env` (`VITE_PASSCODE`).

## Before cross-device sync works

Open the Supabase SQL editor for the project in `.env` and run, in order:

1. [`supabase-schema.sql`](supabase-schema.sql) — trips
2. [`supabase-schema-phase2.sql`](supabase-schema-phase2.sql) — hotels, food,
   postcards, photos, and the `travel-photos` storage bucket
3. [`supabase-schema-phase4.sql`](supabase-schema-phase4.sql) — cards, wishlist,
   packing templates, checklist

Until you do, the app still works fully — everything is written to local storage
and queued — but it won't sync between your phone and laptop.

## Phase 1 — what's built

- PIN gate, passport cover-open animation, passport-style home screen
- Add / edit / delete trips (domestic or international)
- Stats: states, countries, nights; recently stamped; up next with countdown
- Offline-first: every change writes locally first and syncs when reachable

## Phase 2 — what's built

- Trip page with planning and stamped modes
- Hotels, food entries, postcards, and a general photo gallery — full CRUD
- Cost totals auto-calculated by category from the linked entries
- International trips log cost in local currency alongside USD
- Postcards flip front-to-back on tap (real CSS 3D, not a crossfade)
- The planning → stamped transition plays the signature stamp animation

### How photos work

Picked images are downscaled to 1400px and re-encoded as JPEG before anything
else touches them — a 3.5MB phone photo lands around 11KB. The result is stored
in IndexedDB so galleries work offline, then uploaded to Supabase Storage. If
the upload can't go through, the row keeps a `local:<id>` reference and the
image is retried later, at which point every row pointing at it is repointed to
the real URL.

## Design system

Defined once in `src/index.css` under `@theme` — Tailwind v4 has no config file.

| Token | Value | Use |
|---|---|---|
| `emerald-deep` / `emerald` | `#0B3B32` / `#145C4B` | Primary, cover, surfaces |
| `navy-deep` / `navy` | `#0C1A2E` / `#16294A` | Depth, body text on paper |
| `gold` / `gold-light` / `brass` | `#C9A227` / `#E2C569` / `#A8862F` | Foil text, icons, rules |
| `cream` / `ivory` / `parchment` | `#F7F1E4` / `#FDFAF3` / `#ECE2CD` | Page + card surfaces |
| `burgundy` / `rose` | `#7D2B3F` / `#A8455C` | Favorites and "up next" only |

Type: Cormorant Garamond for trip names and headers, Jost for all data.
Textures (`.texture-paper`, `.texture-leather`) and the `.foil` gold gradient are
generated in CSS, so nothing loads over the network.

## Phase 3 — what's built

- **Maps**, US states and world countries, with a watercolor bloom as regions
  fill in. Stamped trips wash emerald, planned ones rose. Tap a filled region
  to open its trip.
- **Badges** — 16 milestones, derived from the data, with a confetti moment
- **Cross-trip search** over trips, food and postcards, with an "All Food" view
  and a "would eat again" filter
- **On this day** flashbacks on the home screen
- Bottom tab bar: Passport / Maps / Search / Badges

### About the map data

Geography comes from [us-atlas] and [world-atlas] (Natural Earth, public
domain). Both are dynamically imported, so the ~830KB of geometry only loads
the first time you open Maps, then the service worker caches it.

Two things worth knowing:

- The world map uses the **50m** resolution rather than 110m. The lighter file
  omits small island nations entirely — Maldives, Malta, Barbados and Singapore
  simply don't exist in it.
- **Puerto Rico has no polygon** in the US atlas. It still counts toward your
  stats; the Maps screen lists it as a chip under the map rather than dropping
  it silently. Any future region in the same position is handled by
  `NOT_ON_MAP` in `src/lib/places.js`.

Natural Earth spells two countries differently than the app does (`Türkiye` →
`Turkey`, `Dominican Republic` → `Dominican Rep.`). `toAtlasName` maps between
them, and both spellings are searchable.

[us-atlas]: https://github.com/topojson/us-atlas
[world-atlas]: https://github.com/topojson/world-atlas

## Phase 4 — what's built

- **Wishlist** of someday destinations, each with a "make it a trip" button
- **Travel cards** — program and points balance, typed in by hand
- **Packing templates** by trip type, applied to a trip's checklist
- **Per-trip checklist** split into booked and packed, surfacing as progress
  bars on the Up Next card
- **Trip reminders** with a lead time you choose, plus a Settings screen

Applying a template *copies* its items rather than linking to them, so editing
a template later never rewrites a trip you've already packed for. Re-applying
the same template won't duplicate items you already have.

### What reminders can and can't do

A PWA cannot wake itself up. Real scheduled push — a notification while the app
is closed — needs a server holding Web Push subscriptions, which this app
deliberately doesn't have. iOS restricts it further still.

So reminders are computed when you open the app: they always appear in-app, and
additionally raise a system notification if you've granted permission. Each one
fires at most once a day. This is a genuine limitation, not a stub — closing
it means adding a backend, which is a decision worth making on purpose.

## Phase 5 — what's built

- **Ask tab** — open-ended travel chat, web-search enabled, with sources listed
  under any answer that used a search
- **Per-trip chat** on a planning trip's page, scoped to that trip so "what
  should I pack" knows where and when you're going
- Streaming replies, a stop button, and per-scope conversations kept locally

### How the API key is protected

The Anthropic key lives in `ANTHROPIC_API_KEY` — **deliberately without a
`VITE_` prefix**. Vite inlines every `VITE_`-prefixed variable into the client
bundle, so prefixing it would publish the key to anyone who opens devtools.

All calls go through `api/chat.js`, which never runs in the browser. In
production Vercel serves it as a serverless function; in development a Vite
plugin mounts the identical handler as middleware, so there's one
implementation rather than two that can drift.

`.env` is gitignored. When you deploy, add `ANTHROPIC_API_KEY` in the Vercel
dashboard **without** the `VITE_` prefix.

### Ongoing cost

This is the one part of the app that costs money per use. Each message is a
model call, and web searches are billed per search on top of that. Searching is
capped at 5 per message in `api/chat.js`, and `effort` is set to `medium` —
raise it there if you want more thorough answers at higher cost.

Chat history is stored locally per conversation and never synced to Supabase.

## Phase 6 — what's built

- **Travel Docs**, genuinely encrypted (see below)
- **Backup**: export everything to one JSON file; restore from it
- **PIN management** — set your own PIN instead of the build-time one
- **Sync indicator** — shows when you're offline or have writes still queued

### How the encryption works

Travel docs use AES-GCM 256 with a key derived by PBKDF2-HMAC-SHA256 at 600,000
iterations (the current OWASP figure) over a random 16-byte salt. The derived
key is non-extractable and lives in memory only — never written to disk, never
sent anywhere. A fresh IV is generated per write.

Three deliberate decisions worth knowing:

1. **The vault passphrase is separate from the 4-digit PIN.** A 4-digit PIN has
   10,000 possibilities — anyone holding the ciphertext could exhaust that
   offline no matter how many PBKDF2 iterations sit behind it. The passphrase
   is the only thing making the encryption meaningful, so it gets a 10-character
   minimum.
2. **Documents never sync.** The Supabase anon key ships inside the client
   bundle, so a synced vault would put passport ciphertext somewhere reachable
   by anyone with the app. Local-only means it never leaves the device — at the
   cost of not appearing on your other devices. **Export a backup.**
3. **There is no recovery.** Forget the passphrase and the documents are gone.
   That is what it means for encryption to work.

The vault auto-locks after 5 minutes idle and immediately when the app is
backgrounded.

### What's in a backup

Every trip, entry, list, and badge; photos that exist only on this device
(base64); and the docs vault as ciphertext — safe to include, because the
passphrase isn't in the file and is still required after a restore.

Chat transcripts are excluded on purpose. Restoring **replaces** everything on
the device and asks for confirmation first.

## Known gaps

Honest list of what isn't done:

- **Lottie.** The spec asked for hand-crafted Lottie files for the cover-open
  and stamp moments. Those are Framer Motion + CSS 3D instead — they work and
  need no binary asset, but they aren't the hand-animated versions. Dropping
  real Lottie JSON in later means swapping the inner block of
  `PassportCover.jsx` / `StampAnimation.jsx`; nothing else changes.
- **Push notifications** can't fire while the app is closed — see the Phase 4
  note. That needs a server.
- **Photos in Supabase Storage** aren't re-downloaded into IndexedDB on a new
  device, so the gallery on a second device needs a connection to show them.
