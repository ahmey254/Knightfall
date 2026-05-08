'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-xl bg-bg-soft/80 border px-4 py-2.5 transition-colors',
          'placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20',
          error ? 'border-rose-500/60 focus:border-rose-500/80' : 'border-white/10 focus:border-accent/60',
          className,
        )}
        {...rest}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
});
