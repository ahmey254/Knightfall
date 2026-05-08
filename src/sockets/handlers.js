// Socket.io handlers for real-time multiplayer chess.
// Authoritative game state (FEN, clocks, draw offers) lives here on the server.
// Clients send intent (`make_move`, `resign`, ...) and we broadcast validated state.
//
// Persisted via mongoose's raw connection so we don't need to import the TS
// model files from this CJS module — the schemas in src/models/ remain the
// single source of truth for HTTP routes.

const { Chess } = require('chess.js');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function shortCode(n = 6) {
  let s = '';
  for (let i = 0; i < n; i++) s += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  return s;
}

const TIME_CONTROLS = {
  bullet: { initialMs: 60_000, incrementMs: 0 },
  blitz: { initialMs: 180_000, incrementMs: 2_000 },
  rapid: { initialMs: 600_000, incrementMs: 5_000 },
  unlimited: { initialMs: 0, incrementMs: 0 },
};

// gameId -> in-memory room
const rooms = new Map();
// roomCode -> gameId (for private join-by-code)
const codeIndex = new Map();
// timeControl -> Array<{ socketId, userId, username, rating }>
const matchQueue = new Map();
// socketId -> { userId, username, gameId }
const sockets = new Map();
// userId -> Set<socketId> (for presence + reconnect)
const presence = new Map();

let dbReady = null;
async function ensureDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (dbReady) return dbReady;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[socket] MONGODB_URI not set — running without persistence');
    return null;
  }
  dbReady = mongoose
    .connect(uri, { bufferCommands: false, maxPoolSize: 10 })
    .then((m) => m.connection)
    .catch((e) => {
      console.error('[socket] Mongo connect failed:', e.message);
      return null;
    });
  return dbReady;
}

function snapshot(room) {
  return {
    id: room.id,
    roomCode: room.roomCode,
    mode: room.mode,
    fen: room.chess.fen(),
    pgn: room.chess.pgn(),
    moves: room.moves,
    status: room.status,
    result: room.result,
    endReason: room.endReason,
    white: room.white,
    black: room.black,
    timeControl: room.timeControl,
    initialTimeMs: room.initialTimeMs,
    incrementMs: room.incrementMs,
    clock: {
      whiteMs: room.whiteMs,
      blackMs: room.blackMs,
      turn: room.chess.turn(),
      running: room.status === 'active',
      lastTickAt: Date.now(),
    },
    chat: room.chat,
    drawOffer: room.drawOffer,
  };
}

function tickClocks(io, room) {
  if (room.status !== 'active') return;
  const now = Date.now();
  const elapsed = now - room.lastTick;
  room.lastTick = now;
  if (room.chess.turn() === 'w') room.whiteMs -= elapsed;
  else room.blackMs -= elapsed;

  if (room.whiteMs <= 0 || room.blackMs <= 0) {
    const loser = room.whiteMs <= 0 ? 'white' : 'black';
    endGame(io, room, loser === 'white' ? 'black' : 'white', 'timeout');
    return;
  }

  io.to(room.id).emit('clock_tick', {
    whiteMs: room.whiteMs,
    blackMs: room.blackMs,
    turn: room.chess.turn(),
  });
}

function startClock(io, room) {
  if (room.timeControl === 'unlimited') return;
  if (room.clockInterval) clearInterval(room.clockInterval);
  room.lastTick = Date.now();
  room.clockInterval = setInterval(() => tickClocks(io, room), 250);
}

function stopClock(room) {
  if (room.clockInterval) {
    clearInterval(room.clockInterval);
    room.clockInterval = null;
  }
}

async function persistGameStart(room) {
  const conn = await ensureDb();
  if (!conn) return;
  await conn.db.collection('games').updateOne(
    { _id: room.id },
    {
      $setOnInsert: {
        _id: room.id,
        roomCode: room.roomCode,
        mode: room.mode,
        timeControl: room.timeControl,
        initialTimeMs: room.initialTimeMs,
        incrementMs: room.incrementMs,
        white: room.white?.id ? new mongoose.Types.ObjectId(room.white.id) : null,
        black: room.black?.id ? new mongoose.Types.ObjectId(room.black.id) : null,
        whiteName: room.white?.name,
        blackName: room.black?.name,
        moves: [],
        fen: room.chess.fen(),
        pgn: '',
        status: room.status,
        spectators: [],
        chat: [],
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

async function persistMove(room, move) {
  const conn = await ensureDb();
  if (!conn) return;
  await conn.db.collection('games').updateOne(
    { _id: room.id },
    {
      $push: { moves: move },
      $set: {
        fen: room.chess.fen(),
        pgn: room.chess.pgn(),
        updatedAt: new Date(),
      },
    },
  );
}

async function persistChat(room, msg) {
  const conn = await ensureDb();
  if (!conn) return;
  await conn.db.collection('games').updateOne(
    { _id: room.id },
    { $push: { chat: msg }, $set: { updatedAt: new Date() } },
  );
}

// FIDE-ish Elo with K-factor that decays with rating.
function kFactor(r) {
  if (r < 1600) return 32;
  if (r < 2100) return 24;
  return 16;
}
function expected(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}
function applyElo(wr, br, result) {
  const eW = expected(wr, br);
  const eB = expected(br, wr);
  const sW = result === 'white' ? 1 : result === 'draw' ? 0.5 : 0;
  const sB = 1 - sW;
  return {
    whiteDelta: Math.round(kFactor(wr) * (sW - eW)),
    blackDelta: Math.round(kFactor(br) * (sB - eB)),
  };
}

async function persistGameEnd(room, result, reason) {
  const conn = await ensureDb();
  if (!conn) return;
  const ended = new Date();
  await conn.db.collection('games').updateOne(
    { _id: room.id },
    {
      $set: {
        status: 'finished',
        result,
        endReason: reason,
        fen: room.chess.fen(),
        pgn: room.chess.pgn(),
        endedAt: ended,
        updatedAt: ended,
      },
    },
  );

  // Rated update only if both sides are real users on an online game.
  if (room.mode === 'ai' || room.mode === 'guest') return;
  if (!room.white?.id || !room.black?.id) return;

  const users = conn.db.collection('users');
  const ratings = conn.db.collection('ratings');
  const matchHistories = conn.db.collection('matchhistories');

  const whiteId = new mongoose.Types.ObjectId(room.white.id);
  const blackId = new mongoose.Types.ObjectId(room.black.id);
  const whiteDoc = await users.findOne({ _id: whiteId });
  const blackDoc = await users.findOne({ _id: blackId });
  if (!whiteDoc || !blackDoc) return;

  const wRating = whiteDoc.rating ?? 1200;
  const bRating = blackDoc.rating ?? 1200;
  const { whiteDelta, blackDelta } = applyElo(wRating, bRating, result);
  const newW = wRating + whiteDelta;
  const newB = bRating + blackDelta;

  const wOutcome = result === 'white' ? 'win' : result === 'draw' ? 'draw' : 'loss';
  const bOutcome = result === 'black' ? 'win' : result === 'draw' ? 'draw' : 'loss';
  const inc = (outcome) => ({
    wins: outcome === 'win' ? 1 : 0,
    losses: outcome === 'loss' ? 1 : 0,
    draws: outcome === 'draw' ? 1 : 0,
    gamesPlayed: 1,
  });

  await users.updateOne(
    { _id: whiteId },
    { $set: { rating: newW, peakRating: Math.max(whiteDoc.peakRating ?? wRating, newW) }, $inc: inc(wOutcome) },
  );
  await users.updateOne(
    { _id: blackId },
    { $set: { rating: newB, peakRating: Math.max(blackDoc.peakRating ?? bRating, newB) }, $inc: inc(bOutcome) },
  );

  const gameOid = room.id;
  await matchHistories.insertMany([
    {
      user: whiteId,
      game: gameOid,
      opponent: blackId,
      opponentName: room.black.name,
      color: 'white',
      result: wOutcome,
      ratingBefore: wRating,
      ratingAfter: newW,
      ratingDelta: whiteDelta,
      timeControl: room.timeControl,
      moves: room.moves.length,
      endReason: reason,
      playedAt: ended,
      createdAt: ended,
      updatedAt: ended,
    },
    {
      user: blackId,
      game: gameOid,
      opponent: whiteId,
      opponentName: room.white.name,
      color: 'black',
      result: bOutcome,
      ratingBefore: bRating,
      ratingAfter: newB,
      ratingDelta: blackDelta,
      timeControl: room.timeControl,
      moves: room.moves.length,
      endReason: reason,
      playedAt: ended,
      createdAt: ended,
      updatedAt: ended,
    },
  ]);

  await ratings.insertMany([
    { user: whiteId, game: gameOid, rating: newW, delta: whiteDelta, timeControl: room.timeControl, at: ended, createdAt: ended, updatedAt: ended },
    { user: blackId, game: gameOid, rating: newB, delta: blackDelta, timeControl: room.timeControl, at: ended, createdAt: ended, updatedAt: ended },
  ]);
}

function endGame(io, room, result, reason) {
  if (room.status === 'finished') return;
  room.status = 'finished';
  room.result = result;
  room.endReason = reason;
  stopClock(room);
  io.to(room.id).emit('game_ended', { result, reason, snapshot: snapshot(room) });
  persistGameEnd(room, result, reason).catch((e) => console.error('persistGameEnd', e));
}

function checkAutoEnd(io, room) {
  if (room.chess.isCheckmate()) {
    const winner = room.chess.turn() === 'w' ? 'black' : 'white';
    endGame(io, room, winner, 'checkmate');
    return true;
  }
  if (room.chess.isStalemate()) {
    endGame(io, room, 'draw', 'stalemate');
    return true;
  }
  if (room.chess.isInsufficientMaterial()) {
    endGame(io, room, 'draw', 'insufficient');
    return true;
  }
  if (room.chess.isThreefoldRepetition()) {
    endGame(io, room, 'draw', 'threefold');
    return true;
  }
  if (room.chess.isDraw()) {
    endGame(io, room, 'draw', 'fifty_move');
    return true;
  }
  return false;
}

function createRoom({ mode, timeControl, isPrivate }) {
  const tc = TIME_CONTROLS[timeControl] ?? TIME_CONTROLS.rapid;
  const id = new mongoose.Types.ObjectId();
  const room = {
    id,
    roomCode: isPrivate ? shortCode(6) : null,
    mode,
    timeControl,
    initialTimeMs: tc.initialMs,
    incrementMs: tc.incrementMs,
    chess: new Chess(),
    moves: [],
    white: null,
    black: null,
    status: 'waiting',
    result: null,
    endReason: null,
    whiteMs: tc.initialMs,
    blackMs: tc.initialMs,
    lastTick: Date.now(),
    clockInterval: null,
    chat: [],
    drawOffer: null,
    spectators: new Set(),
    socketIds: new Set(),
  };
  rooms.set(String(id), room);
  if (room.roomCode) codeIndex.set(room.roomCode, String(id));
  return room;
}

function findRoom(idOrCode) {
  if (rooms.has(idOrCode)) return rooms.get(idOrCode);
  const id = codeIndex.get(idOrCode);
  if (id) return rooms.get(id);
  return null;
}

function seatPlayer(room, player) {
  if (!room.white) {
    room.white = player;
  } else if (!room.black && room.white.id !== player.id) {
    room.black = player;
  } else if (room.white.id === player.id || room.black?.id === player.id) {
    // already seated — reconnect
  } else {
    return false; // room full, must spectate
  }
  return true;
}

function maybeStart(io, room) {
  if (room.status === 'waiting' && room.white && room.black) {
    room.status = 'active';
    room.lastTick = Date.now();
    startClock(io, room);
    persistGameStart(room).catch((e) => console.error('persistGameStart', e));
    io.to(String(room.id)).emit('game_started', snapshot(room));
  }
}

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    sockets.set(socket.id, { userId: null, username: 'Guest', gameId: null });

    socket.on('connect_user', ({ userId, username, rating }) => {
      const meta = sockets.get(socket.id);
      meta.userId = userId || null;
      meta.username = username || 'Guest';
      meta.rating = rating ?? 1200;
      if (userId) {
        const set = presence.get(userId) ?? new Set();
        set.add(socket.id);
        presence.set(userId, set);
        io.emit('presence', { userId, online: true });
      }
    });

    socket.on('create_game', ({ mode = 'private', timeControl = 'rapid', isPrivate = true }, ack) => {
      const room = createRoom({ mode, timeControl, isPrivate });
      const meta = sockets.get(socket.id);
      seatPlayer(room, { id: meta.userId, name: meta.username, rating: meta.rating });
      socket.join(String(room.id));
      meta.gameId = String(room.id);
      room.socketIds.add(socket.id);
      ack?.({ ok: true, snapshot: snapshot(room) });
    });

    socket.on('join_room', ({ roomCode, asSpectator }, ack) => {
      const room = findRoom(roomCode);
      if (!room) return ack?.({ ok: false, error: 'Room not found' });
      const meta = sockets.get(socket.id);
      const player = { id: meta.userId, name: meta.username, rating: meta.rating };

      const isAlreadyPlayer =
        (room.white && room.white.id && room.white.id === meta.userId) ||
        (room.black && room.black.id && room.black.id === meta.userId);

      if (asSpectator || (!isAlreadyPlayer && room.white && room.black)) {
        room.spectators.add(socket.id);
      } else if (!isAlreadyPlayer) {
        const seated = seatPlayer(room, player);
        if (!seated) room.spectators.add(socket.id);
      }

      socket.join(String(room.id));
      meta.gameId = String(room.id);
      room.socketIds.add(socket.id);
      io.to(String(room.id)).emit('player_joined', { snapshot: snapshot(room) });
      maybeStart(io, room);
      ack?.({ ok: true, snapshot: snapshot(room) });
    });

    socket.on('find_match', ({ timeControl = 'rapid' }, ack) => {
      const meta = sockets.get(socket.id);
      const queue = matchQueue.get(timeControl) ?? [];

      // Pull a partner from the front of the queue if anyone's waiting.
      const partner = queue.shift();
      if (partner && partner.socketId !== socket.id) {
        matchQueue.set(timeControl, queue);
        const room = createRoom({ mode: 'online', timeControl, isPrivate: false });
        // Random color assignment.
        const partnerWhite = Math.random() < 0.5;
        const me = { id: meta.userId, name: meta.username, rating: meta.rating };
        const opp = { id: partner.userId, name: partner.username, rating: partner.rating };
        room.white = partnerWhite ? opp : me;
        room.black = partnerWhite ? me : opp;

        const partnerSocket = io.sockets.sockets.get(partner.socketId);
        if (partnerSocket) {
          partnerSocket.join(String(room.id));
          const pmeta = sockets.get(partner.socketId);
          if (pmeta) pmeta.gameId = String(room.id);
          room.socketIds.add(partner.socketId);
          partnerSocket.emit('match_found', { snapshot: snapshot(room) });
        }
        socket.join(String(room.id));
        meta.gameId = String(room.id);
        room.socketIds.add(socket.id);
        socket.emit('match_found', { snapshot: snapshot(room) });
        maybeStart(io, room);
        ack?.({ ok: true, gameId: String(room.id) });
      } else {
        queue.push({
          socketId: socket.id,
          userId: meta.userId,
          username: meta.username,
          rating: meta.rating,
        });
        matchQueue.set(timeControl, queue);
        ack?.({ ok: true, queued: true });
      }
    });

    socket.on('cancel_match', ({ timeControl = 'rapid' }) => {
      const queue = matchQueue.get(timeControl) ?? [];
      matchQueue.set(
        timeControl,
        queue.filter((q) => q.socketId !== socket.id),
      );
    });

    socket.on('make_move', ({ gameId, from, to, promotion }, ack) => {
      const room = rooms.get(gameId);
      if (!room) return ack?.({ ok: false, error: 'Game not found' });
      if (room.status !== 'active') return ack?.({ ok: false, error: 'Game is not active' });

      const meta = sockets.get(socket.id);
      const turn = room.chess.turn();
      const expectedPlayer = turn === 'w' ? room.white : room.black;
      if (expectedPlayer?.id && meta.userId && expectedPlayer.id !== meta.userId) {
        return ack?.({ ok: false, error: 'Not your turn' });
      }

      let move;
      try {
        move = room.chess.move({ from, to, promotion: promotion ?? 'q' });
      } catch {
        return ack?.({ ok: false, error: 'Illegal move' });
      }
      if (!move) return ack?.({ ok: false, error: 'Illegal move' });

      // Apply increment to the player who just moved.
      const justMoved = turn;
      if (justMoved === 'w') room.whiteMs += room.incrementMs;
      else room.blackMs += room.incrementMs;
      room.lastTick = Date.now();

      const moveRecord = {
        san: move.san,
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        fen: room.chess.fen(),
        timestamp: new Date(),
        timeLeftMs: justMoved === 'w' ? room.whiteMs : room.blackMs,
      };
      room.moves.push(moveRecord);
      room.drawOffer = null;

      io.to(String(room.id)).emit('move_made', {
        move: moveRecord,
        clock: { whiteMs: room.whiteMs, blackMs: room.blackMs, turn: room.chess.turn() },
        check: room.chess.inCheck(),
      });

      persistMove(room, moveRecord).catch((e) => console.error('persistMove', e));

      if (!checkAutoEnd(io, room)) {
        // continue
      }
      ack?.({ ok: true });
    });

    socket.on('resign', ({ gameId }) => {
      const room = rooms.get(gameId);
      if (!room || room.status !== 'active') return;
      const meta = sockets.get(socket.id);
      const isWhite = room.white?.id && room.white.id === meta.userId;
      const isBlack = room.black?.id && room.black.id === meta.userId;
      if (!isWhite && !isBlack) return;
      const winner = isWhite ? 'black' : 'white';
      endGame(io, room, winner, 'resignation');
    });

    socket.on('offer_draw', ({ gameId }) => {
      const room = rooms.get(gameId);
      if (!room || room.status !== 'active') return;
      const meta = sockets.get(socket.id);
      const isWhite = room.white?.id && room.white.id === meta.userId;
      const isBlack = room.black?.id && room.black.id === meta.userId;
      if (!isWhite && !isBlack) return;
      room.drawOffer = isWhite ? 'w' : 'b';
      io.to(String(room.id)).emit('draw_offered', { by: room.drawOffer });
    });

    socket.on('accept_draw', ({ gameId }) => {
      const room = rooms.get(gameId);
      if (!room || !room.drawOffer || room.status !== 'active') return;
      endGame(io, room, 'draw', 'draw_agreed');
    });

    socket.on('decline_draw', ({ gameId }) => {
      const room = rooms.get(gameId);
      if (!room) return;
      room.drawOffer = null;
      io.to(String(room.id)).emit('draw_declined', {});
    });

    socket.on('chat', ({ gameId, text }) => {
      const room = rooms.get(gameId);
      if (!room) return;
      const meta = sockets.get(socket.id);
      const trimmed = String(text ?? '').slice(0, 240);
      if (!trimmed) return;
      const msg = { userId: meta.userId, username: meta.username, text: trimmed, ts: new Date() };
      room.chat.push(msg);
      io.to(String(room.id)).emit('chat_message', msg);
      persistChat(room, msg).catch(() => {});
    });

    socket.on('emoji', ({ gameId, emoji }) => {
      const room = rooms.get(gameId);
      if (!room) return;
      const meta = sockets.get(socket.id);
      io.to(String(room.id)).emit('emoji', { from: meta.username, emoji });
    });

    socket.on('disconnect', () => {
      const meta = sockets.get(socket.id);
      if (!meta) return;
      sockets.delete(socket.id);

      // Remove from any matchmaking queues.
      for (const [tc, q] of matchQueue.entries()) {
        matchQueue.set(tc, q.filter((x) => x.socketId !== socket.id));
      }

      if (meta.userId) {
        const set = presence.get(meta.userId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            presence.delete(meta.userId);
            io.emit('presence', { userId: meta.userId, online: false });
          }
        }
      }

      // Allow a 30s reconnect window before treating it as a disconnect-loss.
      // (We just leave the room intact; the player can rejoin via roomCode/gameId.)
    });
  });
}

module.exports = { registerSocketHandlers };
