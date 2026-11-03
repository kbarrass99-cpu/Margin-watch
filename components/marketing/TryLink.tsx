'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react';
import { formatMoney } from '@/lib/money';
import { savePendingTrack } from '@/lib/pendingTrack';
import type { TryResult } from '@/app/api/try/route';

// Example links for visitors who don't have a supplier page open.
const DEFAULT_EXAMPLES = [
  { label: 'AliExpress', url: 'https://www.aliexpress.com/item/1005012339400657.html' },
  { label: 'eBay', url: 'https://www.ebay.co.uk/itm/375119189634' },
  { label: 'Amazon', url: 'https://www.amazon.co.uk/dp/B0CP249PYP' },
];

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Paste a supplier link, see its live price and stock, then sign up to be
// told when it changes. The link is carried into the dashboard.
export default function TryLink({
  placeholder = 'https://www.aliexpress.com/item/…',
  examples = DEFAULT_EXAMPLES,
}: {
  placeholder?: string;
  examples?: { label: string; url: string }[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [checked, setChecked] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'done'>('idle');
  const [result, setResult] = useState<TryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function check(link: string) {
    const target = link.trim();
    if (!target) return;
    setUrl(target);
    setState('checking');
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/try', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'That link could not be checked. Try again in a minute.');
        setState('idle');
        return;
      }
      setChecked(target);
      setResult(data);
      setState('done');
    } catch {
      setError('Could not reach MarginCanary. Check your connection and try again.');
      setState('idle');
    }
  }

  function track() {
    savePendingTrack(checked, result?.title);
    router.push('/signup');
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check(url);
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
            placeholder={placeholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'try-error' : 'try-help'}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base sm:text-sm placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 aria-[invalid=true]:border-red-400"
          />
          <button
            type="submit"
            disabled={state === 'checking'}
            className="shrink-0 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-hover active:scale-[0.98] transition disabled:opacity-60"
          >
            {state === 'checking' ? 'Checking…' : 'Check the price'}
          </button>
        </div>
        {error ? (
          <p id="try-error" role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : (
          <p id="try-help" className="text-xs text-zinc-500">
            No account needed.{examples.length > 0 ? ' Or try an example: ' : ''}
            {examples.map((ex, i) => (
              <span key={ex.label}>
                <button
                  type="button"
                  onClick={() => check(ex.url)}
                  disabled={state === 'checking'}
                  className="text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 disabled:opacity-60"
                >
                  {ex.label}
                </button>
                {i < examples.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>
        )}
      </form>

      <div aria-live="polite" className="mt-4">
        {state === 'checking' && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex gap-4">
              <div className="h-16 w-16 shrink-0 rounded-lg bg-zinc-100 animate-pulse" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-4/5 rounded bg-zinc-100 animate-pulse" />
                <div className="h-3 w-2/5 rounded bg-zinc-100 animate-pulse" />
                <div className="h-5 w-1/4 rounded bg-zinc-100 animate-pulse" />
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Reading the supplier&apos;s page. This can take up to 30 seconds.</p>
          </div>
        )}

        {state === 'done' && result?.ok && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_20px_40px_-20px_rgba(24,24,27,0.15)]">
            <div className="flex gap-4">
              {result.imageUrl ? (
                // Supplier images come from many hosts, so a plain img is used.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.imageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 shrink-0 rounded-lg border border-zinc-100 object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 line-clamp-2">{result.title || hostOf(checked)}</p>
                <p className="mt-0.5 font-mono text-xs text-zinc-400">{hostOf(checked)}</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {result.price != null && (
                    <span className="font-mono text-xl tabular-nums text-zinc-900">
                      {formatMoney(result.price, result.currency)}
                    </span>
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
            <button
              type="button"
              onClick={track}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 active:scale-[0.98] transition"
            >
              Email me when this price changes
              <ArrowRight size={16} weight="bold" />
            </button>
            <p className="mt-2 text-center text-xs text-zinc-500">Free for 1 product. No credit card.</p>
          </div>
        )}

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
