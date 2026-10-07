import * as cheerio from 'cheerio';
import { assertPublicHttpUrl } from './urlSafety';
import { BlockedUrlError, safeGet } from './safeFetch';

export type ScrapeResult = {
  ok: boolean;
  title?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  inStock?: boolean;
  rawStatus: string;
  // The URL itself was refused by the safety check (not a site problem).
  blocked?: boolean;
};

// Product pages are rarely over 1-2 MB; anything past this is ignored.
const MAX_PAGE_BYTES = 3 * 1024 * 1024;

// A normal desktop browser's User-Agent. Many sites block requests that
// don't look like they came from a real browser.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function scrapeProductPage(url: string): Promise<ScrapeResult> {
  try {
    await assertPublicHttpUrl(url);
  } catch (err: any) {
    return { ok: false, blocked: true, rawStatus: err?.message || 'This URL is not allowed' };
  }

  const direct = await fetchDirect(url);
  if (direct.ok || direct.blocked) return direct;

  // Many suppliers (AliExpress in particular) block plain server-side
  // fetches outright. If a Firecrawl key is configured, retry through it -
  // it renders a real browser session, which copes with pages that need
  // JavaScript. It deliberately uses Firecrawl's basic proxy, not its
  // anti-bot "stealth" mode: if a site actively blocks automated checks we
  // report that honestly rather than trying to get around it.
  if (process.env.FIRECRAWL_API_KEY) {
    const viaFirecrawl = await fetchViaFirecrawl(url);
    if (viaFirecrawl) return viaFirecrawl;
  }

  return direct;
}

async function fetchDirect(url: string): Promise<ScrapeResult> {
  try {
    // Follow redirects ourselves and re-check every hop, so a public URL can't
    // bounce the scraper on to a private or cloud-metadata address. safeGet
    // also checks the address it actually connects to.
    let target = url;
    // Don't let a slow/stuck page hang the whole check run.
    const signal = AbortSignal.timeout(15000);
    for (let hop = 0; hop <= 5; hop++) {
      if (hop > 0) await assertPublicHttpUrl(target);
      const res = await safeGet(target, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal,
        maxBytes: MAX_PAGE_BYTES,
      });
      if (res.location) {
        target = new URL(res.location, target).toString();
        continue;
      }
      if (res.body === null) {
        return { ok: false, rawStatus: `Fetch failed with status ${res.status}` };
      }
      return parseProductHtml(res.body);
    }
    return { ok: false, rawStatus: 'The page redirected too many times' };
  } catch (err: any) {
    if (err instanceof BlockedUrlError || err?.message === 'This URL is not allowed') {
      return { ok: false, blocked: true, rawStatus: 'This URL is not allowed' };
    }
    return {
      ok: false,
      rawStatus: `Error fetching page: ${String(err?.message || 'unknown error').slice(0, 200)}`,
    };
  }
}

async function fetchViaFirecrawl(url: string): Promise<ScrapeResult | null> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['rawHtml'],
        proxy: 'basic',
        location: { country: 'US' },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;
    if (Number(res.headers.get('content-length') || 0) > 4 * MAX_PAGE_BYTES) return null;

    const body = await res.json();
    const html = body?.data?.rawHtml;
    if (!html) return null;

    const result = parseProductHtml(String(html).slice(0, MAX_PAGE_BYTES));
    if (!result.ok) return null;

    return { ...result, rawStatus: `${result.rawStatus} (via Firecrawl fallback)` };
  } catch {
    return null;
  }
}

function parseProductHtml(html: string): ScrapeResult {
  const $ = cheerio.load(html);

  // Strategy 1: schema.org structured product data. Most e-commerce
  // platforms embed this, and it's far more stable than parsing the
  // visual page layout.
  const ldJsonResult = parseLdJson($);
  if (ldJsonResult) return ldJsonResult;

  // Strategy 2: fall back to Open Graph tags + a loose price pattern
  // search across the raw page source.
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  const priceMatch = html.match(/"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/i);
  const stockMatch = html.match(/"availability"\s*:\s*"[^"]*(InStock|OutOfStock)[^"]*"/i);

  const fallbackPrice = priceMatch ? cleanPrice(priceMatch[1]) : undefined;
  if (fallbackPrice !== undefined) {
    return {
      ok: true,
      title: cleanTitle(ogTitle),
      imageUrl: cleanImageUrl(ogImage),
      price: fallbackPrice,
      inStock: stockMatch ? stockMatch[1] === 'InStock' : undefined,
      rawStatus: 'Parsed via fallback pattern match',
    };
  }

  return {
    ok: false,
    title: cleanTitle(ogTitle),
    imageUrl: cleanImageUrl(ogImage),
    rawStatus:
      'Could not find price data on this page. The site may have changed its layout or blocked the request.',
  };
}

function parseLdJson($: cheerio.CheerioAPI): ScrapeResult | null {
  const scripts = $('script[type="application/ld+json"]');

  for (let i = 0; i < scripts.length; i++) {
    try {
      const raw = $(scripts[i]).html();
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const c of candidates) {
        const node = c['@graph']
          ? c['@graph'].find((g: any) => g['@type'] === 'Product')
          : c;

        const isProduct =
          node && (node['@type'] === 'Product' || node['@type']?.includes?.('Product'));

        if (isProduct) {
          const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
          const price = cleanPrice(offers?.price);
          const currency = cleanCurrency(offers?.priceCurrency);
          const availability = typeof offers?.availability === 'string' ? offers.availability : undefined;
          const inStock = availability ? availability.toLowerCase().includes('instock') : undefined;
          const image = Array.isArray(node.image) ? node.image[0] : node.image;

          return {
            ok: price !== undefined,
            title: cleanTitle(node.name),
            imageUrl: cleanImageUrl(typeof image === 'object' && image ? image.url : image),
            price,
            currency,
            inStock,
            rawStatus: 'Parsed via structured product data (ld+json)',
          };
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

// Everything below comes from the supplier's page, so it's checked before
// it's stored, shown on the dashboard or put in an email.
function cleanPrice(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const n = parseFloat(String(value));
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? n : undefined;
}

function cleanCurrency(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : undefined;
}

function cleanTitle(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const title = value.replace(/\s+/g, ' ').trim().slice(0, 300);
  return title || undefined;
}

function cleanImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
