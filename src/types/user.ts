export interface PublicUser {
  id: string;
  username: string;
  avatar?: string | null;
  rating: number;
  peakRating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  badges: string[];
  online: boolean;
  country?: string;
  bio?: string;
  createdAt: string;
}
