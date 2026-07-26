-- Woodley Travels — Phase 4 schema (planning tools)
-- Run in the Supabase SQL editor AFTER supabase-schema-phase2.sql.

create extension if not exists "pgcrypto";

-- Loyalty programs are reference only. Nothing here links to a real account:
-- balances are typed in by hand and no credentials are ever stored.
create table if not exists travel_cards (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '',
  program    text,
  -- 'airline' | 'hotel' | 'other'
  kind       text not null default 'airline',
  points     numeric(12, 0) default 0,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Standalone: a someday list, deliberately not tied to any trip.
create table if not exists travel_wishlist (
  id          uuid primary key default gen_random_uuid(),
  destination text not null default '',
  scope       text not null default 'international',
  region_code text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Reusable item lists by trip type. Items are a plain text array — a template
-- item has no state of its own, it only seeds a trip's checklist.
create table if not exists travel_packing_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '',
  trip_type  text not null default 'city',
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The per-trip checklist that drives the "Up Next" card.
create table if not exists travel_checklist (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references travel_trips (id) on delete cascade,
  label      text not null default '',
  -- 'booking' | 'packing' | 'other' — lets the Up Next card summarise
  -- booked and packed separately.
  category   text not null default 'packing',
  done       boolean not null default false,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists travel_checklist_trip_idx on travel_checklist (trip_id);

do $$
declare t text;
begin
  foreach t in array array[
    'travel_cards', 'travel_wishlist', 'travel_packing_templates', 'travel_checklist'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format('create policy %I on %I for all using (true) with check (true)', t || '_all', t);
    execute format('drop trigger if exists %I on %I', t || '_touch', t);
    execute format(
      'create trigger %I before update on %I for each row execute function travel_touch_updated_at()',
      t || '_touch', t);
  end loop;
end $$;
