import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') return null;
  return session;
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase().trim();
  const filter: Record<string, unknown> = {};
  if (q) filter.$or = [{ username: { $regex: q } }, { email: { $regex: q } }];
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .select('username email rating role isBanned banReason gamesPlayed createdAt')
    .lean();
  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id, action, reason } = await req.json().catch(() => ({}));
  if (!id || !['ban', 'unban', 'promote', 'demote'].includes(action)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  await connectDB();
  const update: Record<string, unknown> = {};
  if (action === 'ban') Object.assign(update, { isBanned: true, banReason: reason || 'Violation' });
  if (action === 'unban') Object.assign(update, { isBanned: false, banReason: null });
  if (action === 'promote') update.role = 'admin';
  if (action === 'demote') update.role = 'user';
  await User.updateOne({ _id: id }, { $set: update });
  return NextResponse.json({ ok: true });
}
