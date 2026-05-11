'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';
import { Board } from '@/components/chess/Board';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useSound } from '@/hooks/useSound';

interface Puzzle {
  id: string;
  fen: string;
  solution: string[];
  theme: string;
  rating: number;
}

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

export default function PuzzlesPage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [chess, setChess] = useState<Chess | null>(null);
  const [fen, setFen] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [hintLevel, setHintLevel] = useState(0); // 0 = hidden, 1 = piece+square, 2 = full SAN
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playSound = useSound();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/puzzles/daily')
      .then((r) => r.json())
      .then(({ puzzle }) => {
        if (cancelled) return;
        setPuzzle(puzzle);
        const c = new Chess(puzzle.fen);
        setChess(c);
        setFen(c.fen());
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load puzzle');
      });
    return () => {
      cancelled = true;
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, []);

  function tryMove({ from, to, promotion }: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }) {
    if (!chess || !puzzle || solved) return false;
    const expected = puzzle.solution[stepIndex];
    let move;
    try {
      move = chess.move({ from, to, promotion: promotion ?? 'q' });
    } catch {
      // chess.js throws on illegal moves — treat as a rejected attempt.
      return false;
    }
    if (move.san !== expected) {
      // Legal but not the puzzle line — revert and tell the user.
      chess.undo();
      toast.error('Not the best move — try again');
      return false;
    }
    setFen(chess.fen());
    setHintLevel(0);
    playSound('move');
    const next = stepIndex + 1;
    if (next >= puzzle.solution.length) {
      setSolved(true);
      toast.success('Solved! 🎉');
      setStepIndex(next);
      return true;
    }
    // Auto-play opponent reply (the puzzle's "answer move" against you).
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      replyTimer.current = null;
      const reply = puzzle.solution[next];
      if (!reply) return;
      try {
        chess.move(reply);
      } catch {
        return;
      }
      setFen(chess.fen());
      playSound('move');
      const after = next + 1;
      setStepIndex(after);
      if (after >= puzzle.solution.length) {
        setSolved(true);
        toast.success('Solved! 🎉');
      }
    }, 350);
    setStepIndex(next);
    return true;
  }

  function reset() {
    if (!puzzle) return;
    if (replyTimer.current) {
      clearTimeout(replyTimer.current);
      replyTimer.current = null;
    }
    const c = new Chess(puzzle.fen);
    setChess(c);
    setFen(c.fen());
    setStepIndex(0);
    setSolved(false);
    setHintLevel(0);
  }

  // Resolve the expected move on the *current* position so we can describe it
  // in a hint. Returns null when it's the opponent's turn (auto-reply pending)
  // or the puzzle is solved.
  const hintTarget = useMemo(() => {
    if (!chess || !puzzle || solved) return null;
    if (stepIndex % 2 !== 0) return null;
    const san = puzzle.solution[stepIndex];
    if (!san) return null;
    const m = chess.moves({ verbose: true }).find((mv) => mv.san === san);
    if (!m) return null;
    return { san, from: m.from, piece: m.piece };
  }, [chess, puzzle, stepIndex, solved, fen]);

  if (!puzzle) return <div className="text-muted text-center py-20">Loading puzzle…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 grid lg:grid-cols-[1fr_320px] gap-6">
      <Board fen={fen} interactive={!solved} onMove={(m) => tryMove(m)} />

      <aside className="space-y-3">
        <Card>
          <CardTitle>Puzzle of the day</CardTitle>
          <CardDescription className="mt-1">{puzzle.theme}</CardDescription>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="info">★ {puzzle.rating}</Badge>
            <Badge variant={solved ? 'success' : 'default'}>{solved ? 'Solved' : 'In progress'}</Badge>
          </div>
        </Card>

        <Card>
          <div className="text-sm text-muted">
            {chess?.turn() === 'w' ? 'White' : 'Black'} to move. Find the best continuation.
          </div>
          {hintLevel >= 1 && hintTarget && (
            <div className="mt-2 text-sm">
              Hint: move your <span className="font-medium">{PIECE_NAMES[hintTarget.piece]}</span> from{' '}
              <span className="font-mono">{hintTarget.from}</span>.
            </div>
          )}
          {hintLevel >= 2 && hintTarget && (
            <div className="mt-1 text-sm">
              Solution: <span className="font-mono font-semibold">{hintTarget.san}</span>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHintLevel((l) => Math.min(l + 1, 2))}
              disabled={solved || !hintTarget || hintLevel >= 2}
            >
              {hintLevel === 0 ? 'Hint' : hintLevel === 1 ? 'Reveal move' : 'Revealed'}
            </Button>
            <Button size="sm" onClick={reset}>Reset</Button>
          </div>
        </Card>

        {solved && (
          <Card className="border-emerald-400/40">
            <CardTitle className="text-emerald-300">Solved!</CardTitle>
            <CardDescription>Come back tomorrow for a new puzzle.</CardDescription>
          </Card>
        )}
      </aside>
    </div>
  );
}
