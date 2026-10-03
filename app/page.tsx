import Link from 'next/link';
import PricingTable from '@/components/PricingTable';
import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';
import HeroAlert from '@/components/marketing/HeroAlert';
import HowItWorks from '@/components/marketing/HowItWorks';
import MagneticLink from '@/components/marketing/MagneticLink';

export default function Home() {
  return (
    <main className="min-h-[100dvh]">
      <SiteHeader />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-20 md:pt-20 md:pb-28 grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-10 items-center">
        <div>
          <p className="text-sm text-zinc-500">For dropshipping stores</p>
          <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tighter leading-none max-w-[14ch]">
            Know the moment your margin disappears.
          </h1>
          <p className="mt-6 text-base text-zinc-600 leading-relaxed max-w-[52ch]">
            Other tools only watch your supplier&apos;s price. MarginCanary also knows what you sell
            for, so it emails you the moment a price hike eats into your margin, a product goes out
            of stock, or a variant disappears.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <MagneticLink
              href="/signup"
              className="inline-flex items-center rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
            >
              Track a product free
            </MagneticLink>
            <Link href="/#pricing" className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-400">Free for 1 product. No credit card.</p>
        </div>

        <HeroAlert />
      </section>

      <div className="border-t border-zinc-200" />

      <HowItWorks />

      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 pb-28 scroll-mt-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tighter leading-none">
              Pricing
            </h2>
            <p className="mt-4 text-zinc-600 leading-relaxed max-w-[36ch]">
              Start free with one product. Every plan gets the same alerts; you only pay for how
              many products you track.
            </p>
          </div>
          <PricingTable />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
