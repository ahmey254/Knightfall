import { connectDB } from '@/lib/mongodb';
import { Game } from '@/models/Game';
import type { GameMode, TimeControl } from '@/types/chess';

export interface ListGamesOptions {
  status?: 'waiting' | 'active' | 'finished';
  mode?: GameMode;
  userId?: string;
  limit?: number;
  page?: number;
}

export async function listGames(opts: ListGamesOptions = {}) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.mode) filter.mode = opts.mode;
  if (opts.userId) filter.$or = [{ white: opts.userId }, { black: opts.userId }];

  const limit = Math.min(opts.limit ?? 20, 100);
  const skip = ((opts.page ?? 1) - 1) * limit;

  const [items, total] = await Promise.all([
    Game.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('white black whiteName blackName status result mode timeControl createdAt endedAt')
      .lean(),
    Game.countDocuments(filter),
  ]);

  return { items, total, page: opts.page ?? 1, limit };
}

export async function getGameById(id: string) {
  await connectDB();
  return Game.findById(id).lean();
}

export interface CreateGameInput {
  mode: GameMode;
  timeControl: TimeControl;
  white?: string;
  black?: string;
  whiteName?: string;
  blackName?: string;
  aiDifficulty?: 'beginner' | 'intermediate' | 'advanced' | 'master';
}

export async function createGame(input: CreateGameInput) {
  await connectDB();
  const game = await Game.create({
    mode: input.mode,
    timeControl: input.timeControl,
    white: input.white,
    black: input.black,
    whiteName: input.whiteName,
    blackName: input.blackName,
    aiDifficulty: input.aiDifficulty,
    status: input.mode === 'ai' ? 'active' : 'waiting',
    startedAt: input.mode === 'ai' ? new Date() : undefined,
  });
  return game.toObject();
}
