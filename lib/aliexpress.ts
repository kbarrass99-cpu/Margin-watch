import { createHmac } from 'crypto';
import { safeGet } from './safeFetch';
import type { ScrapeResult } from './scraper';

// AliExpress shows automated visitors a robot check instead of the product
// page, so AliExpress links are read through its official Affiliate API
// (AliExpress Open Platform) instead. Needs ALIEXPRESS_APP_KEY and
// ALIEXPRESS_APP_SECRET; ALIEXPRESS_TRACKING_ID is optional.

const API_URL = 'https://api-sg.aliexpress.com/sync';

// aliexpress.us item IDs are the global ID plus 2^51.
const US_ID_OFFSET = BigInt(2) ** BigInt(51);

export function aliexpressConfigured(): boolean {
  return Boolean(process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_APP_SECRET);
}

function isAliExpressHost(hostname: string): boolean {
  return /(^|\.)aliexpress\.[a-z]{2,3}$/.test(hostname.toLowerCase());
}

export function isAliExpressUrl(rawUrl: string): boolean {
  try {
    return isAliExpressHost(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

// Pulls the product ID out of an AliExpress product URL (desktop, mobile,
// country sites, or ?productId=). Returns null for anything else.
export function productIdFromUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!isAliExpressHost(url.hostname)) return null;
  const match = url.pathname.match(/\/(?:item|i)\/(?:[^/]*\/)?(\d{6,20})\.html/) ?? null;
  const id = match?.[1] ?? url.searchParams.get('productId') ?? url.searchParams.get('product_id');
  if (!id || !/^\d{6,20}$/.test(id)) return null;
  const n = BigInt(id);
  return (url.hostname.endsWith('aliexpress.us') && n > US_ID_OFFSET ? n - US_ID_OFFSET : n).toString();
}

// Short share links (a.aliexpress.com/_xxx, s.click.aliexpress.com/e/_xxx)
// redirect to the product page; follow a few hops to find the product ID.
export async function resolveProductId(rawUrl: string): Promise<string | null> {
  let target = rawUrl;
  const signal = AbortSignal.timeout(10000);
  for (let hop = 0; hop <= 5; hop++) {
    const id = productIdFromUrl(target);
    if (id) return id;
    if (!isAliExpressUrl(target)) return null;
    try {
      const res = await safeGet(target, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal, maxBytes: 0 });
      if (!res.location) return null;
      target = new URL(res.location, target).toString();
    } catch {
      return null;
    }
  }
  return null;
}

// AliExpress Open Platform request signing (business interfaces): sort
// every parameter by name, concatenate name+value, HMAC-SHA256 with the
// app secret, upper-case hex.
export function signParams(params: Record<string, string>, secret: string): string {
  const base = Object.keys(params)
    .sort()
    .filter((k) => params[k] !== '')
    .map((k) => `${k}${params[k]}`)
    .join('');
  return createHmac('sha256', secret).update(base, 'utf8').digest('hex').toUpperCase();
}

type ApiProduct = {
  product_title?: string;
  product_main_image_url?: string;
  target_sale_price?: string | number;
  target_sale_price_currency?: string;
  sale_price?: string | number;
  sale_price_currency?: string;
};

function firstProduct(body: any): ApiProduct | null {
  const result = body?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result;
  const list = result?.products?.product ?? result?.products;
  return Array.isArray(list) && list.length > 0 ? list[0] : null;
}

export async function fetchAliExpressProduct(productId: string): Promise<ScrapeResult> {
  const params: Record<string, string> = {
    method: 'aliexpress.affiliate.productdetail.get',
    app_key: process.env.ALIEXPRESS_APP_KEY!,
    sign_method: 'sha256',
    timestamp: Date.now().toString(),
    format: 'json',
    v: '2.0',
    product_ids: productId,
    target_currency: 'USD',
    target_language: 'EN',
    country: 'US',
    tracking_id: process.env.ALIEXPRESS_TRACKING_ID || '',
  };
  if (!params.tracking_id) delete params.tracking_id;
  params.sign = signParams(params, process.env.ALIEXPRESS_APP_SECRET!);

  let body: any;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(15000),
    });
    body = await res.json();
  } catch (err: any) {
    return { ok: false, rawStatus: `AliExpress API request failed: ${String(err?.message || 'unknown error').slice(0, 150)}` };
  }

  if (body?.error_response) {
    const { code, msg } = body.error_response;
    return { ok: false, rawStatus: `AliExpress API error: ${String(msg || code || 'unknown').slice(0, 200)}` };
  }
  const respCode = body?.aliexpress_affiliate_productdetail_get_response?.resp_result?.resp_code;
  const product = firstProduct(body);
  if (!product) {
    return {
      ok: false,
      rawStatus:
        respCode && respCode !== 200
          ? `AliExpress API error ${respCode}: ${String(body?.aliexpress_affiliate_productdetail_get_response?.resp_result?.resp_msg || '').slice(0, 150)}`
          : 'AliExpress did not return this product. It may have been removed, or it is not available through the AliExpress API.',
    };
  }

  const rawPrice = product.target_sale_price ?? product.sale_price;
  const price = rawPrice !== undefined ? parseFloat(String(rawPrice)) : NaN;
  const currency = String(product.target_sale_price ? product.target_sale_price_currency : product.sale_price_currency || '')
    .trim()
    .toUpperCase();
  const title = typeof product.product_title === 'string' ? product.product_title.replace(/\s+/g, ' ').trim().slice(0, 300) : undefined;
  const image =
    typeof product.product_main_image_url === 'string' && /^https?:\/\//i.test(product.product_main_image_url)
      ? product.product_main_image_url.slice(0, 2048)
      : undefined;

  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, title, imageUrl: image, rawStatus: 'AliExpress returned this product without a price.' };
  }

  return {
    ok: true,
    title: title || undefined,
    imageUrl: image,
    price,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : undefined,
    // The Affiliate API doesn't report stock, so stock is left unknown.
    rawStatus: 'Read via the AliExpress API',
  };
}
