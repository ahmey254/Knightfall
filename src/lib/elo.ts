// Standard FIDE-style Elo with K factor that decays with rating.
// Returns the new ratings for both players.

export type GameResult = 'white' | 'black' | 'draw';

function kFactor(rating: number): number {
  if (rating < 1600) return 32;
  if (rating < 2100) return 24;
  return 16;
}

export function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

export function applyElo(
  whiteRating: number,
  blackRating: number,
  result: GameResult,
): { white: number; black: number; whiteDelta: number; blackDelta: number } {
  const eW = expectedScore(whiteRating, blackRating);
  const eB = expectedScore(blackRating, whiteRating);

  const sW = result === 'white' ? 1 : result === 'draw' ? 0.5 : 0;
  const sB = 1 - sW;

  const kW = kFactor(whiteRating);
  const kB = kFactor(blackRating);

  const whiteDelta = Math.round(kW * (sW - eW));
  const blackDelta = Math.round(kB * (sB - eB));

  return {
    white: whiteRating + whiteDelta,
    black: blackRating + blackDelta,
    whiteDelta,
    blackDelta,
  };
}
