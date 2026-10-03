import Link from 'next/link';
import PricingTable from '@/components/PricingTable';

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600" />
          MarginCanary
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Start free
          </Link>
        </nav>
      </header>

      <section className="max-w-4xl mx-auto text-center px-6 pt-16 pb-20">
        <div className="inline-flex items-center gap-2 text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full mb-6">
          Built for dropshipping suppliers
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Know the moment your
          <br className="hidden sm:block" /> margin disappears.
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
          Other tools just watch your supplier's price. MarginCanary knows what you actually
          sell for — so it emails you the instant a supplier price hike eats into your margin,
          a product goes out of stock, or a variant disappears. Never find out you've been
          selling at a loss.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Start tracking for free
          </Link>
        </div>
        <p className="text-sm text-slate-400 mt-4">Free for 1 product. No credit card.</p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-6">
        {[
          {
            title: 'Paste a link, add your price',
            body: 'Add any supplier product URL and what you sell it for — no browser extension or store integration needed.',
          },
          {
            title: 'We watch your margin',
            body: 'MarginCanary checks supplier price, stock, and variants on a schedule, and does the margin math for you.',
          },
          {
            title: 'Get alerted before it costs you',
            body: 'The moment your margin drops below the threshold you set — or stock changes — you get an email.',
          },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <section id="pricing" className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-2">Simple pricing</h2>
        <p className="text-center text-slate-600 mb-10">
          Start free with one product. Upgrade when you&apos;re tracking more.
        </p>
        <PricingTable />
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-center text-xs text-slate-400">
        MarginCanary — the only supplier watcher that tracks your actual profit margin.
      </footer>
    </main>
  );
}
