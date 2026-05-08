'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/dashboard';
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn('credentials', {
      ...form,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      toast.error('Invalid email or password');
      return;
    }
    toast.success('Welcome back');
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleGuest() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      router.push('/play/ai');
    } catch {
      toast.error('Guest sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardTitle className="font-display text-3xl">Welcome back</CardTitle>
        <CardDescription className="mt-1">Sign in to climb the leaderboard.</CardDescription>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            name="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Button type="submit" loading={loading} fullWidth>Sign in</Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted">
          <div className="flex-1 h-px bg-white/10" /> or <div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="space-y-2">
          <Button
            variant="ghost"
            fullWidth
            onClick={() => signIn('google', { callbackUrl })}
          >
            Continue with Google
          </Button>
          <Button variant="subtle" fullWidth onClick={handleGuest}>
            Play as guest
          </Button>
        </div>

        <p className="mt-6 text-sm text-center text-muted">
          New here? <Link href="/register" className="text-accent hover:underline">Create an account</Link>
        </p>
      </Card>
    </div>
  );
}
