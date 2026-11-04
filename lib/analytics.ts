// Product analytics for the homepage funnel (paste a link -> see the price ->
// sign up), sent to PostHog's HTTP API.
//
// Cookieless by design: the visitor id lives in memory only, so nothing is
// stored on the device and no consent banner is needed (PECR covers storing
// or reading data on the device). The trade-off: a full page reload counts as
// a new visitor. Client-side navigation (homepage -> /signup) keeps the id.
//
// With NEXT_PUBLIC_POSTHOG_KEY unset, nothing is sent and every visitor sees
// the control hero, so this ships switched off.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

// The homepage A/B test. Variants: 'control' (current hero) and 'test'.
export const HERO_FLAG = 'hero-v2';
export type HeroVariant = 'control' | 'test';

let distinctId: string | null = null;
let heroVariant: HeroVariant | null = null;
let flagsPromise: Promise<HeroVariant> | null = null;

function id(): string {
  if (!distinctId) {
    distinctId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return distinctId;
}

export function analyticsEnabled(): boolean {
  return Boolean(KEY);
}

function send(event: string, properties: Record<string, unknown> = {}) {
  if (!KEY || typeof window === 'undefined') return;
  const body = JSON.stringify({
    api_key: KEY,
    event,
    distinct_id: id(),
    timestamp: new Date().toISOString(),
    properties: {
      $current_url: window.location.href,
      $pathname: window.location.pathname,
      $referrer: document.referrer || undefined,
      $process_person_profile: false,
      ...(heroVariant ? { [`$feature/${HERO_FLAG}`]: heroVariant } : {}),
      ...properties,
    },
  });
  try {
    // keepalive lets the event finish even if the page navigates away.
    fetch(`${HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export function capture(event: string, properties?: Record<string, unknown>) {
  send(event, properties);
}

function override(): HeroVariant | null {
  try {
    const v = new URLSearchParams(window.location.search).get('hero');
    return v === 'test' || v === 'control' ? v : null;
  } catch {
    return null;
  }
}

// Which hero this visitor sees. A ?hero=test or ?hero=control link forces a
// variant for previews and is not counted in the experiment.
export function getHeroVariant(timeoutMs = 1200): Promise<HeroVariant> {
  if (flagsPromise) return flagsPromise;
  const forced = override();
  if (forced) {
    heroVariant = null;
    flagsPromise = Promise.resolve(forced);
    return flagsPromise;
  }
  if (!KEY) {
    flagsPromise = Promise.resolve('control');
    return flagsPromise;
  }

  const lookup = fetch(`${HOST}/flags/?v=2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: KEY, distinct_id: id() }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data): HeroVariant => {
      const flag = data?.flags?.[HERO_FLAG];
      const value = flag?.variant ?? data?.featureFlags?.[HERO_FLAG];
      return value === 'test' ? 'test' : 'control';
    })
    .catch((): HeroVariant => 'control');

  const timeout = new Promise<HeroVariant | 'timeout'>((resolve) => setTimeout(() => resolve('timeout'), timeoutMs));

  flagsPromise = Promise.race([lookup, timeout]).then((v) => {
    if (v === 'timeout') {
      // Too slow to decide: show control and leave this visitor out of the test.
      return 'control';
    }
    heroVariant = v;
    // The exposure event PostHog experiments count visitors from.
    send('$feature_flag_called', { $feature_flag: HERO_FLAG, $feature_flag_response: v });
    return v;
  });
  return flagsPromise;
}
