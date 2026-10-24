import { readConsent } from './consent';
import { SITE } from './site';

// OpenAI ads Measurement Pixel (developers.openai.com/ads/measurement-pixel).
// Tells OpenAI Ads when someone who saw an ad signs up or subscribes. It is
// only loaded after the visitor accepts cookies, and sends no personal details.

type Oaiq = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    oaiq?: Oaiq;
  }
}

const SDK_URL = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';

// Loads the pixel once. Does nothing without cookie consent.
export function loadAdsPixel() {
  if (readConsent() !== 'granted' || window.oaiq) return;
  const queue: Oaiq = (...args: unknown[]) => {
    queue.q!.push(args);
  };
  queue.q = [];
  window.oaiq = queue;
  const script = document.createElement('script');
  script.async = true;
  script.src = SDK_URL;
  document.head.appendChild(script);
  window.oaiq('init', { pixelId: SITE.adsPixelId });
}

// Records a conversion, such as "registration_completed". Does nothing
// without cookie consent.
export function measureConversion(
  event: string,
  data: Record<string, unknown>,
  options?: { event_id?: string }
) {
  loadAdsPixel();
  if (!window.oaiq) return;
  if (options) window.oaiq('measure', event, data, options);
  else window.oaiq('measure', event, data);
}
