// Everything read from a supplier page is checked here before it's stored,
// shown on the dashboard or put in an email.

// A supplier price is never zero or negative; a zero almost always means the
// page didn't really contain a price (placeholders, "see options" and so on).
export function cleanPrice(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const n = parseFloat(String(value));
  return Number.isFinite(n) && n > 0 && n < 1e9 ? n : undefined;
}

export function cleanCurrency(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : undefined;
}

export function cleanTitle(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const title = value.replace(/\s+/g, ' ').trim().slice(0, 300);
  return title || undefined;
}

export function cleanImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

// Currency symbols as shops display them. A bare "$" is left out: it could be
// US, Canadian, Australian... dollars, so the caller decides.
const SYMBOLS: [RegExp, string][] = [
  [/US\s?\$/i, 'USD'],
  [/(CA|C)\s?\$/i, 'CAD'],
  [/(AU|A)\s?\$/i, 'AUD'],
  [/NZ\s?\$/i, 'NZD'],
  [/£/, 'GBP'],
  [/€/, 'EUR'],
  [/\b(USD|GBP|EUR|CAD|AUD|NZD)\b/, ''],
];

export function currencyFromText(text: string): string | undefined {
  for (const [pattern, code] of SYMBOLS) {
    const m = text.match(pattern);
    if (m) return code || m[1].toUpperCase();
  }
  return undefined;
}

// Reads the first amount from displayed text such as "Now $3.54",
// "US$31.49", "£1,299.00" or "12,99 €".
export function parseMoney(text: string | undefined): { price?: number; currency?: string } {
  if (!text) return {};
  const m = text.match(/\d{1,3}(?:[,.\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/);
  if (!m) return { currency: currencyFromText(text) };
  let n = m[0].replace(/\s/g, '');
  const lastSep = Math.max(n.lastIndexOf('.'), n.lastIndexOf(','));
  // The last separator is the decimal point when 1-2 digits follow it.
  if (lastSep >= 0 && n.length - lastSep - 1 <= 2) {
    n = n.slice(0, lastSep).replace(/[.,]/g, '') + '.' + n.slice(lastSep + 1);
  } else {
    n = n.replace(/[.,]/g, '');
  }
  return { price: cleanPrice(n), currency: currencyFromText(text) };
}
