import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'warn' | 'danger' | 'info';

const variants: Record<Variant, string> = {
  default: 'bg-white/8 text-white/80 border-white/10',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
  danger: 'bg-rose-500/15 text-rose-300 border-rose-400/20',
  info: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/20',
};

export function Badge({
  className,
  variant = 'default',
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}
