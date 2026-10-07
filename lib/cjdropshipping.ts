import type { ScrapeResult } from './scraper';

// CJdropshipping shows automated visitors a "Human verification" page
// instead of the product, so CJ links are read through CJ's official API
// (developers.cjdropshipping.com). Needs CJ_API_KEY, copied from the CJ
// account under Authorization -> API.

const API_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

export function cjConfigured(): boolean {
  return Boolean(process.env.CJ_API_KEY);
}

function isCjHost(hostname: string): boolean {
  return /(^|\.)cjdropshipping\.com$/.test(hostname.toLowerCase());
}

export function isCjUrl(rawUrl: string): boolean {
  try {
    return isCjHost(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

const PID = '([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}|\\d{10,25})';

// Pulls the CJ product ID out of a product link: desktop
// (/product/<name>-p-<id>.html), mobile (/product/details/<id>) or ?id=.
export function cjProductIdFromUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!isCjHost(url.hostname)) return null;
  const path = url.pathname.match(new RegExp(`-p-${PID}\\.html$`)) ?? url.pathname.match(new RegExp(`/product/details/${PID}/?$`));
  if (path) return path[1];
  const query = url.searchParams.get('id') ?? url.searchParams.get('pid');
  return query && new RegExp(`^${PID}$`).test(query) ? query : null;
}

// One access token lasts 180 days and CJ hands back the same token for 24
// hours, so it's kept for the life of the server instance (capped at a day).
let cachedToken: { token: string; expires: number } | null = null;

async function cjFetch(path: string, init: RequestInit): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, signal: AbortSignal.timeout(15000) });
  return res.json();
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token;
  const request = () =>
    cjFetch('/authentication/getAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
    });
  let body = await request();
  // The token endpoint allows one call per second.
  if (body?.code === 1600200) {
    await new Promise((r) => setTimeout(r, 1100));
    body = await request();
  }
  const token = body?.data?.accessToken;
  if (!body?.result || typeof token !== 'string') {
    throw new Error(`CJ login failed: ${String(body?.message || 'unknown error').slice(0, 150)}`);
  }
  const expiry = Date.parse(body.data.accessTokenExpiryDate);
  cachedToken = { token, expires: Math.min(Number.isFinite(expiry) ? expiry : Infinity, Date.now() + 24 * 3600 * 1000) };
  return token;
}

function toPrice(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const n = parseFloat(String(value));
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? n : undefined;
}

export async function fetchCjProduct(pid: string): Promise<ScrapeResult> {
  let body: any;
  try {
    const query = async () =>
      cjFetch(`/product/query?pid=${encodeURIComponent(pid)}`, {
        headers: { 'CJ-Access-Token': await getAccessToken() },
      });
    body = await query();
    // Token revoked or expired early: log in again once.
    if (body?.code === 1600001 || body?.code === 1600002) {
      cachedToken = null;
      body = await query();
    }
  } catch (err: any) {
    return { ok: false, rawStatus: `CJ API request failed: ${String(err?.message || 'unknown error').slice(0, 150)}` };
  }

  const product = body?.data;
  if (!body?.result || !product) {
    return {
      ok: false,
      rawStatus:
        body?.code === 1602001
          ? 'CJ did not return this product. It may have been removed from CJ.'
          : `CJ API error: ${String(body?.message || body?.code || 'unknown').slice(0, 150)}`,
    };
  }

  // A product with several variants (colours, sizes) is tracked at its
  // cheapest variant price, i.e. the "from" price CJ shows on the listing.
  const variants: any[] = Array.isArray(product.variants) ? product.variants : [];
  const variantPrices = variants.map((v) => toPrice(v?.variantSellPrice)).filter((p): p is number => p !== undefined);
  const price = variantPrices.length > 0 ? Math.min(...variantPrices) : toPrice(product.sellPrice);

  const inventories = variants.flatMap((v) => (Array.isArray(v?.inventories) ? v.inventories : []));
  const inStock =
    inventories.length > 0 ? inventories.some((i: any) => Number(i?.totalInventory) > 0) : undefined;

  const title =
    typeof product.productNameEn === 'string' ? product.productNameEn.replace(/\s+/g, ' ').trim().slice(0, 300) : undefined;
  const image =
    typeof product.bigImage === 'string' && /^https?:\/\//i.test(product.bigImage) ? product.bigImage.slice(0, 2048) : undefined;

  if (price === undefined) {
    return { ok: false, title, imageUrl: image, rawStatus: 'CJ returned this product without a price.' };
  }

  return {
    ok: true,
    title: title || undefined,
    imageUrl: image,
    price,
    currency: 'USD',
    inStock,
    rawStatus: 'Read via the CJdropshipping API',
  };
}
