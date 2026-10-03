// One skeleton per section, sized like the real page.
export default function Loading() {
  const bar = 'rounded bg-zinc-100 animate-pulse';
  return (
    <main className="min-h-[100dvh]" aria-busy="true" aria-label="Loading product history">
      <div className="border-b border-zinc-200 bg-white h-[53px]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className={`${bar} h-5 w-72`} />
        <div className={`${bar} h-3 w-32 mt-2.5`} />
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-y border-zinc-200">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-3 py-3 first:pl-0">
              <div className={`${bar} h-2.5 w-16`} />
              <div className={`${bar} h-5 w-20 mt-2`} />
            </div>
          ))}
        </div>
        <div className={`${bar} h-3 w-28 mt-10`} />
        <div className={`${bar} h-[220px] w-full mt-4`} />
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${bar} h-4 w-full`} />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`${bar} h-9 w-full`} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
