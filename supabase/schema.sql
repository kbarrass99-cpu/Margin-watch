-- Run this entire file once in your Supabase project's SQL Editor.
-- It creates the three tables MarginWatch needs and locks them down so
-- each user can only ever see their own data.

create table if not exists tracked_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  user_email text not null,
  source_url text not null,
  title text,
  image_url text,
  is_active boolean default true not null,
  alert_threshold_percent numeric default 3 not null,
  created_at timestamptz default now() not null
);

create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  tracked_product_id uuid references tracked_products(id) on delete cascade not null,
  price numeric,
  currency text,
  in_stock boolean,
  raw_status text,
  checked_at timestamptz default now() not null
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  tracked_product_id uuid references tracked_products(id) on delete cascade not null,
  type text not null,
  message text not null,
  created_at timestamptz default now() not null
);

create index if not exists snapshots_tracked_product_id_idx on snapshots (tracked_product_id, checked_at desc);
create index if not exists alerts_tracked_product_id_idx on alerts (tracked_product_id, created_at desc);

-- Row Level Security: every logged-in user can only read/write their own rows.
alter table tracked_products enable row level security;
alter table snapshots enable row level security;
alter table alerts enable row level security;

drop policy if exists "Users manage their own tracked products" on tracked_products;
create policy "Users manage their own tracked products"
  on tracked_products for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users view snapshots of their own products" on snapshots;
create policy "Users view snapshots of their own products"
  on snapshots for select
  using (
    exists (
      select 1 from tracked_products tp
      where tp.id = snapshots.tracked_product_id
      and tp.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert snapshots for their own products" on snapshots;
create policy "Users insert snapshots for their own products"
  on snapshots for insert
  with check (
    exists (
      select 1 from tracked_products tp
      where tp.id = snapshots.tracked_product_id
      and tp.user_id = auth.uid()
    )
  );

drop policy if exists "Users view alerts of their own products" on alerts;
create policy "Users view alerts of their own products"
  on alerts for select
  using (
    exists (
      select 1 from tracked_products tp
      where tp.id = alerts.tracked_product_id
      and tp.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert alerts for their own products" on alerts;
create policy "Users insert alerts for their own products"
  on alerts for insert
  with check (
    exists (
      select 1 from tracked_products tp
      where tp.id = alerts.tracked_product_id
      and tp.user_id = auth.uid()
    )
  );

-- Note: the scheduled cron job uses the "service role" key, which is allowed
-- to bypass Row Level Security entirely (by design - Supabase handles this
-- automatically for that key), so it can check every user's products.
