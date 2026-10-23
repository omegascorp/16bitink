import mongoose, { Schema, type Model } from 'mongoose';
import type { StoredEvent } from '../analytics';

/**
 * Raw events expire after two years. MongoDB drops a time-series bucket only
 * once all of it has expired, and an "hours" bucket spans up to 30 days, so
 * the last events go within about 25 months.
 */
export const EVENT_RETENTION_SECONDS = 730 * 24 * 60 * 60;

/**
 * Analytics events, in a time-series collection: MongoDB packs them into
 * compressed buckets per `meta` (event name + game), which suits "per day,
 * per game" reports. Visitor and session ids stay outside `meta` on purpose:
 * one bucket per visitor would undo the packing.
 */
const eventSchema = new Schema<StoredEvent>(
  {
    ts: { type: Date, required: true },
    meta: {
      event: { type: String, required: true },
      game: { type: String, default: null },
    },
    visitor: { type: String, required: true },
    session: { type: String, required: true },
    os: { type: String, required: true },
    browser: { type: String, required: true },
    device: { type: String, required: true },
    country: { type: String, default: null },
    path: String,
    ref: String,
    level: String,
    n: Number,
    name: String,
    result: String,
    seconds: Number,
    score: Number,
    cause: String,
    progress: String,
    version: String,
    ms: Number,
    scroll: Number,
    loadMs: Number,
    pct: Number,
    stage: String,
    error: String,
    source: String,
    target: String,
    slot: Number,
    where: String,
    signedIn: Boolean,
    app: Boolean,
  },
  {
    collection: 'events',
    versionKey: false,
    timeseries: { timeField: 'ts', metaField: 'meta', granularity: 'hours' },
    expireAfterSeconds: EVENT_RETENTION_SECONDS,
  },
);

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const AnalyticsEvent: Model<StoredEvent> =
  (mongoose.models.AnalyticsEvent as Model<StoredEvent> | undefined) ?? mongoose.model<StoredEvent>('AnalyticsEvent', eventSchema);
