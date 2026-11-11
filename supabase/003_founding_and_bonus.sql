-- Run after 002. Paid one-offs, the free bonus month, and the founding price counter.
alter table public.readings add column if not exists paid boolean not null default false;
alter table public.profiles add column if not exists bonus_timeline_until timestamptz;
alter table public.profiles add column if not exists bonus_invite_sent boolean not null default false;
