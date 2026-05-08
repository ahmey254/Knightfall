import type { GameMode, TimeControl } from './chess';

export interface CreateGameRequest {
  mode: GameMode;
  timeControl: TimeControl;
  isPrivate?: boolean;
  aiDifficulty?: 'beginner' | 'intermediate' | 'advanced' | 'master';
}

export interface JoinRoomRequest {
  roomCode: string;
}

export interface MoveRequest {
  gameId: string;
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar?: string | null;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  online: boolean;
}
