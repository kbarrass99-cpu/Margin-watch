import type { SupabaseClient } from '@supabase/supabase-js';
import type { Rates } from './fx';

// Server side: read exchange rates from the fx_rates table, refreshing them
// from the European Central Bank feed (frankfurter.dev) when they're more
// than 12 hours old. Never throws: on any failure the last saved rates are
// used, and with none at all callers fall back to "can't convert".

const SOURCE = 'https://api.frankfurter.dev/v1/latest?base=USD';
const MAX_AGE_MS = 12 * 3600 * 1000;
const CACHE_MS = 10 * 60 * 1000;

let cache: { rates: Rates; at: number } | null = null;

// Pass the admin (service role) client: refreshing writes the table.
export async function loadRates(admin: SupabaseClient): Promise<Rates> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rates;

  const { data } = await admin.from('fx_rates').select('currency, per_usd, updated_at');
  const rates: Rates = { USD: 1 };
  let newest = 0;
  for (const row of data ?? []) {
    const value = Number(row.per_usd);
    if (Number.isFinite(value) && value > 0) rates[row.currency] = value;
    newest = Math.max(newest, new Date(row.updated_at).getTime());
  }

  if (Date.now() - newest > MAX_AGE_MS) {
    const fresh = await fetchRates();
    if (fresh) {
      const updatedAt = new Date().toISOString();
      const rows = Object.entries(fresh).map(([currency, per_usd]) => ({ currency, per_usd, updated_at: updatedAt }));
      const { error } = await admin.from('fx_rates').upsert(rows, { onConflict: 'currency' });
      if (error) console.error('Saving exchange rates failed', error);
      Object.assign(rates, fresh);
    }
  }

  cache = { rates, at: Date.now() };
  return rates;
}

async function fetchRates(): Promise<Rates | null> {
  try {
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json();
    const out: Rates = { USD: 1 };
    for (const [code, value] of Object.entries(body?.rates ?? {})) {
      if (/^[A-Z]{3}$/.test(code) && typeof value === 'number' && value > 0) out[code] = value;
    }
    return Object.keys(out).length > 1 ? out : null;
  } catch (err) {
    console.error('Fetching exchange rates failed', err);
    return null;
  }
}
