'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AddProductForm from '@/components/AddProductForm';
import ProductCard from '@/components/ProductCard';
import PricingTable from '@/components/PricingTable';
import { PLANS, type PaidPlanId, type PlanId } from '@/lib/plans';

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
  created_at: string;
  sell_price: number | null;
  margin_alert_percent: number;
  snapshots: Snapshot[];
};

type Me = {
  email: string;
  plan: PlanId;
  limit: number;
};

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const [products, setProducts] = useState<Product[]>([]);
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
    setLoading(true);
    const [productsRes, meRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/me'),
    ]);
    const productsData = await productsRes.json();
    const meData = await meRes.json();

    if (productsRes.ok) {
      setProducts(productsData.products || []);
      setError(null);
    } else {
      setError(productsData.error || 'Failed to load products');
    }
    if (meRes.ok) setMe(meData);

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

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600" />
            MarginWatch
            {isPaid && (
              <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full ml-1">
                {PLANS[plan].name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500 hidden sm:inline">{userEmail}</span>
            {isPaid ? (
              <button
                onClick={handleManageBilling}
                disabled={billingBusy}
                className="text-slate-600 hover:text-slate-900 font-medium disabled:opacity-50"
              >
                Manage billing
              </button>
            ) : (
              <button
                onClick={() => setShowPlans((open) => !open)}
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                Upgrade
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {justUpgraded && (
          <div className="mb-6 text-sm bg-emerald-50 text-emerald-700 rounded-lg px-4 py-3">
            Thanks for upgrading! Your new plan may take a few seconds to show up below.
          </div>
        )}

        {pickerOpen && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">
                {atLimit
                  ? `You've reached the Free plan limit of ${limit} product. Pick a plan to track more.`
                  : 'Choose a plan'}
              </h2>
              {!atLimit && (
                <button
                  onClick={() => setShowPlans(false)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Close
                </button>
              )}
            </div>
            <PricingTable currentPlan={plan} onChoose={handleChoosePlan} busy={billingBusy} />
          </section>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Tracked products</h1>
            <p className="text-sm text-slate-500 mt-1">
              {products.length} of {limit} tracked on the {PLANS[plan].name} plan
            </p>
          </div>
        </div>

        <AddProductForm onAdded={loadProducts} />

        {atLimit && plan === 'starter' && (
          <div className="mt-4 flex items-center justify-between bg-indigo-50 rounded-2xl px-5 py-4">
            <p className="text-sm text-indigo-900">
              You&apos;ve reached the Starter limit of {limit} products. Switch to Pro for up to{' '}
              {PLANS.pro.productLimit} for ${PLANS.pro.monthlyPrice}/month.
            </p>
            <button
              onClick={handleManageBilling}
              disabled={billingBusy}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 whitespace-nowrap ml-4"
            >
              {billingBusy ? 'Loading…' : 'Switch to Pro'}
            </button>
          </div>
        )}

        {atLimit && plan === 'pro' && (
          <div className="mt-4 text-sm bg-slate-100 text-slate-700 rounded-2xl px-5 py-4">
            You&apos;re tracking the maximum of {limit} products on Pro. Remove a product to add
            another.
          </div>
        )}

        {error && (
          <div className="mt-6 text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3">{error}</div>
        )}

        {loading ? (
          <div className="mt-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : products.length === 0 ? (
          <div className="mt-10 text-center bg-white border border-dashed border-slate-300 rounded-2xl py-16">
            <p className="text-slate-500">You&apos;re not tracking any products yet.</p>
            <p className="text-sm text-slate-400 mt-1">
              Paste a supplier product link above to get started.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onChanged={loadProducts} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
