'use client';

import { useState } from 'react';
import Sparkline from './Sparkline';

type Snapshot = {
  id: string;
  price: number | null;
  currency: string | null;
  in_stock: boolean | null;
  raw_status: string;
  checked_at: string;
};

type Product = {
  id: string;
  title: string | null;
  image_url: string | null;
  source_url: string;
  snapshots: Snapshot[];
};

export default function ProductCard({
  product,
  onChanged,
}: {
  product: Product;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const sorted = [...product.snapshots].sort(
    (a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  const priceChange =
    latest?.price != null && previous?.price != null
      ? ((latest.price - previous.price) / previous.price) * 100
      : null;

  async function handleCheckNow() {
    setBusy(true);
    await fetch(`/api/check/${product.id}`, { method: 'POST' });
    setBusy(false);
    onChanged();
  }

  async function handleDelete() {
    if (!confirm('Stop tracking this product?')) return;
    setBusy(true);
    await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <a
            href={product.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium line-clamp-2 hover:text-indigo-600"
          >
            {product.title || product.source_url}
          </a>
          {latest?.in_stock === false ? (
            <span className="inline-block mt-1 text-xs font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
              Out of stock
            </span>
          ) : latest?.in_stock === true ? (
            <span className="inline-block mt-1 text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
              In stock
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-xl font-bold">
            {latest?.price != null ? `$${latest.price.toFixed(2)}` : '—'}
          </div>
          {priceChange !== null && Math.abs(priceChange) > 0.01 && (
            <div
              className={`text-xs font-medium ${
                priceChange > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {priceChange > 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(1)}% since last check
            </div>
          )}
        </div>
        <Sparkline data={sorted.map((s) => s.price ?? 0)} />
      </div>

      <div className="text-xs text-slate-400">
        {latest
          ? `Last checked ${new Date(latest.checked_at).toLocaleString()}`
          : 'Not checked yet'}
      </div>

      {latest && !latest.in_stock && !latest.price && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
          {latest.raw_status}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={handleCheckNow}
          disabled={busy}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          Check now
        </button>
        <span className="text-slate-300">·</span>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
        >
          Stop tracking
        </button>
      </div>
    </div>
  );
}
