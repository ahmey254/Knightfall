'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const REASON_LABELS: Record<string, string> = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  resignation: 'Resignation',
  timeout: 'Timeout',
  draw_agreed: 'Draw by agreement',
  insufficient: 'Insufficient material',
  threefold: 'Threefold repetition',
  fifty_move: 'Fifty-move rule',
  aborted: 'Game aborted',
};

export function GameResult({
  open,
  onClose,
  result,
  reason,
  yourColor,
  ratingDelta,
  onRematch,
}: {
  open: boolean;
  onClose: () => void;
  result: 'white' | 'black' | 'draw' | null;
  reason: string | null;
  yourColor?: 'white' | 'black';
  ratingDelta?: number;
  onRematch?: () => void;
}) {
  const youWon = yourColor && result === yourColor;
  const draw = result === 'draw';
  const youLost = yourColor && !draw && !youWon;

  const title = draw ? 'Draw' : youWon ? 'Victory' : youLost ? 'Defeat' : result === 'white' ? 'White wins' : 'Black wins';
  const accent = draw ? 'text-amber-300' : youWon ? 'text-emerald-300' : youLost ? 'text-rose-300' : 'text-white';

  return (
    <Modal open={open} onClose={onClose}>
      <motion.div
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200 }}
        className="text-center py-2"
      >
        <div className={`text-4xl font-bold font-display ${accent}`}>{title}</div>
        {reason && <div className="mt-1 text-muted text-sm">{REASON_LABELS[reason] ?? reason}</div>}
        {typeof ratingDelta === 'number' && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="text-sm">Rating</span>
            <span className={`font-bold ${ratingDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {ratingDelta >= 0 ? '+' : ''}{ratingDelta}
            </span>
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          {onRematch && (
            <Button onClick={onRematch}>Rematch</Button>
          )}
          <Link href="/dashboard"><Button variant="ghost">Dashboard</Button></Link>
          <Button variant="subtle" onClick={onClose}>Review</Button>
        </div>
      </motion.div>
    </Modal>
  );
}
