import Link from 'next/link';

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-display font-bold text-xl">
            Knight<span className="gradient-text">fall</span>
          </div>
          <p className="mt-2 text-muted">Modern chess for the web. Built open. Designed dark.</p>
        </div>
        <div>
          <div className="font-semibold mb-2">Play</div>
          <ul className="space-y-1 text-muted">
            <li><Link href="/play/online" className="hover:text-white">Online</Link></li>
            <li><Link href="/play/ai" className="hover:text-white">vs AI</Link></li>
            <li><Link href="/puzzles" className="hover:text-white">Puzzles</Link></li>
            <li><Link href="/analysis" className="hover:text-white">Analysis</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Community</div>
          <ul className="space-y-1 text-muted">
            <li><Link href="/leaderboard" className="hover:text-white">Leaderboard</Link></li>
            <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Resources</div>
          <ul className="space-y-1 text-muted">
            <li><a href="https://www.chessprogramming.org/" target="_blank" rel="noreferrer noopener" className="hover:text-white">Chess Programming Wiki</a></li>
            <li><a href="https://stockfishchess.org/" target="_blank" rel="noreferrer noopener" className="hover:text-white">Stockfish</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 text-xs text-muted flex items-center justify-between">
          <span>© {new Date().getFullYear()} Knightfall. All rights reserved.</span>
          <span>♞ Made for players.</span>
        </div>
      </div>
    </footer>
  );
}
