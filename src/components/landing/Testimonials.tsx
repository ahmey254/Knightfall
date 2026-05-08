'use client';

import { motion } from 'framer-motion';

const QUOTES = [
  {
    name: 'Mira K.',
    title: '1980 rapid',
    quote:
      "Switched from Chess.com for the dark UI. Stayed for the snappy clock and the eval bar. It's just nicer to look at.",
  },
  {
    name: 'Daniyar A.',
    title: '2210 blitz',
    quote:
      'The matchmaking is fast and the engine analysis is on par with what I get on my desktop GUI. Hard to believe it\'s a web app.',
  },
  {
    name: 'Sofia R.',
    title: 'Beginner',
    quote:
      "The hint system + difficulty levels for the AI made me actually want to keep playing. I went from losing every game to drawing intermediates.",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          Loved by <span className="gradient-text">players of every level</span>
        </h2>
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {QUOTES.map((q, i) => (
            <motion.figure
              key={q.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="card"
            >
              <blockquote className="text-white/85 leading-relaxed">"{q.quote}"</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent to-accent-cyan grid place-items-center text-sm font-bold">
                  {q.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-sm">{q.name}</div>
                  <div className="text-xs text-muted">{q.title}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
