-- Run this in Supabase SQL Editor AFTER schema.sql (and schema-billing.sql, if applied).
-- Adds real margin tracking: what you sell each product for, and the margin
-- percentage below which you want to be alerted when supplier cost rises.

alter table tracked_products
  add column if not exists sell_price numeric,
  add column if not exists margin_alert_percent numeric not null default 20;
