import { marginPercent, type PriceSnapshot } from '@/lib/margin';

const W = 720;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

function niceStep(range: number) {
  const raw = range / 4;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

// Margin % over time (or supplier price when no sell price is set), drawn to
// one scale with the alert line on the same axis.
export default function MarginChart({
  snapshots,
  sellPrice,
  extraCost = 0,
  threshold,
}: {
  snapshots: PriceSnapshot[];
  sellPrice: number | null;
  extraCost?: number;
  threshold: number;
}) {
  const showMargin = sellPrice != null && sellPrice > 0;
  const points = snapshots
    .filter((s) => s.price != null)
    .map((s) => ({
      t: new Date(s.checked_at).getTime(),
      v: showMargin ? marginPercent(sellPrice, s.price, extraCost)! : s.price!,
    }));

  if (points.length < 2) {
    return (
      <div className="flex h-[220px] items-center border-y border-zinc-100 text-sm text-zinc-500">
        The chart appears after the second check. Checks run every 6 hours.
      </div>
    );
  }

  const values = points.map((p) => p.v).concat(showMargin ? [threshold] : []);
  const step = niceStep(Math.max(...values) - Math.min(...values));
  const yMin = Math.floor(Math.min(...values) / step) * step;
  const yMax = Math.ceil(Math.max(...values) / step) * step || yMin + step;
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;

  const x = (t: number) => PAD.left + ((t - tMin) / (tMax - tMin || 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom);

  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(Number(v.toFixed(6)));

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(tMax).toFixed(1)} ${y(yMin)} L${x(tMin).toFixed(1)} ${y(yMin)} Z`;
  const last = points[points.length - 1];
  const lastLow = showMargin && last.v <= threshold;
  const fmt = (v: number) => (showMargin ? `${Math.round(v)}%` : `$${v.toFixed(v < 10 ? 2 : 0)}`);
  const date = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={showMargin ? 'Margin over time' : 'Supplier price over time'}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#f4f4f5" />
            <text x={PAD.left - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="#a1a1aa" fontFamily="var(--font-geist-mono)">
              {fmt(v)}
            </text>
          </g>
        ))}
        {showMargin && (
          <g>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(threshold)} y2={y(threshold)} stroke="#dc2626" strokeDasharray="4 4" strokeWidth="1" />
            <text x={W - PAD.right} y={y(threshold) - 6} textAnchor="end" fontSize="10" fill="#dc2626" fontFamily="var(--font-geist-mono)">
              alert at {threshold}%
            </text>
          </g>
        )}
        <path d={area} fill="#18181b" fillOpacity="0.04" />
        <path d={line} fill="none" stroke="#18181b" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last.t)} cy={y(last.v)} r="3.5" fill={lastLow ? '#dc2626' : '#18181b'} />
        <text x={PAD.left} y={H - 8} fontSize="10" fill="#a1a1aa" fontFamily="var(--font-geist-mono)">{date(tMin)}</text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="10" fill="#a1a1aa" fontFamily="var(--font-geist-mono)">{date(tMax)}</text>
      </svg>
      {showMargin && (
        <figcaption className="mt-2 text-xs text-zinc-500">
          Margin uses your current sell price of <span className="font-mono">${sellPrice!.toFixed(2)}</span> for every check.
        </figcaption>
      )}
    </figure>
  );
}
