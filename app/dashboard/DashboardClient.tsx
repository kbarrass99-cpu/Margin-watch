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

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/products');
    const data = await res.json();
    if (res.ok) {
      setProducts(data.products || []);
      setError(null);
    } else {
      setError(data.error || 'Failed to load products');
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

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600" />
            MarginWatch
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500 hidden sm:inline">{userEmail}</span>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Tracked products</h1>
            <p className="text-sm text-slate-500 mt-1">
              {products.length} of 5 free products tracked
            </p>
          </div>
        </div>

        <AddProductForm onAdded={loadProducts} />

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
