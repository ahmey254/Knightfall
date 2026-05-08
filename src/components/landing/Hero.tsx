'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Chessboard } from 'react-chessboard';
import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { Button } from '@/components/ui/Button';

const OPENING_MOVES = [
  'e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6',
];

export function Hero() {
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  useEffect(() => {
    const chess = new Chess();
    let i = 0;
    const id = setInterval(() => {
      if (i >= OPENING_MOVES.length) {
        chess.reset();
        i = 0;
        setFen(chess.fen());
        return;
      }
      try {
        chess.move(OPENING_MOVES[i]);
        setFen(chess.fen());
      } catch {
        chess.reset();
        i = 0;
      }
      i++;
    }, 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-fade" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real-time multiplayer · Stockfish AI · Free
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-5 font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight"
          >
            Play chess like<br /> it's <span className="gradient-text">2049</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 text-lg text-white/70 max-w-xl"
          >
            A modern chess platform built for speed and clarity. Real-time
            matches, Stockfish-powered analysis, daily puzzles, and an Elo
            leaderboard — wrapped in a dark, focused interface.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/play/online"><Button size="lg">Play now →</Button></Link>
            <Link href="/play/ai"><Button size="lg" variant="ghost">Train vs AI</Button></Link>
            <Link href="/leaderboard" className="text-sm text-white/60 hover:text-white">
              See leaderboard →
            </Link>
          </motion.div>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
            {[
              { k: 'Live engine', v: 'Stockfish 16' },
              { k: 'Latency', v: '<60ms' },
              { k: 'Time controls', v: '3 modes' },
            ].map((it) => (
              <div key={it.k} className="rounded-xl glass px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted">{it.k}</div>
                <div className="font-mono text-sm">{it.v}</div>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative w-full max-w-[520px] mx-auto"
        >
          <div className="absolute -inset-8 bg-hero-glow blur-3xl opacity-30 rounded-full" />
          <div className="relative rounded-2xl p-3 glass-strong shadow-card animate-float">
            <Chessboard
              position={fen}
              arePiecesDraggable={false}
              animationDuration={500}
              customDarkSquareStyle={{ backgroundColor: '#181b3a' }}
              customLightSquareStyle={{ backgroundColor: '#2d3361' }}
              customBoardStyle={{ borderRadius: 12 }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
