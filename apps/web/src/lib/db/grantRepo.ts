import { Types } from 'mongoose';
import type { UserId } from '../userId';
import { Grant } from './grantModel';

const oid = (id: UserId): Types.ObjectId => new Types.ObjectId(id);

/** Unlocks `game` for a user. Granting twice keeps the first grant. */
export async function grantGame(userId: UserId, game: string, grantedBy: UserId): Promise<void> {
  await Grant.updateOne({ userId: oid(userId), game }, { $setOnInsert: { userId: oid(userId), game, grantedBy: oid(grantedBy) } }, { upsert: true });
}

/** Takes a granted game back. Purchased games are unaffected. Returns whether there was a grant. */
export async function revokeGame(userId: UserId, game: string): Promise<boolean> {
  const res = await Grant.deleteOne({ userId: oid(userId), game });
  return res.deletedCount === 1;
}

/** Games granted to one user. */
export async function grantedGames(userId: UserId): Promise<string[]> {
  const docs = await Grant.find({ userId: oid(userId) }, { game: 1 }).lean().exec();
  return docs.map((d) => d.game);
}

/** Games granted to each of these users, keyed by user id. */
export async function grantedGamesFor(userIds: readonly UserId[]): Promise<ReadonlyMap<UserId, readonly string[]>> {
  const docs = await Grant.find({ userId: { $in: userIds.map(oid) } }, { userId: 1, game: 1 }).lean().exec();
  const byUser = new Map<UserId, string[]>();
  for (const d of docs) {
    const id = d.userId.toHexString();
    byUser.set(id, [...(byUser.get(id) ?? []), d.game]);
  }
  return byUser;
}
