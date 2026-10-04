import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** A game an admin unlocked for a user without a purchase. */
export interface GrantDoc {
  readonly userId: Types.ObjectId;
  readonly game: string;
  /** The admin who granted it. */
  readonly grantedBy: Types.ObjectId;
  readonly createdAt: Date;
}

const grantSchema = new Schema<GrantDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    game: { type: String, required: true },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'grants' },
);
grantSchema.index({ userId: 1, game: 1 }, { unique: true });

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const Grant: Model<GrantDoc> =
  (mongoose.models.Grant as Model<GrantDoc> | undefined) ?? mongoose.model<GrantDoc>('Grant', grantSchema);
