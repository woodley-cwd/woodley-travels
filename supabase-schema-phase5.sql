-- Woodley Travels — Phase 5 schema (flights)
-- Run in the Supabase SQL editor AFTER supabase-schema-phase4.sql.

create extension if not exists "pgcrypto";

-- Departure and arrival times are stored as a `date` plus a plain `text` clock
-- time, deliberately not as a timestamptz. A flight's times are quoted in the
-- *local* time of each airport; a timestamptz would be re-rendered in the
-- reader's own zone and show the wrong boarding time the moment a trip crosses
-- a zone — which is most of them.
create table if not exists travel_flights (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references travel_trips (id) on delete cascade,
  airline       text not null default '',
  flight_number text,
  origin        text,
  destination   text,
  depart_date   date,
  depart_time   text,
  arrive_date   date,
  arrive_time   text,
  seat          text,
  confirmation  text,
  cost_usd      numeric(12, 2) default 0,
  cost_local    numeric(12, 2),
  currency      text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists travel_flights_trip_idx on travel_flights (trip_id);

-- Same posture as every other table: single user behind a client PIN, so RLS
-- stays enabled with a permissive policy rather than being switched off.
alter table travel_flights enable row level security;

drop policy if exists travel_flights_all on travel_flights;
create policy travel_flights_all on travel_flights
  for all using (true) with check (true);

drop trigger if exists travel_flights_touch on travel_flights;
create trigger travel_flights_touch before update on travel_flights
  for each row execute function travel_touch_updated_at();
