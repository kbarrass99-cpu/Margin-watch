'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onConsentChange, readConsent, writeConsent } from '@/lib/consent';
import { loadAdsPixel } from '@/lib/adsPixel';
import { loadGoogleAds } from '@/lib/googleAds';

// The ads tags only measure visits that came from an ad, so only those
// visitors are asked (the ad link carries OpenAI's oppref, Google's click id
// or our UTM tags).
// Anyone can still answer, or change their answer, with "Cookie settings".
function cameFromAd(): boolean {
  const params = new URLSearchParams(window.location.search);
  return (
    ['oppref', 'gclid', 'gbraid', 'wbraid'].some((key) => params.has(key)) ||
    params.get('utm_medium') === 'paid' ||
    ['chatgpt', 'google'].includes(params.get('utm_source') ?? '')
  );
}

// Asks once whether advertising cookies may be used, and loads the OpenAI ads
// pixel only after "Accept". Sign-in cookies are essential and need no consent.
export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      requestAnimationFrame(() => setShown(true));
    };
    const current = readConsent();
    if (current === 'granted') {
      loadAdsPixel();
      loadGoogleAds();
    }
    if (current === null && cameFromAd()) show();
    return onConsentChange((value) => {
      if (value === null) show();
    });
  }, []);

  function choose(value: 'granted' | 'denied') {
    const pixelWasLoaded = Boolean(window.oaiq || window.gtag);
    writeConsent(value);
    setShown(false);
    setOpen(false);
    if (value === 'granted') {
      loadAdsPixel();
      loadGoogleAds();
    }
    // Withdrawing consent: reload so the already-running pixel stops.
    else if (pixelWasLoaded) window.location.reload();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className={`fixed inset-x-3 bottom-3 z-40 sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-md rounded-xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-[0_16px_32px_-18px_rgba(24,24,27,0.3)] backdrop-blur transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="flex items-center gap-3">
        <p id="cookie-consent-title" className="flex-1 text-xs leading-snug text-zinc-600">
          May we use an advertising cookie to see if our ad brought you here?{' '}
          <Link href="/privacy#cookies" className="text-zinc-900 underline decoration-zinc-300 underline-offset-2">
            Details
          </Link>
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => choose('denied')}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 active:scale-[0.98] transition"
          >
            No
          </button>
          <button
            type="button"
            onClick={() => choose('granted')}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 active:scale-[0.98] transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// Footer link that reopens the banner so a visitor can change their answer.
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => writeConsent(null)} className={className}>
      Cookie settings
    </button>
  );
}
