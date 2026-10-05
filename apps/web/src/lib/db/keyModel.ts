import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** One account's use of a key. */
export interface RedemptionDoc {
  readonly userId: Types.ObjectId;
  readonly at: Date;
  /** Set once this user's grant exists. A grant an admin later revokes stays revoked. */
  readonly granted?: boolean;
}

/** An activation key an admin created: redeeming it grants `game`, to at most `uses` accounts. */
export interface KeyDoc {
  readonly _id: Types.ObjectId;
  /** Stored form (no dashes), see lib/keys.ts. */
  readonly code: string;
  readonly game: string;
  /** Who it is for, e.g. the creator's channel name. */
  readonly note: string;
  /** The admin who created it. */
  readonly createdBy: Types.ObjectId;
  /** How many accounts may redeem it. Absent on keys made before multi-use keys: 1. */
  readonly uses?: number;
  /** Who redeemed it, oldest first. */
  readonly redemptions?: readonly RedemptionDoc[];
  /** Legacy single-use keys: the one redeemer, when and whether granted. New keys use `redemptions`. */
  readonly redeemedBy?: Types.ObjectId;
  readonly redeemedAt?: Date;
  readonly granted?: boolean;
  readonly createdAt: Date;
}

const redemptionSchema = new Schema<RedemptionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, required: true },
    granted: { type: Boolean },
  },
  { _id: false },
);

const keySchema = new Schema<KeyDoc>(
  {
    code: { type: String, required: true, unique: true },
    game: { type: String, required: true },
    note: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uses: { type: Number, min: 1 },
    redemptions: { type: [redemptionSchema], default: undefined },
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
