import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { connectDB } from './mongodb';
import { User } from '@/models/User';
import { shortId } from './utils';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const user = await User.findOne({ email: credentials.email.toLowerCase() }).lean();
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: String(user._id),
          name: user.username,
          email: user.email,
          image: user.avatar ?? null,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        await connectDB();
        const existing = await User.findOne({ email: user.email });
        if (!existing) {
          const username =
            user.name?.toLowerCase().replace(/[^a-z0-9]/g, '') + shortId(3) || `user${shortId(5)}`;
          await User.create({
            username,
            email: user.email,
            avatar: user.image ?? undefined,
            provider: 'google',
            rating: 1200,
            isGuest: false,
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        await connectDB();
        const dbUser = await User.findOne({ email: user.email }).lean();
        if (dbUser) {
          token.uid = String(dbUser._id);
          token.username = dbUser.username;
          token.role = dbUser.role;
          token.rating = dbUser.rating;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? '';
        session.user.username = (token.username as string) ?? '';
        session.user.role = (token.role as 'user' | 'admin') ?? 'user';
        session.user.rating = (token.rating as number) ?? 1200;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
