'use client';

import { cn } from '@/lib/utils';
import { CapturedPieces } from './CapturedPieces';

export function PlayerBar({
  name,
  rating,
  color,
  fen,
  active,
  online,
}: {
  name: string;
  rating?: number;
  color: 'w' | 'b';
  fen: string;
  active: boolean;
  online?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl px-3 py-2 border',
        active ? 'border-accent/40 bg-bg-card/80' : 'border-white/5 bg-bg-soft/40',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent to-accent-cyan grid place-items-center text-sm font-bold">
            {name?.[0]?.toUpperCase() ?? '?'}
          </div>
          {online !== undefined && (
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg',
                online ? 'bg-emerald-400' : 'bg-zinc-500',
              )}
            />
          )}
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">{name}</div>
          {rating != null && <div className="text-xs text-muted">★ {rating}</div>}
        </div>
        <CapturedPieces fen={fen} color={color} />
      </div>
    </div>
  );
}
