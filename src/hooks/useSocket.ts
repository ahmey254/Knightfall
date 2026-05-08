'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

let singleton: Socket | null = null;

export function useSocket(autoConnect = true) {
  const [connected, setConnected] = useState(false);
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;
    if (!singleton) {
      singleton = io(process.env.NEXT_PUBLIC_SOCKET_URL || '/', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });
    }
    socketRef.current = singleton;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    singleton.on('connect', onConnect);
    singleton.on('disconnect', onDisconnect);
    if (singleton.connected) setConnected(true);

    return () => {
      singleton?.off('connect', onConnect);
      singleton?.off('disconnect', onDisconnect);
    };
  }, [autoConnect]);

  // Re-announce identity whenever the session changes — handles login mid-session.
  useEffect(() => {
    if (!socketRef.current || !connected) return;
    socketRef.current.emit('connect_user', {
      userId: session?.user?.id,
      username: session?.user?.username || 'Guest',
      rating: session?.user?.rating,
    });
  }, [session, connected]);

  return { socket: socketRef.current, connected };
}
