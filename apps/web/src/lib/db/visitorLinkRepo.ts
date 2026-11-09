import { Types } from 'mongoose';
import type { UserId } from '../userId';
import { VisitorLink } from './visitorLinkModel';

const oid = (id: UserId): Types.ObjectId => new Types.ObjectId(id);
const isDuplicateKey = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;

/**
 * Notes that `visitor` (a browser's analytics id) is signed in as `userId`,
 * in one upsert. A browser another account used before moves to this one,
 * and its `firstAt` starts again; the same account only moves `lastAt` on.
 */
export async function linkVisitor(visitor: string, userId: UserId, now: Date): Promise<void> {
  const user = oid(userId);
  const upsert = () => VisitorLink.updateOne(
    { visitor },
    [{ $set: { visitor, firstAt: { $cond: [{ $eq: ['$userId', user] }, '$firstAt', now] }, userId: user, lastAt: now } }],
    { upsert: true, updatePipeline: true },
  ).exec();
  try {
    await upsert();
  } catch (err) {
    // Two batches from a new browser at once: one inserted the link, so the retry updates it.
    if (!isDuplicateKey(err)) throw err;
    await upsert();
  }
}

/** The visitor ids linked to each of these users, keyed by user id (users with none are left out). */
export async function visitorsOf(userIds: readonly UserId[]): Promise<ReadonlyMap<UserId, readonly string[]>> {
  if (userIds.length === 0) return new Map();
  const docs = await VisitorLink.find({ userId: { $in: userIds.map(oid) } }, { visitor: 1, userId: 1 }).lean().exec();
  return docs.reduce((byUser, d) => {
    const id = d.userId.toHexString();
    return byUser.set(id, [...(byUser.get(id) ?? []), d.visitor]);
  }, new Map<UserId, readonly string[]>());
}

/**
 * Forgets which browsers these users signed in on, so their statistics are
 * no longer tied to them. Call it wherever an account is deleted. Returns how many links went.
 */
export async function unlinkUsers(userIds: readonly UserId[]): Promise<number> {
  if (userIds.length === 0) return 0;
  const res = await VisitorLink.deleteMany({ userId: { $in: userIds.map(oid) } }).exec();
  return res.deletedCount;
}
