'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/play/online', label: 'Play Online' },
  { href: '/play/ai', label: 'Play AI' },
  { href: '/analysis', label: 'Analysis' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/puzzles', label: 'Puzzles' },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-xl border-b border-white/5" />
      <nav className="relative mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <motion.div
            className="h-8 w-8 rounded-lg bg-hero-glow blur-[1px]"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          />
          <span className="font-display font-bold text-xl tracking-tight">
            Knight<span className="gradient-text">fall</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + '/');
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  active ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5',
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Link href={`/profile/${session.user.username}`} className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-white/5">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent to-accent-cyan grid place-items-center text-xs font-bold">
                  {session.user.username?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="leading-tight">
                  <div className="text-sm">{session.user.username}</div>
                  <div className="text-[10px] text-muted">★ {session.user.rating}</div>
                </div>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
              <Link href="/register"><Button size="sm">Sign up</Button></Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
