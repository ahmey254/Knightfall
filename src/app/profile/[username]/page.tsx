'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatRelative } from '@/lib/utils';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/users/${username}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, [username]);

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 grid gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const { user, recent, ratingHistory } = data;
  const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <Card className="flex flex-wrap items-center gap-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-accent to-accent-cyan grid place-items-center text-2xl font-bold">
            {user.username[0].toUpperCase()}
          </div>
          {user.online && (
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-bg" />
          )}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-display text-3xl font-bold">{user.username}</h1>
          {user.bio && <p className="text-muted text-sm mt-1">{user.bio}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="info">★ {user.rating}</Badge>
            <Badge>Peak {user.peakRating}</Badge>
            <Badge variant="success">{user.gamesPlayed} games</Badge>
            <Badge variant={user.online ? 'success' : 'default'}>{user.online ? 'Online' : 'Offline'}</Badge>
            {user.badges.map((b: string) => (
              <Badge key={b} variant="warn">🏅 {b}</Badge>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Joined</div>
          <div className="font-medium">{formatRelative(user.createdAt)}</div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-4 gap-3">
        <MiniStat k="Wins" v={user.wins} color="text-emerald-300" />
        <MiniStat k="Draws" v={user.draws} color="text-amber-300" />
        <MiniStat k="Losses" v={user.losses} color="text-rose-300" />
        <MiniStat k="Win rate" v={`${winRate}%`} />
      </div>

      <Card>
        <CardTitle>Rating history</CardTitle>
        {ratingHistory.length === 0 ? (
          <CardDescription className="mt-2">No rated games yet.</CardDescription>
        ) : (
          <div className="h-72 mt-3">
            <ResponsiveContainer>
              <LineChart data={ratingHistory.map((p: any) => ({ at: new Date(p.at).toLocaleDateString(), rating: p.rating }))}>
                <XAxis dataKey="at" tick={{ fontSize: 11, fill: '#8a90b3' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8a90b3' }} />
                <Tooltip contentStyle={{ background: 'rgba(17,20,42,0.9)', border: '1px solid rgba(124,92,255,0.3)', borderRadius: 8 }} />
                <Line dataKey="rating" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Recent games</CardTitle>
        <div className="mt-3 space-y-1">
          {recent.length === 0 && <CardDescription>No games yet.</CardDescription>}
          {recent.map((g: any) => (
            <Link key={g.id} href={`/analysis?game=${g.gameId}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5">
              <span>vs <strong>{g.opponent}</strong></span>
              <Badge variant={g.result === 'win' ? 'success' : g.result === 'draw' ? 'warn' : 'danger'}>
                {g.result}
              </Badge>
              <span className={`font-mono ${g.ratingDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {g.ratingDelta >= 0 ? '+' : ''}{g.ratingDelta}
              </span>
              <span className="text-xs text-muted">{formatRelative(g.playedAt)}</span>
            </Link>
          ))}
        </div>
      </Card>

      <div>
        <Button variant="ghost" onClick={async () => {
          const res = await fetch('/api/friends', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username }),
          });
          if (res.ok) alert('Friend request sent');
        }}>
          + Add friend
        </Button>
      </div>
    </div>
  );
}

function MiniStat({ k, v, color }: { k: string; v: string | number; color?: string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wider text-muted">{k}</div>
      <div className={`text-2xl font-bold font-display ${color ?? ''}`}>{v}</div>
    </Card>
  );
}
