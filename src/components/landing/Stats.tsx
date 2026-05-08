'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Stats {
  users: number;
  games: number;
  online: number;
  active: number;
}

export function Stats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/stats')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setStats(d))
        .catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const items = [
    { k: 'Players', v: stats?.users ?? 0 },
    { k: 'Games played', v: stats?.games ?? 0 },
    { k: 'Online now', v: stats?.online ?? 0 },
    { k: 'Live games', v: stats?.active ?? 0 },
  ];

  return (
    <section className="relative py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((it) => (
            <motion.div
              key={it.k}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card text-center"
            >
              <div className="text-3xl font-display font-bold gradient-text">
                {it.v.toLocaleString()}
              </div>
              <div className="text-xs uppercase tracking-wider text-muted mt-1">{it.k}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
