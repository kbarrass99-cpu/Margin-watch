import type { ScrapeResult } from './scraper';

// eBay listings are read through eBay's official Browse API when it's set up
// (developer.ebay.com, a Production keyset): exact price and stock, and it
// can't be blocked the way page reading can. Needs EBAY_CLIENT_ID and
// EBAY_CLIENT_SECRET. Without them, or if the API has a problem, eBay links
// fall back to reading the listing page, which also works.

const API_BASE = 'https://api.ebay.com';

export function ebayConfigured(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

// eBay site -> marketplace, so prices come back as that site shows them.
const MARKETPLACES: Record<string, string> = {
  'ebay.com': 'EBAY_US',
  'ebay.co.uk': 'EBAY_GB',
  'ebay.de': 'EBAY_DE',
  'ebay.fr': 'EBAY_FR',
  'ebay.it': 'EBAY_IT',
  'ebay.es': 'EBAY_ES',
  'ebay.com.au': 'EBAY_AU',
  'ebay.ca': 'EBAY_CA',
  'ebay.ie': 'EBAY_IE',
  'ebay.at': 'EBAY_AT',
  'ebay.ch': 'EBAY_CH',
  'ebay.nl': 'EBAY_NL',
  'ebay.be': 'EBAY_BE',
  'ebay.pl': 'EBAY_PL',
};

function marketplaceFor(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/^(www|m)\./, '');
  return MARKETPLACES[host] ?? null;
}

export function isEbayUrl(rawUrl: string): boolean {
  try {
    return marketplaceFor(new URL(rawUrl).hostname) !== null;
  } catch {
    return false;
  }
}

// The listing number from /itm/<number> or /itm/<title>/<number> (or ?item=).
export function ebayItemIdFromUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!marketplaceFor(url.hostname)) return null;
  const path = url.pathname.match(/\/itm\/(?:[^/]+\/)?(\d{9,15})\/?$/);
  if (path) return path[1];
  const query = url.searchParams.get('item');
  return query && /^\d{9,15}$/.test(query) ? query : null;
}

// Application tokens last two hours; one is reused until shortly before then.
let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token;
  const credentials = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${API_BASE}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'https://api.ebay.com/oauth/api_scope' }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body?.access_token !== 'string') {
    throw new Error(`eBay login failed: ${String(body?.error_description || body?.error || res.status).slice(0, 150)}`);
  }
  const seconds = Number(body.expires_in) || 7200;
  cachedToken = { token: body.access_token, expires: Date.now() + (seconds - 300) * 1000 };
  return cachedToken.token;
}

async function browse(path: string, marketplace: string): Promise<{ status: number; body: any }> {
  const request = async () =>
    fetch(`${API_BASE}/buy/browse/v1${path}`, {
      headers: { Authorization: `Bearer ${await getAccessToken()}`, 'X-EBAY-C-MARKETPLACE-ID': marketplace },
      signal: AbortSignal.timeout(15000),
    });
  let res = await request();
  // Token revoked or expired early: log in again once.
  if (res.status === 401) {
    cachedToken = null;
    res = await request();
  }
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

function toPrice(amount: any): { price: number; currency?: string } | null {
  const n = parseFloat(String(amount?.value ?? ''));
  if (!Number.isFinite(n) || n <= 0 || n >= 1e9) return null;
  const currency = typeof amount?.currency === 'string' && /^[A-Z]{3}$/.test(amount.currency) ? amount.currency : undefined;
  return { price: n, currency };
}

// IN_STOCK and LIMITED_STOCK can be bought; OUT_OF_STOCK can't.
function stockOf(item: any): boolean | undefined {
  const statuses: string[] = (Array.isArray(item?.estimatedAvailabilities) ? item.estimatedAvailabilities : [])
    .map((a: any) => String(a?.estimatedAvailabilityStatus ?? ''))
    .filter(Boolean);
  if (statuses.length === 0) return undefined;
  return statuses.some((s) => s === 'IN_STOCK' || s === 'LIMITED_STOCK');
}

function details(item: any): Pick<ScrapeResult, 'title' | 'imageUrl'> {
  const title = typeof item?.title === 'string' ? item.title.replace(/\s+/g, ' ').trim().slice(0, 300) : undefined;
  const image = item?.image?.imageUrl;
  return { title: title || undefined, imageUrl: typeof image === 'string' && /^https?:\/\//i.test(image) ? image.slice(0, 2048) : undefined };
}

// Reads a listing through the Browse API. Returns null when the API can't be
// used for it, so the caller reads the listing page instead.
export async function fetchEbayProduct(rawUrl: string): Promise<ScrapeResult | null> {
  const itemId = ebayItemIdFromUrl(rawUrl);
  const marketplace = marketplaceFor(new URL(rawUrl).hostname);
  if (!itemId || !marketplace) return null;

  try {
    const { status, body } = await browse(`/item/get_item_by_legacy_id?legacy_item_id=${itemId}`, marketplace);

    if (status === 200) {
      // Auctions without Buy It Now only have a current bid.
      const price = toPrice(body?.price) ?? toPrice(body?.currentBidPrice);
      if (!price) return null;
      return {
        ok: true,
        ...details(body),
        price: price.price,
        currency: price.currency,
        inStock: stockOf(body),
        rawStatus: 'Read via the eBay API',
      };
    }

    const errorIds: number[] = (Array.isArray(body?.errors) ? body.errors : []).map((e: any) => Number(e?.errorId));

    // A listing with variations (sizes, colours) is an "item group": track its
    // cheapest variation, like the "from" price eBay shows.
    if (errorIds.includes(11006)) {
      const group = await browse(`/item/get_items_by_item_group?item_group_id=${itemId}`, marketplace);
      const items: any[] = Array.isArray(group.body?.items) ? group.body.items : [];
      const priced = items
        .map((item) => ({ item, price: toPrice(item?.price) }))
        .filter((x): x is { item: any; price: { price: number; currency?: string } } => x.price !== null)
        .sort((a, b) => a.price.price - b.price.price);
      if (priced.length === 0) return null;
      const stock = items.map(stockOf).filter((s): s is boolean => s !== undefined);
      return {
        ok: true,
        ...details(priced[0].item),
        price: priced[0].price.price,
        currency: priced[0].price.currency,
        inStock: stock.length > 0 ? stock.some(Boolean) : undefined,
        rawStatus: 'Read via the eBay API (cheapest variation)',
      };
    }

    if (status === 404 || errorIds.includes(11001)) {
      return { ok: false, rawStatus: 'eBay says this listing has ended or been removed. Check the link still opens.' };
    }
    return null;
  } catch {
    return null;
  }
}
