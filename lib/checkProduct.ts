import type { SupabaseClient } from '@supabase/supabase-js';
import { scrapeProductPage } from './scraper';
import { sendAlertEmail } from './email';

type ProductForCheck = {
  id: string;
  source_url: string;
  title: string | null;
  user_email: string;
  alert_threshold_percent: number;
};

// This runs the whole "check one product" pipeline:
// scrape -> save a snapshot -> compare to the last snapshot -> alert if needed.
// It's used by both the manual "Check now" button and the scheduled cron job.
export async function checkOneProduct(supabase: SupabaseClient, product: ProductForCheck) {
  const result = await scrapeProductPage(product.source_url);

  const { data: prevSnapshots } = await supabase
    .from('snapshots')
    .select('*')
    .eq('tracked_product_id', product.id)
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
      raw_status: result.rawStatus,
    })
    .select()
    .single();

  // The first time we successfully read a page, save its title/image
  // so the dashboard has something nicer to show than a bare URL.
  if (result.ok && (result.title || result.imageUrl)) {
    await supabase
      .from('tracked_products')
      .update({
        title: result.title ?? product.title,
        image_url: result.imageUrl,
      })
      .eq('id', product.id);
  }

  if (!prev || !result.ok) {
    return { snapshot: inserted, alertSent: false };
  }

  const messages: string[] = [];
  let alertType: 'price_up' | 'price_down' | 'out_of_stock' | 'back_in_stock' | null = null;

  if (prev.price != null && result.price != null && prev.price !== result.price) {
    const pctChange = ((result.price - prev.price) / prev.price) * 100;
    if (Math.abs(pctChange) >= product.alert_threshold_percent) {
      alertType = pctChange > 0 ? 'price_up' : 'price_down';
      messages.push(
        `Price changed from $${prev.price.toFixed(2)} to $${result.price.toFixed(2)} (${
          pctChange > 0 ? '+' : ''
        }${pctChange.toFixed(1)}%).`
      );
    }
  }

  if (prev.in_stock === true && result.inStock === false) {
    alertType = 'out_of_stock';
    messages.push('This product just went out of stock.');
  } else if (prev.in_stock === false && result.inStock === true) {
    alertType = 'back_in_stock';
    messages.push('This product is back in stock.');
  }

  if (messages.length > 0 && alertType) {
    const message = messages.join(' ');

    await supabase.from('alerts').insert({
      tracked_product_id: product.id,
      type: alertType,
      message,
    });

    await sendAlertEmail({
      to: product.user_email,
      productTitle: product.title || 'Tracked product',
      productUrl: product.source_url,
      message,
    });

    return { snapshot: inserted, alertSent: true };
  }

  return { snapshot: inserted, alertSent: false };
}
