-- "Report a problem" on a tracked product. Each report is kept here (so none
-- is lost if an email goes astray) and emailed to the support inbox.
-- Only the server (service role) reads or writes this table.

create table if not exists public.issue_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.tracked_products (id) on delete set null,
  source_url text not null check (char_length(source_url) <= 2048),
  reason text not null check (reason in ('not_found', 'wrong_price', 'wrong_stock', 'other')),
  note text check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

-- Rate limit lookups (recent reports for a product) and per-user cleanup.
create index if not exists issue_reports_product_created_idx on public.issue_reports (product_id, created_at desc);
create index if not exists issue_reports_user_idx on public.issue_reports (user_id);

alter table public.issue_reports enable row level security;
-- No policies: signed-in users and visitors can't see or change it.
revoke all on table public.issue_reports from anon, authenticated;
