import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from '@/lib/supabase/admin';
import { scrapeProductPage } from '@/lib/scraper';
import { unsupportedSupplierMessage, SUPPORTED_SUPPLIERS } from '@/lib/suppliers';
import { assertPublicHttpUrl, normalizeHttpUrl } from '@/lib/urlSafety';

// A supplier page can take a while: direct fetch, then the Firecrawl fallback.
export const maxDuration = 60;

// Every check fetches a supplier page (and may spend a Firecrawl credit), so
// visitors get a handful, and a recent result for the same link is reused.
const PER_HOUR = 8;
const PER_DAY = 20;
const ALL_VISITORS_PER_DAY = 400;
const REUSE_MS = 6 * 3600 * 1000;

export type TryResult = {
  ok: boolean;
  title?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  inStock?: boolean;
  message?: string;
};

// The homepage "paste a supplier link" box: reads the live price and stock
// without an account, so visitors see MarginCanary work before signing up.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) ?? {};
  return check(request, typeof body.url === 'string' ? body.url : '');
}

// Same check from a link (/api/try?url=...), handy for testing a supplier.
export async function GET(request: Request) {
  return check(request, new URL(request.url).searchParams.get('url') ?? '');
}

async function check(request: Request, input: string) {
  const rawUrl = input.trim();
  if (!rawUrl || rawUrl.length > 2048 || !/^https?:\/\//i.test(rawUrl)) {
    return NextResponse.json({ error: 'Paste the full link to a product page, starting with https://' }, { status: 400 });
  }

  const unsupported = unsupportedSupplierMessage(rawUrl);
  if (unsupported) return NextResponse.json({ ok: false, message: unsupported } satisfies TryResult);

  let url: string;
  try {
    await assertPublicHttpUrl(rawUrl);
    url = normalizeHttpUrl(rawUrl);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'That link is not allowed.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const visitor = visitorId(request);
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();

  const [hour, day, everyone] = await Promise.all([
    admin.from('try_checks').select('id', { count: 'exact', head: true }).eq('visitor', visitor).gte('created_at', since(3600 * 1000)),
    admin.from('try_checks').select('id', { count: 'exact', head: true }).eq('visitor', visitor).gte('created_at', since(24 * 3600 * 1000)),
    admin.from('try_checks').select('id', { count: 'exact', head: true }).gte('created_at', since(24 * 3600 * 1000)),
  ]);
  if ((hour.count ?? 0) >= PER_HOUR || (day.count ?? 0) >= PER_DAY || (everyone.count ?? 0) >= ALL_VISITORS_PER_DAY) {
    return NextResponse.json(
      { error: "You've checked a lot of links. Create a free account to keep tracking, or try again later." },
      { status: 429 }
    );
  }

  const { data: recent } = await admin
    .from('try_checks')
    .select('result')
    .eq('source_url', url)
    .eq('ok', true)
    .gte('created_at', since(REUSE_MS))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let result: TryResult;
  if (recent?.result) {
    result = recent.result as TryResult;
  } else {
    const scraped = await scrapeProductPage(url);
    result = scraped.ok
      ? {
          ok: true,
          title: scraped.title,
          imageUrl: scraped.imageUrl,
          price: scraped.price,
          currency: scraped.currency,
          inStock: scraped.inStock,
        }
      : {
          ok: false,
          message: scraped.blocked
            ? scraped.rawStatus
            : `${scraped.rawStatus} MarginCanary works best with ${SUPPORTED_SUPPLIERS}.`,
        };
  }

  const { error } = await admin.from('try_checks').insert({ visitor, source_url: url, ok: result.ok, result });
  if (error) Sentry.captureException(error);

  // Checks older than two days are only kept long enough to rate-limit.
  if (Math.random() < 0.05) {
    await admin.from('try_checks').delete().lt('created_at', since(2 * 24 * 3600 * 1000));
  }

  return NextResponse.json(result);
}

// A daily-salted hash of the visitor's IP address: enough to rate-limit,
// and it can't be linked to the same visitor on another day.
function visitorId(request: Request): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${process.env.CRON_SECRET ?? ''}:${day}:${ip}`)
    .digest('hex');
}
