import Link from 'next/link';
import Logo from '@/components/Logo';

export default function SiteHeader() {
  return (
    <header className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-5">
      <Logo />
      <nav className="flex items-center gap-1 text-sm">
        <Link href="/shopify" className="hidden sm:inline px-3 py-2 text-zinc-600 hover:text-zinc-900 transition-colors">
          For Shopify stores
        </Link>
        <Link href="/#pricing" className="hidden sm:inline px-3 py-2 text-zinc-600 hover:text-zinc-900 transition-colors">
          Pricing
        </Link>
        <Link href="/login" className="px-3 py-2 text-zinc-600 hover:text-zinc-900 transition-colors">
          Log in
        </Link>
        <Link
          href="/signup"
          className="ml-1 bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-800 active:scale-[0.98] transition"
        >
          Start free
        </Link>
      </nav>
    </header>
  );
}
