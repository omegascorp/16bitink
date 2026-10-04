import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** A single-use activation key an admin created: redeeming it grants `game` to the redeemer. */
export interface KeyDoc {
  readonly _id: Types.ObjectId;
  /** Stored form (no dashes), see lib/keys.ts. */
  readonly code: string;
  readonly game: string;
  /** Who it is for, e.g. the creator's channel name. */
  readonly note: string;
  /** The admin who created it. */
  readonly createdBy: Types.ObjectId;
  /** The user who redeemed it; absent until then. */
  readonly redeemedBy?: Types.ObjectId;
  readonly redeemedAt?: Date;
  /** Set once the redeemer's grant exists. A grant an admin later revokes stays revoked. */
  readonly granted?: boolean;
  readonly createdAt: Date;
}

const keySchema = new Schema<KeyDoc>(
  {
    code: { type: String, required: true, unique: true },
    game: { type: String, required: true },
    note: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    redeemedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    redeemedAt: { type: Date },
    granted: { type: Boolean },
  },
  { timestamps: true, collection: 'keys' },
);
keySchema.index({ createdAt: -1 });

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const Key: Model<KeyDoc> =
  (mongoose.models.Key as Model<KeyDoc> | undefined) ?? mongoose.model<KeyDoc>('Key', keySchema);
