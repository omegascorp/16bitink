import { Types } from 'mongoose';
import type { ProgressRecord, ProgressWrite } from '../progress';
import type { UserId } from '../userId';
import { Progress } from './progressModel';

const FIELDS = 'data rev -_id';
const DUPLICATE_KEY = 11000;

const owner = (userId: UserId, game: string): { userId: Types.ObjectId; game: string } => ({ userId: new Types.ObjectId(userId), game });

export async function findProgress(userId: UserId, game: string): Promise<ProgressRecord | null> {
  return Progress.findOne(owner(userId, game), FIELDS).lean<ProgressRecord>().exec();
}

export type WriteResult =
  | { readonly ok: true; readonly rev: number }
  /** Someone saved since `rev`: here is what they saved (null if the record is gone), to merge and retry. */
  | { readonly ok: false; readonly current: ProgressRecord | null };

const isDuplicateKey = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: unknown }).code === DUPLICATE_KEY;

/**
 * Saves progress if the stored revision is still `write.rev`, bumping it by
 * one. Otherwise nothing changes and the newer record comes back.
 */
export async function writeProgress(userId: UserId, game: string, write: ProgressWrite): Promise<WriteResult> {
  if (write.rev === 0) {
    try {
      await Progress.create({ ...owner(userId, game), data: write.data, rev: 1 });
      return { ok: true, rev: 1 };
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
      return { ok: false, current: await findProgress(userId, game) };
    }
  }
  const res = await Progress.updateOne({ ...owner(userId, game), rev: write.rev }, { $set: { data: write.data }, $inc: { rev: 1 } });
  if (res.matchedCount === 1) return { ok: true, rev: write.rev + 1 };
  return { ok: false, current: await findProgress(userId, game) };
}
