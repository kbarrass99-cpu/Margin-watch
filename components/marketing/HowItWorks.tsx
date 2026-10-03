import { AlertTile, PasteLinkTile, PriceChartTile, RiskListTile } from './BentoTiles';

const tile =
  'rounded-[2.5rem] border border-zinc-200/60 bg-white p-8 md:p-10 shadow-[0_20px_40px_-15px_rgba(24,24,27,0.06)] min-h-[260px]';

function Caption({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-5 px-2">
      <h3 className="font-medium tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-zinc-500 max-w-[52ch]">{body}</p>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
      <div className="max-w-xl">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tighter leading-none">
          Set it up once. Hear about it when it matters.
        </h2>
        <p className="mt-4 text-zinc-600 leading-relaxed">
          No browser extension and no store integration. A link and a price is all it needs.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-x-6 gap-y-12">
        <div>
          <div className={tile}><PasteLinkTile /></div>
          <Caption
            title="Paste a supplier link and your sell price"
            body="AliExpress, CJ, Spocket or any product page. We read the price, stock and variants straight away."
          />
        </div>
        <div>
          <div className={tile}><RiskListTile /></div>
          <Caption
            title="Your riskiest products float to the top"
            body="Every product is ranked by how close it is to your margin line."
          />
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-x-6 gap-y-12">
        <div>
          <div className={tile}><PriceChartTile /></div>
          <Caption
            title="Checked every 6 hours"
            body="Each check is saved, so you can see exactly when and how a supplier price moved."
          />
        </div>
        <div>
          <div className={tile}><AlertTile /></div>
          <Caption
            title="An email before it costs you"
            body="Price hike under your margin line, out of stock, or a variant gone: you hear about it right away."
          />
        </div>
      </div>
    </section>
  );
}
