import type { CheerioAPI } from 'cheerio';
import type { ScrapeResult } from './scraper';
import { cleanCurrency, cleanImageUrl, cleanPrice, cleanTitle, parseMoney } from './scrapeValues';

// Readers for big suppliers whose pages don't carry standard product data
// (or carry a misleading one). Each returns null when it can't find a price,
// so the general readers in scraper.ts get their turn.

// The country a site is for, from its domain (amazon.co.uk -> GB). Used to
// browse as a local visitor, since some sites hide prices from other countries.
export function countryForUrl(rawUrl: string): string {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return 'US';
  }
  if (host.endsWith('.uk') || host.startsWith('uk.')) return 'GB';
  const tld = host.split('.').pop() ?? '';
  const known = ['de', 'fr', 'it', 'es', 'nl', 'ie', 'be', 'at', 'ch', 'se', 'pl', 'ca', 'au', 'nz', 'jp', 'mx', 'br', 'in'];
  return known.includes(tld) ? tld.toUpperCase() : 'US';
}

const COUNTRY_CURRENCY: Record<string, string> = {
  GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', IE: 'EUR', BE: 'EUR', AT: 'EUR',
  CH: 'CHF', SE: 'SEK', PL: 'PLN', CA: 'CAD', AU: 'AUD', NZ: 'NZD', JP: 'JPY', MX: 'MXN', BR: 'BRL', IN: 'INR', US: 'USD',
};

function hostOf(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function parseKnownSite($: CheerioAPI, url: string): ScrapeResult | null {
  const host = hostOf(url);
  if (/(^|\.)amazon\.[a-z.]+$/.test(host)) return parseAmazon($, url);
  if (/(^|\.)banggood\.com$/.test(host)) return parseBanggood($);
  if (/(^|\.)walmart\.com$/.test(host)) return parseWalmart($);
  return null;
}

// Amazon keeps the buy-box price in a small JSON block; the visible price
// spans are the fallback. The currency is the store's own.
function parseAmazon($: CheerioAPI, url: string): ScrapeResult | null {
  let price: number | undefined;
  try {
    const data = JSON.parse($('.twister-plus-buying-options-price-data').first().text());
    const offers: any[] = data?.desktop_buybox_group_1 ?? Object.values(data ?? {}).find(Array.isArray) ?? [];
    price = cleanPrice(offers[0]?.priceAmount);
  } catch {
    // No price block on this page; try the visible price instead.
  }
  if (price === undefined) {
    const shown = $('#corePrice_feature_div .a-offscreen, #corePriceDisplay_desktop_feature_div .a-offscreen, #apex_desktop .a-offscreen')
      .map((_, el) => $(el).text().trim())
      .get()
      .find(Boolean);
    price = parseMoney(shown).price;
  }
  if (price === undefined) return null;

  const availability = $('#availability').clone().find('script, style').remove().end().text().replace(/\s+/g, ' ').toLowerCase();
  const inStock = /in stock|left in stock/.test(availability)
    ? true
    : /currently unavailable|out of stock/.test(availability)
      ? false
      : undefined;

  return {
    ok: true,
    title: cleanTitle($('#productTitle').text()),
    imageUrl: cleanImageUrl($('#landingImage').attr('data-old-hires') || $('#landingImage').attr('src')),
    price,
    currency: COUNTRY_CURRENCY[countryForUrl(url)],
    inStock,
    rawStatus: 'Read from the Amazon price block',
  };
}

// Banggood's main price element carries the product's own price; other price
// tags on the page belong to recommended products.
function parseBanggood($: CheerioAPI): ScrapeResult | null {
  const el = $('.main-price').first();
  if (!el.length) return null;
  const shown = parseMoney(el.text());
  const price = shown.price ?? cleanPrice(el.attr('oriprice'));
  if (price === undefined) return null;
  return {
    ok: true,
    title: cleanTitle($('meta[property="og:title"]').attr('content')),
    imageUrl: cleanImageUrl($('meta[property="og:image"]').attr('content')),
    price,
    currency: shown.currency ?? 'USD',
    inStock: stockFromText($('.stock-status').first().text()),
    rawStatus: 'Read from the Banggood price',
  };
}

// Walmart keeps the product's own price and stock in its page data. An item
// that's out of stock has no current price, but its stock status still counts
// as a reading (so the out-of-stock alert goes out).
function parseWalmart($: CheerioAPI): ScrapeResult | null {
  let product: any;
  try {
    product = JSON.parse($('#__NEXT_DATA__').first().text())?.props?.pageProps?.initialData?.data?.product;
  } catch {
    return null;
  }
  if (!product) return null;

  const current = product.priceInfo?.currentPrice;
  const price = cleanPrice(current?.price);
  const status = String(product.availabilityStatus ?? '').toUpperCase();
  const inStock = status === 'IN_STOCK' ? true : status === 'OUT_OF_STOCK' ? false : undefined;
  if (price === undefined && inStock !== false) return null;

  return {
    ok: true,
    title: cleanTitle(product.name),
    imageUrl: cleanImageUrl(product.imageInfo?.thumbnailUrl),
    price,
    currency: price === undefined ? undefined : cleanCurrency(current?.currencyUnit) ?? 'USD',
    inStock,
    rawStatus: price === undefined ? 'Walmart shows this item as out of stock' : 'Read from the Walmart product data',
  };
}

function stockFromText(text: string): boolean | undefined {
  const t = text.replace(/\s+/g, ' ').toLowerCase();
  if (/out of stock|sold out|unavailable/.test(t)) return false;
  if (/in stock/.test(t)) return true;
  return undefined;
}
