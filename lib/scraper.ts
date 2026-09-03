import * as cheerio from 'cheerio';

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
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      // Don't let a slow/stuck page hang the whole check run.
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return { ok: false, rawStatus: `Fetch failed with status ${res.status}` };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Strategy 1: schema.org structured product data. Most e-commerce
    // platforms (including AliExpress product pages) embed this, and it's
    // far more stable than parsing the visual page layout.
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
  } catch (err: any) {
    return {
      ok: false,
      rawStatus: `Error fetching page: ${err?.message || 'unknown error'}`,
    };
  }
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
