import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Minus } from '@phosphor-icons/react/dist/ssr';
import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';
import TryLink from '@/components/marketing/TryLink';
import { COMMON_FAQ, SUPPLIER_PAGES, supplierPage } from '@/lib/supplierPages';
import { SITE } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return SUPPLIER_PAGES.map((p) => ({ supplier: p.slug }));
}

export async function generateMetadata(props: { params: Promise<{ supplier: string }> }): Promise<Metadata> {
  const page = supplierPage((await props.params).supplier);
  if (!page) return {};
  const url = `${SITE.url}/price-tracker/${page.slug}`;
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: page.metaTitle, description: page.metaDescription, url, siteName: SITE.name, type: 'website' },
  };
}

export default async function SupplierPriceTrackerPage(props: { params: Promise<{ supplier: string }> }) {
  const page = supplierPage((await props.params).supplier);
  if (!page) notFound();

  const faq = [...page.faq, ...COMMON_FAQ];
  const others = SUPPLIER_PAGES.filter((p) => p.slug !== page.slug);
  const reads = [
    { label: 'Price', yes: true },
    { label: 'Stock (out of stock and back in stock)', yes: page.readsStock },
    { label: 'Your margin after the supplier price, shipping and fees', yes: true },
  ];
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <main className="min-h-[100dvh]">
      <SiteHeader />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 md:pt-20 md:pb-24 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-12 md:gap-16 items-start">
        <div>
          <p className="text-sm text-zinc-500">For dropshippers who buy from {page.name}</p>
          <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter leading-none max-w-[18ch]">{page.h1}</h1>
          <p className="mt-5 text-base text-zinc-600 leading-relaxed max-w-[56ch]">{page.intro}</p>
          <div className="mt-7 max-w-xl">
            <TryLink placeholder={page.placeholder} examples={page.example.url ? [page.example] : []} />
          </div>
          <p className="mt-5 text-sm text-zinc-500">
            Free for 1 product. No credit card.{' '}
            <Link href="/signup" className="whitespace-nowrap font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">
              Create a free account
            </Link>
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8 shadow-[0_20px_40px_-20px_rgba(24,24,27,0.12)]">
          <h2 className="text-lg font-semibold tracking-tight">What MarginCanary reads from {page.name}</h2>
          <ul className="mt-4 divide-y divide-zinc-100">
            {reads.map((r) => (
              <li key={r.label} className="flex items-start gap-3 py-3 text-sm">
                {r.yes ? (
                  <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-emerald-600" aria-label="Yes" />
                ) : (
                  <Minus size={16} weight="bold" className="mt-0.5 shrink-0 text-zinc-400" aria-label="No" />
                )}
                <span className={r.yes ? 'text-zinc-800' : 'text-zinc-500'}>{r.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-zinc-600 leading-relaxed">Prices come from {page.source}, checked every 6 hours.</p>
          {page.stockNote && <p className="mt-3 text-sm text-zinc-500 leading-relaxed">{page.stockNote}</p>}
        </div>
      </section>

      <section className="border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tighter leading-tight">Which {page.name} link to copy</h2>
            <ol className="mt-6 space-y-4">
              {page.linkSteps.map((step, i) => (
                <li key={step} className="flex gap-4 text-zinc-700 leading-relaxed">
                  <span className="font-mono text-sm text-zinc-400 pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tighter leading-tight">Good to know</h2>
            <ul className="mt-6 space-y-4">
              {page.tips.map((tip) => (
                <li key={tip} className="border-l-2 border-zinc-200 pl-4 text-zinc-700 leading-relaxed">
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-20">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tighter leading-tight">Questions</h2>
          <div className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
            {faq.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none font-medium text-zinc-900 flex justify-between gap-4">
                  {f.q}
                  <span className="text-zinc-400 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-2 text-zinc-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-sm font-medium text-zinc-500">MarginCanary also tracks</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/price-tracker/${o.slug}`}
                  className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <SiteFooter />
    </main>
  );
}
