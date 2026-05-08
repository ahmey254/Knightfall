import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listGames, createGame } from '@/services/gameService';
import type { GameMode, TimeControl } from '@/types/chess';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') as 'waiting' | 'active' | 'finished' | null;
  const mode = url.searchParams.get('mode') as GameMode | null;
  const userId = url.searchParams.get('user');
  const limit = Number(url.searchParams.get('limit') ?? '20');
  const page = Number(url.searchParams.get('page') ?? '1');

  const data = await listGames({
    status: status ?? undefined,
    mode: mode ?? undefined,
    userId: userId ?? undefined,
    limit,
    page,
  });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => ({}));
  const mode: GameMode = body.mode ?? 'ai';
  const timeControl: TimeControl = body.timeControl ?? 'rapid';

  const game = await createGame({
    mode,
    timeControl,
    aiDifficulty: body.aiDifficulty,
    white: session?.user?.id,
    whiteName: session?.user?.username ?? 'You',
    blackName: mode === 'ai' ? 'Stockfish' : undefined,
  });
  return NextResponse.json(game);
}
