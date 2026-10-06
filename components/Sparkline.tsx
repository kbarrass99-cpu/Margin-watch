export default function Sparkline({
  data,
  tone = 'neutral',
  width = 64,
  height = 20,
}: {
  data: number[];
  tone?: 'neutral' | 'bad';
  width?: number;
  height?: number;
}) {
  // Failed checks are left out by the caller; zero is never a real supplier price.
  const points = data.filter((d) => d > 0);

  if (points.length < 2) {
    return <span className="inline-block text-xs text-zinc-300" style={{ width }}>—</span>;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 2;

  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 overflow-visible ${tone === 'bad' ? 'text-red-500' : 'text-zinc-400'}`}
      aria-hidden="true"
    >
      <polyline
        points={coords}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
