'use client';

import { useState } from 'react';
import { STATUS_LABEL, type ProductStatus, type ProductWithSnapshots } from '@/lib/margin';
import { currencySymbol } from '@/lib/money';

// Shared pieces for the desktop table row and the phone card.

const CHIP: Record<ProductStatus, string> = {
  at_risk: 'bg-red-50 text-red-700 ring-red-600/15',
  out_of_stock: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  check_failed: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  stale: 'bg-zinc-100 text-zinc-700 ring-zinc-500/15',
  not_checked: 'bg-zinc-100 text-zinc-600 ring-zinc-500/15',
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
};

const DOT: Record<ProductStatus, string> = {
  at_risk: 'bg-red-500',
  out_of_stock: 'bg-amber-500',
  check_failed: 'bg-amber-500',
  stale: 'bg-zinc-400',
  not_checked: 'bg-zinc-300',
  ok: 'bg-emerald-500',
};

export function StatusChip({ status }: { status: ProductStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CHIP[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

// Busy/error handling for the row actions, shared by row and card.
export function useProductActions(productId: string, onChanged: () => void) {
  const [busy, setBusy] = useState<null | 'check' | 'save' | 'delete'>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: 'check' | 'save' | 'delete', request: () => Promise<Response>, failMessage: string) {
    setBusy(kind);
    setError(null);
    try {
      const res = await request();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || failMessage);
        setBusy(null);
        return false;
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setBusy(null);
      return false;
    }
    setBusy(null);
    onChanged();
    return true;
  }

  return {
    busy,
    error,
    checkNow: () =>
      run('check', () => fetch(`/api/check/${productId}`, { method: 'POST' }), 'The check failed. Try again in a minute.'),
    remove: () =>
      run('delete', () => fetch(`/api/products/${productId}`, { method: 'DELETE' }), 'Could not stop tracking this product.'),
    save: (fields: Record<string, string | null>) =>
      run(
        'save',
        () =>
          fetch(`/api/products/${productId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
          }),
        'Your changes could not be saved.'
      ),
  };
}

const field =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-base sm:text-sm tabular-nums focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5';

// Sell price, shipping and fees, and the alert line, edited together.
export function ProductSettings({
  product,
  currency,
  supplierPrice,
  busy,
  onSave,
  onCancel,
}: {
  product: ProductWithSnapshots;
  currency: string | null;
  supplierPrice: number | null;
  busy: boolean;
  onSave: (fields: Record<string, string | null>) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [sell, setSell] = useState(product.sell_price?.toString() ?? '');
  const [extra, setExtra] = useState(product.extra_cost?.toString() ?? '');
  const [alertAt, setAlertAt] = useState(String(product.margin_alert_percent ?? 20));
  const sym = currencySymbol(currency);
  const sellNum = sell === '' ? null : Number(sell);
  const belowCost = sellNum != null && supplierPrice != null && sellNum <= supplierPrice + (Number(extra) || 0);
  const id = product.id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await onSave({ sell_price: sell || null, extra_cost: extra || null, margin_alert_percent: alertAt || '20' });
    if (ok) onCancel();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg bg-zinc-50 p-4 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`sell-${id}`} className="text-xs font-medium text-zinc-700">
          You sell it for ({sym.trim()})
        </label>
        <input id={`sell-${id}`} type="number" inputMode="decimal" min="0" step="0.01" autoFocus value={sell} onChange={(e) => setSell(e.target.value)} className={field} aria-describedby={`sell-help-${id}`} />
        <p id={`sell-help-${id}`} className={`text-xs ${belowCost ? 'text-red-700' : 'text-zinc-500'}`}>
          {belowCost
            ? 'This is at or below what the product costs you.'
            : sell === '' && product.sell_price != null
              ? 'Leaving this empty turns margin alerts off.'
              : 'Use the same currency as the supplier.'}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`extra-${id}`} className="text-xs font-medium text-zinc-700">
          Shipping and fees per sale
        </label>
        <input id={`extra-${id}`} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={extra} onChange={(e) => setExtra(e.target.value)} className={field} />
        <p className="text-xs text-zinc-500">Counted as cost in your margin.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`alert-${id}`} className="text-xs font-medium text-zinc-700">
          Alert me when margin falls to
        </label>
        <div className="relative">
          <input id={`alert-${id}`} type="number" inputMode="decimal" min="0" max="100" step="0.5" value={alertAt} onChange={(e) => setAlertAt(e.target.value)} className={`${field} pr-8`} />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
        </div>
        <p className="text-xs text-zinc-500">Default is 20%.</p>
      </div>
      <div className="flex items-center gap-2 sm:col-span-3">
        <button type="submit" disabled={busy} className="min-h-[40px] rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="min-h-[40px] rounded-lg px-3 text-sm text-zinc-600 hover:text-zinc-900">
          Cancel
        </button>
      </div>
    </form>
  );
}
