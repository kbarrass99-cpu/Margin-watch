import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600" />
          MarginWatch
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
          Built for AliExpress & dropshipping suppliers
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Know the moment your supplier
          <br className="hidden sm:block" /> changes the price.
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
          Paste your supplier product links. MarginWatch checks them automatically and emails
          you the instant a price jumps, a product goes out of stock, or a variant disappears —
          so you never sell at a stale price again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Start tracking for free
          </Link>
        </div>
        <p className="text-sm text-slate-400 mt-4">Free for up to 5 products. No credit card.</p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-6">
        {[
          {
            title: 'Paste a link',
            body: 'Add any supplier product URL — no browser extension or store integration needed.',
          },
          {
            title: 'We watch it for you',
            body: 'MarginWatch checks price, stock, and variants on a schedule, around the clock.',
          },
          {
            title: 'Get alerted instantly',
            body: 'The moment something changes past your threshold, you get an email — before it costs you money.',
          },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-center text-xs text-slate-400">
        MarginWatch — a simple price &amp; stock watcher for dropshippers.
      </footer>
    </main>
  );
}
