// The visitor's answer to the cookie banner, kept in this browser only.
// Advertising measurement (the OpenAI ads pixel) runs only after "Accept":
// UK law (PECR) needs consent before non-essential tracking.

export type Consent = 'granted' | 'denied';

const KEY = 'mc:consent';
const EVENT = 'mc:consent-change';

export function readConsent(): Consent | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

// null clears the answer, so the banner asks again.
export function writeConsent(value: Consent | null) {
  try {
    if (value) window.localStorage.setItem(KEY, value);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
  window.dispatchEvent(new CustomEvent<Consent | null>(EVENT, { detail: value }));
}

export function onConsentChange(listener: (value: Consent | null) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<Consent | null>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
