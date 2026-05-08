'use client';

import { motion } from 'framer-motion';

const FEATURES = [
  {
    title: 'Real-time multiplayer',
    body: 'WebSocket-driven matches with server-side move validation. Reconnect mid-game without losing state.',
    icon: '⚡',
  },
  {
    title: 'Stockfish 16 engine',
    body: 'Train against a world-class engine, get hint moves, and watch the eval bar swing in real time.',
    icon: '🧠',
  },
  {
    title: 'Deep analysis',
    body: 'Replay any game move-by-move with best-move suggestions, opening recognition, and PGN export.',
    icon: '🔬',
  },
  {
    title: 'Three time controls',
    body: 'Bullet, Blitz, and Rapid — with proper increment handling and a server-authoritative clock.',
    icon: '⏱',
  },
  {
    title: 'Elo leaderboard',
    body: 'FIDE-style ratings with K-factor decay, peak rating tracking, and per-time-control stats.',
    icon: '🏆',
  },
  {
    title: 'Spectator mode',
    body: 'Drop into any active game as a viewer. Live moves, live clock, no spoilers.',
    icon: '👀',
  },
];

export function Features() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            Built for players who <span className="gradient-text">care about chess</span>.
          </h2>
          <p className="mt-3 text-white/70">
            Every detail of Knightfall is tuned for clarity and speed — from the
            authoritative server clock to the eval-bar animation.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="card group hover:border-accent/30 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
