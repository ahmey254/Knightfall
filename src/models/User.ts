import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String },
    avatar: { type: String },
    provider: { type: String, enum: ['credentials', 'google', 'guest'], default: 'credentials' },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    isGuest: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },

    // Aggregated stats — kept in sync after each game so leaderboards are cheap.
    rating: { type: Number, default: 1200, index: true },
    peakRating: { type: Number, default: 1200 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },

    // Time-control specific Elo (optional finer breakdown).
    ratings: {
      bullet: { type: Number, default: 1200 },
      blitz: { type: Number, default: 1200 },
      rapid: { type: Number, default: 1200 },
    },

    badges: [{ type: String }],
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    online: { type: Boolean, default: false, index: true },
    lastSeen: { type: Date, default: () => new Date() },

    bio: { type: String, maxlength: 240 },
    country: { type: String, maxlength: 2 },
  },
  { timestamps: true },
);

UserSchema.index({ rating: -1 });

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>('User', UserSchema);
