-- Woodley Travels — Phase 1 schema
-- Run this in the Supabase SQL editor.
-- Tables are prefixed `travel_` so they can share a project with Casa by Woodley.

create extension if not exists "pgcrypto";

create table if not exists travel_trips (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  destination  text not null default '',
  -- 'domestic' | 'international'
  scope        text not null default 'domestic',
  -- two-letter US state code for domestic, ISO-3166 alpha-2 for international
  region_code  text,
  country      text,
  -- 'planning' | 'completed'
  status       text not null default 'planning',
  start_date   date,
  end_date     date,
  traveled_with text,
  cover_photo  text,
  journal_note text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists travel_trips_status_idx on travel_trips (status);
create index if not exists travel_trips_start_idx  on travel_trips (start_date desc);

-- Single-user app gated by a PIN in the client, so the anon key is the only
-- identity. RLS stays on with a permissive policy rather than being disabled.
alter table travel_trips enable row level security;

drop policy if exists travel_trips_all on travel_trips;
create policy travel_trips_all on travel_trips
  for all using (true) with check (true);

-- Keep updated_at honest.
create or replace function travel_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists travel_trips_touch on travel_trips;
create trigger travel_trips_touch before update on travel_trips
  for each row execute function travel_touch_updated_at();
