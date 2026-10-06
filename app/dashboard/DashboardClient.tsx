'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import AddProductForm from '@/components/AddProductForm';
import PricingTable from '@/components/PricingTable';
import Logo from '@/components/Logo';
import ProductRow from '@/components/dashboard/ProductRow';
import ProductCard from '@/components/dashboard/ProductCard';
import DeleteAccount from '@/components/dashboard/DeleteAccount';
import { FirstProductState, ProductTableSkeleton } from '@/components/dashboard/DashboardStates';
import {
  changesSince,
  hoursUntil,
  nextScheduledCheck,
  NEEDS_ATTENTION,
  STATUS_RANK,
  summarize,
  timeAgo,
  type Change,
  type ProductWithSnapshots,
} from '@/lib/margin';
import { PLANS, formatGBP, type BillingInterval, type PaidPlanId, type PlanId } from '@/lib/plans';

type Me = {
  email: string;
  plan: PlanId;
  limit: number;
};

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const [products, setProducts] = useState<ProductWithSnapshots[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [justUpgraded, setJustUpgraded] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [view, setView] = useState<'attention' | 'all'>('all');
  const [query, setQuery] = useState('');
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const viewChosen = useRef(false);
  const router = useRouter();

  // "What changed" compares against the previous visit to this page on this device.
  useEffect(() => {
    let previous: string | null = null;
    try {
      previous = window.localStorage.getItem('mc:lastVisit');
      window.localStorage.setItem('mc:lastVisit', new Date().toISOString());
    } catch {
      previous = null;
    }
    setLastVisit(previous ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJustUpgraded(new URLSearchParams(window.location.search).get('upgraded') === '1');
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const [productsRes, meRes] = await Promise.all([fetch('/api/products'), fetch('/api/me')]);
      const productsData = await productsRes.json().catch(() => ({}));
      const meData = await meRes.json().catch(() => null);

      if (productsRes.ok) {
        setProducts(productsData.products || []);
        setError(null);
      } else {
        setError(productsData.error || 'Your products could not be loaded. Refresh the page to try again.');
      }
      if (meRes.ok && meData) setMe(meData);
    } catch {
      setError('Could not reach the server. Check your connection, then refresh the page.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  async function openBillingPage(endpoint: string, body?: object) {
    setBillingBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || 'Something went wrong opening billing. Please try again.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setBillingBusy(false);
  }

  const handleChoosePlan = (plan: PaidPlanId, interval: BillingInterval) =>
    openBillingPage('/api/billing/checkout', { plan, interval });
  const handleManageBilling = () => openBillingPage('/api/billing/portal');

  const plan: PlanId = me?.plan ?? 'free';
  const limit = me?.limit ?? PLANS.free.productLimit;
  const isPaid = plan !== 'free';
  const atLimit = products.length >= limit;
  const pickerOpen = !isPaid && showPlans;

  // Most urgent first (margin at risk, out of stock, failed or stale checks),
  // then lowest margin, products without a sell price last within each group.
  const rows = useMemo(() => {
    return products
      .map((p) => ({ product: p, ...summarize(p) }))
      .sort((a, b) => {
        const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (byStatus !== 0) return byStatus;
        if (a.margin == null && b.margin == null) return 0;
        if (a.margin == null) return 1;
        if (b.margin == null) return -1;
        return a.margin - b.margin;
      });
  }, [products]);
  const attentionRows = rows.filter((r) => NEEDS_ATTENTION.includes(r.status));
  const atRiskCount = rows.filter((r) => r.status === 'at_risk').length;
  const outOfStockCount = rows.filter((r) => r.status === 'out_of_stock').length;
  const failedCount = rows.filter((r) => r.status === 'check_failed' || r.status === 'stale').length;
  const missingSellPrice = rows.filter((r) => r.product.sell_price == null).length;

  // Open on "Needs attention" when something does, unless the person picked a view.
  useEffect(() => {
    if (!viewChosen.current) setView(attentionRows.length > 0 ? 'attention' : 'all');
  }, [attentionRows.length]);

  const q = query.trim().toLowerCase();
  const visible = (view === 'attention' ? attentionRows : rows).filter(
    (r) => !q || (r.product.title || '').toLowerCase().includes(q) || r.product.source_url.toLowerCase().includes(q)
  );
  const changes: Change[] = useMemo(
    () => (lastVisit ? changesSince(products, lastVisit) : []),
    [products, lastVisit]
  );
  const nextCheck = nextScheduledCheck();

  const isFirstRun = !loading && !error && products.length === 0;

  return (
    <main className="min-h-[100dvh]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" />
            {me && (
              <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">
                {PLANS[plan].name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-zinc-400 hidden md:inline mr-3">{userEmail}</span>
            {isPaid ? (
              <button
                type="button"
                onClick={handleManageBilling}
                disabled={billingBusy}
                className="px-2.5 py-1.5 text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
              >
                Billing
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowPlans((open) => !open)}
                className="px-2.5 py-1.5 font-medium text-accent hover:text-accent-hover"
                aria-expanded={pickerOpen}
              >
                Upgrade
              </button>
            )}
            <button type="button" onClick={handleSignOut} className="px-2.5 py-1.5 text-zinc-600 hover:text-zinc-900">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {justUpgraded && (
          <p className="mb-6 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle size={16} weight="bold" />
            Thanks for upgrading. Your new plan can take a few seconds to show up.
          </p>
        )}

        {pickerOpen && (
          <section className="mb-10">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <h2 className="font-medium">Choose a plan</h2>
              <button type="button" onClick={() => setShowPlans(false)} className="min-h-[36px] px-2 text-sm text-zinc-600 hover:text-zinc-900">
                Close
              </button>
            </div>
            <PricingTable currentPlan={plan} onChoose={handleChoosePlan} busy={billingBusy} />
          </section>
        )}

        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Tracked products</h1>
          {!loading && products.length > 0 && (
            <p className="text-sm text-zinc-600">
              <span className={atRiskCount > 0 ? 'font-medium text-red-700' : ''}>
                <span className="font-mono">{atRiskCount}</span> of <span className="font-mono">{products.length}</span> at or
                below their margin alert
              </span>
              {outOfStockCount > 0 && (
                <>
                  {' · '}
                  <span className="text-amber-800">
                    <span className="font-mono">{outOfStockCount}</span> out of stock
                  </span>
                </>
              )}
              {failedCount > 0 && (
                <>
                  {' · '}
                  <span className="text-amber-800">
                    <span className="font-mono">{failedCount}</span> not read lately
                  </span>
                </>
              )}
              {' · '}
              <span className="font-mono">{products.length}</span>/<span className="font-mono">{limit}</span> on{' '}
              {PLANS[plan].name}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-6 flex items-start gap-2 text-sm text-red-700">
            <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        {loading ? (
          <ProductTableSkeleton />
        ) : isFirstRun ? (
          <FirstProductState onAdded={loadProducts} limit={limit} />
        ) : (
          <>
            <section aria-labelledby="changes-title" className="mt-6 rounded-lg border border-zinc-200 bg-white px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 id="changes-title" className="text-sm font-semibold">
                  {changes.length > 0 ? 'What changed since your last visit' : 'No supplier changes since your last visit'}
                </h2>
                <p className="text-xs text-zinc-500">
                  Next scheduled check in <span className="font-mono">{hoursUntil(nextCheck)}</span>
                </p>
              </div>
              {changes.length > 0 ? (
                <ul className="mt-3 divide-y divide-zinc-100">
                  {changes.slice(0, 5).map((c, i) => (
                    <li key={`${c.productId}-${c.at}-${i}`} className="flex flex-col gap-0.5 py-2 text-sm sm:flex-row sm:items-baseline sm:gap-4">
                      <span className="min-w-0 truncate font-medium text-zinc-900 sm:flex-1">{c.title}</span>
                      <span className="flex items-baseline justify-between gap-4 sm:justify-end">
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            c.kind === 'price_up' || c.kind === 'out_of_stock' ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {c.text}
                        </span>
                        <span className="w-14 shrink-0 text-right text-xs text-zinc-500">{timeAgo(c.at)}</span>
                      </span>
                    </li>
                  ))}
                  {changes.length > 5 && (
                    <li className="pt-2 text-xs text-zinc-500">and {changes.length - 5} more in the product histories</li>
                  )}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-zinc-600">
                  Prices and stock held steady on every product we could read. You&apos;ll get an email the moment that changes.
                </p>
              )}
            </section>

            <div className="mt-6 border-t border-zinc-200 pt-5">
              {atLimit ? (
                <p className="text-sm text-zinc-600">
                  {plan === 'starter' ? (
                    <>
                      You&apos;re tracking the Starter maximum of {limit}. Pro tracks up to{' '}
                      {PLANS.pro.productLimit} from {formatGBP(PLANS.pro.yearlyPrice / 12)}/month.{' '}
                      <button
                        type="button"
                        onClick={handleManageBilling}
                        disabled={billingBusy}
                        className="font-medium text-accent hover:text-accent-hover disabled:opacity-50"
                      >
                        {billingBusy ? 'Opening billing…' : 'Switch to Pro'}
                      </button>
                    </>
                  ) : plan === 'pro' ? (
                    <>You&apos;re tracking the Pro maximum of {limit}. Stop tracking one to add another.</>
                  ) : (
                    <>
                      Free covers {limit} product. Starter tracks {PLANS.starter.productLimit} from{' '}
                      {formatGBP(PLANS.starter.yearlyPrice / 12)}/month.{' '}
                      <button
                        type="button"
                        onClick={() => setShowPlans(true)}
                        className="font-medium text-accent hover:text-accent-hover"
                        aria-expanded={pickerOpen}
                      >
                        See plans
                      </button>
                    </>
                  )}
                </p>
              ) : (
                <AddProductForm onAdded={loadProducts} />
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Which products to show" className="inline-flex rounded-lg bg-zinc-100 p-1 text-sm">
                {(
                  [
                    ['attention', `Needs attention (${attentionRows.length})`],
                    ['all', `All products (${rows.length})`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={view === key}
                    onClick={() => {
                      viewChosen.current = true;
                      setView(key);
                    }}
                    className={`min-h-[36px] rounded-md px-3 font-medium transition ${
                      view === key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {rows.length > 8 && (
                <div className="w-full sm:w-64">
                  <label htmlFor="product-search" className="sr-only">
                    Search products
                  </label>
                  <input
                    id="product-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or supplier"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base sm:text-sm placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5"
                  />
                </div>
              )}
            </div>

            {visible.length === 0 ? (
              <p className="mt-6 border-t border-zinc-100 pt-6 text-sm text-zinc-600">
                {q
                  ? 'No products match that search.'
                  : 'Nothing needs your attention. Every margin is above its alert line, everything is in stock and every check went through.'}
              </p>
            ) : (
              <>
                <ul className="mt-4 md:hidden">
                  {visible.map(({ product }) => (
                    <ProductCard key={product.id} product={product} onChanged={loadProducts} />
                  ))}
                </ul>

                <div className="relative mt-4 hidden md:block">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs text-zinc-500">
                        <th scope="col" className="pb-2 pl-3 pr-4 font-medium">Product</th>
                        <th scope="col" className="pb-2 px-3 font-medium">Status</th>
                        <th scope="col" className="pb-2 px-3 font-medium text-right">Supplier</th>
                        <th scope="col" className="pb-2 px-3 font-medium hidden lg:table-cell">Trend</th>
                        <th scope="col" className="pb-2 px-3 font-medium text-right">You sell</th>
                        <th scope="col" className="pb-2 px-3 font-medium text-right">Margin / alert</th>
                        <th scope="col" className="pb-2 px-3 font-medium">Checked</th>
                        <th scope="col" className="pb-2 pl-2 pr-3"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="border-b border-zinc-100">
                      {visible.map(({ product }) => (
                        <ProductRow key={product.id} product={product} onChanged={loadProducts} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {missingSellPrice > 0 && (
              <p className="mt-4 text-xs text-zinc-600">
                <span className="font-mono">{missingSellPrice}</span> product{missingSellPrice === 1 ? ' has' : 's have'} no
                sell price yet, so {missingSellPrice === 1 ? 'it only gets' : 'they only get'} price and stock alerts.
              </p>
            )}
          </>
        )}

        {!loading && (
          <div className="mt-24 border-t border-zinc-200 pt-6">
            <DeleteAccount isPaid={isPaid} />
          </div>
        )}
      </div>
    </main>
  );
}
