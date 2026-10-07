-- Run this in Supabase SQL Editor AFTER schema.sql, schema-margin.sql,
-- schema-billing.sql and schema-checks.sql. Safe to run more than once.
--
-- Moves the rules that used to live only in the app into the database, so
-- they hold even for someone who skips the app and talks to Supabase
-- directly with their own login:
-- 1. Alerts always go to the account's own email address, and follow it
--    when the account email changes.
-- 2. The plan's product limit is enforced on every insert, atomically.
-- 3. Only the server writes check results (title, image, last checked time,
--    price history and alerts). Users can no longer reorder the scheduled
--    check queue or fill the database with fake history.
-- 4. Size limits on stored text.

-- ---------------------------------------------------------------------------
-- 1 + 2. Every new tracked product: recipient = account email, server-owned
-- columns cleared, plan limit checked under a per-user lock.
-- Limits must match lib/plans.ts (free 1, starter 5, pro 50).
-- ---------------------------------------------------------------------------
create or replace function public.tracked_products_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_email text;
  owner_plan text;
  product_limit int;
  current_count int;
begin
  -- RLS also checks this; failing early keeps other accounts out of the limit check.
  if auth.uid() is not null and new.user_id is distinct from auth.uid() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select u.email into owner_email from auth.users u where u.id = new.user_id;
  if owner_email is null then
    raise exception 'unknown account' using errcode = 'P0001';
  end if;

  if new.source_url !~* '^https?://' then
    raise exception 'source_url must be an http(s) URL' using errcode = 'P0001';
  end if;

  new.user_email := owner_email;
  new.title := null;
  new.image_url := null;
  new.last_checked_at := null;

  -- Serialise inserts per user so parallel requests can't all pass the count.
  perform pg_advisory_xact_lock(hashtext('tracked_products_limit'), hashtext(new.user_id::text));

  select p.plan into owner_plan from public.profiles p where p.id = new.user_id;
  product_limit := case owner_plan when 'pro' then 50 when 'starter' then 5 else 1 end;

  select count(*) into current_count from public.tracked_products t where t.user_id = new.user_id;
  if current_count >= product_limit then
    raise exception 'product limit reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke execute on function public.tracked_products_before_insert() from public, anon, authenticated;

drop trigger if exists tracked_products_before_insert on public.tracked_products;
create trigger tracked_products_before_insert
  before insert on public.tracked_products
  for each row execute function public.tracked_products_before_insert();

-- Keep the alert recipient in step with the account email.
create or replace function public.sync_tracked_products_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    update public.tracked_products
      set user_email = new.email
      where user_id = new.id and user_email is distinct from new.email;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_tracked_products_email() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_tracked_products_email();

-- One-off: correct any existing rows whose recipient isn't the owner's email.
update public.tracked_products tp
  set user_email = u.email
  from auth.users u
  where u.id = tp.user_id
    and u.email is not null
    and tp.user_email is distinct from u.email;

-- ---------------------------------------------------------------------------
-- 3. Column and table privileges. Users may set up and edit their own
-- product settings; everything a check produces is written by the server
-- (service role, which bypasses these grants and RLS).
-- ---------------------------------------------------------------------------
revoke insert, update on public.tracked_products from anon, authenticated;
grant insert (user_id, user_email, source_url, sell_price, extra_cost, margin_alert_percent, alert_threshold_percent)
  on public.tracked_products to authenticated;
grant update (sell_price, extra_cost, margin_alert_percent, alert_threshold_percent, is_active)
  on public.tracked_products to authenticated;

drop policy if exists "Users insert snapshots for their own products" on public.snapshots;
drop policy if exists "Users insert alerts for their own products" on public.alerts;
revoke insert, update, delete on public.snapshots from anon, authenticated;
revoke insert, update, delete on public.alerts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Size and range limits. NOT VALID applies them to new and changed rows
-- without failing on anything already stored.
-- ---------------------------------------------------------------------------
alter table public.tracked_products drop constraint if exists tracked_products_source_url_length;
alter table public.tracked_products add constraint tracked_products_source_url_length
  check (char_length(source_url) <= 2048) not valid;

alter table public.tracked_products drop constraint if exists tracked_products_title_length;
alter table public.tracked_products add constraint tracked_products_title_length
  check (title is null or char_length(title) <= 300) not valid;

alter table public.tracked_products drop constraint if exists tracked_products_image_url_length;
alter table public.tracked_products add constraint tracked_products_image_url_length
  check (image_url is null or char_length(image_url) <= 2048) not valid;

alter table public.tracked_products drop constraint if exists tracked_products_thresholds_range;
alter table public.tracked_products add constraint tracked_products_thresholds_range
  check (
    alert_threshold_percent >= 0 and alert_threshold_percent <= 100
    and margin_alert_percent >= 0 and margin_alert_percent <= 100
    and (sell_price is null or sell_price >= 0)
  ) not valid;

alter table public.snapshots drop constraint if exists snapshots_text_length;
alter table public.snapshots add constraint snapshots_text_length
  check (
    (currency is null or char_length(currency) <= 3)
    and (raw_status is null or char_length(raw_status) <= 500)
  ) not valid;

alter table public.alerts drop constraint if exists alerts_text_length;
alter table public.alerts add constraint alerts_text_length
  check (char_length(type) <= 40 and char_length(message) <= 2000) not valid;
