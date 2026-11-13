-- Vertex Point: allow the Full Chart reading kind
alter table public.readings drop constraint if exists readings_kind_check;
alter table public.readings add constraint readings_kind_check
  check (kind in ('natal','timeline','question','synastry','yearahead','fullchart'));
