'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import type { LeaderboardEntry } from '@/types/game';

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard?limit=100')
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-4">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          <span className="gradient-text">Leaderboard</span>
        </h1>
        <p className="text-muted">Top players by Elo rating.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        {!rows ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-muted">No ranked players yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left px-5 py-3 w-12">#</th>
                <th className="text-left px-3">Player</th>
                <th className="text-right px-3">Rating</th>
                <th className="text-right px-3 hidden sm:table-cell">Games</th>
                <th className="text-right px-5 hidden sm:table-cell">W / D / L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.username} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-5 py-3 font-mono text-muted">{r.rank}</td>
                  <td className="px-3 py-3">
                    <Link href={`/profile/${r.username}`} className="flex items-center gap-2 group">
                      <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-accent to-accent-cyan grid place-items-center text-xs font-bold">
                        {r.username[0]?.toUpperCase()}
                        {r.online && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-bg" />
                        )}
                      </div>
                      <span className="font-medium group-hover:text-accent transition-colors">{r.username}</span>
                      {r.rank <= 3 && <Badge variant={r.rank === 1 ? 'warn' : r.rank === 2 ? 'info' : 'default'}>#{r.rank}</Badge>}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right font-bold font-mono">{r.rating}</td>
                  <td className="px-3 py-3 text-right text-muted hidden sm:table-cell">{r.gamesPlayed}</td>
                  <td className="px-5 py-3 text-right text-muted hidden sm:table-cell font-mono text-xs">
                    {r.wins} / {r.draws} / {r.losses}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
