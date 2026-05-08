// Seed script — populates a small set of demo users so the leaderboard,
// dashboard, and analysis pages are non-empty on a fresh install.
// Run via:  npm run seed
//
// Reads MONGODB_URI from your .env file (loaded automatically by `tsx`'s
// `--env-file=.env` flag — see package.json scripts).

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Game } from '../src/models/Game';
import { MatchHistory } from '../src/models/MatchHistory';
import { Rating } from '../src/models/Rating';

const URI = process.env.MONGODB_URI;
if (!URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

const DEMO_USERS = [
  { username: 'magnus_demo', email: 'magnus@demo.local', rating: 2830, role: 'user' as const },
  { username: 'hikaru_demo', email: 'hikaru@demo.local', rating: 2780, role: 'user' as const },
  { username: 'judit_demo', email: 'judit@demo.local', rating: 2735, role: 'user' as const },
  { username: 'fabi_demo', email: 'fabi@demo.local', rating: 2792, role: 'user' as const },
  { username: 'dingdemo', email: 'ding@demo.local', rating: 2799, role: 'user' as const },
  { username: 'club_player', email: 'club@demo.local', rating: 1640, role: 'user' as const },
  { username: 'beginner1', email: 'b1@demo.local', rating: 950, role: 'user' as const },
  { username: 'admin', email: 'admin@demo.local', rating: 1500, role: 'admin' as const },
];

async function main() {
  await mongoose.connect(URI as string);
  console.log('connected');

  const passwordHash = await bcrypt.hash('password123', 10);

  for (const u of DEMO_USERS) {
    await User.updateOne(
      { username: u.username },
      {
        $setOnInsert: {
          username: u.username,
          email: u.email,
          passwordHash,
          provider: 'credentials',
          rating: u.rating,
          peakRating: u.rating,
          role: u.role,
          gamesPlayed: 50 + Math.floor(Math.random() * 200),
          wins: 30 + Math.floor(Math.random() * 80),
          losses: 10 + Math.floor(Math.random() * 30),
          draws: 5 + Math.floor(Math.random() * 15),
          badges: u.rating > 2700 ? ['GM', 'Top 10'] : [],
          bio: `Seeded demo player @ ${u.rating}`,
        },
      },
      { upsert: true },
    );
    console.log('upserted', u.username);
  }

  // Seed a small handful of completed games and rating history points so the
  // dashboard charts have something to render.
  const club = await User.findOne({ username: 'club_player' });
  if (club) {
    const baseRating = club.rating;
    for (let i = 0; i < 12; i++) {
      const opp = DEMO_USERS[i % DEMO_USERS.length];
      const oppDoc = await User.findOne({ username: opp.username });
      if (!oppDoc || String(oppDoc._id) === String(club._id)) continue;
      const result = (['win', 'loss', 'draw'] as const)[i % 3];
      const delta = result === 'win' ? 8 : result === 'loss' ? -7 : 0;
      const at = new Date(Date.now() - (12 - i) * 86400_000);
      const game = await Game.create({
        mode: 'online',
        timeControl: 'rapid',
        white: club._id,
        black: oppDoc._id,
        whiteName: club.username,
        blackName: oppDoc.username,
        status: 'finished',
        result: result === 'win' ? 'white' : result === 'loss' ? 'black' : 'draw',
        endReason: result === 'win' ? 'checkmate' : result === 'loss' ? 'resignation' : 'draw_agreed',
        startedAt: at,
        endedAt: at,
      });
      await MatchHistory.create({
        user: club._id, game: game._id, opponent: oppDoc._id, opponentName: oppDoc.username,
        color: 'white', result, ratingBefore: baseRating + delta * (i - 1), ratingAfter: baseRating + delta * i,
        ratingDelta: delta, timeControl: 'rapid', moves: 30 + i, endReason: 'checkmate', playedAt: at,
      });
      await Rating.create({
        user: club._id, game: game._id, rating: baseRating + delta * i, delta,
        timeControl: 'rapid', at,
      });
    }
  }

  console.log('done');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
