'use client';

// Engine wrapper. Tries to load Stockfish from /public/stockfish/ first
// (drop the upstream `stockfish.js` + `stockfish.wasm` there for full strength).
// If the worker fails to load, transparently falls back to a JS bot built on
// chess.js + alpha-beta minimax — so the AI is always responsive.

import { useEffect, useRef, useState, useCallback } from 'react';
import { findBestMoveJS } from '@/lib/jsBot';

export interface StockfishAnalysis {
  bestMove?: string;
  ponder?: string;
  evalCp?: number;
  mate?: number | null;
  depth?: number;
  pv?: string[];
  thinking: boolean;
}

export interface UseStockfishOptions {
  skill?: number;
  depth?: number;
  movetime?: number;
  multiPV?: number;
  ready?: boolean;
}

// Map Stockfish skill (0..20) to JS-bot search depth + blunder rate.
function jsBotConfig(skill: number) {
  if (skill <= 3) return { depth: 1, blunderRate: 0.35 }; // beginner
  if (skill <= 10) return { depth: 2, blunderRate: 0.10 }; // intermediate
  if (skill <= 16) return { depth: 3, blunderRate: 0.02 }; // advanced
  return { depth: 4, blunderRate: 0 }; // master
}

export function useStockfish(opts: UseStockfishOptions = {}) {
  const { skill = 20, depth = 16, movetime, multiPV = 1, ready = true } = opts;
  const workerRef = useRef<Worker | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [analysis, setAnalysis] = useState<StockfishAnalysis>({ thinking: false });
  const onMoveResolverRef = useRef<((m: string | null) => void) | null>(null);

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;

    let worker: Worker | null = null;
    let cancelled = false;

    // Probe if the worker file actually exists before constructing — Worker()
    // throws asynchronously on 404 and we don't want a hard-failure timeline.
    fetch('/stockfish/stockfish.js', { method: 'HEAD' })
      .then((r) => {
        if (cancelled) return;
        if (!r.ok) {
          setUsingFallback(true);
          setEngineReady(true);
          return;
        }
        try {
          worker = new Worker('/stockfish/stockfish.js');
        } catch (e) {
          console.warn('Stockfish worker construction failed; falling back to JS bot.', e);
          setUsingFallback(true);
          setEngineReady(true);
          return;
        }
        workerRef.current = worker;

        const send = (cmd: string) => worker?.postMessage(cmd);

        worker.onerror = () => {
          if (cancelled) return;
          console.warn('Stockfish worker errored; falling back to JS bot.');
          setUsingFallback(true);
          setEngineReady(true);
          worker?.terminate();
          workerRef.current = null;
        };

        worker.onmessage = (e) => {
          const line = typeof e.data === 'string' ? e.data : e.data?.data;
          if (!line) return;
          if (line === 'uciok') {
            send('setoption name Skill Level value ' + skill);
            send('setoption name MultiPV value ' + multiPV);
            send('isready');
          } else if (line === 'readyok') {
            setEngineReady(true);
          } else if (line.startsWith('info')) {
            const depthMatch = line.match(/depth (\d+)/);
            const cpMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            const pvMatch = line.match(/ pv (.+)$/);
            setAnalysis((prev) => ({
              ...prev,
              thinking: true,
              depth: depthMatch ? Number(depthMatch[1]) : prev.depth,
              evalCp: cpMatch ? Number(cpMatch[1]) : prev.evalCp,
              mate: mateMatch ? Number(mateMatch[1]) : null,
              pv: pvMatch ? pvMatch[1].trim().split(/\s+/) : prev.pv,
            }));
          } else if (line.startsWith('bestmove')) {
            const parts = line.split(/\s+/);
            const best = parts[1] === '(none)' ? null : parts[1];
            const ponder = parts[3];
            setAnalysis((prev) => ({ ...prev, thinking: false, bestMove: best ?? undefined, ponder }));
            const r = onMoveResolverRef.current;
            onMoveResolverRef.current = null;
            r?.(best);
          }
        };

        send('uci');
      })
      .catch(() => {
        if (cancelled) return;
        setUsingFallback(true);
        setEngineReady(true);
      });

    return () => {
      cancelled = true;
      worker?.postMessage('quit');
      worker?.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!engineReady || usingFallback) return;
    workerRef.current?.postMessage('setoption name Skill Level value ' + skill);
  }, [skill, engineReady, usingFallback]);

  const analyze = useCallback(
    (fen: string) => {
      if (usingFallback) {
        // Cheap synchronous-ish eval for the fallback path.
        const cfg = jsBotConfig(skill);
        const r = findBestMoveJS(fen, cfg);
        if (r) {
          setAnalysis({
            thinking: false,
            depth: r.depth,
            evalCp: r.evalCp,
            pv: r.pv,
            bestMove: r.uci,
            mate: null,
          });
        }
        return;
      }
      const w = workerRef.current;
      if (!w || !engineReady) return;
      w.postMessage('stop');
      w.postMessage('position fen ' + fen);
      setAnalysis({ thinking: true });
      w.postMessage(movetime ? `go movetime ${movetime}` : `go depth ${depth}`);
    },
    [engineReady, depth, movetime, usingFallback, skill],
  );

  const findBestMove = useCallback(
    (fen: string): Promise<string | null> => {
      // Fallback path — defer with setTimeout so the UI can update first.
      if (usingFallback) {
        return new Promise((resolve) => {
          setAnalysis((p) => ({ ...p, thinking: true }));
          setTimeout(() => {
            const cfg = jsBotConfig(skill);
            const r = findBestMoveJS(fen, cfg);
            if (r) {
              setAnalysis({
                thinking: false,
                depth: r.depth,
                evalCp: r.evalCp,
                pv: r.pv,
                bestMove: r.uci,
                mate: null,
              });
              resolve(r.uci);
            } else {
              setAnalysis((p) => ({ ...p, thinking: false }));
              resolve(null);
            }
          }, 50);
        });
      }

      return new Promise((resolve) => {
        const w = workerRef.current;
        if (!w || !engineReady) return resolve(null);
        if (onMoveResolverRef.current) onMoveResolverRef.current(null);
        onMoveResolverRef.current = resolve;
        w.postMessage('stop');
        w.postMessage('position fen ' + fen);
        setAnalysis({ thinking: true });
        w.postMessage(movetime ? `go movetime ${movetime}` : `go depth ${depth}`);
      });
    },
    [engineReady, depth, movetime, usingFallback, skill],
  );

  const stop = useCallback(() => {
    workerRef.current?.postMessage('stop');
    setAnalysis((p) => ({ ...p, thinking: false }));
  }, []);

  return {
    isReady: engineReady,
    usingFallback,
    analysis,
    analyze,
    findBestMove,
    stop,
  };
}
