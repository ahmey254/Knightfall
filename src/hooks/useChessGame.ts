'use client';

// Local-only chess game state (used for AI mode, analysis board, puzzles).
// For online play, server is authoritative — see useSocket + the play room page.

import { useCallback, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { MoveRecord } from '@/types/chess';

export interface UseChessGameOptions {
  initialFen?: string;
  onGameOver?: (result: 'white' | 'black' | 'draw', reason: string) => void;
  onMove?: (move: MoveRecord) => void;
}

export function useChessGame(opts: UseChessGameOptions = {}) {
  const chessRef = useRef(new Chess(opts.initialFen));
  const [fen, setFen] = useState(chessRef.current.fen());
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [result, setResult] = useState<'white' | 'black' | 'draw' | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);

  const turn = chessRef.current.turn();
  const inCheck = chessRef.current.inCheck();

  const checkEnd = useCallback(() => {
    const chess = chessRef.current;
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'black' : 'white';
      setResult(winner);
      setEndReason('checkmate');
      opts.onGameOver?.(winner, 'checkmate');
      return true;
    }
    if (chess.isStalemate()) {
      setResult('draw'); setEndReason('stalemate'); opts.onGameOver?.('draw', 'stalemate'); return true;
    }
    if (chess.isInsufficientMaterial()) {
      setResult('draw'); setEndReason('insufficient'); opts.onGameOver?.('draw', 'insufficient'); return true;
    }
    if (chess.isThreefoldRepetition()) {
      setResult('draw'); setEndReason('threefold'); opts.onGameOver?.('draw', 'threefold'); return true;
    }
    if (chess.isDraw()) {
      setResult('draw'); setEndReason('fifty_move'); opts.onGameOver?.('draw', 'fifty_move'); return true;
    }
    return false;
  }, [opts]);

  const move = useCallback(
    (m: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }): boolean => {
      try {
        const result = chessRef.current.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' });
        if (!result) return false;
        const newFen = chessRef.current.fen();
        const record: MoveRecord = {
          san: result.san,
          from: result.from,
          to: result.to,
          promotion: result.promotion,
          fen: newFen,
          timestamp: Date.now(),
        };
        setFen(newFen);
        setMoves((prev) => [...prev, record]);
        setLastMove({ from: result.from, to: result.to });
        opts.onMove?.(record);
        checkEnd();
        return true;
      } catch {
        return false;
      }
    },
    [checkEnd, opts],
  );

  const reset = useCallback((fen?: string) => {
    chessRef.current = new Chess(fen);
    setFen(chessRef.current.fen());
    setMoves([]);
    setLastMove(null);
    setResult(null);
    setEndReason(null);
  }, []);

  const undo = useCallback(() => {
    const undone = chessRef.current.undo();
    if (!undone) return false;
    setFen(chessRef.current.fen());
    setMoves((prev) => prev.slice(0, -1));
    const last = chessRef.current.history({ verbose: true }).slice(-1)[0];
    setLastMove(last ? { from: last.from, to: last.to } : null);
    setResult(null);
    setEndReason(null);
    return true;
  }, []);

  const loadPgn = useCallback((pgn: string) => {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      chessRef.current = chess;
      const verbose = chess.history({ verbose: true });
      const newMoves: MoveRecord[] = [];
      const replay = new Chess();
      verbose.forEach((m) => {
        const r = replay.move({ from: m.from, to: m.to, promotion: m.promotion });
        if (r) newMoves.push({ san: r.san, from: r.from, to: r.to, promotion: r.promotion, fen: replay.fen(), timestamp: Date.now() });
      });
      setFen(chess.fen());
      setMoves(newMoves);
      setLastMove(verbose.length ? { from: verbose[verbose.length - 1].from, to: verbose[verbose.length - 1].to } : null);
      return true;
    } catch {
      return false;
    }
  }, []);

  const exportPgn = useCallback(() => chessRef.current.pgn(), []);

  // Replay/seek to a particular ply for the analysis board.
  const goToPly = useCallback(
    (ply: number) => {
      const all = chessRef.current.history({ verbose: true });
      const target = Math.max(0, Math.min(all.length, ply + 1));
      const replay = new Chess();
      for (let i = 0; i < target; i++) {
        const m = all[i];
        replay.move({ from: m.from, to: m.to, promotion: m.promotion });
      }
      setFen(replay.fen());
      const last = target > 0 ? all[target - 1] : null;
      setLastMove(last ? { from: last.from, to: last.to } : null);
    },
    [],
  );

  return useMemo(
    () => ({
      chess: chessRef.current,
      fen,
      moves,
      lastMove,
      turn,
      inCheck,
      result,
      endReason,
      move,
      reset,
      undo,
      loadPgn,
      exportPgn,
      goToPly,
    }),
    [fen, moves, lastMove, turn, inCheck, result, endReason, move, reset, undo, loadPgn, exportPgn, goToPly],
  );
}
