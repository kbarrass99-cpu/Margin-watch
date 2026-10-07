import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkOneProduct, type ProductForCheck } from '@/lib/checkProduct';
import { planFor, PLANS } from '@/lib/plans';

type Product = ProductForCheck & { user_id: string; created_at: string; last_checked_at: string | null };

// Supabase returns at most 1,000 rows per request, so read in pages.
async function loadAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data || []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

// Keeps each account to the products its current plan covers (oldest
// first), then deals the queue out one product per account at a time,
// longest-waiting first, so no single account can fill a whole run.
function buildQueue(products: Product[], planOf: Map<string, string | null>): Product[] {
  const byUser = new Map<string, Product[]>();
  for (const p of [...products].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const list = byUser.get(p.user_id) ?? [];
    if (list.length < PLANS[planFor(planOf.get(p.user_id))].productLimit) list.push(p);
    byUser.set(p.user_id, list);
  }
  const waited = (p: Product) => (p.last_checked_at ? Date.parse(p.last_checked_at) : 0);
  const lanes = [...byUser.values()].map((list) => list.sort((a, b) => waited(a) - waited(b)));
  const queue: Product[] = [];
  for (let round = 0; lanes.some((l) => l.length > round); round++) {
    const batch = lanes.filter((l) => l.length > round).map((l) => l[round]);
    queue.push(...batch.sort((a, b) => waited(a) - waited(b)));
  }
  return queue;
}

// Vercel stops the function at 60 seconds. We stop starting new checks well
// before that, so every run ends cleanly and the next one carries on from
// the products that have waited longest.
export const maxDuration = 60;
const TIME_BUDGET_MS = 45_000;
const CONCURRENCY = 5;

function secretMatches(given: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!given || !expected) return false;
  // Compare fixed-length digests so the check doesn't reveal the secret's length.
  const digest = (v: string) => createHash('sha256').update(v).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

async function handle(request: Request) {
  if (!secretMatches(request.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const supabase = createAdminClient();

  let products: Product[];
  let profiles: { id: string; plan: string | null }[];
  try {
    [products, profiles] = await Promise.all([
      loadAll<Product>((from, to) => supabase.from('tracked_products').select('*').eq('is_active', true).order('id').range(from, to)),
      loadAll<{ id: string; plan: string | null }>((from, to) => supabase.from('profiles').select('id, plan').order('id').range(from, to)),
    ]);
  } catch (err: any) {
    Sentry.captureException(new Error(`Cron load failed: ${err?.message}`));
    return NextResponse.json({ error: 'Could not load products' }, { status: 500 });
  }

  const planOf = new Map(profiles.map((p) => [p.id, p.plan]));
  const queue = buildQueue(products, planOf);
  const results: { ok: boolean; alertSent?: boolean }[] = [];

  async function worker(slot: number) {
    // Stagger the workers a little so we stay a polite, low-volume caller.
    await new Promise((r) => setTimeout(r, slot * 200));
    while (queue.length > 0 && Date.now() - started < TIME_BUDGET_MS) {
      const product = queue.shift()!;
      try {
        const result = await checkOneProduct(supabase, product);
        results.push({ ok: result.scrapeOk, alertSent: result.alertSent });
      } catch (err: any) {
        Sentry.captureException(err, { extra: { productId: product.id } });
        results.push({ ok: false });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  if (queue.length > 0) {
    // Not an error: the rest are first in line next run. Logged so growth is visible.
    Sentry.captureMessage(`Cron run left ${queue.length} products for the next run`, { level: 'info' });
  }

  // Counts only: the response ends up in the GitHub Actions log.
  return NextResponse.json({
    checked: results.length,
    failed: results.filter((r) => !r.ok).length,
    alertsSent: results.filter((r) => r.alertSent).length,
    remaining: queue.length,
  });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
