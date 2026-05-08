import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

// Per-user denormalized record of every game they completed.
// Keeps profile pages and dashboard charts O(N) on the user's own row count
// rather than scanning the global Game collection.
const MatchHistorySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    opponent: { type: Schema.Types.ObjectId, ref: 'User' },
    opponentName: String,
    color: { type: String, enum: ['white', 'black'], required: true },
    result: { type: String, enum: ['win', 'loss', 'draw'], required: true, index: true },
    ratingBefore: { type: Number, required: true },
    ratingAfter: { type: Number, required: true },
    ratingDelta: { type: Number, required: true },
    timeControl: { type: String, enum: ['bullet', 'blitz', 'rapid', 'unlimited'] },
    moves: { type: Number, default: 0 },
    endReason: { type: String },
    playedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true },
);

MatchHistorySchema.index({ user: 1, playedAt: -1 });

export type MatchHistoryDoc = InferSchemaType<typeof MatchHistorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MatchHistory: Model<MatchHistoryDoc> =
  (mongoose.models.MatchHistory as Model<MatchHistoryDoc>) ||
  mongoose.model<MatchHistoryDoc>('MatchHistory', MatchHistorySchema);
