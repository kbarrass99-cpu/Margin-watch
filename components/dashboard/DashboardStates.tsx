import AddProductForm from '@/components/AddProductForm';

// Skeleton shaped like the real table: same row height, same column widths.
export function ProductTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading your products" className="mt-8">
      <div className="h-8 border-b border-zinc-200" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(0,2.4fr)_repeat(3,minmax(0,1fr))] md:grid-cols-[minmax(0,2.4fr)_repeat(6,minmax(0,1fr))] items-center gap-4 border-t border-zinc-100 px-3 py-3.5"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-zinc-100" />
            <div className="flex flex-col gap-1.5 w-full">
              <div className="h-2.5 rounded bg-zinc-100 animate-pulse" style={{ width: `${70 - i * 9}%` }} />
              <div className="h-2 w-20 rounded bg-zinc-100" />
            </div>
          </div>
          {Array.from({ length: 6 }).map((__, j) => (
            <div
              key={j}
              className={`h-2.5 rounded bg-zinc-100 animate-pulse ${j > 2 ? 'hidden md:block' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// First-time view: calm, no motion, one job. Explains what happens, then the form.
export function FirstProductState({ onAdded, limit }: { onAdded: () => void; limit: number }) {
  const steps = [
    ['Paste a supplier link', 'We read the price, stock and variants right away.'],
    ['Add what you sell it for', 'That turns price alerts into margin alerts.'],
    ['Get an email when it matters', 'Checked every 6 hours. Alerts when margin drops under 20% by default.'],
  ];
  return (
    <section className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16 border-t border-zinc-200 pt-10">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Track your first product</h2>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed max-w-[44ch]">
          Start with the product you sell most. Your plan covers {limit} product
          {limit === 1 ? '' : 's'}.
        </p>
        <ol className="mt-8 flex flex-col gap-5">
          {steps.map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[1.75rem_1fr] gap-2 text-sm">
              <span className="font-mono text-zinc-400">{i + 1}.</span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-zinc-500">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="lg:pt-1">
        <AddProductForm onAdded={onAdded} />
      </div>
    </section>
  );
}
