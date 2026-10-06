import * as cheerio from 'cheerio';
import { assertPublicHttpUrl } from './urlSafety';

export type ScrapeResult = {
  ok: boolean;
  title?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  inStock?: boolean;
  rawStatus: string;
};

// A normal desktop browser's User-Agent. Many sites block requests that
// don't look like they came from a real browser.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function scrapeProductPage(url: string): Promise<ScrapeResult> {
  try {
    await assertPublicHttpUrl(url);
  } catch (err: any) {
    return { ok: false, rawStatus: err?.message || 'This URL is not allowed' };
  }

  const direct = await fetchDirect(url);
  if (direct.ok) return direct;

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
    // bounce the scraper on to a private or cloud-metadata address.
    let target = url;
    let res: Response | null = null;
    // Don't let a slow/stuck page hang the whole check run.
    const signal = AbortSignal.timeout(15000);
    for (let hop = 0; hop <= 5; hop++) {
      if (hop > 0) await assertPublicHttpUrl(target);
      res = await fetch(target, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'manual',
        signal,
      });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (!location) break;
      target = new URL(location, target).toString();
      res = null;
    }
    if (!res) {
      return { ok: false, rawStatus: 'The page redirected too many times' };
    }

    if (!res.ok) {
      return { ok: false, rawStatus: `Fetch failed with status ${res.status}` };
    }

    return parseProductHtml(await res.text());
  } catch (err: any) {
    return {
      ok: false,
      rawStatus: `Error fetching page: ${err?.message || 'unknown error'}`,
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

    const body = await res.json();
    const html = body?.data?.rawHtml;
    if (!html) return null;

    const result = parseProductHtml(html);
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

  if (priceMatch) {
    return {
      ok: true,
      title: ogTitle,
      imageUrl: ogImage,
      price: parseFloat(priceMatch[1]),
      inStock: stockMatch ? stockMatch[1] === 'InStock' : undefined,
      rawStatus: 'Parsed via fallback pattern match',
    };
  }

  return {
    ok: false,
    title: ogTitle,
    imageUrl: ogImage,
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
          const price = offers?.price ? parseFloat(offers.price) : undefined;
          const currency = offers?.priceCurrency;
          const availability: string | undefined = offers?.availability;
          const inStock = availability ? availability.toLowerCase().includes('instock') : undefined;

          return {
            ok: price !== undefined,
            title: node.name,
            imageUrl: Array.isArray(node.image) ? node.image[0] : node.image,
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
