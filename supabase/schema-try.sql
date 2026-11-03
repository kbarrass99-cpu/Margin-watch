-- The homepage "check a supplier link" box: lets visitors see a live price
-- before signing up. Each check is logged so the server can rate-limit by
-- visitor and reuse a recent result for the same link (each check costs a
-- page fetch). Only the server reads or writes this table.

create table if not exists public.try_checks (
  id bigint generated always as identity primary key,
  -- sha256 of the visitor's IP with a salt that changes every day, so a
  -- visitor can't be followed from one day to the next.
  visitor text not null,
  source_url text not null check (char_length(source_url) <= 2048),
  ok boolean not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists try_checks_visitor_created_idx on public.try_checks (visitor, created_at desc);
create index if not exists try_checks_url_created_idx on public.try_checks (source_url, created_at desc);
create index if not exists try_checks_created_idx on public.try_checks (created_at);

alter table public.try_checks enable row level security;
revoke all on table public.try_checks from anon, authenticated;
