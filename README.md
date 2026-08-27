# MarginWatch

Track your dropshipping supplier's product pages and get an email alert the
moment the price changes, a product goes out of stock, or comes back in stock.

**If you have zero coding experience, start with `DEPLOYMENT_GUIDE.md`** — it
walks through getting this live on the internet for free, step by step,
using only web dashboards (no software to install, no command line).

## What's in this project

- `app/` — the website itself (Next.js: landing page, login/signup, dashboard)
- `components/` — reusable UI pieces (product card, add-product form, chart)
- `lib/` — the actual logic: the scraper, the email sender, the Supabase
  database connections
- `supabase/schema.sql` — the database structure, run this once in Supabase
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
