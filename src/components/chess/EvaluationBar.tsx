'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// `evaluation` is in centipawns from white's perspective. Positive = white better.
// Mate scores can be passed as `mate` (positive = white mates in N).
export function EvaluationBar({
  evaluation,
  mate,
  orientation = 'white',
}: {
  evaluation?: number;
  mate?: number | null;
  orientation?: 'white' | 'black';
}) {
  let whitePct = 50;
  if (mate != null) {
    whitePct = mate > 0 ? 100 : 0;
  } else if (typeof evaluation === 'number') {
    // sigmoid-ish mapping so swings near 0 are visible without runaway tails
    const cp = Math.max(-1000, Math.min(1000, evaluation));
    whitePct = 50 + 50 * Math.tanh(cp / 400);
  }
  const blackPct = 100 - whitePct;
  const display = mate != null ? `M${Math.abs(mate)}` : evaluation != null ? (evaluation / 100).toFixed(1) : '0.0';
  const positive = mate != null ? mate > 0 : (evaluation ?? 0) >= 0;

  return (
    <div
      className={cn(
        'relative h-full w-6 rounded-md overflow-hidden border border-white/10 bg-black/40',
        orientation === 'black' && 'rotate-180',
      )}
    >
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-white"
        initial={false}
        animate={{ height: `${whitePct}%` }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
      />
      <motion.div
        className="absolute top-0 left-0 right-0 bg-black"
        initial={false}
        animate={{ height: `${blackPct}%` }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
      />
      <span
        className={cn(
          'absolute left-1/2 -translate-x-1/2 text-[10px] font-bold tabular-nums',
          positive ? 'bottom-1 text-black' : 'top-1 text-white',
          orientation === 'black' && 'rotate-180',
        )}
      >
        {display}
      </span>
    </div>
  );
}
