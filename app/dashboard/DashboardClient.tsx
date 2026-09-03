'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AddProductForm from '@/components/AddProductForm';
import ProductCard from '@/components/ProductCard';

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
  snapshots: Snapshot[];
};

type Me = {
  email: string;
  plan: 'free' | 'pro';
  limit: number;
};

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [justUpgraded, setJustUpgraded] = useState(false);
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

  async function handleUpgrade() {
    setBillingBusy(true);
    const res = await fetch('/api/billing/checkout', { method: 'POST' });
    const data = await res.json();
    setBillingBusy(false);
    if (data.url) window.location.href = data.url;
  }

  async function handleManageBilling() {
    setBillingBusy(true);
    const res = await fetch('/api/billing/portal', { method: 'POST' });
    const data = await res.json();
    setBillingBusy(false);
    if (data.url) window.location.href = data.url;
  }

  const limit = me?.limit ?? 5;
  const isPro = me?.plan === 'pro';
  const atLimit = products.length >= limit;

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600" />
            MarginWatch
            {isPro && (
              <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full ml-1">
                Pro
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500 hidden sm:inline">{userEmail}</span>
            {isPro ? (
              <button
                onClick={handleManageBilling}
                disabled={billingBusy}
                className="text-slate-600 hover:text-slate-900 font-medium disabled:opacity-50"
              >
                Manage billing
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={billingBusy}
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
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
            You&apos;re on Pro now — thanks for upgrading! It may take a few seconds to reflect below.
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Tracked products</h1>
            <p className="text-sm text-slate-500 mt-1">
              {products.length} of {limit} {isPro ? 'Pro' : 'free'} products tracked
            </p>
          </div>
        </div>

        <AddProductForm onAdded={loadProducts} />

        {atLimit && !isPro && (
          <div className="mt-4 flex items-center justify-between bg-indigo-50 rounded-2xl px-5 py-4">
            <p className="text-sm text-indigo-900">
              You&apos;ve hit the free plan limit. Upgrade to Pro for up to {' '}
              {50} tracked products.
            </p>
            <button
              onClick={handleUpgrade}
              disabled={billingBusy}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 whitespace-nowrap ml-4"
            >
              {billingBusy ? 'Loading…' : 'Upgrade to Pro'}
            </button>
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
