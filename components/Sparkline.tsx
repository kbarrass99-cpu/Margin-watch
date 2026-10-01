export default function Sparkline({ data }: { data: number[] }) {
  const points = data.filter((d) => d > 0);

  if (points.length < 2) {
    return <div className="w-20 h-8" />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * 80;
      const y = 28 - ((v - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="80" height="28" viewBox="0 0 80 28" className="flex-shrink-0">
      <polyline
        points={coords}
        fill="none"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
