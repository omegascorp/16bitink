import mongoose, { Schema, type Model } from 'mongoose';
import type { PurchaseRecord } from '../purchases';

const purchaseSchema = new Schema<PurchaseRecord>(
  {
    sessionId: { type: String, required: true, unique: true },
    game: { type: String, required: true },
    email: { type: String, default: null, index: true },
    googleSub: { type: String, default: null, index: true },
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
export const Purchase: Model<PurchaseRecord> =
  (mongoose.models.Purchase as Model<PurchaseRecord> | undefined) ?? mongoose.model<PurchaseRecord>('Purchase', purchaseSchema);
