// A supplier link a visitor checked on the homepage before signing up. Kept
// in this browser so the dashboard can fill it in once their account exists
// (sign-up includes an email confirmation, which may come back to a new tab).

const KEY = 'mc:pendingTrack';
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export function savePendingTrack(url: string, title?: string, sellPrice?: number, currency?: string) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ url, title, sellPrice, currency, at: Date.now() }));
  } catch {}
}

export function peekPendingTrack(): { url: string; title?: string; sellPrice?: number; currency?: string } | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    if (typeof saved?.url !== 'string' || !/^https?:\/\//.test(saved.url)) return null;
    if (Date.now() - Number(saved.at) > MAX_AGE_MS) return null;
    const sell = Number(saved.sellPrice);
    return {
      url: saved.url,
      title: typeof saved.title === 'string' ? saved.title : undefined,
      sellPrice: Number.isFinite(sell) && sell > 0 ? sell : undefined,
      currency: typeof saved.currency === 'string' ? saved.currency : undefined,
    };
  } catch {
    return null;
  }
}

export function clearPendingTrack() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
