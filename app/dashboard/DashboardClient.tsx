'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import AddProductForm from '@/components/AddProductForm';
import PricingTable from '@/components/PricingTable';
import Logo from '@/components/Logo';
import ProductRow from '@/components/dashboard/ProductRow';
import DeleteAccount from '@/components/dashboard/DeleteAccount';
import { FirstProductState, ProductTableSkeleton } from '@/components/dashboard/DashboardStates';
import { summarize, type ProductWithSnapshots } from '@/lib/margin';
import { PLANS, type PaidPlanId, type PlanId } from '@/lib/plans';

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
  const router = useRouter();

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

  const handleChoosePlan = (plan: PaidPlanId) => openBillingPage('/api/billing/checkout', { plan });
  const handleManageBilling = () => openBillingPage('/api/billing/portal');

  const plan: PlanId = me?.plan ?? 'free';
  const limit = me?.limit ?? PLANS.free.productLimit;
  const isPaid = plan !== 'free';
  const atLimit = products.length >= limit;
  const pickerOpen = !isPaid && (showPlans || atLimit);

  // Riskiest first: lowest margin at the top, products without a sell price last.
  const rows = useMemo(() => {
    return products
      .map((p) => ({ product: p, ...summarize(p) }))
      .sort((a, b) => {
        if (a.margin == null && b.margin == null) return 0;
        if (a.margin == null) return 1;
        if (b.margin == null) return -1;
        return a.margin - b.margin;
      });
  }, [products]);
  const atRiskCount = rows.filter((r) => r.atRisk).length;
  const outOfStockCount = rows.filter((r) => r.latest?.in_stock === false).length;
  const missingSellPrice = rows.filter((r) => r.product.sell_price == null).length;

  const isFirstRun = !loading && !error && products.length === 0;

  return (
    <main className="min-h-[100dvh]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" />
            {isPaid && (
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
              <h2 className="font-medium">
                {atLimit
                  ? `You've reached the Free plan limit of ${limit} product. Pick a plan to track more.`
                  : 'Choose a plan'}
              </h2>
              {!atLimit && (
                <button type="button" onClick={() => setShowPlans(false)} className="text-sm text-zinc-500 hover:text-zinc-900">
                  Close
                </button>
              )}
            </div>
            <PricingTable currentPlan={plan} onChoose={handleChoosePlan} busy={billingBusy} />
          </section>
        )}

        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Tracked products</h1>
          {!loading && products.length > 0 && (
            <p className="text-sm text-zinc-500">
              <span className={atRiskCount > 0 ? 'font-medium text-red-600' : ''}>
                <span className="font-mono">{atRiskCount}</span> of <span className="font-mono">{products.length}</span> below
                their margin line
              </span>
              {outOfStockCount > 0 && (
                <>
                  {' · '}
                  <span className="text-amber-700">
                    <span className="font-mono">{outOfStockCount}</span> out of stock
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
            <div className="mt-6 border-t border-zinc-200 pt-5">
              {atLimit ? (
                <p className="text-sm text-zinc-500">
                  {plan === 'starter' ? (
                    <>
                      You&apos;re tracking the Starter maximum of {limit}. Pro tracks up to{' '}
                      {PLANS.pro.productLimit} for ${PLANS.pro.monthlyPrice}/month.{' '}
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
                    <>Your Free plan covers {limit} product. Choose a plan above to track more.</>
                  )}
                </p>
              ) : (
                <AddProductForm onAdded={loadProducts} />
              )}
            </div>

            <div className="relative mt-8 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-zinc-400">
                    <th scope="col" className="pb-2 pl-3 pr-4 font-medium">Product</th>
                    <th scope="col" className="pb-2 px-3 font-medium text-right">Supplier</th>
                    <th scope="col" className="pb-2 px-3 font-medium hidden md:table-cell">Trend</th>
                    <th scope="col" className="pb-2 px-3 font-medium text-right">Sell</th>
                    <th scope="col" className="pb-2 px-3 font-medium text-right">Margin</th>
                    <th scope="col" className="pb-2 px-3 font-medium hidden md:table-cell">Stock</th>
                    <th scope="col" className="pb-2 px-3 font-medium hidden lg:table-cell">Checked</th>
                    <th scope="col" className="pb-2 pl-2 pr-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="border-b border-zinc-100">
                  {rows.map(({ product }) => (
                    <ProductRow key={product.id} product={product} onChanged={loadProducts} />
                  ))}
                </tbody>
              </table>
            </div>

            {missingSellPrice > 0 && (
              <p className="mt-4 text-xs text-zinc-500">
                <span className="font-mono">{missingSellPrice}</span> product{missingSellPrice === 1 ? ' has' : 's have'} no
                sell price yet, so {missingSellPrice === 1 ? 'it only gets' : 'they only get'} price and stock alerts.
              </p>
            )}
          </>
        )}

        {!loading && (
          <div className="mt-16 border-t border-zinc-200 pt-6">
            <DeleteAccount isPaid={isPaid} />
          </div>
        )}
      </div>
    </main>
  );
}
