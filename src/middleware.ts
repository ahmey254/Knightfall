// NextAuth-aware route protection. Pages under /dashboard, /admin, and the
// game-creation flow require an authenticated session.
export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
