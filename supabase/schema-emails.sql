-- Lifecycle emails (welcome, first product, limit reached, trial ending).
-- One row per email kind per user, so each email is sent at most once.
-- Only the server (service role) reads or writes this table.

create table if not exists public.email_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 100),
  sent_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.email_log enable row level security;
-- No policies: signed-in users and visitors can't see or change it.
revoke all on table public.email_log from anon, authenticated;
