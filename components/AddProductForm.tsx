'use client';

import { useState } from 'react';

const input =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 aria-[invalid=true]:border-red-400';

export default function AddProductForm({
  onAdded,
  disabled = false,
}: {
  onAdded: () => void;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: url, sell_price: sellPrice || null }),
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
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_10rem_auto] gap-3 items-start">
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
          onChange={(e) => setUrl(e.target.value)}
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
            Any product page from AliExpress, CJ, Spocket or similar.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="add-sell" className="text-xs font-medium text-zinc-700">
          Your sell price
        </label>
        <input
          id="add-sell"
          type="number"
          min="0"
          step="0.01"
          placeholder="24.99"
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          disabled={disabled}
          aria-describedby="add-sell-helper"
          className={`${input} font-mono`}
        />
        <p id="add-sell-helper" className="text-xs text-zinc-500">
          Optional. Needed for margin alerts.
        </p>
      </div>
      <button
        type="submit"
        disabled={loading || disabled}
        className="sm:mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? 'Checking the page…' : 'Track product'}
      </button>
    </form>
  );
}
