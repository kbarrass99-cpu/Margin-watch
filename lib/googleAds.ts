import { readConsent } from './consent';
import { SITE } from './site';

// Google Ads conversion tag (gtag.js). Tells Google Ads when someone who
// clicked an ad signs up or subscribes. Like the OpenAI pixel it only loads
// after the visitor accepts advertising cookies, and it is off until
// SITE.googleAds has the account's conversion ID and labels.

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

function configured(): boolean {
  return Boolean(SITE.googleAds.conversionId);
}

// Loads the tag once. Does nothing without consent or configuration.
export function loadGoogleAds() {
  if (!configured() || readConsent() !== 'granted' || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js reads the arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  // Consent covers measuring our ads only: no remarketing or analytics.
  window.gtag('consent', 'default', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', SITE.googleAds.conversionId, { allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(SITE.googleAds.conversionId!)}`;
  document.head.appendChild(script);
}

// Records a conversion ("signup" or "subscription"). Does nothing without
// consent, or when that conversion's label isn't set.
export function googleConversion(
  kind: 'signup' | 'subscription',
  details?: { value?: number; currency?: string; transactionId?: string }
) {
  const label = SITE.googleAds.labels[kind];
  if (!label) return;
  loadGoogleAds();
  if (!window.gtag) return;
  window.gtag('event', 'conversion', {
    send_to: `${SITE.googleAds.conversionId}/${label}`,
    ...(details?.value != null ? { value: details.value, currency: details.currency ?? 'USD' } : {}),
    ...(details?.transactionId ? { transaction_id: details.transactionId } : {}),
  });
}
