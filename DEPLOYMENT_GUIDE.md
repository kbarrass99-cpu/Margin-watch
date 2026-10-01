# Deploying MarginWatch — a complete, no-coding-required guide

You will not write or edit any code in this guide. You'll create four free
accounts, copy-paste some keys between them, and click a few buttons. It
takes about 30–45 minutes the first time.

**The four free accounts you'll create:**
1. **GitHub** — holds your code
2. **Supabase** — your database + user login system
3. **Resend** — sends your email alerts
4. **Vercel** — hosts your live website

---

## Step 1 — Put the code on GitHub

1. Go to [github.com](https://github.com) and create a free account if you
   don't have one.
2. Click the **+** icon top-right → **New repository**.
3. Name it `marginwatch`. Leave it **Public** or **Private** (either is
   fine — Private is fine even on the free plan). Do **not** check "Add a
   README" (we already have one). Click **Create repository**.
4. On the next page, click the link that says **"uploading an existing
   file"**.
5. Open the `marginwatch` folder you downloaded, select **everything inside
   it** (all files and folders — including the ones starting with a dot,
   like `.github` and `.gitignore`), and drag them all into the GitHub
   upload box in your browser. Modern browsers (Chrome, Edge) preserve
   folder structure when you drag a folder in.
   - If drag-and-drop drops files into the wrong place or flattens folders,
     install the free **GitHub Desktop** app instead
     ([desktop.github.com](https://desktop.github.com)) — it has a simple
     "Add existing repository" → publish flow that handles this perfectly,
     with no command line involved.
6. Scroll down, add a commit message like "Initial upload", click **Commit
   changes**.

Your code is now on GitHub. You won't need to touch GitHub's file browser
again — from here on, Vercel will read your code directly from this repo.

---

## Step 2 — Create your database (Supabase)

1. Go to [supabase.com](https://supabase.com) → **Start your project** →
   sign up free (you can use your GitHub account to sign in, which is
   fastest).
2. Click **New project**. Give it a name like `marginwatch`, set a database
   password (save this somewhere, though you won't need it again for this
   guide), pick the region closest to you, and click **Create new project**.
   Wait about 2 minutes while it sets up.
3. Once it's ready, click the **SQL Editor** icon in the left sidebar →
   **New query**.
4. Open the `supabase/schema.sql` file from your downloaded project folder
   in any text editor (even Notepad or TextEdit), select all the text, copy
   it, and paste it into the Supabase SQL editor.
5. Click **Run** (bottom right). You should see "Success. No rows returned."
   This created your three database tables and locked them down so users
   can only see their own data.
6. Now go to the gear icon **Project Settings** → **API**. You'll see three
   values you need to copy somewhere safe (a Notes app is fine):
   - **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (click "Reveal") → this is your
     `SUPABASE_SERVICE_ROLE_KEY` — **keep this one truly secret**, never
     share it or put it anywhere public.

**Optional but recommended for testing:** go to **Authentication** →
**Providers** → **Email**, and turn **off** "Confirm email". This means
when you sign up on your live site, you're logged in immediately instead
of needing to click a confirmation email first. You can turn it back on
later once real users are involved.

---

## Step 3 — Set up email alerts (Resend)

1. Go to [resend.com](https://resend.com) → sign up free.
2. Go to **API Keys** → **Create API Key**. Give it any name, click
   **Add**, and copy the key it shows you (starts with `re_`). This is your
   `RESEND_API_KEY`.
3. You do **not** need to set up a custom domain to get started. Resend
   lets you send test emails from `onboarding@resend.dev` right away —
   that's already set as the default in this project. (Later, if you want
   emails to come from your own domain like `alerts@yourdomain.com`, Resend
   has a free "Verify a domain" flow you can do at any time.)

---

## Step 4 — Deploy the website (Vercel)

1. Go to [vercel.com](https://vercel.com) → sign up free using your GitHub
   account (this makes the next step automatic).
2. Click **Add New...** → **Project**.
3. Find your `marginwatch` repository in the list and click **Import**.
4. Before clicking Deploy, open the **Environment Variables** section and
   add each of these one at a time (Name on the left, Value on the right —
   paste the values you saved from Steps 2 and 3):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role key |
   | `RESEND_API_KEY` | your Resend API key |
   | `ALERT_FROM_EMAIL` | `onboarding@resend.dev` |
   | `CRON_SECRET` | make up any long random password, e.g. `mw-7f3k9x2q1p8z4v6n` |

5. Click **Deploy**. Wait 1–2 minutes. When it's done, click **Visit** —
   your site is live at a `.vercel.app` address!

Try it now: click **Start free**, create an account, and paste in a real
AliExpress product URL. Within a few seconds you should see its title,
image, and price appear on your dashboard.

---

## Step 5 — Turn on the automatic scheduler (GitHub Actions)

This is what makes MarginWatch check your products automatically, even
when you're not on the site — every 6 hours, for free, forever.

1. On your GitHub repository page, click **Settings** → in the left
   sidebar, **Secrets and variables** → **Actions**.
2. Click **New repository secret** and add these two, one at a time:
   - Name: `APP_URL` → Value: your live Vercel site URL, e.g.
     `https://marginwatch-yourname.vercel.app` (no trailing slash)
   - Name: `CRON_SECRET` → Value: the exact same random password you used
     in Vercel's `CRON_SECRET` in Step 4
3. Go to the **Actions** tab on your repository. You should see a workflow
   called **"Price & Stock Check"**. Click it, then click **Run workflow**
   → **Run workflow** to trigger it manually right now and confirm it
   works — it should finish with a green checkmark within a few seconds.

From now on, this runs automatically every 6 hours without you doing
anything. You can change how often in `.github/workflows/cron.yml` (the
comments in that file explain how).

---

## You're live 🎉

Anyone can now go to your `.vercel.app` link, sign up, and start tracking
supplier products for free (up to 5 products per account, by default).

## Troubleshooting

- **"Could not find price data on this page"** — the supplier's website
  changed its layout, is blocking automated requests, or the page requires
  logging in to view. This is the expected main limitation of this kind of
  tool (explained in the original research doc) — try a different product
  URL, or a supplier like CJdropshipping, which tends to be more scraper-
  friendly than AliExpress.
- **Signup says "Error sending confirmation email"** — go back to Step 2
  and turn off "Confirm email" in Supabase, or set up a Resend domain so
  Supabase can send its own auth emails.
- **Dashboard shows "Not authenticated" / keeps redirecting to login** —
  double check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  in Vercel exactly match what's in your Supabase project settings, then
  redeploy (Vercel → Deployments → ⋯ → Redeploy).
- **GitHub Action fails with a 401 error** — the `CRON_SECRET` in GitHub
  and in Vercel must be *identical, character for character*.
- **Want to change how sensitive alerts are** (currently alerts fire on
  any price move of 3% or more) — edit the default value in
  `supabase/schema.sql`'s `alert_threshold_percent` column, or update it
  per-product directly in Supabase's **Table Editor**.

## Natural next upgrades (v2 ideas, not built yet)

- Auto-sync the new price straight to your Shopify listing
- SMS alerts (via Twilio's free trial credit)
- A paid tier with a higher product limit (Stripe has a no-monthly-fee
  free tier — you only pay a % when you actually get paid)
- Support for more suppliers as dedicated "adapters" in `lib/scraper.ts`
