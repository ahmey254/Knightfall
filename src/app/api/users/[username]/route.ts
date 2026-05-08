import { NextResponse } from 'next/server';
import { getPublicUser, getUserStats } from '@/services/userService';

export async function GET(_req: Request, ctx: { params: Promise<{ username: string }> }) {
  const { username } = await ctx.params;
  const user = await getPublicUser(username);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const stats = await getUserStats(user.id);
  return NextResponse.json({ user, ...stats });
}
