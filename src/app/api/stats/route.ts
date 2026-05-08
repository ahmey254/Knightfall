import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Game } from '@/models/Game';

// Lightweight aggregate counters for the landing page hero "live stats" panel.
export async function GET() {
  await connectDB();
  const [users, games, online, active] = await Promise.all([
    User.estimatedDocumentCount(),
    Game.estimatedDocumentCount(),
    User.countDocuments({ online: true }),
    Game.countDocuments({ status: 'active' }),
  ]);
  return NextResponse.json({ users, games, online, active });
}
