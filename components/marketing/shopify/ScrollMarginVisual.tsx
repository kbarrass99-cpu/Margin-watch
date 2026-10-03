'use client';

import { memo, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';

const SHOP_PRICE = 34.0;
const COST_START = 13.2;
const COST_END = 21.9;

// As the page scrolls through this block, the supplier cost climbs toward
// the fixed Shopify price and the margin between them shrinks.
function ScrollMarginVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 35%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });
  const p = reduce ? scrollYProgress : progress;

  const cost = useTransform(p, [0, 1], [COST_START, COST_END]);
  const costY = useTransform(p, [0, 1], ['78%', '44%']);
  const gapScale = useTransform(p, [0, 1], [1, (SHOP_PRICE - COST_END) / (SHOP_PRICE - COST_START)]);
  const costText = useTransform(cost, (c) => `$${c.toFixed(2)}`);
  const marginText = useTransform(cost, (c) => `${(((SHOP_PRICE - c) / SHOP_PRICE) * 100).toFixed(1)}%`);
  const alertOpacity = useTransform(p, [0.8, 0.95], [0, 1]);

  return (
    <div ref={ref} className="relative h-[420px] md:h-[520px] rounded-[2.5rem] border border-zinc-200/70 bg-white overflow-hidden">
      <div className="absolute inset-x-8 top-[22%] flex items-center gap-3">
        <span className="h-px flex-1 bg-zinc-900" />
        <span className="font-mono text-sm">Shopify price ${SHOP_PRICE.toFixed(2)}</span>
      </div>

      <motion.div style={{ top: costY }} className="absolute inset-x-8 flex items-center gap-3">
        <span className="h-px flex-1 bg-red-500" />
        <motion.span className="font-mono text-sm text-red-600">{costText}</motion.span>
        <span className="text-xs text-zinc-400">supplier</span>
      </motion.div>

      <div className="absolute left-8 bottom-8 right-8 flex items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-400">Your margin</p>
          <motion.p className="text-4xl md:text-5xl font-semibold tracking-tighter tabular-nums">{marginText}</motion.p>
        </div>
        <motion.div
          style={{ scaleY: gapScale }}
          className="hidden sm:block w-3 h-28 origin-bottom rounded-full bg-zinc-900"
          aria-hidden="true"
        />
      </div>

      <motion.p
        style={{ opacity: alertOpacity }}
        className="absolute right-8 top-8 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700"
      >
        Email sent: margin under 40%
      </motion.p>
    </div>
  );
}

export default memo(ScrollMarginVisual);
