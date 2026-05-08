import { NextResponse } from 'next/server';
import { leaderboard } from '@/services/ratingService';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);
  const data = await leaderboard(limit);
  return NextResponse.json(data);
}
