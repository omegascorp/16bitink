import { Types } from 'mongoose';
import { randomToken } from '../google';
import { ACCESS_TTL_MS, CLIENT_UNUSED_TTL_MS, CODE_TTL_MS, hashToken, REFRESH_TTL_MS, type ClientRegistration } from '../oauth';
import type { UserId } from '../userId';
import { OAuthClient, OAuthToken } from './oauthModel';

export interface RegisteredClient {
  readonly clientId: string;
  readonly name: string;
  readonly redirectUris: readonly string[];
  readonly createdAt: Date;
}

export interface IssuedTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** Seconds until the access token expires. */
  readonly expiresIn: number;
}

export interface TokenOwner {
  readonly userId: UserId;
  readonly clientId: string;
  readonly expiresAt: Date;
}

/** A refresh token just swapped: whose it was, and the sign-in the new tokens continue. */
export interface ClaimedRefresh {
  readonly userId: UserId;
  readonly family: string;
}

const later = (now: Date, ms: number): Date => new Date(now.getTime() + ms);

/** A new client, forgotten in a day unless an admin approves it. */
export async function registerClient(reg: ClientRegistration, now: Date): Promise<RegisteredClient> {
  const clientId = `c_${randomToken().slice(0, 32)}`;
  await OAuthClient.create({ _id: clientId, name: reg.clientName, redirectUris: reg.redirectUris, createdAt: now, expiresAt: later(now, CLIENT_UNUSED_TTL_MS) });
  return { clientId, name: reg.clientName, redirectUris: reg.redirectUris, createdAt: now };
}

export async function findClient(clientId: string, now: Date): Promise<RegisteredClient | null> {
  const doc = await OAuthClient.findOne({ _id: clientId, expiresAt: { $gt: now } }).lean().exec();
  return doc && { clientId: doc._id, name: doc.name, redirectUris: doc.redirectUris, createdAt: doc.createdAt };
}

/** Keeps a client that is in use for as long as a refresh token it holds. */
export async function keepClient(clientId: string, now: Date): Promise<void> {
  await OAuthClient.updateOne({ _id: clientId }, { $set: { expiresAt: later(now, REFRESH_TTL_MS) } });
}

async function store(kind: 'code' | 'access' | 'refresh', ttlMs: number, fields: {
  readonly clientId: string; readonly userId: UserId; readonly redirectUri?: string; readonly codeChallenge?: string; readonly family?: string;
}, now: Date): Promise<string> {
  const value = randomToken();
  await OAuthToken.create({ _id: await hashToken(value), kind, ...fields, userId: new Types.ObjectId(fields.userId), expiresAt: later(now, ttlMs) });
  return value;
}

/** A one-time code for the client to swap for tokens within ten minutes. */
export const issueCode = (o: { clientId: string; userId: UserId; redirectUri: string; codeChallenge: string }, now: Date): Promise<string> =>
  store('code', CODE_TTL_MS, o, now);

export interface RedeemedCode {
  readonly userId: UserId;
  readonly redirectUri: string;
  readonly codeChallenge: string;
}

/** Takes a code (it works once, even when two requests race), if it belongs to this client and hasn't expired. */
export async function consumeCode(code: string, clientId: string, now: Date): Promise<RedeemedCode | null> {
  const doc = await OAuthToken.findOneAndDelete({ _id: await hashToken(code), kind: 'code', clientId, expiresAt: { $gt: now } }).lean().exec();
  if (!doc?.redirectUri || !doc.codeChallenge) return null;
  return { userId: doc.userId.toHexString(), redirectUri: doc.redirectUri, codeChallenge: doc.codeChallenge };
}

/** An access token and a refresh token, continuing `family` (a new sign-in when omitted). */
export async function issueTokens(clientId: string, userId: UserId, now: Date, family: string = randomToken()): Promise<IssuedTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    store('access', ACCESS_TTL_MS, { clientId, userId, family }, now),
    store('refresh', REFRESH_TTL_MS, { clientId, userId, family }, now),
  ]);
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_MS / 1000 };
}

/**
 * Marks a refresh token used and says whose it was; the caller then issues
 * the next pair with issueTokens(…, family). A token used a second time means
 * someone has a copy: every token from that sign-in is revoked.
 */
export async function claimRefresh(refreshToken: string, clientId: string, now: Date): Promise<ClaimedRefresh | null> {
  const id = await hashToken(refreshToken);
  const doc = await OAuthToken.findOneAndUpdate(
    { _id: id, kind: 'refresh', clientId, usedAt: { $exists: false }, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { projection: { userId: 1, family: 1 } },
  ).lean().exec();
  if (doc?.family) return { userId: doc.userId.toHexString(), family: doc.family };
  const replayed = await OAuthToken.findOne({ _id: id, kind: 'refresh', usedAt: { $exists: true } }, { family: 1 }).lean().exec();
  if (replayed?.family) {
    await OAuthToken.deleteMany({ family: replayed.family });
    console.warn(`[oauth] refresh token reused: revoked its sign-in (client ${clientId})`);
  }
  return null;
}

/** Who an access token belongs to, while it is valid. */
export async function findAccessToken(token: string, now: Date): Promise<TokenOwner | null> {
  const doc = await OAuthToken.findOne({ _id: await hashToken(token), kind: 'access', expiresAt: { $gt: now } }).lean().exec();
  return doc && { userId: doc.userId.toHexString(), clientId: doc.clientId, expiresAt: doc.expiresAt };
}

/** Signs these users out of every connected app (when they stop being admins). Returns how many tokens went. */
export async function revokeUserTokens(userIds: readonly UserId[]): Promise<number> {
  if (userIds.length === 0) return 0;
  const res = await OAuthToken.deleteMany({ userId: { $in: userIds.map((id) => new Types.ObjectId(id)) } });
  return res.deletedCount;
}
