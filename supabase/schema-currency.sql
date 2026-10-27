-- Selling currency per product, and daily exchange rates for converting the
-- supplier's price into it before working out the margin.

-- null = the seller prices in the supplier's own currency (the original behaviour).
alter table public.tracked_products
  add column if not exists sell_currency text check (sell_currency ~ '^[A-Z]{3}$');

-- Users already read, add and edit their own products column by column.
grant select (sell_currency), insert (sell_currency), update (sell_currency)
  on public.tracked_products to authenticated;

-- Units of each currency per 1 US dollar (European Central Bank reference
-- rates via frankfurter.dev), refreshed by the server about twice a day.
create table if not exists public.fx_rates (
  currency text primary key check (currency ~ '^[A-Z]{3}$'),
  per_usd numeric not null check (per_usd > 0),
  updated_at timestamptz not null default now()
);

alter table public.fx_rates enable row level security;
-- Public reference data: anyone may read it, only the server writes it.
drop policy if exists "fx rates are public" on public.fx_rates;
create policy "fx rates are public" on public.fx_rates for select to anon, authenticated using (true);
revoke insert, update, delete on table public.fx_rates from anon, authenticated;
grant select on table public.fx_rates to anon, authenticated;
