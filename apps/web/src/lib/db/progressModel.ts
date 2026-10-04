import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** One player's progress in one game. */
export interface ProgressDoc {
  readonly userId: Types.ObjectId;
  readonly game: string;
  /** The game's progress as JSON text (opaque to the site). */
  readonly data: string;
  readonly rev: number;
}

const progressSchema = new Schema<ProgressDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    game: { type: String, required: true },
    data: { type: String, required: true },
    rev: { type: Number, required: true, min: 1 },
  },
  { timestamps: true, collection: 'progress' },
);
progressSchema.index({ userId: 1, game: 1 }, { unique: true });

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const Progress: Model<ProgressDoc> =
  (mongoose.models.Progress as Model<ProgressDoc> | undefined) ?? mongoose.model<ProgressDoc>('Progress', progressSchema);
