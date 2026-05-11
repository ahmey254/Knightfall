// Copies a Stockfish JS+WASM pair from node_modules into public/stockfish/
// renamed to stockfish.js / stockfish.wasm so the app's Worker URL resolves.
// Tries variants in priority order; falls back silently to leave the app's
// JS-bot fallback path in charge.

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join('node_modules', 'stockfish', 'src');
const DEST_DIR = path.join('public', 'stockfish');
const VARIANTS = [
  'stockfish-nnue-16-single',
  'stockfish-nnue-16-no-Worker',
  'stockfish-nnue-16-no-simd',
  'stockfish-nnue-16',
  'stockfish',
];

if (!fs.existsSync(SRC_DIR)) {
  console.log('[stockfish] node_modules/stockfish not found — skipping (JS fallback will run)');
  process.exit(0);
}

fs.mkdirSync(DEST_DIR, { recursive: true });

for (const v of VARIANTS) {
  const js = path.join(SRC_DIR, `${v}.js`);
  const wasm = path.join(SRC_DIR, `${v}.wasm`);
  if (fs.existsSync(js) && fs.existsSync(wasm)) {
    // App loads /stockfish/stockfish.js as a Worker, but the JS bundle has its
    // WASM filename (e.g. stockfish-nnue-16-single.wasm) baked in. Copy the
    // WASM under BOTH names so the Worker's internal fetch resolves.
    fs.copyFileSync(js, path.join(DEST_DIR, 'stockfish.js'));
    fs.copyFileSync(wasm, path.join(DEST_DIR, 'stockfish.wasm'));
    fs.copyFileSync(wasm, path.join(DEST_DIR, `${v}.wasm`));
    console.log(`[stockfish] installed ${v} -> stockfish.js + ${v}.wasm (+ stockfish.wasm)`);
    process.exit(0);
  }
}

console.log('[stockfish] no compatible variant found — JS fallback will run');
