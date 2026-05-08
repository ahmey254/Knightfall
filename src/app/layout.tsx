import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Knightfall — Modern Chess',
  description:
    'Knightfall is a modern, real-time chess platform. Play online, train against Stockfish, analyze games, and climb the leaderboard.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Knightfall — Modern Chess',
    description: 'Play, train, and master chess with a modern dark-tech experience.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#070912',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <Providers>
          <div className="relative z-10">
            <Navbar />
            <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
