import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { MatchHistory } from '@/models/MatchHistory';
import { Rating } from '@/models/Rating';
import { applyElo, type GameResult } from '@/lib/elo';
import type { TimeControl } from '@/types/chess';

interface ApplyResultInput {
  whiteId: string;
  blackId: string;
  whiteName: string;
  blackName: string;
  gameId: string;
  result: GameResult;
  endReason: string;
  timeControl: TimeControl;
  moves: number;
}

// HTTP-side fallback for the same logic in src/sockets/handlers.js. Use this
// from API routes when persisting an AI game outcome (where there's no socket).
export async function applyResultAndUpdateRatings(input: ApplyResultInput) {
  await connectDB();
  const [white, black] = await Promise.all([
    User.findById(input.whiteId),
    User.findById(input.blackId),
  ]);
  if (!white || !black) throw new Error('User not found');

  const elo = applyElo(white.rating, black.rating, input.result);

  white.rating = elo.white;
  white.peakRating = Math.max(white.peakRating, elo.white);
  white.gamesPlayed += 1;
  if (input.result === 'white') white.wins += 1;
  else if (input.result === 'black') white.losses += 1;
  else white.draws += 1;

  black.rating = elo.black;
  black.peakRating = Math.max(black.peakRating, elo.black);
  black.gamesPlayed += 1;
  if (input.result === 'black') black.wins += 1;
  else if (input.result === 'white') black.losses += 1;
  else black.draws += 1;

  await white.save();
  await black.save();

  const playedAt = new Date();
  await MatchHistory.insertMany([
    {
      user: white._id,
      game: input.gameId,
      opponent: black._id,
      opponentName: input.blackName,
      color: 'white',
      result: input.result === 'white' ? 'win' : input.result === 'draw' ? 'draw' : 'loss',
      ratingBefore: white.rating - elo.whiteDelta,
      ratingAfter: white.rating,
      ratingDelta: elo.whiteDelta,
      timeControl: input.timeControl,
      moves: input.moves,
      endReason: input.endReason,
      playedAt,
    },
    {
      user: black._id,
      game: input.gameId,
      opponent: white._id,
      opponentName: input.whiteName,
      color: 'black',
      result: input.result === 'black' ? 'win' : input.result === 'draw' ? 'draw' : 'loss',
      ratingBefore: black.rating - elo.blackDelta,
      ratingAfter: black.rating,
      ratingDelta: elo.blackDelta,
      timeControl: input.timeControl,
      moves: input.moves,
      endReason: input.endReason,
      playedAt,
    },
  ]);

  await Rating.insertMany([
    { user: white._id, game: input.gameId, rating: white.rating, delta: elo.whiteDelta, timeControl: input.timeControl, at: playedAt },
    { user: black._id, game: input.gameId, rating: black.rating, delta: elo.blackDelta, timeControl: input.timeControl, at: playedAt },
  ]);

  return elo;
}

export async function leaderboard(limit = 50) {
  await connectDB();
  const users = await User.find({ isBanned: { $ne: true }, isGuest: { $ne: true } })
    .sort({ rating: -1 })
    .limit(limit)
    .select('username avatar rating wins losses draws gamesPlayed online')
    .lean();
  return users.map((u, i) => ({
    rank: i + 1,
    username: u.username,
    avatar: u.avatar ?? null,
    rating: u.rating,
    wins: u.wins,
    losses: u.losses,
    draws: u.draws,
    gamesPlayed: u.gamesPlayed,
    online: u.online ?? false,
  }));
}
