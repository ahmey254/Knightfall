import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { rateLimit, clientIp } from '@/lib/ratelimit';

const RegisterSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/i, 'Letters, numbers, underscore only'),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`register:${ip}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Try again shortly.' }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const { username, email, password } = parsed.data;

  await connectDB();
  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] }).lean();
  if (existing) {
    return NextResponse.json({ error: 'Username or email already taken' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    passwordHash,
    provider: 'credentials',
    rating: 1200,
  });

  return NextResponse.json({
    id: String(user._id),
    username: user.username,
    email: user.email,
  });
}
