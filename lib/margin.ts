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
  margin_alert_percent: number;
  snapshots: PriceSnapshot[];
};

export function sortByCheckedAt<T extends { checked_at: string }>(snapshots: T[]): T[] {
  return [...snapshots].sort(
    (a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()
  );
}

export function marginPercent(sellPrice: number | null, cost: number | null): number | null {
  if (sellPrice == null || sellPrice <= 0 || cost == null) return null;
  return ((sellPrice - cost) / sellPrice) * 100;
}

export function summarize(product: ProductWithSnapshots) {
  const sorted = sortByCheckedAt(product.snapshots);
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  const priceChange =
    latest?.price != null && previous?.price != null && previous.price !== 0
      ? ((latest.price - previous.price) / previous.price) * 100
      : null;
  const margin = marginPercent(product.sell_price, latest?.price ?? null);
  const marginDollar =
    product.sell_price != null && latest?.price != null ? product.sell_price - latest.price : null;
  const atRisk = margin != null && margin <= product.margin_alert_percent;
  return { sorted, latest, previous, priceChange, margin, marginDollar, atRisk };
}

export function money(value: number | null | undefined): string {
  return value == null ? '—' : `$${value.toFixed(2)}`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
