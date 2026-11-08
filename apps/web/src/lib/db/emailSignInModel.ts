import mongoose, { Schema, type Model, type Types } from 'mongoose';

/**
 * One sign-in email: the code and link it carried, as SHA-256 hashes (see
 * lib/emailSignIn.ts), never the values. Works once; gone at `expiresAt`.
 */
export interface EmailSignInDoc {
  readonly _id: Types.ObjectId;
  /** Trimmed and lower-cased. */
  readonly email: string;
  readonly tokenHash: string;
  readonly codeHash: string;
  /** Where to go once signed in: a path on this site. */
  readonly ret: string;
  /** Wrong codes typed so far. */
  readonly attempts: number;
  /** Set when the code or link signed someone in. */
  readonly usedAt?: Date;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

const emailSignInSchema = new Schema<EmailSignInDoc>(
  {
    email: { type: String, required: true },
    tokenHash: { type: String, required: true },
    codeHash: { type: String, required: true },
    ret: { type: String, required: true },
    attempts: { type: Number, required: true, default: 0 },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'emailsignins' },
);
emailSignInSchema.index({ tokenHash: 1 }, { unique: true });
emailSignInSchema.index({ email: 1, createdAt: -1 });
emailSignInSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const EmailSignIn: Model<EmailSignInDoc> =
  (mongoose.models.EmailSignIn as Model<EmailSignInDoc> | undefined) ?? mongoose.model<EmailSignInDoc>('EmailSignIn', emailSignInSchema);
