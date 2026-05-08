'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { Board } from '@/components/chess/Board';
import { MoveHistory } from '@/components/chess/MoveHistory';
import { Timer } from '@/components/chess/Timer';
import { GameResult } from '@/components/chess/GameResult';
import { PlayerBar } from '@/components/chess/PlayerBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useSocket } from '@/hooks/useSocket';
import { useSound } from '@/hooks/useSound';
import type { GameStateSnapshot, MoveRecord, ChatMessage } from '@/types/chess';

export default function GameRoomPage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const { socket, connected } = useSocket();
  const { data: session } = useSession();
  const playSound = useSound();

  const [snapshot, setSnapshot] = useState<GameStateSnapshot | null>(null);
  const [whiteMs, setWhiteMs] = useState(0);
  const [blackMs, setBlackMs] = useState(0);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [drawOffer, setDrawOffer] = useState<'w' | 'b' | null>(null);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [emojiPop, setEmojiPop] = useState<{ from: string; emoji: string; id: number } | null>(null);
  const joinedRef = useRef(false);

  const userId = session?.user?.id;

  const yourColor: 'white' | 'black' | null = useMemo(() => {
    if (!snapshot) return null;
    if (userId && snapshot.white?.id === userId) return 'white';
    if (userId && snapshot.black?.id === userId) return 'black';
    if (!snapshot.white?.id && !snapshot.black?.id) return 'white'; // guest fallback
    return null;
  }, [snapshot, userId]);

  // Join the game room as soon as the socket is ready.
  useEffect(() => {
    if (!socket || !connected || !gameId || joinedRef.current) return;
    joinedRef.current = true;
    socket.emit('join_room', { roomCode: gameId }, (ack: any) => {
      if (!ack?.ok) {
        toast.error(ack?.error || 'Could not join game');
        return;
      }
      setSnapshot(ack.snapshot);
      setWhiteMs(ack.snapshot.clock?.whiteMs ?? ack.snapshot.initialTimeMs);
      setBlackMs(ack.snapshot.clock?.blackMs ?? ack.snapshot.initialTimeMs);
      setChat(ack.snapshot.chat ?? []);
    });
  }, [socket, connected, gameId]);

  useEffect(() => {
    if (yourColor) setOrientation(yourColor);
  }, [yourColor]);

  // Wire all the live-game socket events.
  useEffect(() => {
    if (!socket) return;
    const onMove = (payload: { move: MoveRecord; clock: { whiteMs: number; blackMs: number; turn: 'w' | 'b' }; check: boolean }) => {
      setSnapshot((s) =>
        s ? { ...s, fen: payload.move.fen, moves: [...s.moves, payload.move] } : s,
      );
      setWhiteMs(payload.clock.whiteMs);
      setBlackMs(payload.clock.blackMs);
      setLastMove({ from: payload.move.from, to: payload.move.to });
      const cap = /x/.test(payload.move.san);
      const cas = /O-O/.test(payload.move.san);
      if (payload.check) playSound('check');
      else if (cas) playSound('castle');
      else if (cap) playSound('capture');
      else playSound('move');
    };
    const onTick = (clk: { whiteMs: number; blackMs: number }) => {
      setWhiteMs(clk.whiteMs);
      setBlackMs(clk.blackMs);
    };
    const onStart = (snap: GameStateSnapshot) => {
      setSnapshot(snap);
      playSound('start');
    };
    const onJoined = (payload: { snapshot: GameStateSnapshot }) => setSnapshot(payload.snapshot);
    const onEnd = (payload: { result: 'white' | 'black' | 'draw'; reason: string; snapshot: GameStateSnapshot }) => {
      setSnapshot(payload.snapshot);
      setShowResult(true);
      playSound(payload.reason === 'checkmate' ? 'checkmate' : 'end');
    };
    const onChat = (m: ChatMessage) => setChat((c) => [...c, m]);
    const onDraw = (payload: { by: 'w' | 'b' }) => {
      setDrawOffer(payload.by);
      toast(`${payload.by === 'w' ? 'White' : 'Black'} offers a draw`, { icon: '🤝' });
    };
    const onDrawDeclined = () => setDrawOffer(null);
    const onEmoji = (payload: { from: string; emoji: string }) => {
      setEmojiPop({ ...payload, id: Date.now() });
      setTimeout(() => setEmojiPop(null), 2200);
    };

    socket.on('move_made', onMove);
    socket.on('clock_tick', onTick);
    socket.on('game_started', onStart);
    socket.on('player_joined', onJoined);
    socket.on('game_ended', onEnd);
    socket.on('chat_message', onChat);
    socket.on('draw_offered', onDraw);
    socket.on('draw_declined', onDrawDeclined);
    socket.on('emoji', onEmoji);

    return () => {
      socket.off('move_made', onMove);
      socket.off('clock_tick', onTick);
      socket.off('game_started', onStart);
      socket.off('player_joined', onJoined);
      socket.off('game_ended', onEnd);
      socket.off('chat_message', onChat);
      socket.off('draw_offered', onDraw);
      socket.off('draw_declined', onDrawDeclined);
      socket.off('emoji', onEmoji);
    };
  }, [socket, playSound]);

  function handleMove(m: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }): boolean {
    if (!socket || !snapshot || snapshot.status !== 'active' || !yourColor) return false;
    const turn = snapshot.fen.split(' ')[1];
    if ((yourColor === 'white' && turn !== 'w') || (yourColor === 'black' && turn !== 'b')) {
      toast.error("Not your turn");
      return false;
    }
    socket.emit('make_move', { gameId, ...m }, (ack: { ok: boolean; error?: string }) => {
      if (!ack?.ok) toast.error(ack?.error || 'Illegal move');
    });
    return true;
  }

  function resign() {
    if (!confirm('Resign this game?')) return;
    socket?.emit('resign', { gameId });
  }

  function offerDraw() {
    socket?.emit('offer_draw', { gameId });
    toast.success('Draw offered');
  }

  function acceptDraw() {
    socket?.emit('accept_draw', { gameId });
  }

  function declineDraw() {
    socket?.emit('decline_draw', { gameId });
    setDrawOffer(null);
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatText.trim()) return;
    socket?.emit('chat', { gameId, text: chatText.trim() });
    setChatText('');
  }

  function sendEmoji(emoji: string) {
    socket?.emit('emoji', { gameId, emoji });
  }

  if (!snapshot) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted">
        <div className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          Connecting to game…
        </div>
      </div>
    );
  }

  const turnIsWhite = snapshot.fen.split(' ')[1] === 'w';
  const opp = yourColor === 'white' ? snapshot.black : snapshot.white;
  const me = yourColor === 'white' ? snapshot.white : snapshot.black;
  const oppMs = orientation === 'white' ? blackMs : whiteMs;
  const meMs = orientation === 'white' ? whiteMs : blackMs;
  const oppActive = (orientation === 'white' && !turnIsWhite) || (orientation === 'black' && turnIsWhite);
  const meActive = !oppActive && snapshot.status === 'active';
  const isUserTurn = (yourColor === 'white' && turnIsWhite) || (yourColor === 'black' && !turnIsWhite);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      {snapshot.roomCode && snapshot.status === 'waiting' && (
        <Card className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted">Share this code with a friend:</div>
            <div className="font-mono text-2xl font-bold tracking-widest gradient-text">{snapshot.roomCode}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(snapshot.roomCode!);
              toast.success('Copied');
            }}
          >
            Copy
          </Button>
        </Card>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-3">
          <PlayerBar
            name={opp?.name ?? 'Waiting…'}
            rating={opp?.rating}
            color={orientation === 'white' ? 'b' : 'w'}
            fen={snapshot.fen}
            active={oppActive}
            online={!!opp}
          />
          <Board
            fen={snapshot.fen}
            orientation={orientation}
            interactive={isUserTurn && snapshot.status === 'active'}
            onMove={(m) => handleMove(m)}
            lastMove={lastMove}
          />
          <PlayerBar
            name={me?.name ?? session?.user?.username ?? 'You'}
            rating={me?.rating}
            color={orientation === 'white' ? 'w' : 'b'}
            fen={snapshot.fen}
            active={meActive}
            online
          />
        </div>

        <aside className="space-y-3">
          {snapshot.timeControl !== 'unlimited' && (
            <Card className="p-3 space-y-2">
              <Timer ms={oppMs} active={oppActive} label={opp?.name ?? 'Opponent'} />
              <Timer ms={meMs} active={meActive} label={me?.name ?? 'You'} />
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>
              Flip
            </Button>
            <Button variant="ghost" size="sm" onClick={offerDraw} disabled={snapshot.status !== 'active'}>
              Draw
            </Button>
            <Button variant="danger" size="sm" onClick={resign} disabled={snapshot.status !== 'active'}>
              Resign
            </Button>
          </div>

          {drawOffer && drawOffer !== (yourColor === 'white' ? 'w' : 'b') && (
            <Card className="p-3 border border-amber-500/30">
              <div className="text-sm">Draw offered</div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={acceptDraw}>Accept</Button>
                <Button size="sm" variant="ghost" onClick={declineDraw}>Decline</Button>
              </div>
            </Card>
          )}

          <MoveHistory moves={snapshot.moves} />

          {/* Emoji reactions row */}
          <Card className="p-3">
            <div className="text-xs text-muted mb-2">Reactions</div>
            <div className="flex gap-1 text-2xl">
              {['👋', '😅', '🔥', '🧠', '🤝', '😱'].map((e) => (
                <button
                  key={e}
                  className="hover:scale-110 transition-transform"
                  onClick={() => sendEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
              <span className="text-sm font-semibold">Chat</span>
              <Badge variant="info">{chat.length}</Badge>
            </div>
            <div className="px-3 py-2 max-h-48 overflow-y-auto space-y-1 text-sm">
              {chat.length === 0 && <div className="text-muted text-xs">Be civil. Have fun.</div>}
              {chat.map((m, i) => (
                <div key={i}>
                  <span className="font-semibold text-accent-cyan">{m.username}:</span>{' '}
                  <span className="text-white/85">{m.text}</span>
                </div>
              ))}
            </div>
            <form onSubmit={sendChat} className="border-t border-white/5 p-2 flex gap-2">
              <Input
                placeholder="Say hi…"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                maxLength={200}
              />
              <Button size="sm" type="submit">Send</Button>
            </form>
          </Card>
        </aside>
      </div>

      {emojiPop && (
        <div className="fixed inset-0 grid place-items-center pointer-events-none z-40">
          <div
            key={emojiPop.id}
            className="text-7xl animate-pulse-glow"
          >
            {emojiPop.emoji}
          </div>
        </div>
      )}

      <GameResult
        open={showResult}
        onClose={() => setShowResult(false)}
        result={snapshot.result}
        reason={snapshot.endReason}
        yourColor={yourColor ?? undefined}
      />
    </div>
  );
}
