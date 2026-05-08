'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(17, 20, 42, 0.92)',
            color: '#e7e9f5',
            border: '1px solid rgba(124, 92, 255, 0.25)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
    </SessionProvider>
  );
}
