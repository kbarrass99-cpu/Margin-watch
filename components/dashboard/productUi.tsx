'use client';

import { useState } from 'react';
import { STATUS_LABEL, type ProductStatus, type ProductWithSnapshots } from '@/lib/margin';
import { currencySymbol } from '@/lib/money';
import { SELL_CURRENCIES, convert, type Rates } from '@/lib/fx';

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
  supplierCurrency,
  rates,
  supplierPrice,
  busy,
  onSave,
  onCancel,
}: {
  product: ProductWithSnapshots;
  supplierCurrency: string;
  rates?: Rates | null;
  // In the supplier's currency.
  supplierPrice: number | null;
  busy: boolean;
  onSave: (fields: Record<string, string | null>) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [sell, setSell] = useState(product.sell_price?.toString() ?? '');
  const [sellCurrency, setSellCurrency] = useState(product.sell_currency ?? supplierCurrency);
  const [extra, setExtra] = useState(product.extra_cost?.toString() ?? '');
  const [alertAt, setAlertAt] = useState(String(product.margin_alert_percent ?? 20));
  const sym = currencySymbol(sellCurrency);
  const sellNum = sell === '' ? null : Number(sell);
  const cost = convert(supplierPrice, supplierCurrency, sellCurrency, rates);
  const belowCost = sellNum != null && cost != null && sellNum <= cost + (Number(extra) || 0);
  const id = product.id;
  // The supplier's currency may not be in the list (e.g. CNY); offer it too.
  const options = SELL_CURRENCIES.some((c) => c.code === supplierCurrency)
    ? SELL_CURRENCIES
    : [...SELL_CURRENCIES, { code: supplierCurrency, name: "Supplier's currency" }];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await onSave({
      sell_price: sell || null,
      sell_currency: sellCurrency === supplierCurrency && !product.sell_currency ? null : sellCurrency,
      extra_cost: extra || null,
      margin_alert_percent: alertAt || '20',
    });
    if (ok) onCancel();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg bg-zinc-50 p-4 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`sell-${id}`} className="text-xs font-medium text-zinc-700">
          You sell it for ({sym.trim()})
        </label>
        <div className="flex gap-2">
          <select
            aria-label="Your selling currency"
            value={sellCurrency}
            onChange={(e) => setSellCurrency(e.target.value)}
            className="w-[5.5rem] shrink-0 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-base sm:text-sm focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5"
          >
            {options.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
          <input id={`sell-${id}`} type="number" inputMode="decimal" min="0" step="0.01" autoFocus value={sell} onChange={(e) => setSell(e.target.value)} className={`${field} min-w-0`} aria-describedby={`sell-help-${id}`} />
        </div>
        <p id={`sell-help-${id}`} className={`text-xs ${belowCost ? 'text-red-700' : 'text-zinc-500'}`}>
          {belowCost
            ? 'This is at or below what the product costs you.'
            : sell === '' && product.sell_price != null
              ? 'Leaving this empty turns margin alerts off.'
              : sellCurrency !== supplierCurrency && cost != null
                ? `Supplier price is about ${sym}${cost.toFixed(2)} at today's rate.`
                : sellCurrency !== supplierCurrency
                  ? "We'll convert the supplier's price at today's rate."
                  : 'Same currency as the supplier.'}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`extra-${id}`} className="text-xs font-medium text-zinc-700">
          Shipping and fees per sale
        </label>
        <input id={`extra-${id}`} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={extra} onChange={(e) => setExtra(e.target.value)} className={field} />
        <p className="text-xs text-zinc-500">In {sellCurrency}. Counted as cost in your margin.</p>
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

const REPORT_REASONS = [
  { id: 'not_found', label: "Price isn't being found" },
  { id: 'wrong_price', label: 'Price is wrong' },
  { id: 'wrong_stock', label: 'Stock is wrong' },
  { id: 'other', label: 'Something else' },
] as const;

type ReportReason = (typeof REPORT_REASONS)[number]['id'];

// "Report a problem": tells MarginCanary support straight away, with the
// product's latest checks attached on the server.
export function ReportProblem({
  productId,
  defaultReason,
  onClose,
}: {
  productId: string;
  defaultReason: ReportReason;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason>(defaultReason);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Your report could not be sent. Try again in a minute.');
        setState('idle');
        return;
      }
      setState('sent');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
        <span>Thanks. We&apos;ve been alerted and will look into this product. We&apos;ll email you when it&apos;s sorted.</span>
        <button type="button" onClick={onClose} className="min-h-[36px] px-2 font-medium text-emerald-900 hover:underline">
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg bg-zinc-50 p-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-medium text-zinc-700">What&apos;s wrong with this product?</legend>
        <div className="flex flex-wrap gap-2">
          {REPORT_REASONS.map((r) => (
            <label
              key={r.id}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ring-1 ring-inset transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-900 ${
                reason === r.id ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-300 hover:ring-zinc-400'
              }`}
            >
              <input
                type="radio"
                name={`report-reason-${productId}`}
                value={r.id}
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
                className="sr-only"
              />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`report-note-${productId}`} className="text-xs font-medium text-zinc-700">
          Anything else we should know? <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id={`report-note-${productId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="For example: the supplier page shows $12.40"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5"
        />
        {error ? (
          <p role="alert" className="text-xs text-red-700">{error}</p>
        ) : (
          <p className="text-xs text-zinc-500">We&apos;ll see the supplier link and your latest checks, so there&apos;s no need to repeat them.</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={state === 'sending'}
          className="min-h-[40px] rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
        >
          {state === 'sending' ? 'Sending…' : 'Send report'}
        </button>
        <button type="button" onClick={onClose} className="min-h-[40px] rounded-lg px-3 text-sm text-zinc-600 hover:text-zinc-900">
          Cancel
        </button>
      </div>
    </form>
  );
}
