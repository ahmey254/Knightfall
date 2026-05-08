'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useSocket } from '@/hooks/useSocket';
import { TIME_CONTROLS, type TimeControl } from '@/types/chess';

export default function PlayOnlinePage() {
  const router = useRouter();
  const { socket, connected } = useSocket();
  const [timeControl, setTimeControl] = useState<TimeControl>('rapid');
  const [searching, setSearching] = useState(false);
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const onMatch = (payload: { snapshot: { id: string } }) => {
      setSearching(false);
      router.push(`/play/${payload.snapshot.id}`);
    };
    socket.on('match_found', onMatch);
    return () => {
      socket.off('match_found', onMatch);
    };
  }, [socket, router]);

  function findMatch() {
    if (!socket) return toast.error('Not connected to server');
    setSearching(true);
    socket.emit('find_match', { timeControl }, (ack: { ok: boolean }) => {
      if (!ack?.ok) {
        setSearching(false);
        toast.error('Could not enter matchmaking');
      }
    });
  }

  function cancelMatch() {
    socket?.emit('cancel_match', { timeControl });
    setSearching(false);
  }

  function createPrivate() {
    if (!socket) return toast.error('Not connected');
    setCreating(true);
    socket.emit('create_game', { mode: 'private', timeControl, isPrivate: true }, (ack: any) => {
      setCreating(false);
      if (!ack?.ok) return toast.error('Failed to create room');
      router.push(`/play/${ack.snapshot.id}`);
    });
  }

  function joinByCode() {
    if (!code.trim()) return;
    socket?.emit('join_room', { roomCode: code.trim().toUpperCase() }, (ack: any) => {
      if (!ack?.ok) return toast.error(ack?.error || 'Could not join');
      router.push(`/play/${ack.snapshot.id}`);
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          Play <span className="gradient-text">online</span>
        </h1>
        <Badge variant={connected ? 'success' : 'warn'}>{connected ? 'connected' : 'reconnecting…'}</Badge>
      </div>

      <Card>
        <CardTitle>Quick match</CardTitle>
        <CardDescription>Get paired with a player at your level.</CardDescription>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['bullet', 'blitz', 'rapid', 'unlimited'] as TimeControl[]).map((t) => (
            <Button
              key={t}
              variant={timeControl === t ? 'primary' : 'ghost'}
              onClick={() => setTimeControl(t)}
            >
              {TIME_CONTROLS[t].label}
            </Button>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2">
          {!searching ? (
            <Button onClick={findMatch} disabled={!connected}>Find match</Button>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 text-sm text-muted">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                Searching for a {TIME_CONTROLS[timeControl].label} opponent…
              </span>
              <Button variant="ghost" onClick={cancelMatch}>Cancel</Button>
            </>
          )}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Create a private room</CardTitle>
          <CardDescription>Send the code to a friend.</CardDescription>
          <Button className="mt-4" onClick={createPrivate} loading={creating}>Create room</Button>
        </Card>

        <Card>
          <CardTitle>Join by code</CardTitle>
          <CardDescription>6-character room code.</CardDescription>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="font-mono uppercase"
            />
            <Button onClick={joinByCode} disabled={!code.trim()}>Join</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
