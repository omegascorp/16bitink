import { Types } from 'mongoose';
import { generateKey } from '../keys';
import type { UserId } from '../userId';
import { grantGame } from './grantRepo';
import { Key, type KeyDoc, type RedemptionDoc } from './keyModel';
import { User } from './userModel';

const oid = (id: UserId): Types.ObjectId => new Types.ObjectId(id);

export interface KeySummary {
  readonly code: string;
  readonly game: string;
  readonly note: string;
  readonly createdAt: Date;
  /** How many accounts may redeem it. */
  readonly uses: number;
  /** Who redeemed it and when, oldest first; empty while unused. */
  readonly redemptions: readonly { readonly email: string; readonly at: Date }[];
}

export interface KeyPage {
  readonly keys: readonly KeySummary[];
  readonly total: number;
}

export type RedeemResult =
  | { readonly ok: true; readonly game: string }
  | { readonly ok: false; readonly reason: 'unknown' | 'used' };

type KeyUses = Pick<KeyDoc, 'uses' | 'redemptions' | 'redeemedBy' | 'redeemedAt' | 'granted' | 'createdAt'>;

/** A key's redemptions, counting a legacy single-use key's one redeemer. */
function redemptionsOf(key: Partial<KeyUses>): readonly RedemptionDoc[] {
  if (key.redemptions) return key.redemptions;
  if (!key.redeemedBy) return [];
  return [{ userId: key.redeemedBy, at: key.redeemedAt ?? key.createdAt ?? new Date(0), granted: key.granted }];
}

/** Creates one key for `game` that up to `uses` accounts can redeem. Returns its code. */
export async function createKey(opts: { readonly game: string; readonly uses: number; readonly note: string; readonly createdBy: UserId }): Promise<string> {
  const code = generateKey();
  await Key.create({ code, game: opts.game, note: opts.note, uses: opts.uses, redemptions: [], createdBy: oid(opts.createdBy) });
  return code;
}

/** Keys, newest first, with who redeemed them. */
export async function listKeys(opts: { readonly page: number; readonly perPage: number }): Promise<KeyPage> {
  const [docs, total] = await Promise.all([
    Key.find({}, { code: 1, game: 1, note: 1, createdAt: 1, uses: 1, redemptions: 1, redeemedBy: 1, redeemedAt: 1 })
      .sort({ createdAt: -1, _id: -1 }).skip(opts.page * opts.perPage).limit(opts.perPage).lean().exec(),
    Key.countDocuments({}),
  ]);
  const redeemerIds = docs.flatMap((d) => redemptionsOf(d).map((r) => r.userId));
  const users = redeemerIds.length ? await User.find({ _id: { $in: redeemerIds } }, { email: 1 }).lean().exec() : [];
  const emails = new Map(users.map((u) => [u._id.toHexString(), u.email]));
  const keys = docs.map((d) => ({
    code: d.code, game: d.game, note: d.note, createdAt: d.createdAt, uses: d.uses ?? 1,
    redemptions: redemptionsOf(d).map((r) => ({ email: emails.get(r.userId.toHexString()) ?? '(deleted user)', at: r.at })),
  }));
  return { keys, total };
}

/**
 * Redeems a key for a user and unlocks its game for them. Each account can use
 * a key once, and only `uses` accounts can use it at all. The same user
 * redeeming it again succeeds, and re-grants only if the first grant never
 * happened (so a retry finishes the job, but a grant an admin revoked stays
 * revoked).
 */
export async function redeemKey(code: string, userId: UserId, now: Date): Promise<RedeemResult> {
  const fields = { game: 1, createdBy: 1, uses: 1, redemptions: 1, redeemedBy: 1, redeemedAt: 1, granted: 1, createdAt: 1 };
  // One atomic claim: not yet redeemed by this user, a use left, and not a legacy (used) key.
  const claimed = await Key.findOneAndUpdate(
    {
      code,
      redeemedBy: { $exists: false },
      'redemptions.userId': { $ne: oid(userId) },
      $expr: { $lt: [{ $size: { $ifNull: ['$redemptions', []] } }, { $ifNull: ['$uses', 1] }] },
    },
    { $push: { redemptions: { userId: oid(userId), at: now } } },
    { new: true, projection: fields },
  ).lean().exec();
  const key = claimed ?? (await Key.findOne({ code }, fields).lean().exec());
  if (!key) return { ok: false, reason: 'unknown' };
  const mine = redemptionsOf(key).find((r) => r.userId.toHexString() === userId);
  if (!mine) return { ok: false, reason: 'used' };
  if (!mine.granted) {
    await grantGame(userId, key.game, key.createdBy.toHexString());
    await (key.redemptions
      ? Key.updateOne({ code, 'redemptions.userId': oid(userId) }, { $set: { 'redemptions.$.granted': true } })
      : Key.updateOne({ code }, { $set: { granted: true } }));
  }
  return { ok: true, game: key.game };
}

/** Deletes a key nobody has redeemed. Returns whether it was deleted. */
export async function deleteUnusedKey(code: string): Promise<boolean> {
  const res = await Key.deleteOne({ code, redeemedBy: { $exists: false }, 'redemptions.0': { $exists: false } });
  return res.deletedCount === 1;
}
