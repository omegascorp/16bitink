import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { EVENT_RETENTION_SECONDS } from './eventModel';

/**
 * Which account a browser's analytics visitor id belongs to: recorded when
 * a batch of events arrives from a signed-in browser. Kept apart from the
 * events themselves, so the time-series buckets stay per event and game,
 * and so a player's events from before they signed in count too.
 */
export interface VisitorLinkDoc {
  /** The browser's random analytics id (`16bitink:visitor`). One account at a time. */
  readonly visitor: string;
  readonly userId: Types.ObjectId;
  /** When this account was first seen signed in on this browser. */
  readonly firstAt: Date;
  /** When it was last seen signed in on it. */
  readonly lastAt: Date;
}

const visitorLinkSchema = new Schema<VisitorLinkDoc>(
  {
    visitor: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    firstAt: { type: Date, required: true },
    lastAt: { type: Date, required: true },
  },
  { collection: 'visitorlinks', versionKey: false },
);
visitorLinkSchema.index({ visitor: 1 }, { unique: true });
// Goes when the browser's events would: as long after its last signed-in batch as events are kept.
visitorLinkSchema.index({ lastAt: 1 }, { expireAfterSeconds: EVENT_RETENTION_SECONDS });

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const VisitorLink: Model<VisitorLinkDoc> =
  (mongoose.models.VisitorLink as Model<VisitorLinkDoc> | undefined) ?? mongoose.model<VisitorLinkDoc>('VisitorLink', visitorLinkSchema);
