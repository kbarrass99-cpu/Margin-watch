import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { createClient } from '@/lib/supabase/server';
import Logo from '@/components/Logo';
import MarginChart from '@/components/dashboard/MarginChart';
import { hostOf, marginPercent, money, summarize, type ProductWithSnapshots } from '@/lib/margin';
import type { Alert } from '@/lib/types';

const ALERT_LABEL: Record<Alert['type'], string> = {
  price_up: 'Price went up',
  price_down: 'Price went down',
  out_of_stock: 'Went out of stock',
  back_in_stock: 'Back in stock',
  margin_below_threshold: 'Margin below alert line',
};

export default async function ProductHistoryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: product }, { data: alerts }] = await Promise.all([
    supabase
      .from('tracked_products')
      .select('*, snapshots(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('alerts')
      .select('*')
      .eq('tracked_product_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (!product) notFound();

  const p = product as ProductWithSnapshots;
  const { sorted, latest, margin, marginDollar, atRisk } = summarize(p);

  // Change log: the first check, then only checks where price or stock moved.
  const changes = sorted
    .map((s, i) => ({ s, prev: sorted[i - 1] }))
    .filter(({ s, prev }) => !prev || s.price !== prev.price || s.in_stock !== prev.in_stock)
    .reverse();
  const hiddenChecks = sorted.length - changes.length;

  const stats = [
    { label: 'Supplier price', value: money(latest?.price) },
    { label: 'You sell for', value: money(p.sell_price) },
    { label: 'Margin', value: margin != null ? `${margin.toFixed(1)}%` : '—', bad: atRisk },
    { label: 'Per sale', value: money(marginDollar), bad: atRisk },
    { label: 'Alert line', value: `${p.margin_alert_percent}%` },
    { label: 'Checks', value: String(sorted.length) },
  ];

  return (
    <main className="min-h-[100dvh]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <Logo href="/dashboard" />
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900">
            <ArrowLeft size={14} weight="bold" />
            All products
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">{p.title || hostOf(p.source_url)}</h1>
          <a
            href={p.source_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-zinc-400 hover:text-zinc-700"
          >
            {hostOf(p.source_url)}
            <ArrowUpRight size={11} weight="bold" />
          </a>
        </div>

        <dl className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-y border-zinc-200 divide-x divide-zinc-100">
          {stats.map((s) => (
            <div key={s.label} className="px-3 py-3 first:pl-0">
              <dt className="text-[11px] uppercase tracking-wider text-zinc-400">{s.label}</dt>
              <dd className={`mt-1 font-mono text-lg tabular-nums ${s.bad ? 'text-red-600' : ''}`}>{s.value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-10">
          <h2 className="text-sm font-medium">{p.sell_price != null ? 'Margin over time' : 'Supplier price over time'}</h2>
          <div className="mt-4">
            <MarginChart snapshots={sorted} sellPrice={p.sell_price} threshold={p.margin_alert_percent} />
          </div>
        </section>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
          <section className="min-w-0">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-sm font-medium">Changes</h2>
              {hiddenChecks > 0 && (
                <span className="text-xs text-zinc-400">
                  <span className="font-mono">{hiddenChecks}</span> checks with no change hidden
                </span>
              )}
            </div>
            {changes.length === 0 ? (
              <p className="mt-4 border-t border-zinc-200 pt-4 text-sm text-zinc-500">
                No checks yet. The first one runs within 6 hours, or use Check now on the dashboard.
              </p>
            ) : (
              <div className="relative mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-200">
                      <th scope="col" className="py-2 pr-3 font-medium">Checked</th>
                      <th scope="col" className="py-2 px-3 font-medium text-right">Price</th>
                      <th scope="col" className="py-2 px-3 font-medium text-right">Change</th>
                      <th scope="col" className="py-2 px-3 font-medium text-right">Margin</th>
                      <th scope="col" className="py-2 pl-3 font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {changes.map(({ s, prev }) => {
                      const delta =
                        prev?.price != null && s.price != null && prev.price !== 0
                          ? ((s.price - prev.price) / prev.price) * 100
                          : null;
                      const m = marginPercent(p.sell_price, s.price);
                      const low = m != null && m <= p.margin_alert_percent;
                      return (
                        <tr key={s.id}>
                          <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-zinc-500">
                            {new Date(s.checked_at).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">{money(s.price)}</td>
                          <td
                            className={`py-2 px-3 text-right font-mono text-xs tabular-nums ${
                              delta == null ? 'text-zinc-300' : delta > 0 ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {delta == null ? (prev ? '—' : 'first check') : `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}%`}
                          </td>
                          <td className={`py-2 px-3 text-right font-mono tabular-nums ${low ? 'text-red-600' : ''}`}>
                            {m != null ? `${m.toFixed(1)}%` : '—'}
                          </td>
                          <td className="py-2 pl-3 whitespace-nowrap text-xs">
                            {s.in_stock === false ? (
                              <span className="text-amber-700">Out of stock</span>
                            ) : s.in_stock ? (
                              <span className="text-zinc-500">In stock</span>
                            ) : (
                              <span className="text-zinc-300">Unknown</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium">Alerts sent</h2>
            {!alerts || alerts.length === 0 ? (
              <p className="mt-4 border-t border-zinc-200 pt-4 text-sm text-zinc-500">
                No alerts yet. You&apos;ll get an email the moment the price, stock or margin crosses a line.
              </p>
            ) : (
              <ol className="mt-3 border-t border-zinc-200 divide-y divide-zinc-100">
                {(alerts as Alert[]).map((a) => (
                  <li key={a.id} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`text-sm ${a.type === 'margin_below_threshold' ? 'text-red-600' : ''}`}>
                        {ALERT_LABEL[a.type] ?? a.type}
                      </span>
                      <time dateTime={a.created_at} className="shrink-0 font-mono text-xs text-zinc-400">
                        {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </time>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">{a.message}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
