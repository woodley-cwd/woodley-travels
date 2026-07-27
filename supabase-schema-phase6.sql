-- Woodley Travels — Phase 6 schema (per-trip itinerary)
-- Run in the Supabase SQL editor AFTER supabase-schema-phase5.sql.

create extension if not exists "pgcrypto";

-- Things to see and do on a trip, each tickable once done.
--
-- `day` is nullable on purpose: half of what goes on an itinerary is "sometime
-- while we're there", and forcing a date on it would make the list a chore to
-- fill in. Undated items collect under their own heading. `at_time` is a plain
-- clock string for the same reason flights store times that way — it's local to
-- where you are, not to whoever is reading it.
create table if not exists travel_itinerary (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references travel_trips (id) on delete cascade,
  title      text not null default '',
  day        date,
  at_time    text,
  location   text,
  notes      text,
  done       boolean not null default false,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists travel_itinerary_trip_idx on travel_itinerary (trip_id);

-- Same posture as every other table: single user behind a client PIN, so RLS
-- stays enabled with a permissive policy rather than being switched off.
alter table travel_itinerary enable row level security;

drop policy if exists travel_itinerary_all on travel_itinerary;
create policy travel_itinerary_all on travel_itinerary
  for all using (true) with check (true);

drop trigger if exists travel_itinerary_touch on travel_itinerary;
create trigger travel_itinerary_touch before update on travel_itinerary
  for each row execute function travel_touch_updated_at();
