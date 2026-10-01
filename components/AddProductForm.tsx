'use client';

import { useState } from 'react';

export default function AddProductForm({ onAdded }: { onAdded: () => void }) {
  const [url, setUrl] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_url: url, sell_price: sellPrice || null }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Something went wrong');
      return;
    }

    setUrl('');
    setSellPrice('');
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          required
          placeholder="Paste a supplier product URL (e.g. an AliExpress product page)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Your sell price (optional)"
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          className="sm:w-48 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Adding…' : 'Track product'}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Add your sell price to get margin alerts, not just price/stock alerts. You can set it later too.
      </p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </form>
  );
}
