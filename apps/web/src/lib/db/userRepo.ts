import type { Role } from '../admins';
import type { GoogleUser } from '../google';
import { generatePlayerId, normalizePlayerId } from '../playerId';
import type { UserId } from '../userId';
import { User } from './userModel';

const DUPLICATE_KEY = 11000;

const isDuplicateKey = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: unknown }).code === DUPLICATE_KEY;

async function upsertGoogleUser(g: GoogleUser, role: Role, now: Date): Promise<UserId> {
  const user = await User.findOneAndUpdate(
    { googleId: g.googleId },
    { $set: { email: g.email, name: g.name, lastSignInAt: now, role }, $setOnInsert: { googleId: g.googleId } },
    { upsert: true, new: true, projection: { _id: 1 } },
  ).lean().exec();
  if (!user) throw new Error('User upsert returned nothing');
  return user._id.toHexString();
}

/** The user for this Google account, created on first sign-in, with `role` as of now. */
export async function signInGoogleUser(g: GoogleUser, role: Role, now: Date): Promise<UserId> {
  try {
    return await upsertGoogleUser(g, role, now);
  } catch (err) {
    // Two first sign-ins at once: one created the user, so the retry finds it.
    if (!isDuplicateKey(err)) throw err;
    return upsertGoogleUser(g, role, now);
  }
}

const PLAYER_ID_ATTEMPTS = 5;

/** The user's player id, given one now if they have none yet. `generate` is for tests. */
export async function ensurePlayerId(userId: UserId, generate: () => string = generatePlayerId): Promise<string> {
  for (let attempt = 0; attempt < PLAYER_ID_ATTEMPTS; attempt++) {
    const user = await User.findById(userId, { playerId: 1 }).lean().exec();
    if (!user) throw new Error(`No user ${userId}`);
    if (user.playerId) return user.playerId;
    try {
      // Only if still unset: a concurrent request may have just given them one, and the re-read finds it.
      await User.updateOne({ _id: user._id, playerId: { $exists: false } }, { $set: { playerId: generate() } });
    } catch (err) {
      // Another player already has that id (rare at 40 bits): draw again.
      if (!isDuplicateKey(err)) throw err;
    }
  }
  throw new Error(`Could not assign a player id to ${userId}`);
}

/** The user's current role, or null when there is no such user. */
export async function findRole(userId: UserId): Promise<Role | null> {
  const user = await User.findById(userId, { role: 1 }).lean().exec();
  return user?.role ?? null;
}

/** Makes exactly these emails admins: listed users are promoted, other admins demoted. Returns how many changed. */
export async function syncAdminRoles(adminEmails: ReadonlySet<string>): Promise<number> {
  const emails = [...adminEmails];
  const [up, down] = await Promise.all([
    User.updateMany({ email: { $in: emails }, role: { $ne: 'admin' } }, { $set: { role: 'admin' } }),
    User.updateMany({ email: { $nin: emails }, role: 'admin' }, { $set: { role: 'user' } }),
  ]);
  return up.modifiedCount + down.modifiedCount;
}

export interface UserSummary {
  readonly id: UserId;
  readonly email: string;
  readonly name: string;
  /** Absent until the player first needs one. */
  readonly playerId?: string;
  readonly role: Role;
  readonly createdAt: Date;
  readonly lastSignInAt: Date;
}

export interface UserPage {
  readonly users: readonly UserSummary[];
  readonly total: number;
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function searchFilter(search: string) {
  const q = search.trim();
  if (!q) return {};
  const pattern = new RegExp(escapeRegex(q), 'i');
  const playerId = normalizePlayerId(q);
  return { $or: [{ email: pattern }, { name: pattern }, ...(playerId ? [{ playerId }] : [])] };
}

/** Users, newest first, optionally only those whose email or name contains `search`, or whose player id it is. */
export async function listUsers(opts: { readonly search: string; readonly page: number; readonly perPage: number }): Promise<UserPage> {
  const filter = searchFilter(opts.search);
  const [docs, total] = await Promise.all([
    User.find(filter, { email: 1, name: 1, playerId: 1, role: 1, createdAt: 1, lastSignInAt: 1 })
      .sort({ createdAt: -1 }).skip(opts.page * opts.perPage).limit(opts.perPage).lean().exec(),
    User.countDocuments(filter),
  ]);
  const users = docs.map((d) => ({
    id: d._id.toHexString(), email: d.email, name: d.name, playerId: d.playerId, role: d.role, createdAt: d.createdAt, lastSignInAt: d.lastSignInAt,
  }));
  return { users, total };
}
