'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { analyticsEnabled, getHeroVariant, type HeroVariant } from '@/lib/analytics';

// Shows the control or test hero for the hero-v2 experiment. Both are
// server-rendered and passed in; only the chosen one is shown.
// Without a PostHog key (or a ?hero= preview link) everyone gets control
// straight away, so there is no wait and no flicker.
export default function HeroSwitch({ control, test }: { control: ReactNode; test: ReactNode }) {
  const [variant, setVariant] = useState<HeroVariant | null>(() => {
    if (typeof window === 'undefined') return analyticsEnabled() ? null : 'control';
    const forced = new URLSearchParams(window.location.search).get('hero');
    if (forced === 'test' || forced === 'control') return null;
    return analyticsEnabled() ? null : 'control';
  });

  useEffect(() => {
    let live = true;
    getHeroVariant().then((v) => live && setVariant(v));
    return () => {
      live = false;
    };
  }, []);

  if (variant === null) {
    // While the variant is decided (at most ~1.2s), control is in the HTML for
    // search engines but invisible, so test visitors don't see it flash.
    return <div style={{ visibility: 'hidden' }}>{control}</div>;
  }
  return <>{variant === 'test' ? test : control}</>;
}
