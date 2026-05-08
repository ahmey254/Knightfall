'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  rating: number;
  role: 'user' | 'admin';
  isBanned: boolean;
  banReason?: string;
  gamesPlayed: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || session.user.role !== 'admin') return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
    if (!res.ok) {
      toast.error('Forbidden');
      return;
    }
    const data = await res.json();
    setUsers(data.users);
    setLoading(false);
  }

  async function action(id: string, action: 'ban' | 'unban' | 'promote' | 'demote') {
    const reason = action === 'ban' ? prompt('Ban reason?') : undefined;
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reason }),
    });
    if (!res.ok) return toast.error('Failed');
    toast.success('Done');
    load();
  }

  if (status === 'loading') return <div className="p-8 text-muted">Loading…</div>;
  if (status === 'unauthenticated' || session?.user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md text-center py-20">
        <h1 className="text-2xl font-display font-bold">Admin only</h1>
        <p className="text-muted mt-2">You need administrator privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin · <span className="gradient-text">Users</span></h1>
        <CardDescription>Search, ban, and promote players.</CardDescription>
      </div>

      <Card className="flex items-center gap-2">
        <Input placeholder="Search by username or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={load}>Search</Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-muted">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left px-5 py-3">Username</th>
                <th className="text-left px-3">Email</th>
                <th className="text-right px-3">Rating</th>
                <th className="text-right px-3">Games</th>
                <th className="text-left px-3">Role</th>
                <th className="text-left px-3">Status</th>
                <th className="text-right px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-white/5">
                  <td className="px-5 py-2.5 font-medium">{u.username}</td>
                  <td className="px-3 text-muted">{u.email}</td>
                  <td className="px-3 text-right font-mono">{u.rating}</td>
                  <td className="px-3 text-right text-muted">{u.gamesPlayed}</td>
                  <td className="px-3"><Badge variant={u.role === 'admin' ? 'info' : 'default'}>{u.role}</Badge></td>
                  <td className="px-3">{u.isBanned ? <Badge variant="danger">banned</Badge> : <Badge variant="success">active</Badge>}</td>
                  <td className="px-5 text-right space-x-1">
                    {u.isBanned ? (
                      <Button size="sm" variant="ghost" onClick={() => action(u._id, 'unban')}>Unban</Button>
                    ) : (
                      <Button size="sm" variant="danger" onClick={() => action(u._id, 'ban')}>Ban</Button>
                    )}
                    {u.role === 'admin' ? (
                      <Button size="sm" variant="subtle" onClick={() => action(u._id, 'demote')}>Demote</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => action(u._id, 'promote')}>Promote</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
