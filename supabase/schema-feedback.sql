-- Product feedback and feature requests from customers (and creators trying
-- the app before recommending it). Written only by the server, which also
-- emails each one to support.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  recommend text check (recommend in ('yes', 'not_yet', 'no')),
  working text check (char_length(working) <= 2000),
  missing text check (char_length(missing) <= 2000),
  features text check (char_length(features) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_created_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;
-- No policies: customers never read or write this table directly.
revoke all on table public.feedback from anon, authenticated;
