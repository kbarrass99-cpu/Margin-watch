import type { SupabaseClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { scrapeProductPage } from './scraper';
import { sendAlertEmail } from './email';
import { formatMoney } from './money';

export type ProductForCheck = {
  id: string;
  source_url: string;
  title: string | null;
  user_email: string;
  alert_threshold_percent: number;
  sell_price?: number | null;
  extra_cost?: number | null;
  margin_alert_percent?: number;
};

type AlertType = 'price_up' | 'price_down' | 'out_of_stock' | 'back_in_stock' | 'margin_below_threshold';

// This runs the whole "check one product" pipeline:
// scrape -> save a snapshot -> compare to the last good reading -> alert if needed.
// It's used by both the manual "Check now" button and the scheduled cron job.
// Pass the admin (service role) client: check results are server-owned and
// users can't write them directly. Callers must check ownership first.
export async function checkOneProduct(supabase: SupabaseClient, product: ProductForCheck) {
  const result = await scrapeProductPage(product.source_url);

  // Surface scrape failures in Sentry so a supplier that's gone consistently
  // unreadable (blocked, redesigned, delisted) shows up as a pattern.
  if (!result.ok) {
    Sentry.captureMessage(`Scrape failed for tracked product ${product.id}`, {
      level: 'warning',
      extra: {
        productId: product.id,
        sourceUrl: product.source_url,
        rawStatus: result.rawStatus,
      },
    });
  }

  // Compare against the last reading that actually got data, not the last
  // attempt. Otherwise one failed check in between would hide a price rise
  // or stock-out from the alerts entirely.
  const { data: prevSnapshots } = await supabase
    .from('snapshots')
    .select('*')
    .eq('tracked_product_id', product.id)
    .or('price.not.is.null,in_stock.not.is.null')
    .order('checked_at', { ascending: false })
    .limit(1);

  const prev = prevSnapshots?.[0];

  const { data: inserted } = await supabase
    .from('snapshots')
    .insert({
      tracked_product_id: product.id,
      price: result.price ?? null,
      currency: result.currency ?? null,
      in_stock: result.inStock ?? null,
      raw_status: result.rawStatus.slice(0, 500),
    })
    .select()
    .single();

  // Record the attempt so the scheduled run checks the longest-waiting
  // products first, and save the page's title/image when we have them.
  const productUpdate: Record<string, unknown> = { last_checked_at: new Date().toISOString() };
  if (result.ok && (result.title || result.imageUrl)) {
    productUpdate.title = result.title ?? product.title;
    productUpdate.image_url = result.imageUrl;
  }
  await supabase.from('tracked_products').update(productUpdate).eq('id', product.id);

  if (!prev || !result.ok) {
    return { snapshot: inserted, alertSent: false, scrapeOk: result.ok };
  }

  const currency = result.currency ?? prev.currency ?? null;
  const money = (v: number) => formatMoney(v, currency);
  const found: { type: AlertType; message: string }[] = [];

  if (prev.price != null && result.price != null && prev.price !== result.price) {
    const pctChange = ((result.price - prev.price) / prev.price) * 100;
    if (Math.abs(pctChange) >= product.alert_threshold_percent) {
      found.push({
        type: pctChange > 0 ? 'price_up' : 'price_down',
        message: `Price changed from ${money(prev.price)} to ${money(result.price)} (${
          pctChange > 0 ? '+' : ''
        }${pctChange.toFixed(1)}%).`,
      });
    }
  }

  if (prev.in_stock === true && result.inStock === false) {
    found.push({ type: 'out_of_stock', message: 'This product just went out of stock.' });
  } else if (prev.in_stock === false && result.inStock === true) {
    found.push({ type: 'back_in_stock', message: 'This product is back in stock.' });
  }

  // Margin erosion: only fire the moment margin crosses the threshold
  // (not on every check while it stays low). Shipping and fees count as cost.
  const sellPrice = product.sell_price;
  const extra = product.extra_cost ?? 0;
  const marginAlertPercent = product.margin_alert_percent ?? 20;
  if (sellPrice != null && sellPrice > 0 && result.price != null) {
    const marginPercent = ((sellPrice - result.price - extra) / sellPrice) * 100;
    const prevMarginPercent =
      prev.price != null ? ((sellPrice - prev.price - extra) / sellPrice) * 100 : null;

    if (
      marginPercent <= marginAlertPercent &&
      (prevMarginPercent === null || prevMarginPercent > marginAlertPercent)
    ) {
      found.push({
        type: 'margin_below_threshold',
        message:
          `Your margin on this product just dropped to ${marginPercent.toFixed(1)}% ` +
          `(supplier price ${money(result.price)}${extra ? ` plus ${money(extra)} shipping and fees` : ''} ` +
          `vs. your sell price ${money(sellPrice)}), at or below your ${marginAlertPercent}% alert line.`,
      });
    }
  }

  if (found.length === 0) {
    return { snapshot: inserted, alertSent: false, scrapeOk: true };
  }

  // One alert row per change, so the history keeps every type; one email covering all of them.
  await supabase
    .from('alerts')
    .insert(found.map((f) => ({ tracked_product_id: product.id, type: f.type, message: f.message })));

  const message = found.map((f) => f.message).join(' ');
  const sent = await sendAlertEmail({
    to: product.user_email,
    productTitle: product.title || 'Tracked product',
    productUrl: product.source_url,
    message,
  });
  if (!sent) {
    Sentry.captureMessage(`Alert email not sent for tracked product ${product.id}`, {
      level: 'error',
      extra: { productId: product.id, types: found.map((f) => f.type) },
    });
  }

  return { snapshot: inserted, alertSent: sent, scrapeOk: true };
}
