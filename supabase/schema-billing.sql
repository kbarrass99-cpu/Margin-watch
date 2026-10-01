-- Run this in Supabase SQL Editor AFTER your original schema.sql.
-- Adds a "profiles" table that tracks each user's plan and Stripe IDs.
-- (We can't add custom columns directly to Supabase's built-in auth.users
-- table, so this is the standard pattern: a linked public table instead.)

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz default now() not null
);

alter table profiles enable row level security;

drop policy if exists "Users can view their own profile" on profiles;
create policy "Users can view their own profile"
  on profiles for select
  using ((select auth.uid()) = id);

-- Automatically create a "free" profile row the moment someone signs up.
-- search_path is pinned to prevent search_path hijacking, and EXECUTE is
-- revoked from PUBLIC so this can only run via the trigger below, not as a
-- directly callable RPC.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, plan)
  values (new.id, 'free');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Backfill profiles for any accounts that already existed before this ran.
insert into profiles (id, plan)
select id, 'free' from auth.users
where id not in (select id from profiles);
