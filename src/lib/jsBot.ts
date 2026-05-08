// Pure-JS chess bot using chess.js + alpha-beta minimax. Used as a fallback
// when the Stockfish WASM worker isn't available. Strong enough for casual
// play up to ~1800; not a serious engine.

import { Chess, type Move } from 'chess.js';

const PIECE_VALUE: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// Piece-square tables (from white's perspective). Encourage centralization,
// pawn advance, knight outposts, king safety. Indexed by 0..63 (a8 = 0, h1 = 63).
// These are tiny so the file stays small; tweak freely.
const PST: Record<string, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

function squareIndex(file: number, rank: number): number {
  // chess.js board() returns rank 8 at row 0, so rank: 0..7 corresponds to ranks 8..1
  return rank * 8 + file;
}

function evaluate(chess: Chess): number {
  if (chess.isCheckmate()) {
    // Side to move is checkmated: bad for them.
    return chess.turn() === 'w' ? -100000 : 100000;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) return 0;

  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const val = PIECE_VALUE[piece.type];
      const idx = squareIndex(f, r);
      const pst = PST[piece.type];
      // Mirror PST for black (which views the board flipped).
      const positional = piece.color === 'w' ? pst[idx] : pst[63 - idx];
      const total = val + positional;
      score += piece.color === 'w' ? total : -total;
    }
  }

  // Small mobility bonus — encourages active piece placement.
  const moves = chess.moves().length;
  score += chess.turn() === 'w' ? moves : -moves;

  return score;
}

// Order captures first (MVV-LVA-ish) so alpha-beta cuts more.
function orderMoves(moves: Move[]): Move[] {
  return moves.slice().sort((a, b) => {
    const aCap = a.captured ? PIECE_VALUE[a.captured] - PIECE_VALUE[a.piece] / 10 : 0;
    const bCap = b.captured ? PIECE_VALUE[b.captured] - PIECE_VALUE[b.piece] / 10 : 0;
    if (a.promotion && !b.promotion) return -1;
    if (!a.promotion && b.promotion) return 1;
    return bCap - aCap;
  });
}

interface SearchResult {
  score: number;
  move: Move | null;
}

function search(chess: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): SearchResult {
  if (depth === 0 || chess.isGameOver()) {
    return { score: evaluate(chess), move: null };
  }

  const moves = orderMoves(chess.moves({ verbose: true }) as Move[]);
  if (moves.length === 0) return { score: evaluate(chess), move: null };

  let best: Move | null = null;

  if (maximizing) {
    let value = -Infinity;
    for (const m of moves) {
      chess.move(m);
      const child = search(chess, depth - 1, alpha, beta, false);
      chess.undo();
      if (child.score > value) {
        value = child.score;
        best = m;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return { score: value, move: best };
  } else {
    let value = Infinity;
    for (const m of moves) {
      chess.move(m);
      const child = search(chess, depth - 1, alpha, beta, true);
      chess.undo();
      if (child.score < value) {
        value = child.score;
        best = m;
      }
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return { score: value, move: best };
  }
}

export interface BotOptions {
  /** Search depth: 1=beginner, 2=intermediate, 3=advanced, 4=master */
  depth: number;
  /** 0..1 — chance to play a non-best move (for weaker difficulties) */
  blunderRate?: number;
}

export interface BotResult {
  uci: string;
  evalCp: number;
  pv: string[];
  depth: number;
}

export function findBestMoveJS(fen: string, opts: BotOptions): BotResult | null {
  const chess = new Chess(fen);
  if (chess.isGameOver()) return null;

  const maximizing = chess.turn() === 'w';
  const { score, move } = search(chess, opts.depth, -Infinity, Infinity, maximizing);
  if (!move) return null;

  // Beginner-style "blunder" — replace best with random legal occasionally.
  let chosen: Move = move;
  if (opts.blunderRate && Math.random() < opts.blunderRate) {
    const legal = chess.moves({ verbose: true }) as Move[];
    if (legal.length) chosen = legal[Math.floor(Math.random() * legal.length)];
  }

  const uci = chosen.from + chosen.to + (chosen.promotion ?? '');
  return {
    uci,
    evalCp: score,
    pv: [uci],
    depth: opts.depth,
  };
}
