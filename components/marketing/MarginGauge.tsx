'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { Bird } from '@phosphor-icons/react';

// The hero-v2 signature moment: a supplier price rise drags the margin needle
// down past the alert line, and the canary sings (the alert email arrives).
// The numbers are a worked example, labelled as one.
const SELL = 24.99;
const BEFORE = 11.4;
const AFTER = 14.85;
const ALERT = 45;
const SALES = 30;

const marginOf = (cost: number) => ((SELL - cost) / SELL) * 100;

// Gauge geometry: a 180 degree arc, 0% margin on the left, 100% on the right.
const CX = 160;
const CY = 150;
const R = 120;
function point(pct: number, r = R) {
  const a = Math.PI * (1 - pct / 100);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}
function arc(from: number, to: number, r = R) {
  const a = point(from, r);
  const b = point(to, r);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

function MarginGauge() {
  const reduce = useReducedMotion();
  const cost = useMotionValue(reduce ? AFTER : BEFORE);
  const margin = useTransform(cost, marginOf);
  const needleRef = useRef<SVGGElement>(null);
  const marginText = useTransform(margin, (m) => `${m.toFixed(1)}%`);
  const costText = useTransform(cost, (c) => `$${c.toFixed(2)}`);
  const lostText = useTransform(cost, (c) => `$${((c - BEFORE) * SALES).toFixed(2)}`);
  const [low, setLow] = useState(Boolean(reduce));

  // The needle turns about the gauge centre. Written straight to the SVG
  // transform attribute: Framer's style rotate on SVG pivots on the element's
  // own bounding box, which would spin the needle about its middle.
  useEffect(() => {
    const place = (m: number) =>
      needleRef.current?.setAttribute('transform', `rotate(${-90 + (m / 100) * 180} ${CX} ${CY})`);
    place(margin.get());
    return margin.on('change', place);
  }, [margin]);

  useEffect(() => {
    if (reduce) return;
    const unsub = margin.on('change', (m) => setLow(m < ALERT));
    let up = false;
    let controls: ReturnType<typeof animate> | null = null;
    const tick = () => {
      up = !up;
      controls = animate(cost, up ? AFTER : BEFORE, {
        type: 'spring',
        stiffness: up ? 60 : 120,
        damping: up ? 14 : 22,
      });
    };
    const first = setTimeout(tick, 900);
    const id = setInterval(tick, 4200);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      controls?.stop();
      unsub();
    };
  }, [cost, margin, reduce]);

  const tickIn = point(ALERT, R - 22);
  const tickOut = point(ALERT, R + 14);
  const label = point(ALERT, R + 30);

  return (
    <figure className="w-full max-w-md md:ml-auto" aria-label="Example: a supplier price rise pulls the margin under the alert line">
      <div className="rounded-[2rem] border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-[0_24px_48px_-24px_rgba(24,24,27,0.18)]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-900">Ceramic pour-over set</span>
          <span className="font-mono text-zinc-500">aliexpress.com</span>
        </div>

        <svg viewBox="0 0 320 175" className="mt-4 w-full" role="img" aria-label={`Margin gauge with an alert line at ${ALERT}%`}>
          <path d={arc(0, 100)} fill="none" stroke="#f4f4f5" strokeWidth="18" strokeLinecap="round" />
          <path d={arc(0, ALERT)} fill="none" stroke="#fee2e2" strokeWidth="18" strokeLinecap="round" />
          <line x1={tickIn.x} y1={tickIn.y} x2={tickOut.x} y2={tickOut.y} stroke="#f2c230" strokeWidth="4" strokeLinecap="round" />
          <motion.circle
            cx={tickOut.x}
            cy={tickOut.y}
            r="7"
            fill="#f2c230"
            animate={low && !reduce ? { scale: [1, 1.7, 1], opacity: [1, 0.35, 1] } : { scale: 1, opacity: 1 }}
            transition={low && !reduce ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
          />
          <text x={label.x - 6} y={label.y} textAnchor="end" className="fill-zinc-500 font-mono" fontSize="10">
            alert {ALERT}%
          </text>
          <g ref={needleRef} transform={`rotate(${-90 + (marginOf(reduce ? AFTER : BEFORE) / 100) * 180} ${CX} ${CY})`}>
            <line x1={CX} y1={CY} x2={CX} y2={CY - R + 6} stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          </g>
          <circle cx={CX} cy={CY} r="7" fill="#18181b" />
          <text x={CX - R} y={CY + 20} textAnchor="middle" className="fill-zinc-400 font-mono" fontSize="10">0%</text>
          <text x={CX + R} y={CY + 20} textAnchor="middle" className="fill-zinc-400 font-mono" fontSize="10">100%</text>
        </svg>

        <dl className="mt-2 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-4 text-xs">
          <div>
            <dt className="text-zinc-500">Supplier</dt>
            <motion.dd className="mt-1 font-mono text-base tabular-nums text-zinc-900">{costText}</motion.dd>
          </div>
          <div>
            <dt className="text-zinc-500">Margin</dt>
            <motion.dd
              className={`mt-1 font-mono text-base tabular-nums transition-colors duration-300 ${low ? 'text-red-600' : 'text-zinc-900'}`}
            >
              {marginText}
            </motion.dd>
          </div>
          <div>
            <dt className="text-zinc-500">Lost / month</dt>
            <motion.dd className="mt-1 font-mono text-base tabular-nums text-zinc-900">{lostText}</motion.dd>
          </div>
        </dl>
        <figcaption className="mt-3 text-[11px] text-zinc-400">
          Example: sells for ${SELL.toFixed(2)}, {SALES} sales a month.
        </figcaption>
      </div>

      <div className="mt-3 h-[72px]">
        <AnimatePresence>
          {low && (
            <motion.div
              key="alert"
              initial={reduce ? false : { opacity: 0, y: 14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="flex gap-3 rounded-2xl border border-canary/60 bg-canary-soft px-4 py-3 text-sm"
            >
              <Bird size={18} weight="bold" className="mt-0.5 shrink-0 text-canary-ink" />
              <div>
                <p className="font-medium text-zinc-900">Margin under {ALERT}% on Ceramic pour-over set</p>
                <p className="text-xs text-zinc-600">
                  Supplier went from ${BEFORE.toFixed(2)} to ${AFTER.toFixed(2)}. That&apos;s ${((AFTER - BEFORE) * SALES).toFixed(2)} a month.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </figure>
  );
}

export default memo(MarginGauge);
