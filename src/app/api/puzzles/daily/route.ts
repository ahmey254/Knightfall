import { NextResponse } from 'next/server';

// Tiny seed pool of puzzles. In a production app this would back a Puzzle
// model populated from a Lichess puzzle export.
const PUZZLES = [
  {
    id: 'p1',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7'],
    theme: 'Fried Liver Attack',
    rating: 1200,
  },
  {
    id: 'p2',
    fen: 'r3k2r/ppp1qppp/2n5/3pP3/3P4/2N2N2/PPP2PPP/R2QK2R w KQkq - 0 9',
    solution: ['Nb5', 'Kd8', 'Nxa7'],
    theme: 'Knight Outpost',
    rating: 1500,
  },
  {
    id: 'p3',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solution: ['Re8#'],
    theme: 'Back-Rank Mate',
    rating: 1100,
  },
];

export async function GET() {
  // Stable "puzzle of the day" — deterministic from current UTC date, so every
  // visitor in the same day sees the same puzzle.
  const today = new Date();
  const dayKey = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
  let hash = 0;
  for (const c of dayKey) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  const puzzle = PUZZLES[Math.abs(hash) % PUZZLES.length];
  return NextResponse.json({ puzzle, date: dayKey });
}
