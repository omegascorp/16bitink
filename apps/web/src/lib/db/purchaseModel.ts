import mongoose, { Schema, type Model, type Types } from 'mongoose';
import type { PurchaseRecord } from '../purchases';

/** A purchase as stored: the user is a reference to the `users` collection. */
export type PurchaseDoc = Omit<PurchaseRecord, 'userId'> & { readonly userId: Types.ObjectId | null };

const purchaseSchema = new Schema<PurchaseDoc>(
  {
    sessionId: { type: String, required: true, unique: true },
    game: { type: String, required: true },
    email: { type: String, default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    paymentIntent: { type: String, default: null, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    livemode: { type: Boolean, required: true },
    status: { type: String, required: true, enum: ['paid', 'refunded', 'disputed'] },
    paidAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'purchases' },
);

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const Purchase: Model<PurchaseDoc> =
  (mongoose.models.Purchase as Model<PurchaseDoc> | undefined) ?? mongoose.model<PurchaseDoc>('Purchase', purchaseSchema);
