import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { ROLES, type Role } from '../admins';

/** A player's account. Sign-in methods are fields on it, so more can be linked later. */
export interface UserDoc {
  readonly _id: Types.ObjectId;
  /** Google's stable account id; never changes, unlike the email. */
  readonly googleId: string;
  /** Verified, lower-cased; updated on each sign-in. */
  readonly email: string;
  readonly name: string;
  readonly lastSignInAt: Date;
  /** Set from ADMIN_EMAILS at sign-in and on each deploy. */
  readonly role: Role;
  readonly createdAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, index: true },
    name: { type: String, required: true },
    lastSignInAt: { type: Date, required: true },
    role: { type: String, enum: ROLES, required: true, default: 'user' },
  },
  { timestamps: true, collection: 'users' },
);

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc> | undefined) ?? mongoose.model<UserDoc>('User', userSchema);
