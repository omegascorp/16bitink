import mongoose, { Schema, type Model } from 'mongoose';

/** An address on the Sunday email list: told when the week's new game is out. */
export interface SubscriberDoc {
  /** Trimmed and lower-cased (see subscribe.ts). */
  readonly email: string;
  /** The page the form was on, e.g. "/games/inkfish". */
  readonly source: string;
  /** Secret for the unsubscribe link every email carries (100 random bits). */
  readonly token: string;
  readonly createdAt: Date;
}

const subscriberSchema = new Schema<SubscriberDoc>(
  {
    email: { type: String, required: true },
    source: { type: String, required: true },
    token: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'subscribers' },
);
subscriberSchema.index({ email: 1 }, { unique: true });
subscriberSchema.index({ token: 1 }, { unique: true });

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const Subscriber: Model<SubscriberDoc> =
  (mongoose.models.Subscriber as Model<SubscriberDoc> | undefined) ?? mongoose.model<SubscriberDoc>('Subscriber', subscriberSchema);
