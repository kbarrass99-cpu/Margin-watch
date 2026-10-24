'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onConsentChange, readConsent, writeConsent } from '@/lib/consent';
import { loadAdsPixel } from '@/lib/adsPixel';

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
    if (current === 'granted') loadAdsPixel();
    if (current === null) show();
    return onConsentChange((value) => {
      if (value === null) show();
    });
  }, []);

  function choose(value: 'granted' | 'denied') {
    const pixelWasLoaded = Boolean(window.oaiq);
    writeConsent(value);
    setShown(false);
    setOpen(false);
    if (value === 'granted') loadAdsPixel();
    // Withdrawing consent: reload so the already-running pixel stops.
    else if (pixelWasLoaded) window.location.reload();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className={`fixed inset-x-4 bottom-4 z-40 sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_20px_40px_-20px_rgba(24,24,27,0.25)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <p id="cookie-consent-title" className="text-sm font-medium text-zinc-900">
        Can we measure our ads?
      </p>
      <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">
        With your OK, we use a cookie from OpenAI to see whether our ads led to your visit. Nothing
        about you is sold. Sign-in cookies are always on.{' '}
        <Link href="/privacy#cookies" className="text-zinc-900 underline decoration-zinc-300 underline-offset-4">
          Details
        </Link>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => choose('denied')}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 active:scale-[0.98] transition"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => choose('granted')}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 active:scale-[0.98] transition"
        >
          Accept
        </button>
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
