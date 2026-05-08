'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelative } from '@/lib/utils';

interface MeResponse {
  user: {
    username: string;
    rating: number;
    peakRating: number;
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
    badges: string[];
  };
  recent: Array<{
    id: string;
    gameId: string;
    opponent: string;
    color: 'white' | 'black';
    result: 'win' | 'loss' | 'draw';
    ratingDelta: number;
    ratingAfter: number;
    timeControl: string;
    moves: number;
    playedAt: string;
  }>;
  ratingHistory: Array<{ at: string; rating: number; delta: number }>;
}

export default function DashboardPage() {
  const { status } = useSession();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto max-w-md text-center py-20 space-y-4">
        <h1 className="font-display text-3xl">Sign in to see your dashboard</h1>
        <Link href="/login"><Button>Sign in</Button></Link>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 grid sm:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const { user, recent, ratingHistory } = data;
  const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;

  const pieData = [
    { name: 'Wins', value: user.wins, color: '#34d399' },
    { name: 'Draws', value: user.draws, color: '#fbbf24' },
    { name: 'Losses', value: user.losses, color: '#fb7185' },
  ];

  const chartData = ratingHistory.map((p) => ({
    at: new Date(p.at).toLocaleDateString(),
    rating: p.rating,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Welcome back, <span className="gradient-text">{user.username}</span>
          </h1>
          <p className="text-muted">Here's your chess at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/play/online"><Button>Play online</Button></Link>
          <Link href="/play/ai"><Button variant="ghost">vs AI</Button></Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Rating" value={user.rating} sub={`Peak ${user.peakRating}`} accent />
        <StatBox label="Games played" value={user.gamesPlayed} />
        <StatBox label="Win rate" value={`${winRate}%`} sub={`${user.wins}W / ${user.draws}D / ${user.losses}L`} />
        <StatBox label="Badges" value={user.badges.length} sub={user.badges.slice(0, 3).join(', ') || '—'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardTitle>Rating over time</CardTitle>
          {chartData.length === 0 ? (
            <div className="text-center text-muted py-12">Play a few rated games to see your trajectory.</div>
          ) : (
            <div className="h-72 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <XAxis dataKey="at" tick={{ fontSize: 11, fill: '#8a90b3' }} />
                  <YAxis domain={['dataMin - 30', 'dataMax + 30']} tick={{ fontSize: 11, fill: '#8a90b3' }} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(17,20,42,0.92)', border: '1px solid rgba(124,92,255,0.3)', borderRadius: 8 }}
                    labelStyle={{ color: '#e7e9f5' }}
                  />
                  <Line type="monotone" dataKey="rating" stroke="#7c5cff" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Results split</CardTitle>
          <div className="h-56 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} stroke="rgba(0,0,0,0.4)" strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-3 text-xs text-muted">
            {pieData.map((d) => (
              <span key={d.name}>
                <span className="inline-block h-2 w-2 rounded-full mr-1 align-middle" style={{ background: d.color }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold">Recent games</h3>
          <CardDescription>Last {recent.length}</CardDescription>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted">No games yet — go play one!</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left px-5 py-2">Opponent</th>
                <th className="text-left px-3 py-2">Color</th>
                <th className="text-left px-3 py-2">Result</th>
                <th className="text-left px-3 py-2">Δ</th>
                <th className="text-left px-3 py-2">Time</th>
                <th className="text-left px-3 py-2">When</th>
                <th className="text-right px-5 py-2">Review</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((g) => (
                <tr key={g.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-5 py-2.5 font-medium">{g.opponent ?? '—'}</td>
                  <td className="px-3">{g.color === 'white' ? '♔' : '♚'}</td>
                  <td className="px-3">
                    <Badge
                      variant={g.result === 'win' ? 'success' : g.result === 'draw' ? 'warn' : 'danger'}
                    >
                      {g.result}
                    </Badge>
                  </td>
                  <td className={`px-3 font-mono ${g.ratingDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {g.ratingDelta >= 0 ? '+' : ''}{g.ratingDelta}
                  </td>
                  <td className="px-3 text-muted">{g.timeControl}</td>
                  <td className="px-3 text-muted">{formatRelative(g.playedAt)}</td>
                  <td className="px-5 text-right">
                    <Link href={`/analysis?game=${g.gameId}`} className="text-accent hover:underline">
                      Review →
                    </Link>
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

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <Card className={accent ? 'border-accent/30' : ''}>
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-3xl font-bold font-display ${accent ? 'gradient-text' : ''}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </Card>
  );
}
