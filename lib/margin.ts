import { currencySymbol } from './money';

export type PriceSnapshot = {
  id: string;
  price: number | null;
  currency: string | null;
  in_stock: boolean | null;
  raw_status: string;
  checked_at: string;
};

export type ProductWithSnapshots = {
  id: string;
  title: string | null;
  image_url: string | null;
  source_url: string;
  created_at: string;
  sell_price: number | null;
  extra_cost?: number | null;
  margin_alert_percent: number;
  last_checked_at?: string | null;
  snapshots: PriceSnapshot[];
};

// What a product needs from you, most urgent first. The dashboard sorts and
// filters on this so a failed check never looks calmer than a healthy product.
export type ProductStatus = 'at_risk' | 'out_of_stock' | 'check_failed' | 'stale' | 'not_checked' | 'ok';

export const STATUS_RANK: Record<ProductStatus, number> = {
  at_risk: 0,
  out_of_stock: 1,
  check_failed: 2,
  stale: 3,
  not_checked: 4,
  ok: 5,
};

export const NEEDS_ATTENTION: ProductStatus[] = ['at_risk', 'out_of_stock', 'check_failed', 'stale'];

export const STATUS_LABEL: Record<ProductStatus, string> = {
  at_risk: 'Margin at risk',
  out_of_stock: 'Out of stock',
  check_failed: 'Check failed',
  stale: 'Not checked lately',
  not_checked: 'First check pending',
  ok: 'OK',
};

// Checks run every 6 hours; anything older than two missed runs is stale.
const STALE_AFTER_MS = 13 * 60 * 60 * 1000;

export function sortByCheckedAt<T extends { checked_at: string }>(snapshots: T[]): T[] {
  return [...snapshots].sort(
    (a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()
  );
}

export const isGoodReading = (s: PriceSnapshot) => s.price != null || s.in_stock != null;

export function marginPercent(sellPrice: number | null, cost: number | null, extraCost = 0): number | null {
  if (sellPrice == null || sellPrice <= 0 || cost == null) return null;
  return ((sellPrice - cost - (extraCost || 0)) / sellPrice) * 100;
}

export function summarize(product: ProductWithSnapshots, now = Date.now()) {
  const sorted = sortByCheckedAt(product.snapshots);
  const good = sorted.filter(isGoodReading);
  const lastAttempt = sorted[sorted.length - 1];
  // Prices and stock come from the last reading that actually got data.
  const latest = good[good.length - 1];
  const previous = good[good.length - 2];
  // An out-of-stock page often shows no price; keep using the last price we saw.
  const priced = good.filter((g) => g.price != null);
  const lastPrice = priced[priced.length - 1]?.price ?? null;
  const prevPrice = priced[priced.length - 2]?.price ?? null;
  const lastFailed = !!lastAttempt && !isGoodReading(lastAttempt);
  const currency = latest?.currency ?? priced[priced.length - 1]?.currency ?? null;
  const extra = product.extra_cost ?? 0;
  const priceChange =
    lastPrice != null && prevPrice != null && prevPrice !== 0 ? ((lastPrice - prevPrice) / prevPrice) * 100 : null;
  const margin = marginPercent(product.sell_price, lastPrice, extra);
  const profitPerSale = product.sell_price != null && lastPrice != null ? product.sell_price - lastPrice - extra : null;
  const atRisk = margin != null && margin <= product.margin_alert_percent;

  let status: ProductStatus = 'ok';
  if (!lastAttempt) status = 'not_checked';
  else if (atRisk) status = 'at_risk';
  else if (latest?.in_stock === false) status = 'out_of_stock';
  else if (lastFailed) status = 'check_failed';
  else if (now - new Date(lastAttempt.checked_at).getTime() > STALE_AFTER_MS) status = 'stale';

  return {
    sorted,
    good,
    latest,
    previous,
    lastAttempt,
    lastFailed,
    currency,
    lastPrice,
    priceChange,
    margin,
    profitPerSale,
    marginDollar: profitPerSale,
    atRisk,
    status,
  };
}

export function money(value: number | null | undefined, currency?: string | null): string {
  return value == null ? '—' : `${currencySymbol(currency)}${value.toFixed(2)}`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// Scheduled checks run at 00:00, 06:00, 12:00 and 18:00 UTC.
export function nextScheduledCheck(now = new Date()): Date {
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(Math.floor(now.getUTCHours() / 6) * 6 + 6);
  return next;
}

export function hoursUntil(date: Date, now = Date.now()): string {
  const mins = Math.max(0, Math.round((date.getTime() - now) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export type Change = {
  productId: string;
  title: string;
  kind: 'price_up' | 'price_down' | 'out_of_stock' | 'back_in_stock';
  text: string;
  at: string;
};

// Supplier changes between consecutive good readings since `sinceIso`, newest first.
export function changesSince(products: ProductWithSnapshots[], sinceIso: string): Change[] {
  const since = new Date(sinceIso).getTime();
  const out: Change[] = [];
  for (const p of products) {
    const good = sortByCheckedAt(p.snapshots).filter(isGoodReading);
    const title = p.title || hostOf(p.source_url);
    for (let i = 1; i < good.length; i++) {
      const a = good[i - 1];
      const b = good[i];
      if (new Date(b.checked_at).getTime() <= since) continue;
      if (a.price != null && b.price != null && a.price !== b.price && a.price !== 0) {
        const pct = ((b.price - a.price) / a.price) * 100;
        if (Math.abs(pct) >= 0.5) {
          out.push({
            productId: p.id,
            title,
            kind: pct > 0 ? 'price_up' : 'price_down',
            text: `${money(a.price, b.currency)} → ${money(b.price, b.currency)} (${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%)`,
            at: b.checked_at,
          });
        }
      }
      if (a.in_stock === true && b.in_stock === false) {
        out.push({ productId: p.id, title, kind: 'out_of_stock', text: 'Went out of stock', at: b.checked_at });
      } else if (a.in_stock === false && b.in_stock === true) {
        out.push({ productId: p.id, title, kind: 'back_in_stock', text: 'Back in stock', at: b.checked_at });
      }
    }
  }
  return out.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
