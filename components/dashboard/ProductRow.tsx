'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowClockwise, ArrowUpRight, ChartLineUp, PencilSimple, Trash } from '@phosphor-icons/react';
import Sparkline from '@/components/Sparkline';
import { hostOf, money, summarize, timeAgo, type ProductWithSnapshots } from '@/lib/margin';

const iconButton =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.96] disabled:opacity-40';

export default function ProductRow({
  product,
  onChanged,
}: {
  product: ProductWithSnapshots;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [sellPriceInput, setSellPriceInput] = useState(product.sell_price?.toString() ?? '');
  const [rowError, setRowError] = useState<string | null>(null);

  const { sorted, latest, priceChange, margin, marginDollar, atRisk } = summarize(product);

  async function run(request: () => Promise<Response>, failMessage: string) {
    setBusy(true);
    setRowError(null);
    try {
      const res = await request();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRowError(data.error || failMessage);
        setBusy(false);
        return false;
      }
    } catch {
      setRowError('Could not reach the server. Check your connection and try again.');
      setBusy(false);
      return false;
    }
    setBusy(false);
    onChanged();
    return true;
  }

  const handleCheckNow = () =>
    run(() => fetch(`/api/check/${product.id}`, { method: 'POST' }), 'The check failed. Try again in a minute.');

  const handleDelete = () =>
    run(() => fetch(`/api/products/${product.id}`, { method: 'DELETE' }), 'Could not stop tracking this product.');

  async function handleSaveSellPrice(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(
      () =>
        fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sell_price: sellPriceInput || null }),
        }),
      'Could not save the sell price.'
    );
    if (ok) setEditing(false);
  }

  const stock =
    latest?.in_stock === false ? (
      <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">Out of stock</span>
    ) : latest?.in_stock === true ? (
      <span className="text-xs text-zinc-500">In stock</span>
    ) : (
      <span className="text-xs text-zinc-300">—</span>
    );

  return (
    <>
      <tr className={`group align-middle border-t border-zinc-100 ${atRisk ? 'bg-red-50/40' : ''}`}>
        <td className="py-2.5 pl-3 pr-4 min-w-[10rem] md:min-w-0 md:max-w-0 md:w-[34%]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-zinc-100">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <Link
                href={`/dashboard/products/${product.id}`}
                className="line-clamp-2 md:line-clamp-1 break-words text-sm font-medium text-zinc-900 hover:underline underline-offset-2"
              >
                {product.title || hostOf(product.source_url)}
              </Link>
              <a
                href={product.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-xs text-zinc-400 hover:text-zinc-700"
              >
                {hostOf(product.source_url)}
                <ArrowUpRight size={11} weight="bold" />
              </a>
            </div>
          </div>
        </td>

        <td className="py-2.5 px-3 text-right whitespace-nowrap">
          <span className="font-mono text-sm tabular-nums">{money(latest?.price)}</span>
          {priceChange !== null && Math.abs(priceChange) > 0.01 && (
            <span
              className={`ml-1.5 hidden sm:inline font-mono text-xs tabular-nums ${
                priceChange > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {priceChange > 0 ? '+' : '−'}
              {Math.abs(priceChange).toFixed(1)}%
            </span>
          )}
        </td>

        <td className="py-2.5 px-3 hidden md:table-cell">
          <Sparkline data={sorted.map((s) => s.price ?? 0)} tone={priceChange != null && priceChange > 0 ? 'bad' : 'neutral'} />
        </td>

        <td className="py-2.5 px-3 text-right whitespace-nowrap">
          {editing ? (
            <form onSubmit={handleSaveSellPrice} className="flex items-center justify-end gap-1.5">
              <label htmlFor={`sell-${product.id}`} className="sr-only">
                Your sell price
              </label>
              <input
                id={`sell-${product.id}`}
                type="number"
                min="0"
                step="0.01"
                autoFocus
                value={sellPriceInput}
                onChange={(e) => setSellPriceInput(e.target.value)}
                className="w-20 rounded border border-zinc-300 px-1.5 py-1 text-right font-mono text-sm focus:border-zinc-900 focus:outline-none"
              />
              <button type="submit" disabled={busy} className="text-xs font-medium text-accent hover:text-accent-hover disabled:opacity-50">
                Save
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-zinc-400 hover:text-zinc-700">
                Cancel
              </button>
            </form>
          ) : product.sell_price != null ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 font-mono text-sm tabular-nums text-zinc-700 hover:text-zinc-900"
              aria-label={`Edit sell price, currently ${money(product.sell_price)}`}
            >
              {money(product.sell_price)}
              <PencilSimple size={12} className="text-zinc-300 group-hover:text-zinc-500" />
            </button>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-accent hover:text-accent-hover">
              Add sell price
            </button>
          )}
        </td>

        <td className="py-2.5 px-3 text-right whitespace-nowrap">
          {margin != null ? (
            <span
              title={`${money(marginDollar)} per sale. Alert at ${product.margin_alert_percent}%.`}
              className={`rounded px-1.5 py-0.5 font-mono text-xs tabular-nums ${
                atRisk ? 'bg-red-100 text-red-700' : 'text-zinc-700'
              }`}
            >
              {margin.toFixed(1)}%
            </span>
          ) : (
            <span className="text-xs text-zinc-300">—</span>
          )}
        </td>

        <td className="py-2.5 px-3 hidden md:table-cell whitespace-nowrap">{stock}</td>

        <td className="py-2.5 px-3 hidden lg:table-cell whitespace-nowrap text-xs text-zinc-400">
          {latest ? (
            <time dateTime={latest.checked_at} title={new Date(latest.checked_at).toLocaleString()}>
              {timeAgo(latest.checked_at)}
            </time>
          ) : (
            'Not checked'
          )}
        </td>

        <td className="py-2.5 pl-2 pr-3 whitespace-nowrap">
          {confirmingDelete ? (
            <div className="flex items-center justify-end gap-2 text-xs">
              <span className="text-zinc-500">Stop tracking?</span>
              <button type="button" onClick={handleDelete} disabled={busy} className="font-medium text-red-600 hover:text-red-700">
                Yes
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} className="text-zinc-500 hover:text-zinc-900">
                No
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-0.5">
              <button type="button" onClick={handleCheckNow} disabled={busy} className={iconButton} aria-label="Check now" title="Check now">
                <ArrowClockwise size={15} weight="bold" className={busy ? 'animate-spin' : ''} />
              </button>
              <Link href={`/dashboard/products/${product.id}`} className={iconButton} aria-label="Margin history" title="Margin history">
                <ChartLineUp size={15} weight="bold" />
              </Link>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
                className={`${iconButton} hover:!text-red-600`}
                aria-label="Stop tracking"
                title="Stop tracking"
              >
                <Trash size={15} weight="bold" />
              </button>
            </div>
          )}
        </td>
      </tr>

      {(rowError || (latest && !latest.in_stock && !latest.price)) && (
        <tr>
          <td colSpan={8} className="px-3 pb-2.5 pt-0 pl-14 text-xs">
            {rowError ? (
              <span role="alert" className="text-red-600">{rowError}</span>
            ) : (
              <span className="text-amber-700">{latest!.raw_status}</span>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
