'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle, EnvelopeSimple, WarningCircle, XCircle } from '@phosphor-icons/react';
import { formatMoney } from '@/lib/money';
import { savePendingTrack } from '@/lib/pendingTrack';
import { createClient } from '@/lib/supabase/client';
import { measureConversion } from '@/lib/adsPixel';
import { capture } from '@/lib/analytics';
import { SITE } from '@/lib/site';
import type { TryResult } from '@/app/api/try/route';

// hero-v2 price check: paste a link, see the live price, then see what a
// supplier rise would cost per month, and start watching it without leaving
// the page. The control version is TryLink.

const EXAMPLES = [
  { label: 'AliExpress', url: 'https://www.aliexpress.com/item/1005012339400657.html' },
  { label: 'eBay', url: 'https://www.ebay.co.uk/itm/375119189634' },
  { label: 'Amazon', url: 'https://www.amazon.co.uk/dp/B0CP249PYP' },
];
const RISES = [5, 10, 20];
const ALERT = 45;

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const num = (s: string) => {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export default function TryCheck() {
  const [url, setUrl] = useState('');
  const [checked, setChecked] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'done'>('idle');
  const [result, setResult] = useState<TryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function check(link: string, source: 'paste' | 'example') {
    const target = link.trim();
    if (!target) return;
    setUrl(target);
    setState('checking');
    setError(null);
    setResult(null);
    capture('try_check_started', { source, supplier: hostOf(target) });
    try {
      const res = await fetch('/api/try', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        capture('try_check_result', { ok: false, status: res.status, supplier: hostOf(target) });
        setError(data.error || 'That link could not be checked. Try again in a minute.');
        setState('idle');
        return;
      }
      capture('try_check_result', { ok: Boolean(data.ok), has_price: data.price != null, supplier: hostOf(target) });
      setChecked(target);
      setResult(data);
      setState('done');
    } catch {
      setError('Could not reach MarginCanary. Check your connection and try again.');
      setState('idle');
    }
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check(url, 'paste');
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="try-url" className="text-sm font-medium text-zinc-900">
          Paste a supplier product link
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="try-url"
            type="url"
            inputMode="url"
            required
            placeholder="https://www.aliexpress.com/item/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'try-error' : 'try-help'}
            className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-base sm:text-sm placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-canary/40 aria-[invalid=true]:border-red-400"
          />
          <button
            type="submit"
            disabled={state === 'checking'}
            className="shrink-0 rounded-xl bg-canary px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-canary-hover active:scale-[0.98] transition disabled:opacity-60"
          >
            {state === 'checking' ? 'Checking…' : 'Check my margin'}
          </button>
        </div>
        {error ? (
          <p id="try-error" role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : (
          <p id="try-help" className="text-xs text-zinc-500">
            No account needed. Or try an example:{' '}
            {EXAMPLES.map((ex, i) => (
              <span key={ex.label}>
                <button
                  type="button"
                  onClick={() => check(ex.url, 'example')}
                  disabled={state === 'checking'}
                  className="text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 disabled:opacity-60"
                >
                  {ex.label}
                </button>
                {i < EXAMPLES.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>
        )}
      </form>

      <div aria-live="polite" className="mt-4">
        {state === 'checking' && (
          <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5">
            <div className="flex gap-4">
              <div className="h-16 w-16 shrink-0 rounded-xl bg-zinc-100 animate-pulse" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-4/5 rounded bg-zinc-100 animate-pulse" />
                <div className="h-3 w-2/5 rounded bg-zinc-100 animate-pulse" />
                <div className="h-5 w-1/4 rounded bg-zinc-100 animate-pulse" />
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Reading the supplier&apos;s page. This can take up to 30 seconds.</p>
          </div>
        )}

        {state === 'done' && result?.ok && <ResultCard result={result} link={checked} />}

        {state === 'done' && result && !result.ok && (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0" />
            <p className="leading-relaxed">{result.message || "We couldn't read that page."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result, link }: { result: TryResult; link: string }) {
  const reduce = useReducedMotion();
  const currency = result.currency;
  const cost = result.price ?? null;
  const [sell, setSell] = useState('');
  const [sales, setSales] = useState('');
  const [rise, setRise] = useState(10);

  const sellN = num(sell);
  // Monthly loss is only shown once the visitor tells us their own sales.
  const salesN = num(sales);
  const figures = useMemo(() => {
    if (cost == null) return null;
    const newCost = cost * (1 + rise / 100);
    const perSale = newCost - cost;
    const lost = salesN ? perSale * salesN : null;
    const marginNow = sellN ? ((sellN - cost) / sellN) * 100 : null;
    const marginAfter = sellN ? ((sellN - newCost) / sellN) * 100 : null;
    return { newCost, perSale, lost, marginNow, marginAfter };
  }, [cost, rise, salesN, sellN]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_24px_48px_-28px_rgba(24,24,27,0.25)]"
    >
      <div className="flex gap-4">
        {result.imageUrl ? (
          // Supplier images come from many hosts, so a plain img is used.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-16 w-16 shrink-0 rounded-xl border border-zinc-100 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 line-clamp-2">{result.title || hostOf(link)}</p>
          <p className="mt-0.5 font-mono text-xs text-zinc-400">{hostOf(link)}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {cost != null && (
              <span className="font-mono text-xl tabular-nums text-zinc-900">{formatMoney(cost, currency)}</span>
            )}
            {result.inStock === true && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle size={14} weight="bold" /> In stock
              </span>
            )}
            {result.inStock === false && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                <XCircle size={14} weight="bold" /> Out of stock
              </span>
            )}
          </div>
        </div>
      </div>

      {cost != null && figures && (
        <div className="mt-5 border-t border-zinc-100 pt-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-700">
              You sell it for ({currency || 'USD'})
              <input
                inputMode="decimal"
                placeholder="Your shop price"
                value={sell}
                onChange={(e) => setSell(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-canary/40"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-700">
              Your sales a month
              <input
                inputMode="numeric"
                placeholder="Units of this product"
                value={sales}
                onChange={(e) => setSales(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-canary/40"
              />
            </label>
          </div>

          <div className="mt-4 rounded-2xl bg-zinc-950 p-4 text-white">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-zinc-400">
              <span>If the supplier puts the price up</span>
              <div role="radiogroup" aria-label="Price rise" className="inline-flex rounded-lg bg-white/10 p-0.5">
                {RISES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={rise === r}
                    onClick={() => setRise(r)}
                    className={`rounded-md px-2.5 py-1 font-mono tabular-nums transition ${
                      rise === r ? 'bg-canary text-zinc-950' : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>
            {figures.lost != null ? (
              <p className="mt-3 font-mono text-3xl tabular-nums tracking-tight">
                {formatMoney(figures.lost, currency)}
                <span className="ml-2 font-sans text-sm font-normal text-zinc-400">lost a month</span>
              </p>
            ) : (
              <>
                <p className="mt-3 font-mono text-3xl tabular-nums tracking-tight">
                  {formatMoney(figures.perSale, currency)}
                  <span className="ml-2 font-sans text-sm font-normal text-zinc-400">less profit on every sale</span>
                </p>
                <p className="mt-1 text-xs text-zinc-400">Add your monthly sales to see what that costs you a month.</p>
              </>
            )}
            {figures.marginNow != null && figures.marginAfter != null ? (
              <MarginBar now={figures.marginNow} after={figures.marginAfter} />
            ) : (
              <p className="mt-2 text-xs text-zinc-400">
                Add your sell price to see where your margin lands.
              </p>
            )}
          </div>
        </div>
      )}

      <InlineSignup link={link} title={result.title} sellPrice={sellN ?? undefined} currency={currency} />
    </motion.div>
  );
}

function MarginBar({ now, after }: { now: number; after: number }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const under = after < ALERT;
  return (
    <div className="mt-3">
      <div className="relative h-1.5 rounded-full bg-white/10">
        <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${clamp(now)}%` }} />
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${under ? 'bg-red-400' : 'bg-emerald-400'}`}
          style={{ width: `${clamp(after)}%` }}
        />
        <span className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded bg-canary" style={{ left: `${ALERT}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Margin <span className="font-mono text-zinc-200">{now.toFixed(1)}%</span> to{' '}
        <span className={`font-mono ${under ? 'text-red-300' : 'text-zinc-200'}`}>{after.toFixed(1)}%</span>
        {under ? `, under a ${ALERT}% alert line.` : '.'}
      </p>
    </div>
  );
}

// Creates the free account right here, so the visitor never leaves the
// result. The product is carried into the dashboard via pendingTrack.
function InlineSignup({
  link,
  title,
  sellPrice,
  currency,
}: {
  link: string;
  title?: string;
  sellPrice?: number;
  currency?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  function begin() {
    if (!started) {
      setStarted(true);
      capture('try_watch_started');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    savePendingTrack(link, title, sellPrice, currency);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    capture('signup_completed', { location: 'inline' });
    measureConversion('registration_completed', { type: 'customer_action' });
    if (data.session) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setSentTo(email);
    }
  }

  if (sentTo) {
    return (
      <div className="mt-5 flex gap-3 rounded-2xl bg-canary-soft p-4 text-sm text-zinc-700">
        <EnvelopeSimple size={20} weight="bold" className="mt-0.5 shrink-0 text-canary-ink" />
        <p className="leading-relaxed">
          Nearly there. We sent a link to <span className="font-medium text-zinc-900">{sentTo}</span>. Open it on this
          device and this product will be ready to watch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} onFocus={begin} className="mt-5 flex flex-col gap-2">
      <p className="text-sm font-medium text-zinc-900">Watch this free. We&apos;ll email you before it costs you.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="sr-only" htmlFor="watch-email">Email</label>
        <input
          id="watch-email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@yourstore.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-base sm:text-sm placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-canary/40"
        />
        <label className="sr-only" htmlFor="watch-password">Password</label>
        <input
          id="watch-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'watch-error' : undefined}
          className="rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-base sm:text-sm placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-canary/40 aria-[invalid=true]:border-red-400"
        />
      </div>
      {error && (
        <p id="watch-error" role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-canary px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-canary-hover active:scale-[0.98] transition disabled:opacity-60"
      >
        {loading ? 'Creating your account…' : 'Watch this product free'}
        {!loading && <ArrowRight size={16} weight="bold" />}
      </button>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Free for 1 product, no card. {SITE.name} is for businesses: by continuing you confirm that, and agree to our{' '}
        <Link href="/terms" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900">Terms</Link> and{' '}
        <Link href="/privacy" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900">Privacy Policy</Link>.
      </p>
    </form>
  );
}
