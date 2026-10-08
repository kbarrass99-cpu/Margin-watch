'use client';

import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EnvelopeSimple } from '@phosphor-icons/react';

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 };

// --- 1. Paste a link: typewriter cycling real-looking supplier URLs ---------

const URLS = [
  'aliexpress.com/item/1005006213847192.html',
  'cjdropshipping.com/product/linen-tote-p-1729',
  'ebay.co.uk/itm/375119189634',
];

export const PasteLinkTile = memo(function PasteLinkTile() {
  const reduce = useReducedMotion();
  const [urlIndex, setUrlIndex] = useState(0);
  const [typed, setTyped] = useState(reduce ? URLS[0].length : 0);
  const [phase, setPhase] = useState<'typing' | 'checking' | 'done'>(reduce ? 'done' : 'typing');

  useEffect(() => {
    if (reduce) return;
    const url = URLS[urlIndex];
    let t: ReturnType<typeof setTimeout>;
    if (phase === 'typing') {
      t = typed < url.length
        ? setTimeout(() => setTyped(typed + 1), 38)
        : setTimeout(() => setPhase('checking'), 400);
    } else if (phase === 'checking') {
      t = setTimeout(() => setPhase('done'), 1300);
    } else {
      t = setTimeout(() => {
        setUrlIndex((urlIndex + 1) % URLS.length);
        setTyped(0);
        setPhase('typing');
      }, 2200);
    }
    return () => clearTimeout(t);
  }, [reduce, urlIndex, typed, phase]);

  const url = URLS[urlIndex];
  const results = [
    { price: '$11.40', stock: 'In stock' },
    { price: '$6.10', stock: 'In stock' },
    { price: '$17.30', stock: '3 variants' },
  ];

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-[13px] text-zinc-700">
        <span className="truncate">
          {url.slice(0, typed)}
        </span>
        <span className="h-4 w-px shrink-0 bg-zinc-900 animate-pulse" />
      </div>
      <div className="h-6 text-sm">
        {phase === 'checking' && (
          <div className="h-2 w-40 rounded-full bg-[linear-gradient(90deg,#f4f4f5_0%,#e4e4e7_50%,#f4f4f5_100%)] bg-[length:200%_100%] animate-shimmer mt-2" />
        )}
        {phase === 'done' && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="text-zinc-600"
          >
            Found <span className="font-mono text-zinc-900">{results[urlIndex].price}</span> ·{' '}
            {results[urlIndex].stock}
          </motion.p>
        )}
      </div>
    </div>
  );
});

// --- 2. Risk list: products re-sort by margin as prices move -------------

type Row = { name: string; margin: number };
const ROUNDS: Row[][] = [
  [
    { name: 'Linen tote bag', margin: 66.1 },
    { name: 'Ceramic pour-over set', margin: 54.4 },
    { name: 'LED desk lamp', margin: 47.8 },
    { name: 'Magnetic phone mount', margin: 75.4 },
  ],
  [
    { name: 'Linen tote bag', margin: 66.1 },
    { name: 'Ceramic pour-over set', margin: 40.6 },
    { name: 'LED desk lamp', margin: 42.3 },
    { name: 'Magnetic phone mount', margin: 75.4 },
  ],
];
const THRESHOLD = 45;

export const RiskListTile = memo(function RiskListTile() {
  const reduce = useReducedMotion();
  const [round, setRound] = useState(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setRound((r) => (r + 1) % ROUNDS.length), 3200);
    return () => clearInterval(id);
  }, [reduce]);

  const rows = [...ROUNDS[round]].sort((a, b) => a.margin - b.margin);

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const low = row.margin <= THRESHOLD;
        return (
          <motion.li
            key={row.name}
            layout
            transition={spring}
            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm"
          >
            <span className="truncate">{row.name}</span>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-xs tabular-nums transition-colors duration-500 ${
                low ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {row.margin.toFixed(1)}%
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
});

// --- 3. Price chart: supplier price line drawing toward the sell line -------

const LINE = 'M0 92 L40 90 L80 92 L120 86 L160 88 L200 76 L240 64 L280 50 L320 36';

export const PriceChartTile = memo(function PriceChartTile() {
  const reduce = useReducedMotion();
  return (
    <div className="flex h-full flex-col justify-end">
      <svg viewBox="0 0 320 120" className="w-full h-auto" aria-hidden="true">
        <line x1="0" y1="44" x2="320" y2="44" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="4 4" />
        <text x="0" y="36" fill="#71717a" fontSize="10" fontFamily="var(--font-geist-mono)">
          45% margin line
        </text>
        <motion.path
          d={LINE}
          fill="none"
          stroke="#18181b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={
            reduce ? undefined : { duration: 2.6, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatDelay: 1.6 }
          }
        />
        <motion.circle
          cx="320"
          cy="36"
          r="4"
          fill="#dc2626"
          animate={reduce ? undefined : { scale: [1, 1.6, 1], opacity: [1, 0.55, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{ transformOrigin: '320px 36px' }}
        />
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-zinc-400">
        <span>14 days ago</span>
        <span>today</span>
      </div>
    </div>
  );
});

// --- 4. Alert: email notification pops in, holds 3s, leaves -----------------

export const AlertTile = memo(function AlertTile() {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setVisible((v) => !v), visible ? 3000 : 1400);
    return () => clearTimeout(t);
  }, [reduce, visible]);

  return (
    <div className="relative flex h-full flex-col justify-center gap-3">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Checking 4 products every 6 hours
      </div>
      <div className="h-[72px]">
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 16 }}
              className="flex gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-[0_12px_30px_-18px_rgba(24,24,27,0.35)]"
            >
              <EnvelopeSimple size={18} weight="bold" className="mt-0.5 shrink-0 text-zinc-900" />
              <div className="min-w-0 text-sm">
                <p className="font-medium">Margin below 45% on LED desk lamp</p>
                <p className="truncate text-xs text-zinc-500">Now 42.3%. Supplier price went from $15.95 to $17.30.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
