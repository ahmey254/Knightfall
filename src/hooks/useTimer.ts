'use client';

// Simple ticking countdown for AI/local games. Online games get their clock
// pushed from the server's `clock_tick` event instead of running this locally.

import { useEffect, useRef, useState } from 'react';

export function useTimer(initialMs: number, running: boolean, onExpire?: () => void) {
  const [ms, setMs] = useState(initialMs);
  const lastTickRef = useRef<number>(Date.now());
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setMs(initialMs);
  }, [initialMs]);

  useEffect(() => {
    if (!running) return;
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      setMs((prev) => {
        const next = Math.max(0, prev - delta);
        if (next === 0 && prev > 0) onExpireRef.current?.();
        return next;
      });
    }, 200);
    return () => clearInterval(id);
  }, [running]);

  return { ms, setMs };
}
