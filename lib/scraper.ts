import * as cheerio from 'cheerio';
import { assertPublicHttpUrl } from './urlSafety';
import { BlockedUrlError, safeGet } from './safeFetch';
import { aliexpressConfigured, fetchAliExpressProduct, isAliExpressUrl, resolveProductId } from './aliexpress';
import { cjConfigured, cjProductIdFromUrl, fetchCjProduct, isCjUrl } from './cjdropshipping';
import { countryForUrl, parseKnownSite } from './supplierParsers';
import { unsupportedSupplierMessage } from './suppliers';
import { cleanCurrency, cleanImageUrl, cleanPrice, cleanTitle, parseMoney } from './scrapeValues';

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

// Signs that a site served a bot check / CAPTCHA page instead of the product.
const ROBOT_CHECK = /captcha|are you a robot|check if you are a robot|not a robot|human verification|unusual traffic|x5secdata|_____tmd_____/i;
const ROBOT_CHECK_STATUS = 'This supplier showed a robot check instead of the product page, so the price could not be read.';
const DEAD_LINK_STATUS = "The supplier says this page doesn't exist any more. The product may have been removed: check the link still opens.";

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

  // Suppliers that can't be read at all: say so instead of failing every check.
  const unsupported = unsupportedSupplierMessage(url);
  if (unsupported) return { ok: false, rawStatus: unsupported };

  // AliExpress blocks automated page visits with a robot check, so its
  // products are read through the official AliExpress API when configured.
  if (isAliExpressUrl(url) && aliexpressConfigured()) {
    const productId = await resolveProductId(url);
    if (productId) return fetchAliExpressProduct(productId);
    return { ok: false, rawStatus: "This doesn't look like an AliExpress product link. Use the link to the product's own page." };
  }

  // CJdropshipping does the same, so CJ products go through CJ's API.
  if (isCjUrl(url) && cjConfigured()) {
    const pid = cjProductIdFromUrl(url);
    if (pid) return fetchCjProduct(pid);
    return { ok: false, rawStatus: "This doesn't look like a CJdropshipping product link. Use the link to the product's own page." };
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
    // A robot check or missing page reported by Firecrawl says more than the
    // plain fetch's failure.
    if (viaFirecrawl && (viaFirecrawl.ok || [ROBOT_CHECK_STATUS, DEAD_LINK_STATUS].includes(viaFirecrawl.rawStatus))) {
      return viaFirecrawl;
    }
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
      if (res.status === 404 || res.status === 410) return { ok: false, rawStatus: DEAD_LINK_STATUS };
      if (res.body === null) {
        return { ok: false, rawStatus: `Fetch failed with status ${res.status}` };
      }
      return parseProductHtml(res.body, target);
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
        // Browse as a local visitor: some shops hide prices from other countries.
        location: { country: countryForUrl(url) },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;
    if (Number(res.headers.get('content-length') || 0) > 4 * MAX_PAGE_BYTES) return null;

    const body = await res.json();
    // Firecrawl returns the page even when the shop answered with an error.
    // Error pages are full of other products' prices, so never read them.
    const status = Number(body?.data?.metadata?.statusCode) || 200;
    if (status === 404 || status === 410) return { ok: false, rawStatus: DEAD_LINK_STATUS };
    if (status >= 400) return null;

    const html = body?.data?.rawHtml;
    if (!html) return null;

    const result = parseProductHtml(String(html).slice(0, MAX_PAGE_BYTES), url);
    if (!result.ok) return result;

    return { ...result, rawStatus: `${result.rawStatus} (via Firecrawl fallback)` };
  } catch {
    return null;
  }
}

function parseProductHtml(html: string, url: string): ScrapeResult {
  const $ = cheerio.load(html);

  // Readers are tried from most to least precise. A wrong price is worse
  // than no price (it can send a false alert), so the loose pattern match
  // at the end only accepts a page with one unambiguous price.
  const result =
    parseKnownSite($, html, url) ??
    // Schema.org product data: most shops embed it, and it's far more stable
    // than the visual layout.
    parseLdJson($) ??
    parseMicrodata($) ??
    parseMetaPrice($) ??
    parseSinglePrice($, html);
  if (result) return result;

  return {
    ok: false,
    title: cleanTitle($('meta[property="og:title"]').attr('content')),
    imageUrl: cleanImageUrl($('meta[property="og:image"]').attr('content')),
    rawStatus: ROBOT_CHECK.test(html)
      ? ROBOT_CHECK_STATUS
      : 'Could not find price data on this page. The site may have changed its layout or blocked the request.',
  };
}

function pageTitle($: cheerio.CheerioAPI): string | undefined {
  return cleanTitle($('meta[property="og:title"]').attr('content') || $('title').first().text());
}

function pageImage($: cheerio.CheerioAPI): string | undefined {
  return cleanImageUrl($('meta[property="og:image"]').attr('content'));
}

// Schema.org microdata: <span itemprop="price" content="3.54">. The first one
// on the page is the product's own; later ones belong to recommendations.
function parseMicrodata($: cheerio.CheerioAPI): ScrapeResult | null {
  const el = $('[itemprop="price"]').first();
  if (!el.length) return null;
  const shown = parseMoney(el.attr('content') ?? el.text());
  if (shown.price === undefined) return null;
  const currencyEl = $('[itemprop="priceCurrency"]').first();
  const availability = String($('[itemprop="availability"]').first().attr('href') ?? $('[itemprop="availability"]').first().attr('content') ?? '');
  return {
    ok: true,
    title: pageTitle($),
    imageUrl: pageImage($),
    price: shown.price,
    currency: cleanCurrency(currencyEl.attr('content') ?? currencyEl.text()) ?? shown.currency,
    inStock: /instock/i.test(availability) ? true : /outofstock/i.test(availability) ? false : undefined,
    rawStatus: 'Parsed via product price tag (microdata)',
  };
}

// <meta property="product:price:amount" content="..."> (Open Graph product tags).
function parseMetaPrice($: cheerio.CheerioAPI): ScrapeResult | null {
  const price = cleanPrice($('meta[property="product:price:amount"], meta[property="og:price:amount"]').first().attr('content'));
  if (price === undefined) return null;
  return {
    ok: true,
    title: pageTitle($),
    imageUrl: pageImage($),
    price,
    currency: cleanCurrency($('meta[property="product:price:currency"], meta[property="og:price:currency"]').first().attr('content')),
    rawStatus: 'Parsed via product price tags (meta)',
  };
}

// Last resort: a "price" value in the page source, used only when every one
// on the page is the same, i.e. there are no other products' prices to mix up.
function parseSinglePrice($: cheerio.CheerioAPI, html: string): ScrapeResult | null {
  const prices = new Set<number>();
  for (const m of html.matchAll(/"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/gi)) {
    const p = cleanPrice(m[1]);
    if (p !== undefined) prices.add(p);
    if (prices.size > 1) return null;
  }
  if (prices.size !== 1) return null;
  const stockMatch = html.match(/"availability"\s*:\s*"[^"]*(InStock|OutOfStock)[^"]*"/i);
  return {
    ok: true,
    title: pageTitle($),
    imageUrl: pageImage($),
    price: [...prices][0],
    inStock: stockMatch ? stockMatch[1] === 'InStock' : undefined,
    rawStatus: 'Parsed via fallback pattern match',
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
          const price = cleanPrice(offers?.price ?? offers?.lowPrice);
          // No price here (e.g. "choose an option" pages): let the other readers try.
          if (price === undefined) continue;
          const currency = cleanCurrency(offers?.priceCurrency);
          const availability = typeof offers?.availability === 'string' ? offers.availability : undefined;
          const inStock = availability ? availability.toLowerCase().includes('instock') : undefined;
          const image = Array.isArray(node.image) ? node.image[0] : node.image;

          return {
            ok: true,
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
