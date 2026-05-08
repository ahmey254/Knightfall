import { NextResponse } from 'next/server';
import { getGameById } from '@/services/gameService';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const game = await getGameById(id);
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(game);
}
