import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

// Time series of rating changes — drives the user's rating chart on their profile.
const RatingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game' },
    rating: { type: Number, required: true },
    delta: { type: Number, required: true },
    timeControl: { type: String, enum: ['bullet', 'blitz', 'rapid', 'unlimited'] },
    at: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true },
);

RatingSchema.index({ user: 1, at: 1 });

export type RatingDoc = InferSchemaType<typeof RatingSchema> & { _id: mongoose.Types.ObjectId };

export const Rating: Model<RatingDoc> =
  (mongoose.models.Rating as Model<RatingDoc>) || mongoose.model<RatingDoc>('Rating', RatingSchema);
