-- Woodley Travels — Phase 2 schema (hotels, food, postcards, photos)
-- Run this in the Supabase SQL editor AFTER supabase-schema.sql.

create extension if not exists "pgcrypto";

-- Every child row dies with its trip.
create table if not exists travel_hotels (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references travel_trips (id) on delete cascade,
  name         text not null default '',
  check_in     date,
  check_out    date,
  cost_usd     numeric(12, 2) default 0,
  cost_local   numeric(12, 2),
  currency     text,
  confirmation text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists travel_food (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references travel_trips (id) on delete cascade,
  photo_url   text,
  dish        text not null default '',
  restaurant  text,
  city        text,
  cuisine     text,
  cost_usd    numeric(12, 2) default 0,
  cost_local  numeric(12, 2),
  currency    text,
  again       boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists travel_postcards (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references travel_trips (id) on delete cascade,
  front_url  text,
  back_url   text,
  back_note  text,
  location   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists travel_photos (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references travel_trips (id) on delete cascade,
  url        text,
  caption    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists travel_hotels_trip_idx    on travel_hotels (trip_id);
create index if not exists travel_food_trip_idx      on travel_food (trip_id);
create index if not exists travel_postcards_trip_idx on travel_postcards (trip_id);
create index if not exists travel_photos_trip_idx    on travel_photos (trip_id);

-- Same posture as travel_trips: single user behind a client PIN, so RLS stays
-- enabled with a permissive policy rather than being switched off.
do $$
declare t text;
begin
  foreach t in array array['travel_hotels', 'travel_food', 'travel_postcards', 'travel_photos']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format('create policy %I on %I for all using (true) with check (true)', t || '_all', t);
    execute format(
      'drop trigger if exists %I on %I', t || '_touch', t);
    execute format(
      'create trigger %I before update on %I for each row execute function travel_touch_updated_at()',
      t || '_touch', t);
  end loop;
end $$;

-- Photo storage. Public read so <img src> works without signing every URL;
-- the bucket holds nothing sensitive (passport docs live elsewhere, encrypted).
insert into storage.buckets (id, name, public)
values ('travel-photos', 'travel-photos', true)
on conflict (id) do nothing;

drop policy if exists travel_photos_rw on storage.objects;
create policy travel_photos_rw on storage.objects
  for all using (bucket_id = 'travel-photos')
  with check (bucket_id = 'travel-photos');
