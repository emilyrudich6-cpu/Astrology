-- Vertex Point 006: Seeing Numbers journal and friend referrals.
-- Run after 005 (Supabase: SQL Editor > New query > paste > Run). Safe to run more than once.
-- All writes go through the server (service role). Members can read only their own rows.

-- ---------- Seeing Numbers journal ----------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  number_raw text not null check (char_length(number_raw) between 1 and 20),       -- as typed, e.g. "12:12"
  number_norm text not null check (number_norm ~ '^[0-9]{1,12}$'),                 -- digits only, e.g. "1212"
  seen_at timestamptz not null,                                                     -- the moment it was seen
  seen_local_date date not null,                                                    -- the sighting's calendar date where it was seen
  seen_local_time text check (seen_local_time is null or seen_local_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  seen_tz text not null,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_entries_user_seen on public.journal_entries (user_id, seen_at desc);
create index if not exists journal_entries_user_month on public.journal_entries (user_id, seen_local_date);

-- Which local days each member saved an entry on. No journal text: used only to see who comes back on a later day.
create table if not exists public.journal_activity (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

alter table public.journal_entries enable row level security;
alter table public.journal_activity enable row level security;
drop policy if exists "own journal" on public.journal_entries;
create policy "own journal" on public.journal_entries for select using (auth.uid() = user_id);

-- Adds an entry if the member is under their cap (null cap = unlimited).
-- The per-member lock makes simultaneous saves count correctly.
create or replace function public.add_journal_entry(
  p_user uuid, p_cap int, p_raw text, p_norm text, p_seen_at timestamptz, p_local_date date,
  p_local_time text, p_tz text, p_note text, p_today date
) returns uuid language plpgsql security definer set search_path = public as $$
declare n int; new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('journal:' || p_user::text, 0));
  if p_cap is not null then
    select count(*) into n from journal_entries where user_id = p_user;
    if n >= p_cap then raise exception 'journal_cap_reached' using errcode = 'P0001'; end if;
  end if;
  insert into journal_entries (user_id, number_raw, number_norm, seen_at, seen_local_date, seen_local_time, seen_tz, note)
    values (p_user, p_raw, p_norm, p_seen_at, p_local_date, p_local_time, p_tz, nullif(btrim(p_note), ''))
    returning id into new_id;
  insert into journal_activity (user_id, day) values (p_user, p_today) on conflict do nothing;
  return new_id;
end $$;
revoke all on function public.add_journal_entry(uuid, int, text, text, timestamptz, date, text, text, text, date) from public, anon, authenticated;

-- ---------- Friend referrals ----------
alter table public.profiles add column if not exists invite_code text;
create unique index if not exists profiles_invite_code on public.profiles (invite_code) where invite_code is not null;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null unique references auth.users(id) on delete cascade,   -- a person can be referred once
  status text not null default 'signed_up' check (status in ('signed_up', 'qualified')),
  rewarded boolean not null default false,          -- this referral holds the inviter's free reading
  friend_shared boolean,                            -- null: not answered yet; true: shared; false: declined
  shared_at timestamptz,
  person_id uuid references public.people(id) on delete set null,
  reading_id uuid references public.readings(id) on delete set null,
  redeemed_at timestamptz,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  check (inviter_id <> friend_id)
);
-- One earned reading per inviter account
create unique index if not exists referrals_one_reward on public.referrals (inviter_id) where rewarded;
create index if not exists referrals_inviter on public.referrals (inviter_id, created_at);

alter table public.referrals enable row level security;
drop policy if exists "own referrals" on public.referrals;
create policy "own referrals" on public.referrals for select using (auth.uid() = inviter_id or auth.uid() = friend_id);

-- Records that a new account came from an invite. Ignores self-referrals, unknown codes,
-- accounts that already have a chart, and accounts that were already referred.
create or replace function public.attach_referral(p_friend uuid, p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare inv uuid; has_chart boolean;
begin
  select id into inv from profiles where invite_code = upper(btrim(p_code));
  if inv is null or inv = p_friend then return false; end if;
  select exists (select 1 from readings where user_id = p_friend and kind = 'natal') into has_chart;
  if has_chart then return false; end if;
  insert into referrals (inviter_id, friend_id) values (inv, p_friend) on conflict (friend_id) do nothing;
  return found;
end $$;

-- Called when the referred friend (verified) creates their first free chart.
-- The inviter earns the reward only if they don't already hold one.
create or replace function public.qualify_referral(p_friend uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r referrals%rowtype; holder uuid;
begin
  select * into r from referrals where friend_id = p_friend for update;
  if not found then return 'none'; end if;
  if r.status = 'qualified' then return 'already'; end if;
  perform pg_advisory_xact_lock(hashtextextended('referral:' || r.inviter_id::text, 0));
  select id into holder from referrals where inviter_id = r.inviter_id and rewarded;
  update referrals set status = 'qualified', qualified_at = now(), rewarded = (holder is null) where id = r.id;
  return case when holder is null then 'rewarded' else 'qualified' end;
end $$;

-- The friend's answer to "share your chart for the reading?". Declining frees the reward,
-- which passes to the next friend who qualified, if any.
create or replace function public.set_referral_share(p_friend uuid, p_share boolean) returns text
language plpgsql security definer set search_path = public as $$
declare r referrals%rowtype; nxt uuid;
begin
  select * into r from referrals where friend_id = p_friend for update;
  if not found or not r.rewarded then return 'none'; end if;
  if r.reading_id is not null then return 'redeemed'; end if;
  if p_share then
    update referrals set friend_shared = true, shared_at = now() where id = r.id;
    return 'shared';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('referral:' || r.inviter_id::text, 0));
  update referrals set friend_shared = false, shared_at = now(), rewarded = false where id = r.id;
  select id into nxt from referrals where inviter_id = r.inviter_id and status = 'qualified' and not rewarded
    and friend_shared is distinct from false order by qualified_at limit 1;
  if nxt is not null then update referrals set rewarded = true where id = nxt; end if;
  return 'declined';
end $$;

-- Redeems the inviter's free reading with the friend who earned it. Idempotent: calling it again
-- returns the same reading, and a reading that failed to generate is reset and retried, never duplicated.
create or replace function public.redeem_referral(p_inviter uuid)
returns table (out_reading_id uuid, out_outcome text)
language plpgsql security definer set search_path = public as $$
declare r referrals%rowtype; f profiles%rowtype; pid uuid; rid uuid; st text;
begin
  select * into r from referrals where inviter_id = p_inviter and rewarded for update;
  if not found then raise exception 'no_credit' using errcode = 'P0001'; end if;
  if r.friend_shared is not true then raise exception 'not_shared' using errcode = 'P0001'; end if;
  if r.reading_id is not null then
    select status into st from readings where id = r.reading_id;
    if st = 'failed' then
      update readings set status = 'scheduled', attempts = 0, error = null, deliver_at = now() where id = r.reading_id;
      return query select r.reading_id, 'retry'::text;
    else
      return query select r.reading_id, 'existing'::text;
    end if;
    return;
  end if;
  select * into f from profiles where id = r.friend_id;
  if f.birth_date is null then raise exception 'friend_no_chart' using errcode = 'P0001'; end if;
  insert into people (user_id, name, relationship, birth_date, birth_time, birth_place, latitude, longitude, timezone, purchased)
    values (p_inviter, coalesce(nullif(f.name, ''), 'Your friend'), 'friend', f.birth_date, f.birth_time, f.birth_place, f.latitude, f.longitude, f.timezone, true)
    returning id into pid;
  insert into readings (user_id, kind, person_id, title, deliver_at, paid)
    values (p_inviter, 'synastry', pid, 'You & ' || coalesce(nullif(f.name, ''), 'your friend'), now(), true)
    returning id into rid;
  update referrals set person_id = pid, reading_id = rid, redeemed_at = now() where id = r.id;
  return query select rid, 'started'::text;
end $$;

revoke all on function public.attach_referral(uuid, text) from public, anon, authenticated;
revoke all on function public.qualify_referral(uuid) from public, anon, authenticated;
revoke all on function public.set_referral_share(uuid, boolean) from public, anon, authenticated;
revoke all on function public.redeem_referral(uuid) from public, anon, authenticated;
grant execute on function public.add_journal_entry(uuid, int, text, text, timestamptz, date, text, text, text, date) to service_role;
grant execute on function public.attach_referral(uuid, text) to service_role;
grant execute on function public.qualify_referral(uuid) to service_role;
grant execute on function public.set_referral_share(uuid, boolean) to service_role;
grant execute on function public.redeem_referral(uuid) to service_role;
