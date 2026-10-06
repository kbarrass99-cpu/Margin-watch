-- Run this in Supabase SQL Editor AFTER schema.sql, schema-margin.sql and schema-billing.sql.
-- 1. Shipping and fees per sale, so margin reflects what a sale actually costs.
-- 2. When each product was last checked, so the scheduled run checks the
--    longest-waiting products first and never starves the same ones.
-- 3. Signed-in users can only change the settings columns on their own products.
--    In particular they can't change user_email, which would let someone point
--    alert emails at another person's inbox.

alter table tracked_products
  add column if not exists extra_cost numeric check (extra_cost is null or extra_cost >= 0),
  add column if not exists last_checked_at timestamptz;

create index if not exists tracked_products_due_idx
  on tracked_products (last_checked_at asc nulls first)
  where is_active;

revoke update on tracked_products from authenticated;
grant update (sell_price, extra_cost, margin_alert_percent, alert_threshold_percent, is_active, title, image_url, last_checked_at)
  on tracked_products to authenticated;
