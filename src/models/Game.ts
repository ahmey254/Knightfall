import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const MoveSchema = new Schema(
  {
    san: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    promotion: String,
    fen: { type: String, required: true },
    timestamp: { type: Date, default: () => new Date() },
    timeLeftMs: { type: Number },
    eval: { type: Number },
  },
  { _id: false },
);

const GameSchema = new Schema(
  {
    roomCode: { type: String, unique: true, sparse: true, index: true },
    mode: { type: String, enum: ['ai', 'online', 'private', 'guest'], required: true, index: true },
    timeControl: {
      type: String,
      enum: ['bullet', 'blitz', 'rapid', 'unlimited'],
      default: 'rapid',
    },
    initialTimeMs: { type: Number, default: 600000 },
    incrementMs: { type: Number, default: 0 },

    white: { type: Schema.Types.ObjectId, ref: 'User' },
    black: { type: Schema.Types.ObjectId, ref: 'User' },
    whiteName: String,
    blackName: String,

    moves: [MoveSchema],
    fen: { type: String, default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    pgn: { type: String, default: '' },

    status: {
      type: String,
      enum: ['waiting', 'active', 'finished', 'aborted'],
      default: 'waiting',
      index: true,
    },
    result: { type: String, enum: ['white', 'black', 'draw', null], default: null },
    endReason: {
      type: String,
      enum: ['checkmate', 'stalemate', 'resignation', 'timeout', 'draw_agreed', 'insufficient', 'threefold', 'fifty_move', 'aborted', null],
      default: null,
    },

    // For AI mode
    aiDifficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'master'] },

    // Spectators (just userIds; the live socket room is the source of truth).
    spectators: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    chat: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        username: String,
        text: String,
        ts: { type: Date, default: () => new Date() },
      },
    ],

    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true },
);

GameSchema.index({ status: 1, mode: 1 });
GameSchema.index({ white: 1, black: 1, createdAt: -1 });

export type GameDoc = InferSchemaType<typeof GameSchema> & { _id: mongoose.Types.ObjectId };

export const Game: Model<GameDoc> =
  (mongoose.models.Game as Model<GameDoc>) || mongoose.model<GameDoc>('Game', GameSchema);
