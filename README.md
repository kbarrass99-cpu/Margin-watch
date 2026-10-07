# MarginCanary

Track your dropshipping supplier's product pages and get an email alert the
moment the price changes, a product goes out of stock, comes back in stock,
or your profit margin drops below a threshold you set (enter what you sell
the product for, and MarginCanary alerts you when a supplier price hike eats
into your margin — not just when the raw price moves).

**If you have zero coding experience, start with `DEPLOYMENT_GUIDE.md`** — it
walks through getting this live on the internet for free, step by step,
using only web dashboards (no software to install, no command line).

## What's in this project

- `app/` — the website itself (Next.js: landing page, login/signup, dashboard)
- `components/` — reusable UI pieces (product card, add-product form, chart)
- `lib/` — the actual logic: the scraper, the email sender, the Supabase
  database connections
- `supabase/schema.sql` — the database structure, run this once in Supabase
- `supabase/schema-margin.sql` — adds sell price + margin alert threshold,
  run this once too (after `schema.sql`)
- `supabase/schema-billing.sql` — adds each user's plan and Stripe IDs; run
  this once after `schema-margin.sql`
- `supabase/schema-checks.sql` — adds shipping and fees per sale, tracks when
  each product was last checked, and limits which columns users can edit;
  run this once after the other schema files
- `supabase/schema-security.sql` — makes the database enforce the plan
  limit and the alert recipient, and keeps check results server-only; run
  this last (safe to re-run)
- `.github/workflows/cron.yml` — the free scheduler that checks all products
  automatically every 6 hours

## Stack (100% free tier)

| Piece | Tool | Free tier |
|---|---|---|
| Hosting | [Vercel](https://vercel.com) | Yes, generous Hobby plan |
| Database + auth | [Supabase](https://supabase.com) | Yes, 500MB DB |
| Email alerts | [Resend](https://resend.com) | Yes, 3,000 emails/month |
| Scheduler | GitHub Actions | Yes, free for personal repos |

## Local development (optional — only if you later want to code)

```bash
npm install
cp .env.example .env.local   # fill in your real keys
npm run dev
```
