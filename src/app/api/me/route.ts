import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPublicUser, getUserStats } from '@/services/userService';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const user = await getPublicUser(session.user.username);
  if (!user) return NextResponse.json({ user: null }, { status: 404 });
  const stats = await getUserStats(user.id);
  return NextResponse.json({ user, ...stats });
}
