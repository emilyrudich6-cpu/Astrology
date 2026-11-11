-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  birth_date date,
  birth_time text,            -- "HH:mm" or null when unknown
  birth_place text,
  latitude double precision,
  longitude double precision,
  timezone text,
  tier text not null default 'free' check (tier in ('free','timeline','deep')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  created_at timestamptz not null default now()
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  relationship text not null,
  birth_date date not null,
  birth_time text,
  birth_place text,
  latitude double precision not null,
  longitude double precision not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('natal','timeline','question','synastry')),
  category text,
  question text,
  person_id uuid references public.people(id) on delete set null,
  title text,
  body text,
  status text not null default 'scheduled' check (status in ('scheduled','generating','ready','failed')),
  attempts int not null default 0,
  error text,
  deliver_at timestamptz not null,
  delivered_at timestamptz,
  read_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists readings_due on public.readings (status, deliver_at);
create index if not exists readings_user on public.readings (user_id, created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text unique not null,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- Row level security: members can only ever see their own rows, and only delivered readings.
-- All writes happen on the server with the service key.
alter table public.profiles enable row level security;
alter table public.people enable row level security;
alter table public.readings enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "own people" on public.people;
create policy "own people" on public.people for select using (auth.uid() = user_id);
drop policy if exists "own delivered readings" on public.readings;
create policy "own delivered readings" on public.readings for select using (auth.uid() = user_id and delivered_at is not null);
