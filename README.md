# Knightfall — Modern Full-Stack Chess

A production-ready chess web app. Real-time multiplayer over Socket.io, an
authoritative server clock, Stockfish 16 in the browser via Web Worker, ELO
ratings, deep analysis, leaderboard, daily puzzles, and a dark, neon UI.

> Built with **Next.js 15** (App Router), **TypeScript**, **Tailwind**,
> **MongoDB / Mongoose**, **NextAuth**, **Socket.io**, **Zustand**,
> **Framer Motion**, **react-chessboard**, and **chess.js**.

---

## Features

- **Auth** — credentials, Google OAuth, and one-click guest play.
- **Real-time multiplayer** — server-authoritative chess.js validation, live
  clocks, draw offers, resign, chat, emoji reactions, spectator mode.
- **Matchmaking** — quick-play queue per time control + private rooms with
  shareable 6-character codes.
- **Stockfish AI** — four difficulty levels (skill 1-20) running in a Web
  Worker; on-demand hint button; live eval bar.
- **Analysis board** — load any game, scrub through moves, get the engine's
  best line, import/export PGN, opening recognition.
- **Dashboard** — Elo trajectory, results pie, recent games table.
- **Leaderboard** — top 100 by rating with online indicators.
- **Profile pages** — public user pages with rating chart and game history.
- **Daily puzzle** — deterministic daily puzzle with hint and solution checking.
- **Admin panel** — search users, ban/unban, promote/demote.
- **Friends + notifications** — friend requests with notifications.
- **Mobile-ready PWA** — manifest, theme colors, install shortcuts.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# edit .env — at minimum set MONGODB_URI and NEXTAUTH_SECRET

# 3. Drop the Stockfish engine files into /public/stockfish/
#    See public/stockfish/README.md for the one-liner.

# 4. (Optional) Seed demo players
npm run seed

# 5. Run dev server (custom server.js — Next.js + Socket.io)
npm run dev
```

Open http://localhost:3000.

---

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | yes |
| `NEXTAUTH_URL` | Public URL for NextAuth callbacks | yes |
| `NEXTAUTH_SECRET` | JWT signing secret (generate with `openssl rand -base64 32`) | yes |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google OAuth | no |
| `NEXT_PUBLIC_SOCKET_URL` | Public WebSocket URL (defaults to current host) | no |
| `PORT` | Server port (default 3000) | no |

---

## Stockfish setup

The browser engine lives at `/public/stockfish/stockfish.{js,wasm}`. After
`npm install`, copy them in:

```bash
mkdir -p public/stockfish
cp node_modules/stockfish/src/stockfish.js   public/stockfish/
cp node_modules/stockfish/src/stockfish.wasm public/stockfish/
```

(See `public/stockfish/README.md` for PowerShell.) The app degrades gracefully
when these files are missing — only AI/analysis is affected.

---

## Sound files

Drop short MP3s into `public/sounds/` (`move.mp3`, `capture.mp3`, `check.mp3`,
`checkmate.mp3`, `castle.mp3`, `start.mp3`, `end.mp3`, `notify.mp3`). See
`public/sounds/README.md`.

---

## Project layout

```
src/
├── app/                   # Next.js App Router pages + API routes
│   ├── api/               # REST routes (auth, games, leaderboard, admin, ...)
│   ├── (auth)/            # login, register
│   ├── play/              # /play/online, /play/ai, /play/[id]
│   ├── analysis/          # analysis board
│   ├── dashboard/         # signed-in dashboard
│   ├── leaderboard/
│   ├── profile/[username]/
│   ├── puzzles/
│   └── admin/
├── components/
│   ├── chess/             # Board, Timer, MoveHistory, EvaluationBar, ...
│   ├── landing/           # Hero, Features, Stats, Testimonials, Footer
│   ├── layout/            # Navbar, Providers
│   └── ui/                # Button, Card, Input, Modal, Badge, Skeleton
├── hooks/                 # useChessGame, useSocket, useStockfish, useTimer, useSound
├── lib/                   # mongodb, auth, elo, ratelimit, utils
├── models/                # Mongoose: User, Game, MatchHistory, Rating, Notification, FriendRequest
├── services/              # gameService, userService, ratingService
├── sockets/
│   ├── handlers.js        # Socket.io server-side handlers (CommonJS, loaded by server.js)
│   └── events.ts          # Shared event-name constants
├── store/                 # Zustand stores (game state, UI prefs)
└── types/                 # Shared TypeScript types
public/
├── stockfish/             # Drop stockfish.{js,wasm} here
├── sounds/                # Drop game sounds here
└── manifest.json          # PWA manifest
server.js                  # Custom Next.js + Socket.io server entry
scripts/seed.ts            # Demo seed script
```

---

## How real-time games work

The server (`server.js` + `src/sockets/handlers.js`) is the **single source of
truth** for every active game:

1. The browser connects via `socket.io-client` and announces its identity
   (`connect_user`).
2. To start a game, the client emits `find_match`, `create_game`, or
   `join_room`. The server creates an in-memory room with a `chess.js`
   instance and starts a 250ms-tick clock interval.
3. The client emits `make_move`. The server validates with `chess.js`,
   updates the FEN, applies the increment, persists the move to MongoDB,
   broadcasts `move_made`, and checks for end conditions.
4. On game end, the server emits `game_ended`, persists final state, recomputes
   Elo, and writes per-player `MatchHistory` and `Rating` records.

The client is purely a renderer; if it ever desyncs it can rejoin the room
and pull a fresh snapshot.

---

## Deploying to Vercel

A custom Node server is needed for Socket.io's WebSocket upgrade. Vercel's
serverless runtime cannot host long-lived WebSockets, so use one of these:

### Option A — Vercel for the Next.js side, separate WS host

- Deploy the Next.js app to Vercel as normal.
- Run `node server.js` (or extract `src/sockets/handlers.js` into a tiny
  standalone Node service) on Fly.io, Render, Railway, or a small VPS.
- Set `NEXT_PUBLIC_SOCKET_URL` to that WebSocket host's URL.

### Option B — Single Node host (recommended for simplicity)

Run the entire app on Render / Railway / Fly.io / a VPS:

```bash
npm run build
NODE_ENV=production npm start
```

Both Next.js requests and Socket.io are served from the same `server.js`.

### Database

Use **MongoDB Atlas** for a free, fully-managed cluster. Whitelist your host
IPs and paste the connection string into `MONGODB_URI`.

---

## Demo credentials (after `npm run seed`)

- `magnus_demo@demo.local` / `password123` — top-rated demo player
- `admin@demo.local` / `password123` — admin account (visit `/admin`)

---

## Roadmap

The codebase is structured so these can be plugged in incrementally:

- Tournaments page + bracket model
- Lessons section (curated PGN pgn-based courses)
- Achievements / badges engine (already a `badges` array on User)
- Stricter anti-cheat (engine-correlation flagging in `ratingService`)
- Server-pushed notifications via the existing socket layer
- Lichess-export-based puzzle library to replace the in-memory pool

---

## License

MIT — do whatever, but don't impersonate Knightfall as an official platform.
