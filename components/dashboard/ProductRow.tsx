'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowClockwise, ArrowUpRight, PencilSimple, Trash } from '@phosphor-icons/react';
import Sparkline from '@/components/Sparkline';
import { hostOf, money, summarize, timeAgo, type ProductWithSnapshots } from '@/lib/margin';
import { ProductSettings, StatusChip, useProductActions } from '@/components/dashboard/productUi';

const iconButton =
  'inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.96] disabled:opacity-40';

// Desktop table row (md and up). Phones get ProductCard instead.
export default function ProductRow({ product, onChanged }: { product: ProductWithSnapshots; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { busy, error, checkNow, remove, save } = useProductActions(product.id, onChanged);
  const s = summarize(product);
  const { latest, lastPrice, lastAttempt, lastFailed, priceChange, margin, profitPerSale, atRisk, status, currency } = s;

  return (
    <>
      <tr className={`group align-middle border-t border-zinc-100 ${atRisk ? 'bg-red-50/70' : ''}`}>
        <td className="py-3 pl-3 pr-4 max-w-0 w-[34%]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-zinc-100">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <Link
                href={`/dashboard/products/${product.id}`}
                className="line-clamp-1 break-words text-sm font-medium text-zinc-900 hover:underline underline-offset-2"
                title="See margin history"
              >
                {product.title || hostOf(product.source_url)}
              </Link>
              <a href={product.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-zinc-500 hover:text-zinc-800">
                {hostOf(product.source_url)}
                <ArrowUpRight size={11} weight="bold" aria-hidden="true" />
                <span className="sr-only">(opens supplier page)</span>
              </a>
            </div>
          </div>
        </td>

        <td className="py-3 px-3 whitespace-nowrap">
          <StatusChip status={status} />
        </td>

        <td className="py-3 px-3 text-right whitespace-nowrap">
          <span className="font-mono text-sm tabular-nums">{money(lastPrice, currency)}</span>
          {priceChange !== null && Math.abs(priceChange) > 0.01 && (
            <span className={`ml-1.5 font-mono text-xs tabular-nums ${priceChange > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {priceChange > 0 ? '+' : '−'}
              {Math.abs(priceChange).toFixed(1)}%
            </span>
          )}
        </td>

        <td className="py-3 px-3 hidden lg:table-cell">
          <Sparkline data={s.good.map((x) => x.price ?? 0)} tone={priceChange != null && priceChange > 0 ? 'bad' : 'neutral'} />
        </td>

        <td className="py-3 px-3 text-right whitespace-nowrap">
          {product.sell_price != null ? (
            <span className="font-mono text-sm tabular-nums text-zinc-700">{money(product.sell_price, currency)}</span>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-accent hover:text-accent-hover">
              Add sell price
            </button>
          )}
        </td>

        <td className="py-3 px-3 text-right whitespace-nowrap">
          {margin != null ? (
            <div className="flex flex-col items-end leading-tight">
              <span className={`font-mono text-sm tabular-nums ${atRisk ? 'font-semibold text-red-700' : 'text-zinc-900'}`}>
                {margin.toFixed(1)}%<span className="text-xs font-normal text-zinc-500"> / {product.margin_alert_percent}%</span>
              </span>
              <span className="font-mono text-xs tabular-nums text-zinc-500">{money(profitPerSale, currency)} a sale</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">—</span>
          )}
        </td>

        <td className="py-3 px-3 whitespace-nowrap text-xs text-zinc-500">
          {lastAttempt ? (
            <time dateTime={lastAttempt.checked_at} title={new Date(lastAttempt.checked_at).toLocaleString()}>
              {timeAgo(lastAttempt.checked_at)}
            </time>
          ) : (
            'Pending'
          )}
        </td>

        <td className="py-3 pl-2 pr-3 whitespace-nowrap">
          {confirmingDelete ? (
            <div className="flex items-center justify-end gap-2 text-xs">
              <span className="text-zinc-600">Stop tracking?</span>
              <button type="button" onClick={remove} disabled={busy !== null} className="min-h-[36px] px-1 font-medium text-red-700 hover:text-red-800">
                {busy === 'delete' ? 'Stopping…' : 'Stop'}
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} className="min-h-[36px] px-1 text-zinc-600 hover:text-zinc-900">
                Keep
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-0.5">
              <button type="button" onClick={() => setEditing((v) => !v)} className={iconButton} aria-label="Edit sell price, shipping and alert line" title="Edit prices and alert line" aria-expanded={editing}>
                <PencilSimple size={16} weight="bold" />
              </button>
              <button type="button" onClick={checkNow} disabled={busy !== null} className={iconButton} aria-label="Check now" title="Check now">
                <ArrowClockwise size={16} weight="bold" className={busy === 'check' ? 'animate-spin' : ''} />
              </button>
              <button type="button" onClick={() => setConfirmingDelete(true)} disabled={busy !== null} className={`${iconButton} hover:!text-red-700`} aria-label="Stop tracking" title="Stop tracking">
                <Trash size={16} weight="bold" />
              </button>
            </div>
          )}
        </td>
      </tr>

      {(error || editing || lastFailed) && (
        <tr className={atRisk ? 'bg-red-50/70' : ''}>
          <td colSpan={8} className="px-3 pb-3 pt-0 pl-[3.75rem] text-xs">
            <div className="flex flex-col gap-2">
              {error && <span role="alert" className="text-red-700">{error}</span>}
              {lastFailed && lastAttempt && (
                <span className="text-amber-800">
                  Last check failed: {lastAttempt.raw_status.replace(/\.$/, '')}.
                  {latest ? ` Showing the last good reading from ${timeAgo(latest.checked_at)}.` : ''}
                </span>
              )}
              {editing && (
                <ProductSettings
                  product={product}
                  currency={currency}
                  supplierPrice={lastPrice}
                  busy={busy === 'save'}
                  onSave={save}
                  onCancel={() => setEditing(false)}
                />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
