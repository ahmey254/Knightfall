'use client';

import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';
import { Board } from '@/components/chess/Board';
import { MoveHistory } from '@/components/chess/MoveHistory';
import { Timer } from '@/components/chess/Timer';
import { GameResult } from '@/components/chess/GameResult';
import { PlayerBar } from '@/components/chess/PlayerBar';
import { EvaluationBar } from '@/components/chess/EvaluationBar';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useChessGame } from '@/hooks/useChessGame';
import { useStockfish } from '@/hooks/useStockfish';
import { useSound } from '@/hooks/useSound';
import { useTimer } from '@/hooks/useTimer';
import { AI_DIFFICULTY, TIME_CONTROLS, type AIDifficulty, type TimeControl } from '@/types/chess';

export default function PlayAIPage() {
  const [color, setColor] = useState<'white' | 'black'>('white');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('intermediate');
  const [timeControl, setTimeControl] = useState<TimeControl>('rapid');
  const [showResult, setShowResult] = useState(false);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [hint, setHint] = useState<string | null>(null);

  const playSound = useSound();
  const game = useChessGame({
    onMove: (m) => {
      const isCapture = /x/.test(m.san);
      const isCastle = /O-O/.test(m.san);
      if (isCastle) playSound('castle');
      else if (isCapture) playSound('capture');
      else playSound('move');
    },
    onGameOver: (_r, reason) => {
      playSound(reason === 'checkmate' ? 'checkmate' : 'end');
      setShowResult(true);
    },
  });

  const tcConfig = TIME_CONTROLS[timeControl];
  const aiCfg = AI_DIFFICULTY[difficulty];

  const stockfish = useStockfish({
    skill: aiCfg.skill,
    depth: aiCfg.depth,
    movetime: difficulty === 'beginner' ? 200 : difficulty === 'intermediate' ? 600 : 1200,
  });

  const turn = game.turn;
  const isAITurn = (color === 'white' && turn === 'b') || (color === 'black' && turn === 'w');
  const isUserTurn = !isAITurn;

  // Local clocks — tick only on the side whose turn it is.
  const whiteClock = useTimer(tcConfig.initialMs, turn === 'w' && !game.result, () => {
    setShowResult(true);
  });
  const blackClock = useTimer(tcConfig.initialMs, turn === 'b' && !game.result, () => {
    setShowResult(true);
  });

  // Reset clocks on time-control change.
  useEffect(() => {
    whiteClock.setMs(tcConfig.initialMs);
    blackClock.setMs(tcConfig.initialMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeControl]);

  useEffect(() => {
    setOrientation(color);
  }, [color]);

  // Drive AI replies whenever it's its turn.
  useEffect(() => {
    if (game.result) return;
    if (!isAITurn) return;
    if (!stockfish.isReady) return;
    let cancelled = false;
    (async () => {
      const uci = await stockfish.findBestMove(game.fen);
      if (cancelled || !uci) return;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? (uci[4] as 'q' | 'r' | 'b' | 'n') : undefined;
      game.move({ from, to, promotion });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAITurn, game.fen, stockfish.isReady, game.result]);

  function handleMove({ from, to, promotion }: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }) {
    if (!isUserTurn || game.result) return false;
    const ok = game.move({ from, to, promotion });
    setHint(null);
    return ok;
  }

  async function getHint() {
    if (!isUserTurn || !stockfish.isReady) return;
    const uci = await stockfish.findBestMove(game.fen);
    if (uci) {
      setHint(uci);
      toast.success(`Engine suggests: ${uci.slice(0, 2)} → ${uci.slice(2, 4)}`);
    }
  }

  function newGame() {
    game.reset();
    whiteClock.setMs(tcConfig.initialMs);
    blackClock.setMs(tcConfig.initialMs);
    setShowResult(false);
    setHint(null);
  }

  const lastMoveSquares = useMemo(() => {
    if (hint) return { from: hint.slice(0, 2), to: hint.slice(2, 4) };
    return game.lastMove;
  }, [hint, game.lastMove]);

  const youWon = game.result && (game.result === color);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="grid lg:grid-cols-[280px_1fr_300px] gap-6">
        {/* Left controls */}
        <Card>
          <CardTitle className="font-display">Configure</CardTitle>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted">Color</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Button size="sm" variant={color === 'white' ? 'primary' : 'ghost'} onClick={() => setColor('white')}>
                  White
                </Button>
                <Button size="sm" variant={color === 'black' ? 'primary' : 'ghost'} onClick={() => setColor('black')}>
                  Black
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted">Difficulty</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(Object.keys(AI_DIFFICULTY) as AIDifficulty[]).map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={difficulty === d ? 'primary' : 'ghost'}
                    onClick={() => setDifficulty(d)}
                  >
                    {d[0].toUpperCase() + d.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted">Time control</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(['bullet', 'blitz', 'rapid', 'unlimited'] as TimeControl[]).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={timeControl === t ? 'primary' : 'ghost'}
                    onClick={() => setTimeControl(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-2">
              <Button fullWidth onClick={newGame}>New game</Button>
              <Button fullWidth variant="ghost" onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>
                Flip board
              </Button>
              <Button fullWidth variant="subtle" onClick={getHint} disabled={!stockfish.isReady}>
                💡 Hint
              </Button>
              <Button fullWidth variant="subtle" onClick={() => game.undo()}>
                ↩ Undo
              </Button>
            </div>
          </div>
        </Card>

        {/* Board area */}
        <div className="flex flex-col gap-3 items-stretch">
          <PlayerBar
            name={orientation === 'white' ? 'Stockfish' : 'You'}
            rating={orientation === 'white' ? 2500 : 1200}
            color={orientation === 'white' ? 'b' : 'w'}
            fen={game.fen}
            active={(orientation === 'white' && turn === 'b') || (orientation === 'black' && turn === 'w')}
            online
          />
          <div className="flex gap-3 items-stretch">
            <div className="hidden sm:block w-6">
              <EvaluationBar
                evaluation={stockfish.analysis.evalCp}
                mate={stockfish.analysis.mate}
                orientation={orientation}
              />
            </div>
            <div className="flex-1">
              <Board
                fen={game.fen}
                orientation={orientation}
                onMove={(m) => handleMove(m)}
                lastMove={lastMoveSquares}
                interactive={isUserTurn && !game.result}
                inCheck={game.inCheck}
              />
            </div>
          </div>
          <PlayerBar
            name={orientation === 'white' ? 'You' : 'Stockfish'}
            rating={orientation === 'white' ? 1200 : 2500}
            color={orientation === 'white' ? 'w' : 'b'}
            fen={game.fen}
            active={(orientation === 'white' && turn === 'w') || (orientation === 'black' && turn === 'b')}
            online
          />
        </div>

        {/* Right side: clocks, history */}
        <div className="space-y-3">
          {timeControl !== 'unlimited' && (
            <Card className="p-3">
              <div className="space-y-2">
                <Timer ms={orientation === 'white' ? blackClock.ms : whiteClock.ms} active={turn === (orientation === 'white' ? 'b' : 'w') && !game.result} label={orientation === 'white' ? 'Black' : 'White'} />
                <Timer ms={orientation === 'white' ? whiteClock.ms : blackClock.ms} active={turn === (orientation === 'white' ? 'w' : 'b') && !game.result} label={orientation === 'white' ? 'White (you)' : 'Black (you)'} />
              </div>
            </Card>
          )}

          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted uppercase tracking-wider">Engine</span>
              <Badge variant={stockfish.isReady ? 'success' : 'warn'}>
                {stockfish.isReady ? (stockfish.usingFallback ? 'js bot' : 'stockfish') : 'loading…'}
              </Badge>
            </div>
            <div className="text-sm font-mono">
              <div>depth: {stockfish.analysis.depth ?? '—'}</div>
              <div>eval: {stockfish.analysis.mate != null ? `M${stockfish.analysis.mate}` : ((stockfish.analysis.evalCp ?? 0) / 100).toFixed(2)}</div>
              <div className="truncate">pv: {stockfish.analysis.pv?.slice(0, 5).join(' ') ?? '—'}</div>
            </div>
          </Card>

          <MoveHistory moves={game.moves} />
        </div>
      </div>

      <GameResult
        open={showResult}
        onClose={() => setShowResult(false)}
        result={game.result}
        reason={game.endReason}
        yourColor={color}
        onRematch={newGame}
      />

      {stockfish.usingFallback && (
        <Card className="mt-6">
          <div className="text-sm text-muted">
            <strong className="text-amber-300">JS fallback bot active.</strong> Stockfish
            WASM isn't installed in <code className="font-mono">/public/stockfish/</code>,
            so the AI is using a built-in chess.js + alpha-beta engine. Strong enough for
            casual play; for full Stockfish strength, drop the engine files into that
            folder (see README).
          </div>
        </Card>
      )}

      {youWon && (
        <div className="fixed inset-0 pointer-events-none z-30">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-2 w-2 bg-accent rounded-full animate-pulse-glow"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: ['#7c5cff', '#22d3ee', '#ff4d8d', '#a3e635'][i % 4],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
