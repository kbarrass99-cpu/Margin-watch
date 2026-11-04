import Link from 'next/link';
import HeroAlert from '@/components/marketing/HeroAlert';
import TryLink from '@/components/marketing/TryLink';

// The current homepage hero: control in the hero-v2 experiment.
export default function HeroControl() {
  return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-20 md:pt-20 md:pb-28 grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-10 items-center">
        <div>
          <p className="text-sm text-zinc-500">For dropshipping stores</p>
          <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tighter leading-none max-w-[14ch]">
            Know the moment your margin disappears.
          </h1>
          <p className="mt-5 text-base text-zinc-600 leading-relaxed max-w-[48ch]">
            MarginCanary watches your supplier&apos;s product page and emails you when a price rise eats into
            your profit or the item goes out of stock.
          </p>
          <div className="mt-7 max-w-xl">
            <TryLink />
          </div>
          <p className="mt-5 text-sm text-zinc-500">
            Rather set it up later?{' '}
            <Link href="/signup" className="whitespace-nowrap font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">
              Create a free account
            </Link>
            <span className="text-zinc-400"> &middot; </span>
            <Link href="/#pricing" className="whitespace-nowrap text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
              See pricing
            </Link>
          </p>
        </div>

        <HeroAlert />
      </section>
  );
}
