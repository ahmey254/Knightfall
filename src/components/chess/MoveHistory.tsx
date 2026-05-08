'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { MoveRecord } from '@/types/chess';

export function MoveHistory({
  moves,
  currentPly,
  onSelect,
}: {
  moves: MoveRecord[];
  currentPly?: number;
  onSelect?: (ply: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves.length]);

  // Pair plies into (white, black) tuples for the classic two-column display.
  const rows: { num: number; w?: MoveRecord; b?: MoveRecord; wPly?: number; bPly?: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      num: Math.floor(i / 2) + 1,
      w: moves[i],
      b: moves[i + 1],
      wPly: i,
      bPly: i + 1 < moves.length ? i + 1 : undefined,
    });
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-white/80">Moves</h3>
        <span className="text-xs text-muted">{moves.length} plies</span>
      </div>
      <div ref={scrollRef} className="max-h-[260px] overflow-y-auto px-2 py-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted px-3 py-4 text-center">No moves yet</p>
        ) : (
          <table className="w-full text-sm font-mono">
            <tbody>
              {rows.map((row) => (
                <tr key={row.num} className="hover:bg-white/5 rounded">
                  <td className="px-3 py-1.5 text-muted w-10">{row.num}.</td>
                  <td className="px-2 py-1.5">
                    {row.w && (
                      <button
                        className={cn(
                          'rounded px-2 py-0.5 hover:bg-white/10',
                          currentPly === row.wPly && 'bg-accent/20 text-accent',
                        )}
                        onClick={() => row.wPly !== undefined && onSelect?.(row.wPly)}
                      >
                        {row.w.san}
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {row.b && (
                      <button
                        className={cn(
                          'rounded px-2 py-0.5 hover:bg-white/10',
                          currentPly === row.bPly && 'bg-accent/20 text-accent',
                        )}
                        onClick={() => row.bPly !== undefined && onSelect?.(row.bPly)}
                      >
                        {row.b.san}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
