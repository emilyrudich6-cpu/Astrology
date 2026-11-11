-- Run after 003. Free chart: cached interpretations, daily limits, and "email me my chart".
create table if not exists public.free_cache (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.free_hits (
  ip_hash text not null,
  day date not null,
  count int not null default 0,
  primary key (ip_hash, day)
);
create table if not exists public.chart_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  chart_link text not null,
  sent boolean not null default false,
  created_at timestamptz not null default now()
);
-- Server-only tables: row level security on, no public policies.
alter table public.free_cache enable row level security;
alter table public.free_hits enable row level security;
alter table public.chart_emails enable row level security;

-- "Notes from Vertex Point" newsletter: separate from chart emails, explicit opt-in only.
create table if not exists public.newsletter_signups (
  email text primary key,
  source text,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
alter table public.newsletter_signups enable row level security;
