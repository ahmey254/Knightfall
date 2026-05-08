import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email?: string | null;
      image?: string | null;
      role: 'user' | 'admin';
      rating: number;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    username?: string;
    role?: 'user' | 'admin';
    rating?: number;
  }
}
