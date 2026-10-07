// Formats a price in the supplier's currency when we know it, e.g. "£12.40" or "€9.99".
// Falls back to "$" because most supplier pages we read are priced in US dollars.
const SYMBOLS: Record<string, string> = { USD: '$', GBP: '£', EUR: '€', CAD: 'CA$', AUD: 'A$', NZD: 'NZ$' };

// Only three-letter ISO codes are shown; anything else (including values a
// supplier page tried to sneak in) falls back to "$".
export function currencySymbol(currency: string | null | undefined): string {
  if (typeof currency !== 'string') return '$';
  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return '$';
  return SYMBOLS[code] ?? `${code} `;
}

export function formatMoney(value: number, currency?: string | null): string {
  return `${currency ? currencySymbol(currency) : '$'}${value.toFixed(2)}`;
}
