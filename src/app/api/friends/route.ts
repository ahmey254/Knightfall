import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { FriendRequest } from '@/models/FriendRequest';
import { Notification } from '@/models/Notification';
import { User } from '@/models/User';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const user = await User.findById(session.user.id).populate('friends', 'username avatar rating online').lean();
  const incoming = await FriendRequest.find({ to: session.user.id, status: 'pending' })
    .populate('from', 'username avatar rating')
    .lean();
  const outgoing = await FriendRequest.find({ from: session.user.id, status: 'pending' })
    .populate('to', 'username avatar rating')
    .lean();

  return NextResponse.json({
    friends: user?.friends ?? [],
    incoming,
    outgoing,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { username } = await req.json().catch(() => ({}));
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  await connectDB();
  const target = await User.findOne({ username: String(username).toLowerCase() }).lean();
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (String(target._id) === session.user.id) {
    return NextResponse.json({ error: "You can't friend yourself" }, { status: 400 });
  }

  // Idempotent: re-requesting an existing pending invite is a no-op.
  await FriendRequest.updateOne(
    { from: session.user.id, to: target._id },
    { $setOnInsert: { from: session.user.id, to: target._id, status: 'pending' } },
    { upsert: true },
  );

  await Notification.create({
    user: target._id,
    type: 'friend_request',
    title: 'New friend request',
    body: `${session.user.username} wants to be your friend`,
    link: `/profile/${session.user.username}`,
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, action } = await req.json().catch(() => ({}));
  if (!id || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  await connectDB();
  const fr = await FriendRequest.findById(id);
  if (!fr || String(fr.to) !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  fr.status = action === 'accept' ? 'accepted' : 'declined';
  await fr.save();

  if (action === 'accept') {
    await User.updateOne({ _id: fr.from }, { $addToSet: { friends: fr.to } });
    await User.updateOne({ _id: fr.to }, { $addToSet: { friends: fr.from } });
  }

  return NextResponse.json({ ok: true });
}
