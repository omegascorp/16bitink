import { Types } from 'mongoose';
import type { Role } from '../admins';
import type { GoogleUser } from '../google';
import type { UserId } from '../userId';
import { Purchase } from './purchaseModel';
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

/**
 * The user for this Google account, created on first sign-in, with `role`
 * as of now. Purchases saved before users existed name the Google account
 * instead of a user; they are linked to the user here.
 */
export async function signInGoogleUser(g: GoogleUser, role: Role, now: Date): Promise<UserId> {
  let id: UserId;
  try {
    id = await upsertGoogleUser(g, role, now);
  } catch (err) {
    // Two first sign-ins at once: one created the user, so the retry finds it.
    if (!isDuplicateKey(err)) throw err;
    id = await upsertGoogleUser(g, role, now);
  }
  // Older purchases stored the Google id as `googleSub`, a field no longer in the schema, hence the raw collection.
  await Purchase.collection.updateMany({ googleSub: g.googleId, userId: null }, { $set: { userId: new Types.ObjectId(id) } });
  return id;
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
  readonly role: Role;
  readonly createdAt: Date;
  readonly lastSignInAt: Date;
}

export interface UserPage {
  readonly users: readonly UserSummary[];
  readonly total: number;
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Users, newest first, optionally only those whose email or name contains `search`. */
export async function listUsers(opts: { readonly search: string; readonly page: number; readonly perPage: number }): Promise<UserPage> {
  const q = opts.search.trim();
  const pattern = new RegExp(escapeRegex(q), 'i');
  const filter = q ? { $or: [{ email: pattern }, { name: pattern }] } : {};
  const [docs, total] = await Promise.all([
    User.find(filter, { email: 1, name: 1, role: 1, createdAt: 1, lastSignInAt: 1 })
      .sort({ createdAt: -1 }).skip(opts.page * opts.perPage).limit(opts.perPage).lean().exec(),
    User.countDocuments(filter),
  ]);
  const users = docs.map((d) => ({ id: d._id.toHexString(), email: d.email, name: d.name, role: d.role, createdAt: d.createdAt, lastSignInAt: d.lastSignInAt }));
  return { users, total };
}
