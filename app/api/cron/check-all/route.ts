import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkOneProduct } from '@/lib/checkProduct';

// Vercel stops the function at 60 seconds. We stop starting new checks well
// before that, so every run ends cleanly and the next one carries on from
// the products that have waited longest.
export const maxDuration = 60;
const TIME_BUDGET_MS = 45_000;
const CONCURRENCY = 5;

function secretMatches(given: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(request: Request) {
  if (!secretMatches(request.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const supabase = createAdminClient();

  // Longest-waiting first, never-checked products before everything else.
  const { data: products, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('is_active', true)
    .order('last_checked_at', { ascending: true, nullsFirst: true });

  if (error) {
    Sentry.captureException(new Error(`Cron product load failed: ${error.message}`));
    return NextResponse.json({ error: 'Could not load products' }, { status: 500 });
  }

  const queue = [...(products || [])];
  const results: { id: string; ok: boolean; alertSent?: boolean; error?: string }[] = [];

  async function worker(slot: number) {
    // Stagger the workers a little so we stay a polite, low-volume caller.
    await new Promise((r) => setTimeout(r, slot * 200));
    while (queue.length > 0 && Date.now() - started < TIME_BUDGET_MS) {
      const product = queue.shift()!;
      try {
        const result = await checkOneProduct(supabase, product);
        results.push({ id: product.id, ok: result.scrapeOk, alertSent: result.alertSent });
      } catch (err: any) {
        Sentry.captureException(err, { extra: { productId: product.id } });
        results.push({ id: product.id, ok: false, error: err?.message });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  if (queue.length > 0) {
    // Not an error: the rest are first in line next run. Logged so growth is visible.
    Sentry.captureMessage(`Cron run left ${queue.length} products for the next run`, { level: 'info' });
  }

  return NextResponse.json({ checked: results.length, remaining: queue.length, results });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
