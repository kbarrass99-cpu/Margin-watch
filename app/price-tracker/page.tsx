import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';
import { SUPPLIER_PAGES } from '@/lib/supplierPages';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Supplier price trackers for dropshippers | MarginCanary',
  description:
    'Track supplier prices on AliExpress, CJdropshipping, eBay, Amazon, Etsy, Walmart, DHgate, Banggood and Shopify stores, and get an email before a price rise eats your margin.',
  alternates: { canonical: `${SITE.url}/price-tracker` },
};

export default function PriceTrackerIndex() {
  return (
    <main className="min-h-[100dvh]">
      <SiteHeader />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-20 md:pt-20">
        <p className="text-sm text-zinc-500">For dropshippers</p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter leading-none max-w-[20ch]">
          Supplier price trackers
        </h1>
        <p className="mt-5 text-base text-zinc-600 leading-relaxed max-w-[56ch]">
          Pick where you buy from to see exactly what MarginCanary reads there and which link to copy.
        </p>
        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUPPLIER_PAGES.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/price-tracker/${p.slug}`}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 hover:border-zinc-400 transition-colors"
              >
                <span>
                  <span className="block font-medium text-zinc-900">{p.name}</span>
                  <span className="block text-sm text-zinc-500">{p.readsStock ? 'Price and stock' : 'Price'}</span>
                </span>
                <ArrowRight size={16} weight="bold" className="text-zinc-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <SiteFooter />
    </main>
  );
}
