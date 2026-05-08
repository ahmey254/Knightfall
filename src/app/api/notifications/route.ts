import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Notification } from '@/models/Notification';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const items = await Notification.find({ user: session.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return NextResponse.json({ items });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ids, all } = await req.json().catch(() => ({}));
  await connectDB();
  if (all) {
    await Notification.updateMany({ user: session.user.id, read: false }, { $set: { read: true } });
  } else if (Array.isArray(ids)) {
    await Notification.updateMany({ user: session.user.id, _id: { $in: ids } }, { $set: { read: true } });
  }
  return NextResponse.json({ ok: true });
}
