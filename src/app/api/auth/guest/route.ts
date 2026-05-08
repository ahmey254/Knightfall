import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { shortId } from '@/lib/utils';

// Lightweight guest creation — used by the "Play as Guest" CTA. The guest
// account exists for stat tracking on a single session; it has no password.
export async function POST() {
  await connectDB();
  const username = `guest_${shortId(5).toLowerCase()}`;
  const user = await User.create({
    username,
    email: `${username}@guest.local`,
    provider: 'guest',
    isGuest: true,
    rating: 1000,
  });
  return NextResponse.json({
    id: String(user._id),
    username: user.username,
  });
}
