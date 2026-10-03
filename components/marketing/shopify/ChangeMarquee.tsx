'use client';

import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const CHANGES = [
  'Ceramic pour-over set +$3.45',
  'Linen tote bag out of stock',
  'LED desk lamp +$1.35',
  'Silicone baking mat 3-pack variant removed',
  'Magnetic phone mount back in stock',
  'Bamboo cutlery roll +$0.88',
  'Heated eye mask +$2.10',
];

function ChangeMarquee() {
  const reduce = useReducedMotion();
  const items = [...CHANGES, ...CHANGES];
  return (
    <div className="overflow-hidden border-y border-zinc-200 py-5" aria-label="Examples of supplier changes">
      <motion.ul
        className="flex w-max gap-12 whitespace-nowrap font-mono text-sm text-zinc-500"
        animate={reduce ? undefined : { x: ['0%', '-50%'] }}
        transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
      >
        {items.map((c, i) => (
          <li key={i} aria-hidden={i >= CHANGES.length}>
            {c}
          </li>
        ))}
      </motion.ul>
    </div>
  );
}

export default memo(ChangeMarquee);
