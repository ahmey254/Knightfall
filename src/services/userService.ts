import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { MatchHistory } from '@/models/MatchHistory';
import { Rating } from '@/models/Rating';
import type { PublicUser } from '@/types/user';

export async function getPublicUser(username: string): Promise<PublicUser | null> {
  await connectDB();
  const u = await User.findOne({ username: username.toLowerCase() }).lean();
  if (!u) return null;
  return {
    id: String(u._id),
    username: u.username,
    avatar: u.avatar ?? null,
    rating: u.rating,
    peakRating: u.peakRating,
    wins: u.wins,
    losses: u.losses,
    draws: u.draws,
    gamesPlayed: u.gamesPlayed,
    badges: u.badges ?? [],
    online: u.online,
    country: u.country ?? undefined,
    bio: u.bio ?? undefined,
    createdAt: (u.createdAt as Date).toISOString(),
  };
}

export async function getUserStats(userId: string) {
  await connectDB();
  const recent = await MatchHistory.find({ user: userId })
    .sort({ playedAt: -1 })
    .limit(20)
    .lean();

  const ratingHistory = await Rating.find({ user: userId })
    .sort({ at: 1 })
    .limit(200)
    .lean();

  return {
    recent: recent.map((r) => ({
      id: String(r._id),
      gameId: String(r.game),
      opponent: r.opponentName,
      color: r.color,
      result: r.result,
      ratingDelta: r.ratingDelta,
      ratingAfter: r.ratingAfter,
      timeControl: r.timeControl,
      moves: r.moves,
      endReason: r.endReason,
      playedAt: (r.playedAt as Date).toISOString(),
    })),
    ratingHistory: ratingHistory.map((r) => ({
      at: (r.at as Date).toISOString(),
      rating: r.rating,
      delta: r.delta,
    })),
  };
}
