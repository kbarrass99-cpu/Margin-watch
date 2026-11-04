import Link from 'next/link';
import MarginGauge from '@/components/marketing/MarginGauge';
import TryCheck from '@/components/marketing/TryCheck';

// hero-v2 test variant: money-first copy, canary signal colour, the margin
// gauge, and a price check that ends in an inline free signup.
export default function HeroTest() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-20 md:pt-20 md:pb-28 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-14 md:gap-12 items-start">
      <div>
        <p className="inline-flex items-center gap-2 text-sm text-zinc-600">
          <span className="h-2 w-2 rounded-full bg-canary" aria-hidden />
          For dropshipping stores
        </p>
        <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tighter leading-none max-w-[15ch]">
          Your supplier put the price up. Did you notice?
        </h1>
        <p className="mt-5 text-base text-zinc-600 leading-relaxed max-w-[48ch]">
          MarginCanary checks your supplier&apos;s page every 6 hours and emails you the moment a price rise or
          stock-out starts costing you money.
        </p>
        <div className="mt-7 max-w-xl">
          <TryCheck />
        </div>
        <p className="mt-5 text-sm text-zinc-500">
          <Link href="/#pricing" className="whitespace-nowrap text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
            See pricing
          </Link>
          <span className="text-zinc-400"> &middot; </span>
          <Link href="/login" className="whitespace-nowrap text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
            Log in
          </Link>
        </p>
      </div>

      <div className="md:pt-10">
        <MarginGauge />
      </div>
    </section>
  );
}
