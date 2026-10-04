import { Types } from 'mongoose';
import { generateKey } from '../keys';
import type { UserId } from '../userId';
import { grantGame } from './grantRepo';
import { Key } from './keyModel';
import { User } from './userModel';

const oid = (id: UserId): Types.ObjectId => new Types.ObjectId(id);

export interface KeySummary {
  readonly code: string;
  readonly game: string;
  readonly note: string;
  readonly createdAt: Date;
  /** Who redeemed it and when; null while unused. */
  readonly redeemed: { readonly email: string; readonly at: Date } | null;
}

export interface KeyPage {
  readonly keys: readonly KeySummary[];
  readonly total: number;
}

export type RedeemResult =
  | { readonly ok: true; readonly game: string }
  | { readonly ok: false; readonly reason: 'unknown' | 'used' };

/** Creates `count` new unused keys for `game`. Returns their codes. */
export async function createKeys(opts: { readonly game: string; readonly count: number; readonly note: string; readonly createdBy: UserId }): Promise<string[]> {
  const codes = Array.from({ length: opts.count }, () => generateKey());
  await Key.insertMany(codes.map((code) => ({ code, game: opts.game, note: opts.note, createdBy: oid(opts.createdBy) })));
  return codes;
}

/** Keys, newest first, with who redeemed them. */
export async function listKeys(opts: { readonly page: number; readonly perPage: number }): Promise<KeyPage> {
  const [docs, total] = await Promise.all([
    Key.find({}, { code: 1, game: 1, note: 1, createdAt: 1, redeemedBy: 1, redeemedAt: 1 })
      .sort({ createdAt: -1, _id: -1 }).skip(opts.page * opts.perPage).limit(opts.perPage).lean().exec(),
    Key.countDocuments({}),
  ]);
  const redeemerIds = docs.flatMap((d) => (d.redeemedBy ? [d.redeemedBy] : []));
  const users = redeemerIds.length ? await User.find({ _id: { $in: redeemerIds } }, { email: 1 }).lean().exec() : [];
  const emails = new Map(users.map((u) => [u._id.toHexString(), u.email]));
  const keys = docs.map((d) => ({
    code: d.code, game: d.game, note: d.note, createdAt: d.createdAt,
    redeemed: d.redeemedBy ? { email: emails.get(d.redeemedBy.toHexString()) ?? '(deleted user)', at: d.redeemedAt ?? d.createdAt } : null,
  }));
  return { keys, total };
}

/**
 * Redeems a key for a user and unlocks its game for them. A key works once;
 * the same user redeeming it again succeeds, and re-grants only if the first
 * grant never happened (so a retry finishes the job, but a grant an admin
 * revoked stays revoked). Nobody else can use it.
 */
export async function redeemKey(code: string, userId: UserId, now: Date): Promise<RedeemResult> {
  const fields = { game: 1, createdBy: 1, redeemedBy: 1, granted: 1 };
  const claimed = await Key.findOneAndUpdate(
    { code, redeemedBy: { $exists: false } },
    { $set: { redeemedBy: oid(userId), redeemedAt: now } },
    { new: true, projection: fields },
  ).lean().exec();
  const key = claimed ?? (await Key.findOne({ code }, fields).lean().exec());
  if (!key) return { ok: false, reason: 'unknown' };
  if (key.redeemedBy?.toHexString() !== userId) return { ok: false, reason: 'used' };
  if (!key.granted) {
    await grantGame(userId, key.game, key.createdBy.toHexString());
    await Key.updateOne({ code }, { $set: { granted: true } });
  }
  return { ok: true, game: key.game };
}

/** Deletes a key nobody has redeemed. Returns whether it was deleted. */
export async function deleteUnusedKey(code: string): Promise<boolean> {
  const res = await Key.deleteOne({ code, redeemedBy: { $exists: false } });
  return res.deletedCount === 1;
}
