# Stockfish setup

The browser-side engine ships separately from the npm package.

## Quick install

The `stockfish` npm package (already in `package.json`) bundles the
browser-ready files. After running `npm install`, copy them in:

```bash
# bash / macOS / Linux / Git Bash
mkdir -p public/stockfish
cp node_modules/stockfish/src/stockfish.js public/stockfish/
cp node_modules/stockfish/src/stockfish.wasm public/stockfish/
```

```powershell
# PowerShell
New-Item -ItemType Directory -Force public/stockfish | Out-Null
Copy-Item node_modules/stockfish/src/stockfish.js  public/stockfish/
Copy-Item node_modules/stockfish/src/stockfish.wasm public/stockfish/
```

You can also script this in `package.json` as a `postinstall` step.

## Why aren't these checked in?

`.wasm` files are large and benefit from Vercel's edge caching when served
directly from `/public/`. They're regenerated on every deploy from the npm
package, so checking them in would just bloat the repo.

The `useStockfish` hook will degrade gracefully when these files are missing
— the AI/analysis features will simply show a "engine not loaded" notice and
the rest of the app continues to work.
