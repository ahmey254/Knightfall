'use client';

import { motion } from 'framer-motion';
import { formatClock, cn } from '@/lib/utils';

export function Timer({
  ms,
  active,
  label,
  low,
}: {
  ms: number;
  active: boolean;
  label?: string;
  low?: boolean;
}) {
  const lowTime = low ?? ms < 30_000;
  return (
    <motion.div
      className={cn(
        'flex items-center justify-between rounded-xl px-4 py-2.5 font-mono tabular-nums border',
        active
          ? 'bg-bg-card border-accent/40 shadow-glow'
          : 'bg-bg-soft/60 border-white/5 text-white/60',
        lowTime && active && 'border-rose-400/60 text-rose-300',
      )}
      animate={lowTime && active ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    >
      {label && <span className="text-xs uppercase tracking-wider text-muted">{label}</span>}
      <span className="text-2xl font-bold">{formatClock(ms)}</span>
    </motion.div>
  );
}
