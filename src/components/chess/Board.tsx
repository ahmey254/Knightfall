'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const BOARD_THEMES = {
  midnight: {
    light: '#2d3361',
    dark: '#181b3a',
    selected: 'rgba(124, 92, 255, 0.55)',
    legal: 'rgba(34, 211, 238, 0.45)',
    capture: 'rgba(255, 77, 141, 0.55)',
    lastMove: 'rgba(163, 230, 53, 0.30)',
    check: 'rgba(255, 77, 141, 0.65)',
  },
  emerald: {
    light: '#3a7a5b',
    dark: '#1f4d3a',
    selected: 'rgba(124, 92, 255, 0.55)',
    legal: 'rgba(255, 255, 255, 0.35)',
    capture: 'rgba(255, 77, 141, 0.55)',
    lastMove: 'rgba(255, 211, 0, 0.30)',
    check: 'rgba(255, 77, 141, 0.65)',
  },
  cyber: {
    light: '#1a2240',
    dark: '#0a0f23',
    selected: 'rgba(34, 211, 238, 0.55)',
    legal: 'rgba(124, 92, 255, 0.5)',
    capture: 'rgba(255, 77, 141, 0.55)',
    lastMove: 'rgba(34, 211, 238, 0.25)',
    check: 'rgba(255, 77, 141, 0.65)',
  },
} as const;

export interface BoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  onMove?: (move: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }) => boolean | Promise<boolean>;
  interactive?: boolean;
  lastMove?: { from: string; to: string } | null;
  theme?: keyof typeof BOARD_THEMES;
  showCoordinates?: boolean;
  width?: number;
  inCheck?: boolean;
}

export function Board({
  fen,
  orientation = 'white',
  onMove,
  interactive = true,
  lastMove,
  theme = 'midnight',
  showCoordinates = true,
  width,
  inCheck,
}: BoardProps) {
  const [selected, setSelected] = useState<Square | null>(null);
  const palette = BOARD_THEMES[theme];

  // react-chessboard@4 needs an explicit pixel width — undefined renders nothing
  // useful. Measure our container so the board scales with its column.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(width ?? 480);
  useEffect(() => {
    if (width) {
      setMeasuredWidth(width);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth - 16; // subtract our p-2 (8px each side)
      if (w > 0) setMeasuredWidth(Math.min(720, Math.max(280, w)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [width]);

  // Build chess.js instance for legal-move highlighting (display only).
  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  useEffect(() => {
    setSelected(null);
  }, [fen]);

  const legalTargets = useMemo(() => {
    if (!selected) return new Map<string, { capture: boolean }>();
    const moves = chess.moves({ square: selected, verbose: true });
    const map = new Map<string, { capture: boolean }>();
    moves.forEach((m) => map.set(m.to, { capture: Boolean(m.captured) }));
    return map;
  }, [selected, chess]);

  const checkSquare = useMemo(() => {
    if (!inCheck && !chess.inCheck()) return null;
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const file = 'abcdefgh'[c];
          const rank = 8 - r;
          return `${file}${rank}`;
        }
      }
    }
    return null;
  }, [inCheck, chess]);

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { background: palette.lastMove };
      styles[lastMove.to] = { background: palette.lastMove };
    }
    if (selected) {
      styles[selected] = { background: palette.selected, boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.25)' };
    }
    legalTargets.forEach((info, sq) => {
      styles[sq] = info.capture
        ? { background: `radial-gradient(circle, transparent 56%, ${palette.capture} 60%)` }
        : { background: `radial-gradient(circle, ${palette.legal} 22%, transparent 25%)` };
    });
    if (checkSquare) {
      styles[checkSquare] = { ...(styles[checkSquare] ?? {}), boxShadow: `inset 0 0 0 4px ${palette.check}` };
    }
    return styles;
  }, [selected, legalTargets, lastMove, palette, checkSquare]);

  const tryMove = useCallback(
    async (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => {
      if (!onMove) return false;
      const ok = await onMove({ from, to, promotion });
      if (ok) setSelected(null);
      return ok;
    },
    [onMove],
  );

  const onSquareClick = useCallback(
    (square: Square) => {
      if (!interactive) return;
      if (selected && selected !== square) {
        const target = legalTargets.get(square);
        if (target) {
          // Auto-promote to queen for click moves; promotion picker is rare on click flow.
          void tryMove(selected, square, 'q');
          return;
        }
      }
      const piece = chess.get(square);
      if (piece && piece.color === chess.turn()) {
        setSelected(square);
      } else {
        setSelected(null);
      }
    },
    [interactive, selected, legalTargets, chess, tryMove],
  );

  const onPieceDrop = useCallback(
    (from: string, to: string, piece: string): boolean => {
      if (!interactive) return false;
      // piece string is e.g. 'wP', 'bQ' — second char is the piece type uppercase.
      const isPawn = piece[1] === 'P';
      const promotionRank = piece[0] === 'w' ? '8' : '1';
      const promotion: 'q' | undefined = isPawn && to.endsWith(promotionRank) ? 'q' : undefined;
      void tryMove(from, to, promotion);
      // Optimistic — react-chessboard will revert if our async update returns a different fen.
      // For correctness we re-render via the parent fen prop.
      return true;
    },
    [interactive, tryMove],
  );

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'relative rounded-2xl p-2 glass shadow-card mx-auto',
        inCheck && 'animate-check',
      )}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{ width: width ? width + 16 : '100%', maxWidth: 736 }}
    >
      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onSquareClick={onSquareClick}
        onPieceDrop={onPieceDrop}
        customSquareStyles={customSquareStyles}
        customDarkSquareStyle={{ backgroundColor: palette.dark }}
        customLightSquareStyle={{ backgroundColor: palette.light }}
        customBoardStyle={{ borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}
        boardWidth={measuredWidth}
        showBoardNotation={showCoordinates}
        animationDuration={180}
        arePiecesDraggable={interactive}
      />
    </motion.div>
  );
}
