import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** A client that registered itself (RFC 7591), e.g. Claude. */
export interface OAuthClientDoc {
  readonly _id: string;
  readonly name: string;
  readonly redirectUris: readonly string[];
  readonly createdAt: Date;
  /** Forgotten then (lib/oauth.ts CLIENT_UNUSED_TTL_MS), pushed back each time it is approved or refreshes. */
  readonly expiresAt: Date;
}

/**
 * A code or token issued to an admin through a client. `_id` is its SHA-256
 * (lib/oauth.ts hashToken), never the value itself; each is gone at `expiresAt`.
 */
export interface OAuthTokenDoc {
  readonly _id: string;
  readonly kind: 'code' | 'access' | 'refresh';
  readonly clientId: string;
  readonly userId: Types.ObjectId;
  /** Codes only: where the code was sent, and the PKCE challenge it must be redeemed with. */
  readonly redirectUri?: string;
  readonly codeChallenge?: string;
  /** Access and refresh tokens: the sign-in they descend from. A refresh token used twice revokes the whole family. */
  readonly family?: string;
  /** Refresh tokens: when it was swapped. Kept until it expires, so a second use is noticed. */
  readonly usedAt?: Date;
  readonly expiresAt: Date;
}

const clientSchema = new Schema<OAuthClientDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    redirectUris: { type: [String], required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'oauth_clients' },
);
clientSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const tokenSchema = new Schema<OAuthTokenDoc>(
  {
    _id: { type: String, required: true },
    kind: { type: String, enum: ['code', 'access', 'refresh'], required: true },
    clientId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    redirectUri: { type: String },
    codeChallenge: { type: String },
    family: { type: String },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'oauth_tokens', versionKey: false },
);
// MongoDB deletes each one once it expires; lookups also check expiresAt, since that sweep runs about once a minute.
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ family: 1 });
tokenSchema.index({ userId: 1 });

// Reused across dev-server reloads instead of redefined (which Mongoose rejects).
export const OAuthClient: Model<OAuthClientDoc> =
  (mongoose.models.OAuthClient as Model<OAuthClientDoc> | undefined) ?? mongoose.model<OAuthClientDoc>('OAuthClient', clientSchema);
export const OAuthToken: Model<OAuthTokenDoc> =
  (mongoose.models.OAuthToken as Model<OAuthTokenDoc> | undefined) ?? mongoose.model<OAuthTokenDoc>('OAuthToken', tokenSchema);
