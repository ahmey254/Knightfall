'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';
import { Board } from '@/components/chess/Board';
import { MoveHistory } from '@/components/chess/MoveHistory';
import { EvaluationBar } from '@/components/chess/EvaluationBar';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useStockfish } from '@/hooks/useStockfish';
import type { MoveRecord } from '@/types/chess';

const OPENINGS: { name: string; fen: string }[] = [
  { name: 'Starting position', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  { name: 'Italian Game', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK1R1 b kq - 4 3' },
  { name: 'Ruy Lopez', fen: 'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4' },
  { name: 'Sicilian (Najdorf)', fen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6' },
  { name: 'Queen\'s Gambit', fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2' },
];

export default function AnalysisPage() {
  const params = useSearchParams();
  const initialGame = params.get('game');
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [pgnInput, setPgnInput] = useState('');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [opening, setOpening] = useState<string | null>(null);
  const [currentPly, setCurrentPly] = useState<number>(-1);

  const stockfish = useStockfish({ skill: 20, depth: 18 });

  // Pre-fill from a passed-in game.
  useEffect(() => {
    if (!initialGame) return;
    fetch(`/api/games/${initialGame}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.pgn) return;
        try {
          chess.loadPgn(data.pgn);
          setFen(chess.fen());
          rebuildMoves();
        } catch {
          // ignore malformed pgn
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGame]);

  function rebuildMoves() {
    const verbose = chess.history({ verbose: true });
    const replay = new Chess();
    const list: MoveRecord[] = [];
    verbose.forEach((m) => {
      const r = replay.move({ from: m.from, to: m.to, promotion: m.promotion });
      if (r) list.push({ san: r.san, from: r.from, to: r.to, promotion: r.promotion, fen: replay.fen(), timestamp: Date.now() });
    });
    setMoves(list);
    setCurrentPly(list.length - 1);
  }

  // Run engine analysis on the current position.
  useEffect(() => {
    if (stockfish.isReady) stockfish.analyze(fen);
    // crude opening recognition: match common positions by FEN prefix
    const opp = OPENINGS.find((o) => fen.split(' ')[0] === o.fen.split(' ')[0]);
    setOpening(opp?.name ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, stockfish.isReady]);

  function handleMove({ from, to, promotion }: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }) {
    try {
      const r = chess.move({ from, to, promotion: promotion ?? 'q' });
      if (!r) return false;
      const newFen = chess.fen();
      setFen(newFen);
      const record: MoveRecord = { san: r.san, from: r.from, to: r.to, promotion: r.promotion, fen: newFen, timestamp: Date.now() };
      setMoves((prev) => {
        const next = [...prev.slice(0, currentPly + 1), record];
        setCurrentPly(next.length - 1);
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }

  function importPgn() {
    try {
      const c = new Chess();
      c.loadPgn(pgnInput.trim());
      // Replace state from imported pgn.
      const verbose = c.history({ verbose: true });
      chess.reset();
      verbose.forEach((m) => chess.move({ from: m.from, to: m.to, promotion: m.promotion }));
      setFen(chess.fen());
      rebuildMoves();
      toast.success('PGN loaded');
    } catch {
      toast.error('Could not parse PGN');
    }
  }

  function exportPgn() {
    navigator.clipboard.writeText(chess.pgn());
    toast.success('PGN copied to clipboard');
  }

  function reset() {
    chess.reset();
    setFen(chess.fen());
    setMoves([]);
    setCurrentPly(-1);
  }

  function goToPly(ply: number) {
    const replay = new Chess();
    const verbose = chess.history({ verbose: true });
    for (let i = 0; i <= ply && i < verbose.length; i++) {
      const m = verbose[i];
      replay.move({ from: m.from, to: m.to, promotion: m.promotion });
    }
    setFen(replay.fen());
    setCurrentPly(ply);
  }

  const lastMove = useMemo(() => {
    if (currentPly < 0) return null;
    const m = moves[currentPly];
    return m ? { from: m.from, to: m.to } : null;
  }, [currentPly, moves]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="flex gap-3">
          <div className="hidden sm:block w-6">
            <EvaluationBar evaluation={stockfish.analysis.evalCp} mate={stockfish.analysis.mate} orientation={orientation} />
          </div>
          <div className="flex-1">
            <Board fen={fen} orientation={orientation} onMove={(m) => handleMove(m)} lastMove={lastMove} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => goToPly(-1)}>⏮</Button>
              <Button size="sm" variant="ghost" onClick={() => goToPly(Math.max(-1, currentPly - 1))}>◀</Button>
              <Button size="sm" variant="ghost" onClick={() => goToPly(Math.min(moves.length - 1, currentPly + 1))}>▶</Button>
              <Button size="sm" variant="ghost" onClick={() => goToPly(moves.length - 1)}>⏭</Button>
              <Button size="sm" variant="ghost" onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>Flip</Button>
              <Button size="sm" variant="subtle" onClick={reset}>Reset</Button>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CardTitle>Engine</CardTitle>
              <Badge variant={stockfish.isReady ? 'success' : 'warn'}>
                {stockfish.isReady ? 'ready' : 'loading…'}
              </Badge>
            </div>
            <div className="text-sm font-mono space-y-1">
              <div>depth: <span className="text-white">{stockfish.analysis.depth ?? '—'}</span></div>
              <div>eval: <span className="text-white">{stockfish.analysis.mate != null ? `M${stockfish.analysis.mate}` : ((stockfish.analysis.evalCp ?? 0) / 100).toFixed(2)}</span></div>
              <div>best: <span className="text-accent">{stockfish.analysis.bestMove ?? '—'}</span></div>
              <div className="truncate">pv: {stockfish.analysis.pv?.slice(0, 6).join(' ') ?? '—'}</div>
            </div>
          </Card>

          {opening && (
            <Card className="p-3">
              <div className="text-xs uppercase text-muted">Opening</div>
              <div className="font-semibold">{opening}</div>
            </Card>
          )}

          <Card>
            <CardTitle>PGN</CardTitle>
            <CardDescription className="mt-1">Import or export the game.</CardDescription>
            <textarea
              className="input mt-3 h-24 font-mono text-xs"
              placeholder="Paste PGN here…"
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={importPgn} disabled={!pgnInput.trim()}>Import</Button>
              <Button size="sm" variant="ghost" onClick={exportPgn}>Export</Button>
            </div>
          </Card>

          <MoveHistory moves={moves} currentPly={currentPly} onSelect={goToPly} />
        </aside>
      </div>
    </div>
  );
}
