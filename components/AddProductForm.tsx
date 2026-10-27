'use client';

import { useEffect, useState } from 'react';
import { SUPPORTED_SUPPLIERS } from '@/lib/suppliers';
import { SELL_CURRENCIES, guessCurrency, isSellCurrency } from '@/lib/fx';

const CURRENCY_KEY = 'mc:sellCurrency';

const input =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base sm:text-sm transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 aria-[invalid=true]:border-red-400';

export default function AddProductForm({
  onAdded,
  disabled = false,
}: {
  onAdded: () => void;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellCurrency, setSellCurrency] = useState('USD');
  const [extraCost, setExtraCost] = useState('');
  const [alertAt, setAlertAt] = useState('20');
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  // The seller's currency: the last one they picked, or a guess from the browser.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(CURRENCY_KEY);
    } catch {}
    setSellCurrency(isSellCurrency(saved) ? saved : guessCurrency(navigator.language));
  }, []);

  function chooseCurrency(code: string) {
    setSellCurrency(code);
    try {
      window.localStorage.setItem(CURRENCY_KEY, code);
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAdded(false);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_url: url,
          sell_price: sellPrice || null,
          sell_currency: sellCurrency,
          extra_cost: extraCost || null,
          margin_alert_percent: alertAt || '20',
        }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok) {
        setError(data.error || 'Something went wrong adding that product. Try again.');
        return;
      }
    } catch {
      setLoading(false);
      setError('Could not reach the server. Check your connection and try again.');
      return;
    }

    setUrl('');
    setSellPrice('');
    setExtraCost('');
    setAdded(true);
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_15rem_auto] gap-3 items-start">
        <div className="flex flex-col gap-2">
          <label htmlFor="add-url" className="text-xs font-medium text-zinc-700">
            Supplier product link
          </label>
          <input
            id="add-url"
            type="url"
            required
            placeholder="https://www.aliexpress.com/item/…"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setAdded(false);
            }}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'add-error' : 'add-helper'}
            className={input}
          />
          {error ? (
            <p id="add-error" role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : (
            <p id="add-helper" className="text-xs text-zinc-500">
              Works with {SUPPORTED_SUPPLIERS}.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="add-sell" className="text-xs font-medium text-zinc-700">
            Your sell price
          </label>
          <div className="flex gap-2">
            <select
              aria-label="Your selling currency"
              value={sellCurrency}
              onChange={(e) => chooseCurrency(e.target.value)}
              disabled={disabled}
              className="w-[5.5rem] shrink-0 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-base sm:text-sm focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 disabled:opacity-60"
            >
              {SELL_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
            <input
              id="add-sell"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="24.99"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              disabled={disabled}
              aria-describedby="add-sell-helper"
              className={`${input} min-w-0 font-mono`}
            />
          </div>
          <p id="add-sell-helper" className="text-xs text-zinc-500">
            Optional. Turns on margin alerts. We convert the supplier&apos;s price for you.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading || disabled}
          className="sm:mt-6 min-h-[44px] rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Checking the page…' : 'Track product'}
        </button>
      </div>

      {showMore ? (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="flex flex-col gap-2">
            <label htmlFor="add-extra" className="text-xs font-medium text-zinc-700">
              Shipping and fees per sale ({sellCurrency})
            </label>
            <input id="add-extra" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={extraCost} onChange={(e) => setExtraCost(e.target.value)} className={`${input} font-mono`} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="add-alert" className="text-xs font-medium text-zinc-700">
              Alert when margin falls to (%)
            </label>
            <input id="add-alert" type="number" inputMode="decimal" min="0" max="100" step="0.5" value={alertAt} onChange={(e) => setAlertAt(e.target.value)} className={`${input} font-mono`} />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowMore(true)} className="self-start min-h-[36px] text-xs font-medium text-accent hover:text-accent-hover">
          Add shipping costs or change the 20% alert line
        </button>
      )}

      <p role="status" className="text-sm text-emerald-700">
        {added ? 'Added. The first check is done and it will be checked every 6 hours from now on.' : ''}
      </p>
    </form>
  );
}
