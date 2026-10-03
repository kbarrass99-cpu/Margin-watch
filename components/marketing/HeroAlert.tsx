'use client';

import { memo, useEffect, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { WarningCircle } from '@phosphor-icons/react';

const SELL = 24.99;
const BEFORE = 11.4;
const AFTER = 14.85;
const THRESHOLD = 45;

function marginOf(cost: number) {
  return ((SELL - cost) / SELL) * 100;
}

// Sample alert that replays on a loop: the supplier raises the price, the
// margin falls through the alert line, the email arrives.
function HeroAlert() {
  const reduce = useReducedMotion();
  const cost = useMotionValue(reduce ? AFTER : BEFORE);
  const costText = useTransform(cost, (c) => `$${c.toFixed(2)}`);
  const marginText = useTransform(cost, (c) => `${marginOf(c).toFixed(1)}%`);
  const barScale = useTransform(cost, (c) => marginOf(c) / 100);
  const [raised, setRaised] = useState(Boolean(reduce));

  useEffect(() => {
    if (reduce) return;
    let up = false;
    const id = setInterval(() => {
      up = !up;
      animate(cost, up ? AFTER : BEFORE, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
      setRaised(up);
    }, 3600);
    return () => clearInterval(id);
  }, [cost, reduce]);

  const low = raised;

  return (
    <div className="w-full max-w-md md:ml-auto" aria-label="Sample margin alert">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_20px_40px_-15px_rgba(24,24,27,0.08)]">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span className="font-medium text-zinc-900 text-sm">Ceramic pour-over set</span>
          <span className="font-mono">aliexpress.com</span>
        </div>

        <dl className="mt-4 divide-y divide-zinc-100 text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-zinc-500">Supplier price</dt>
            <motion.dd className="font-mono tabular-nums">{costText}</motion.dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-zinc-500">You sell for</dt>
            <dd className="font-mono tabular-nums">${SELL.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-zinc-500">Margin</dt>
            <motion.dd
              className={`font-mono tabular-nums transition-colors duration-500 ${
                low ? 'text-red-600' : 'text-zinc-900'
              }`}
            >
              {marginText}
            </motion.dd>
          </div>
        </dl>

        <div className="relative mt-5 h-1.5 rounded-full bg-zinc-100">
          <motion.div
            className={`absolute inset-0 origin-left rounded-full transition-colors duration-500 ${
              low ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            style={{ scaleX: barScale }}
          />
          <span
            className="absolute -top-1.5 -bottom-1.5 w-px bg-zinc-900"
            style={{ left: `${THRESHOLD}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-zinc-400">
          <span>0%</span>
          <span>alert at {THRESHOLD}%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="h-[76px] mt-3">
        <AnimatePresence>
          {low && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="flex gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-[0_12px_30px_-18px_rgba(24,24,27,0.35)]"
            >
              <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <p className="font-medium">Margin dropped to {marginOf(AFTER).toFixed(1)}%</p>
                <p className="text-xs text-zinc-500">
                  Your supplier raised the price from ${BEFORE.toFixed(2)} to ${AFTER.toFixed(2)}.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default memo(HeroAlert);
