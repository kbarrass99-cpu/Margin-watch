import Link from 'next/link';
import { LogoMark } from '@/components/Logo';
import { SITE, companyFooterLine } from '@/lib/site';

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid gap-6 md:grid-cols-[2fr_1fr_1fr_1fr] text-sm">
        <div className="flex items-start gap-3 text-zinc-500">
          <LogoMark className="w-5 h-5 text-zinc-900 shrink-0" />
          <p className="max-w-[40ch]">
            MarginCanary tracks your supplier&apos;s price against what you sell for, and emails you
            when the gap gets too small.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/shopify" className="text-zinc-600 hover:text-zinc-900">For Shopify stores</Link>
          <Link href="/#pricing" className="text-zinc-600 hover:text-zinc-900">Pricing</Link>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/login" className="text-zinc-600 hover:text-zinc-900">Log in</Link>
          <Link href="/signup" className="text-zinc-600 hover:text-zinc-900">Create an account</Link>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/privacy" className="text-zinc-600 hover:text-zinc-900">Privacy</Link>
          <Link href="/terms" className="text-zinc-600 hover:text-zinc-900">Terms</Link>
          <a href={`mailto:${SITE.supportEmail}`} className="text-zinc-600 hover:text-zinc-900">Contact</a>
        </div>
      </div>
      <div className="border-t border-zinc-200">
        <p className="max-w-7xl mx-auto px-4 sm:px-6 py-5 text-xs text-zinc-500 leading-relaxed">
          &copy; {new Date().getFullYear()} {SITE.company.name}. {companyFooterLine()}
        </p>
      </div>
    </footer>
  );
}
