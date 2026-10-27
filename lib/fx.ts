// Currencies a seller can price in, and conversion between them. Rates are
// units of each currency per 1 US dollar (European Central Bank reference
// rates), so any pair converts through USD.

export type Rates = Record<string, number>;

export const SELL_CURRENCIES = [
  { code: 'GBP', name: 'British pound' },
  { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'CAD', name: 'Canadian dollar' },
  { code: 'AUD', name: 'Australian dollar' },
  { code: 'NZD', name: 'New Zealand dollar' },
  { code: 'CHF', name: 'Swiss franc' },
  { code: 'SEK', name: 'Swedish krona' },
  { code: 'NOK', name: 'Norwegian krone' },
  { code: 'DKK', name: 'Danish krone' },
  { code: 'PLN', name: 'Polish złoty' },
  { code: 'CZK', name: 'Czech koruna' },
  { code: 'JPY', name: 'Japanese yen' },
  { code: 'SGD', name: 'Singapore dollar' },
  { code: 'HKD', name: 'Hong Kong dollar' },
  { code: 'INR', name: 'Indian rupee' },
  { code: 'MXN', name: 'Mexican peso' },
  { code: 'BRL', name: 'Brazilian real' },
  { code: 'ZAR', name: 'South African rand' },
] as const;

const CODES = new Set<string>(SELL_CURRENCIES.map((c) => c.code));

export function isSellCurrency(value: unknown): value is string {
  return typeof value === 'string' && CODES.has(value);
}

// Supplier pages without a currency are treated as US dollars, as elsewhere.
export function normalizeCurrency(code: string | null | undefined): string {
  const c = typeof code === 'string' ? code.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(c) ? c : 'USD';
}

// How many units of `to` one unit of `from` is worth, or null without rates.
export function fxFactor(from: string, to: string, rates: Rates | null | undefined): number | null {
  if (from === to) return 1;
  const a = from === 'USD' ? 1 : rates?.[from];
  const b = to === 'USD' ? 1 : rates?.[to];
  if (!a || !b) return null;
  return b / a;
}

export function convert(
  amount: number | null | undefined,
  from: string,
  to: string,
  rates: Rates | null | undefined
): number | null {
  if (amount == null) return null;
  const f = fxFactor(from, to, rates);
  return f == null ? null : amount * f;
}

const EURO_REGIONS = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
]);
const REGION_CURRENCY: Record<string, string> = {
  GB: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
  CZ: 'CZK', JP: 'JPY', SG: 'SGD', HK: 'HKD', IN: 'INR', MX: 'MXN', BR: 'BRL', ZA: 'ZAR',
};

// A sensible first choice from the browser's language, e.g. en-GB -> GBP.
export function guessCurrency(locale: string | undefined): string {
  const region = locale?.split(/[-_]/)[1]?.toUpperCase() ?? '';
  if (EURO_REGIONS.has(region)) return 'EUR';
  return REGION_CURRENCY[region] ?? 'USD';
}
