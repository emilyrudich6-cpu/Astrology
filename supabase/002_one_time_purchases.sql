-- Run this after schema.sql (SQL Editor > New query > paste > Run). Adds one-time purchases.

alter table public.readings drop constraint if exists readings_kind_check;
alter table public.readings add constraint readings_kind_check
  check (kind in ('natal','timeline','question','synastry','yearahead'));

-- People entered only for a one-time compatibility reading don't count as "saved people"
alter table public.people add column if not exists purchased boolean not null default false;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product text not null,
  stripe_session_id text unique not null,
  amount_cents int,
  reading_id uuid references public.readings(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.purchases enable row level security;
drop policy if exists "own purchases" on public.purchases;
create policy "own purchases" on public.purchases for select using (auth.uid() = user_id);
