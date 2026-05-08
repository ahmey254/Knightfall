'use client';

import { useMemo } from 'react';
import { Chess } from 'chess.js';

const PIECE_SYMBOLS: Record<string, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function CapturedPieces({ fen, color }: { fen: string; color: 'w' | 'b' }) {
  // We compute material difference from the position alone — there's only one
  // chessboard's worth of pieces, so anything missing was captured.
  const { captured, advantage } = useMemo(() => {
    const chess = new Chess(fen);
    const board = chess.board();
    const counts: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    let whiteMaterial = 0;
    let blackMaterial = 0;

    const start: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue;
        if (sq.color === color) continue;
        // it's an opposing piece still on the board — don't count
      }
    }

    // Count surviving pieces of opposing color
    const survivors: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue;
        if (sq.color !== color) continue;
        // A piece of *our* color belongs to us.
        // For "captured by us" we want pieces of the opposite color removed.
      }
    }

    // Recount cleanly: "captured by `color`" means missing pieces of the opposite color.
    const opp = color === 'w' ? 'b' : 'w';
    const oppSurvive: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const ourSurvive: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue;
        if (sq.type === 'k') continue;
        if (sq.color === opp) oppSurvive[sq.type]++;
        else ourSurvive[sq.type]++;
      }
    }
    for (const t of ['p', 'n', 'b', 'r', 'q'] as const) {
      counts[t] = Math.max(0, start[t] - oppSurvive[t]);
      whiteMaterial += (color === 'w' ? oppSurvive[t] : ourSurvive[t]) * PIECE_VALUES[t];
      blackMaterial += (color === 'w' ? ourSurvive[t] : oppSurvive[t]) * PIECE_VALUES[t];
    }

    const ours = color === 'w' ? whiteMaterial : blackMaterial;
    const theirs = color === 'w' ? blackMaterial : whiteMaterial;

    return { captured: counts, advantage: ours - theirs };
  }, [fen, color]);

  const oppColor = color === 'w' ? 'b' : 'w';

  return (
    <div className="flex items-center gap-1 min-h-[28px] text-2xl leading-none">
      {(['q', 'r', 'b', 'n', 'p'] as const).map((t) =>
        Array.from({ length: captured[t] }).map((_, i) => (
          <span key={`${t}-${i}`} className="text-white/70">
            {PIECE_SYMBOLS[`${oppColor}${t}`]}
          </span>
        )),
      )}
      {advantage > 0 && (
        <span className="ml-2 text-xs font-semibold text-emerald-300">+{advantage}</span>
      )}
    </div>
  );
}
