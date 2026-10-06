'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react';
import { hostOf, money, summarize, timeAgo, type ProductWithSnapshots } from '@/lib/margin';
import { ProductSettings, StatusChip, useProductActions } from '@/components/dashboard/productUi';

const action =
  'inline-flex min-h-[44px] items-center justify-center rounded-lg px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-50';

// Phone layout (below md): one product per block, the numbers that matter on one line.
export default function ProductCard({ product, onChanged }: { product: ProductWithSnapshots; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { busy, error, checkNow, remove, save } = useProductActions(product.id, onChanged);
  const { latest, lastPrice, lastAttempt, lastFailed, priceChange, margin, profitPerSale, atRisk, status, currency } = summarize(product);

  return (
    <li className={`border-t border-zinc-100 py-4 ${atRisk ? 'bg-red-50/70 -mx-4 px-4' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-zinc-100">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/dashboard/products/${product.id}`} className="line-clamp-2 text-sm font-medium text-zinc-900">
            {product.title || hostOf(product.source_url)}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            <StatusChip status={status} />
            <span>{lastAttempt ? `checked ${timeAgo(lastAttempt.checked_at)}` : 'first check pending'}</span>
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 pl-[3.25rem]">
        <div>
          <dt className="text-[11px] text-zinc-500">Supplier</dt>
          <dd className="font-mono text-sm tabular-nums">
            {money(lastPrice, currency)}
            {priceChange !== null && Math.abs(priceChange) > 0.01 && (
              <span className={`block text-xs ${priceChange > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {priceChange > 0 ? '+' : '−'}
                {Math.abs(priceChange).toFixed(1)}%
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-zinc-500">You sell</dt>
          <dd className="font-mono text-sm tabular-nums">{product.sell_price != null ? money(product.sell_price, currency) : '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-zinc-500">Margin / alert</dt>
          <dd className={`font-mono text-sm tabular-nums ${atRisk ? 'font-semibold text-red-700' : ''}`}>
            {margin != null ? `${margin.toFixed(1)}% / ${product.margin_alert_percent}%` : '—'}
            {profitPerSale != null && <span className="block text-xs font-normal text-zinc-500">{money(profitPerSale, currency)} a sale</span>}
          </dd>
        </div>
      </dl>

      {lastFailed && lastAttempt && (
        <p className="mt-3 pl-[3.25rem] text-xs text-amber-800">
          Last check failed: {lastAttempt.raw_status.replace(/\.$/, '')}.
          {latest ? ` Showing the reading from ${timeAgo(latest.checked_at)}.` : ''}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 pl-[3.25rem] text-xs text-red-700">
          {error}
        </p>
      )}

      {editing ? (
        <div className="mt-3">
          <ProductSettings
            product={product}
            currency={currency}
            supplierPrice={lastPrice}
            busy={busy === 'save'}
            onSave={save}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : confirmingDelete ? (
        <div className="mt-2 flex items-center gap-1 pl-[3.25rem] text-sm">
          <span className="mr-1 text-zinc-600">Stop tracking this product?</span>
          <button type="button" onClick={remove} disabled={busy !== null} className={`${action} text-red-700`}>
            {busy === 'delete' ? 'Stopping…' : 'Stop'}
          </button>
          <button type="button" onClick={() => setConfirmingDelete(false)} className={action}>
            Keep
          </button>
        </div>
      ) : (
        <div className="mt-2 -ml-3 flex flex-wrap items-center pl-[3.25rem]">
          <button type="button" onClick={() => setEditing(true)} className={`${action} ${product.sell_price == null ? 'text-accent' : ''}`}>
            {product.sell_price == null ? 'Add sell price' : 'Edit prices'}
          </button>
          <button type="button" onClick={checkNow} disabled={busy !== null} className={action}>
            {busy === 'check' ? 'Checking…' : 'Check now'}
          </button>
          <a href={product.source_url} target="_blank" rel="noreferrer" className={action}>
            Supplier
            <ArrowUpRight size={12} weight="bold" className="ml-1" aria-hidden="true" />
          </a>
          <button type="button" onClick={() => setConfirmingDelete(true)} disabled={busy !== null} className={`${action} text-zinc-500`}>
            Stop tracking
          </button>
        </div>
      )}
    </li>
  );
}
