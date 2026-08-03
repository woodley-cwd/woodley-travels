import Anthropic from '@anthropic-ai/sdk'

/* Travel chat proxy.

   This runs server-side for one reason: the Anthropic API key must never reach
   the browser. Note the env var has no VITE_ prefix — anything prefixed that
   way is inlined into the client bundle by Vite and would be readable by
   anyone who opens devtools.

   The same handler serves both environments: Vercel invokes it directly, and
   in development a Vite plugin mounts it as middleware (see vite.config.js).
   Responses are streamed as Server-Sent Events so replies appear as they're
   written rather than after a long pause. */

const MODEL = 'claude-opus-4-8'

const SYSTEM = `You are the travel companion inside Woodley Travels, a personal
passport-style trip journal. You help with trip brainstorming, planning, and
practical questions.

Voice: warm, specific, and concrete. You are talking to one person about her own
travel, not writing a listicle. Skip preamble — answer directly.

When a question depends on current information — weather, prices, opening hours,
visa rules, whether something is still operating, anything seasonal — search
before answering rather than answering from memory. Say when something is
seasonal or subject to change.

Keep answers short unless depth is genuinely wanted. Recommend rather than
survey: name the two or three you'd actually pick and say why, instead of
listing ten. If you don't know and can't find out, say so.

Formatting: the chat renders plain text, bold, and simple dash bullets — nothing
else. Do not use headings, tables, code fences, links, or nested lists; they
appear as raw characters. Prefer plain prose.`

/* Web search is metered per search, so the cap is a real cost control, not a
   formality. Five is enough for "what's the weather and is this open in
   November" without letting one question run away. */
const MAX_SEARCHES = 5

/* Web search runs a loop on Anthropic's side: the model searches, reads the
   results, and searches again. That loop has its own iteration cap, and when it
   trips the API ends the turn with `stop_reason: "pause_turn"` — no answer text
   written yet, just the searches. Nothing resumes it automatically; the
   conversation has to be sent back with the unfinished assistant turn appended.
   Without that the reply simply stops after the searches, which is exactly what
   a search that never returns looks like from the chat. */
const MAX_CONTINUATIONS = 4

// Long enough to be quiet, short enough to beat any intermediary's idle
// timeout. A model can spend a minute searching without writing a byte.
const HEARTBEAT_MS = 15000

const readBody = async (req) => {
  // Vercel parses JSON bodies; the Vite dev middleware does not.
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

// Trip context is built server-side from fields the client sends, so a prompt
// can't be smuggled in by rewriting the system prompt.
function tripContext(trip) {
  if (!trip) return ''
  const bits = [
    trip.name && `Trip: ${trip.name}`,
    trip.destination && `Destination: ${trip.destination}`,
    trip.region && `Region: ${trip.region}`,
    trip.start_date && `Dates: ${trip.start_date} to ${trip.end_date || 'open'}`,
    trip.traveled_with && `Traveling with: ${trip.traveled_with}`,
    trip.status && `Status: ${trip.status}`,
  ].filter(Boolean)

  if (bits.length === 0) return ''
  return `\n\nThe user is asking about this specific trip:\n${bits.join('\n')}\nAssume questions refer to it unless she says otherwise.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    return res.end(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set on the server.' })
    )
  }

  let body
  try {
    body = await readBody(req)
  } catch {
    res.statusCode = 400
    return res.end(JSON.stringify({ error: 'Invalid JSON body' }))
  }

  const { messages = [], trip = null } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    res.statusCode = 400
    return res.end(JSON.stringify({ error: 'messages is required' }))
  }

  const client = new Anthropic({ apiKey })

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  // Without this some proxies buffer the whole response and streaming silently
  // degrades into a single delayed chunk.
  res.setHeader('X-Accel-Buffering', 'no')

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  // Nothing is written until the model produces something, and that can be a
  // while. Flushing now means the browser sees a live response immediately
  // rather than an open request that might be dead.
  res.flushHeaders?.()

  const sources = new Map()

  const heartbeat = setInterval(() => {
    // An SSE comment. The client's frame parser skips it (no `data:` line), so
    // it costs nothing but keeps the connection provably alive.
    res.write(': keep-alive\n\n')
  }, HEARTBEAT_MS)

  try {
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: String(m.content ?? '') }))

    // Content blocks carried over from turns that paused mid-search. They go
    // back as one assistant turn so the API resumes from the trailing tool use.
    let carried = []
    let searchCount = 0
    let sawText = false
    let final = null

    for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt++) {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM + tripContext(trip),
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        tools: [
          {
            // The cap is per request, so resuming would hand back a fresh five
            // searches every time. Spend it down instead — five per question is
            // the promise, not five per attempt.
            type: 'web_search_20260209',
            name: 'web_search',
            max_uses: Math.max(1, MAX_SEARCHES - searchCount),
          },
        ],
        messages: carried.length
          ? [...history, { role: 'assistant', content: carried }]
          : history,
      })

      // A tool block's `input` is empty at content_block_start and streams in
      // as partial JSON, so the query isn't known until the block closes.
      const pendingQueries = new Map()

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          sawText = true
          send('text', { text: event.delta.text })
        } else if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'input_json_delta' &&
          pendingQueries.has(event.index)
        ) {
          pendingQueries.set(
            event.index,
            pendingQueries.get(event.index) + event.delta.partial_json
          )
        } else if (
          event.type === 'content_block_start' &&
          event.content_block.type === 'server_tool_use'
        ) {
          // Dynamic filtering runs its own server-side tools under the hood;
          // only an actual search is worth narrating.
          if (event.content_block.name === 'web_search') {
            searchCount += 1
            pendingQueries.set(event.index, '')
            // Lets the UI say "searching…" instead of stalling silently.
            send('searching', { query: '' })
          }
        } else if (
          event.type === 'content_block_stop' &&
          pendingQueries.has(event.index)
        ) {
          const raw = pendingQueries.get(event.index)
          pendingQueries.delete(event.index)
          try {
            const query = JSON.parse(raw || '{}').query
            if (query) send('searching', { query })
          } catch {
            // Malformed partial JSON only costs us the query label.
          }
        } else if (
          event.type === 'content_block_start' &&
          event.content_block.type === 'web_search_tool_result'
        ) {
          // On failure `content` is a single error object, not a list.
          const results = event.content_block.content
          if (Array.isArray(results)) {
            for (const r of results) {
              if (r.url && !sources.has(r.url)) {
                sources.set(r.url, { url: r.url, title: r.title || r.url })
              }
            }
          }
          // The gap between results landing and the answer starting is where
          // the old UI sat on "Searching…" forever. Say what's actually
          // happening instead.
          send('searched', { count: Array.isArray(results) ? results.length : 0 })
        }
      }

      final = await stream.finalMessage()

      if (final.stop_reason !== 'pause_turn') break

      carried = [...carried, ...final.content]
    }

    if (final.stop_reason === 'refusal') {
      send('error', { message: "I can't help with that one." })
    } else if (final.stop_reason === 'pause_turn') {
      // Still paused after every continuation — the question is sending it on
      // an unbounded search. Say so rather than leaving a blank reply.
      send('error', {
        message: 'That one took more searching than I could finish. Try asking something narrower.',
      })
    } else {
      if (sources.size > 0) {
        send('sources', { sources: [...sources.values()] })
      }
      if (!sawText) {
        send('error', {
          message: "I searched but didn't come back with an answer. Try asking again.",
        })
      }
    }

    send('done', { stop_reason: final.stop_reason })
  } catch (err) {
    const message =
      err instanceof Anthropic.RateLimitError
        ? 'Rate limited — give it a moment and try again.'
        : err instanceof Anthropic.AuthenticationError
          ? 'The API key was rejected. Check ANTHROPIC_API_KEY.'
          : err instanceof Anthropic.APIConnectionError
            ? "Couldn't reach the API. Check your connection."
            : 'Something went wrong reaching the travel assistant.'
    send('error', { message })
  } finally {
    clearInterval(heartbeat)
    res.end()
  }
}
