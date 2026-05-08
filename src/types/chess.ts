export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'unlimited';
export type GameMode = 'ai' | 'online' | 'private' | 'guest';
export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'master';

export interface MoveRecord {
  san: string;
  from: string;
  to: string;
  promotion?: string;
  fen: string;
  timestamp: number;
  timeLeftMs?: number;
  eval?: number;
}

export interface ChatMessage {
  userId?: string;
  username: string;
  text: string;
  ts: number;
}

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  turn: PieceColor;
  running: boolean;
  lastTickAt: number;
}

export interface GameStateSnapshot {
  id: string;
  roomCode?: string;
  mode: GameMode;
  fen: string;
  pgn: string;
  moves: MoveRecord[];
  status: 'waiting' | 'active' | 'finished' | 'aborted';
  result: 'white' | 'black' | 'draw' | null;
  endReason: string | null;
  white?: { id?: string; name: string; rating?: number };
  black?: { id?: string; name: string; rating?: number };
  timeControl: TimeControl;
  initialTimeMs: number;
  incrementMs: number;
  clock?: ClockState;
  chat?: ChatMessage[];
  drawOffer?: PieceColor | null;
}

export const TIME_CONTROLS: Record<TimeControl, { initialMs: number; incrementMs: number; label: string }> = {
  bullet: { initialMs: 60_000, incrementMs: 0, label: 'Bullet 1+0' },
  blitz: { initialMs: 180_000, incrementMs: 2_000, label: 'Blitz 3+2' },
  rapid: { initialMs: 600_000, incrementMs: 5_000, label: 'Rapid 10+5' },
  unlimited: { initialMs: 0, incrementMs: 0, label: 'Unlimited' },
};

export const AI_DIFFICULTY: Record<AIDifficulty, { skill: number; depth: number; label: string }> = {
  beginner: { skill: 1, depth: 4, label: 'Beginner (~800)' },
  intermediate: { skill: 8, depth: 8, label: 'Intermediate (~1400)' },
  advanced: { skill: 15, depth: 14, label: 'Advanced (~1900)' },
  master: { skill: 20, depth: 20, label: 'Master (~2400+)' },
};
