import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const FriendRequestSchema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true },
  },
  { timestamps: true },
);

FriendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

export type FriendRequestDoc = InferSchemaType<typeof FriendRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FriendRequest: Model<FriendRequestDoc> =
  (mongoose.models.FriendRequest as Model<FriendRequestDoc>) ||
  mongoose.model<FriendRequestDoc>('FriendRequest', FriendRequestSchema);
