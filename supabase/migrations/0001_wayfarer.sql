-- A Wayfarer's Guide: shared realm for the Fellowship.
-- Access rule: every request must carry the Fellowship passphrase in the
-- `x-fellowship` header. Its SHA-256 hash is compared with the one stored in
-- the private schema, which the Data API never exposes.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

create table private.fellowship (
  id boolean primary key default true check (id), -- single row
  phrase_hash text not null
);

-- Default phrase: "second breakfast". Change it with:
--   update private.fellowship set phrase_hash = encode(extensions.digest(lower(trim('your new phrase')), 'sha256'), 'hex');
insert into private.fellowship (phrase_hash)
values (encode(extensions.digest('second breakfast', 'sha256'), 'hex'));

create or replace function private.is_fellow()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.fellowship f
    where f.phrase_hash = encode(
      extensions.digest(
        lower(trim(coalesce(current_setting('request.headers', true)::json ->> 'x-fellowship', ''))),
        'sha256'),
      'hex')
  );
$$;

revoke all on function private.is_fellow() from public;
grant usage on schema private to anon;
grant execute on function private.is_fellow() to anon;

-- Lets the gate ask "is this phrase right?" without touching any data.
create or replace function public.fellowship_ok()
returns boolean
language sql
stable
set search_path = ''
as $$ select private.is_fellow(); $$;

revoke all on function public.fellowship_ok() from public;
grant execute on function public.fellowship_ok() to anon;

-- ── Tables ─────────────────────────────────────────────

create table public.members (
  id text primary key,
  name text not null check (char_length(name) between 1 and 40),
  cls text not null,
  avatar text not null,
  oaths text[] not null default '{}',
  hoard text[] not null default '{}',
  xp integer not null default 0 check (xp >= 0),
  bestiary text[] not null default '{}',
  sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.places (
  id text primary key,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null check (kind in ('tavern','inn','hideout','hearth','potion','market')),
  description text not null default '',
  address text not null default '',
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  price smallint not null check (price between 1 and 3),
  hours text not null default '',
  realm text not null check (realm in ('vietnam','indonesia')),
  added_by text references public.members (id) on delete set null,
  sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.oaths_on_places (
  place_id text not null references public.places (id) on delete cascade,
  oath text not null check (oath in ('halal','green','plant','jain','gluten','nut')),
  trust text not null check (trust in ('sworn','rumour','beware')),
  primary key (place_id, oath)
);

create table public.quest_logs (
  id text primary key,
  place_id text not null references public.places (id) on delete cascade,
  member_id text references public.members (id) on delete set null,
  stars smallint not null check (stars between 1 and 5),
  oath_held smallint not null check (oath_held between 1 and 5),
  note text not null default '',
  visit_date date,
  checks jsonb not null default '{}',
  understood text not null default 'unsure' check (understood in ('yes','no','unsure')),
  created_at timestamptz not null default now()
);

create table public.photos (
  id text primary key,
  place_id text not null references public.places (id) on delete cascade,
  log_id text references public.quest_logs (id) on delete cascade,
  data text not null check (char_length(data) < 400000), -- shrunk JPEG data URL
  created_at timestamptz not null default now()
);

create table public.expeditions (
  id text primary key,
  name text not null,
  realm text not null check (realm in ('vietnam','indonesia')),
  dates text not null default '',
  place_ids text[] not null default '{}',
  member_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index on public.places (added_by);
create index on public.quest_logs (place_id);
create index on public.quest_logs (member_id);
create index on public.photos (place_id);
create index on public.photos (log_id);

-- ── Access: Fellowship only ────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['members','places','oaths_on_places','quest_logs','photos','expeditions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to anon', t);
    execute format(
      'create policy "Fellowship only" on public.%I for all to anon using ((select private.is_fellow())) with check ((select private.is_fellow()))',
      t);
  end loop;
end $$;
