import type { Metadata } from 'next';
import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';
import MagneticLink from '@/components/marketing/MagneticLink';
import ScrollMarginVisual from '@/components/marketing/shopify/ScrollMarginVisual';
import ChangeMarquee from '@/components/marketing/shopify/ChangeMarquee';
import Reveal from '@/components/marketing/shopify/Reveal';
import { PLANS, formatPrice } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'MarginCanary for Shopify dropshippers',
  description:
    'Your Shopify price stays put while supplier costs move. MarginCanary emails you when the gap gets too small.',
};

const STEPS = [
  {
    title: 'Copy the supplier link',
    body: 'Open the product you sell on Shopify and grab the supplier page you order from. AliExpress, CJ, Spocket or any other product page.',
  },
  {
    title: 'Paste it with your Shopify price',
    body: 'Enter what the product sells for in your store. MarginCanary reads the supplier price and works out your margin straight away.',
  },
  {
    title: 'Reprice before the next order',
    body: 'When the supplier raises the price or runs out, you get an email. Update the price in Shopify, or pause the product, before it sells at a loss.',
  },
];

export default function ShopifyPage() {
  return (
    <main className="min-h-[100dvh]">
      <SiteHeader />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-24 md:pt-28 md:pb-36">
        <div className="md:pl-[12vw]">
          <p className="text-sm text-zinc-500">For Shopify dropshippers</p>
          <h1 className="mt-5 text-4xl md:text-7xl font-semibold tracking-tighter leading-[0.95] max-w-[16ch]">
            Your Shopify price is fixed. Your supplier&apos;s isn&apos;t.
          </h1>
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-8">
          <p className="md:col-start-2 text-base text-zinc-600 leading-relaxed max-w-[48ch]">
            A supplier adds $3 to a product and your store keeps selling it at the old price. You
            find out from your payout. MarginCanary watches the supplier page and emails you first.
          </p>
          <div className="md:col-start-3 flex flex-col items-start gap-3">
            <MagneticLink
              href="/signup"
              className="inline-flex items-center rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
            >
              Watch your first product free
            </MagneticLink>
            <p className="text-xs text-zinc-400">Works with any Shopify store. Nothing to install.</p>
          </div>
        </div>
      </section>

      <ChangeMarquee />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-36 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-12 md:gap-20 items-center">
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter leading-none max-w-[12ch]">
            Watch the gap close.
          </h2>
          <p className="mt-6 text-zinc-600 leading-relaxed max-w-[40ch]">
            Your price in Shopify is the top line. The supplier&apos;s cost is the one that moves.
            Scroll to see what a $8.70 increase does to a $34 product.
          </p>
        </Reveal>
        <ScrollMarginVisual />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 md:pb-36">
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter leading-none md:pl-[12vw]">
            Three steps, no app install.
          </h2>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-x-10 gap-y-14">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.12} className={i === 0 ? 'md:pr-16' : 'md:pt-24'}>
              <div className="border-t border-zinc-900 pt-6">
                <span className="font-mono text-sm text-zinc-400">Step {i + 1}</span>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm text-zinc-600 leading-relaxed">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-10 items-end">
          <Reveal>
            <h2 className="text-3xl md:text-6xl font-semibold tracking-tighter leading-none max-w-[14ch]">
              Find out before your payout does.
            </h2>
          </Reveal>
          <div className="flex flex-col items-start gap-3">
            <MagneticLink
              href="/signup"
              className="inline-flex items-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              Start free
            </MagneticLink>
            <p className="text-xs text-zinc-400">1 product free. Paid plans from {formatPrice(PLANS.starter.yearlyPrice / 12)}/month.</p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
