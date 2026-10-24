import { Types } from 'mongoose';
import { EMAIL_SIGNIN_MAX_AGE_SEC, EMAIL_WINDOW_SEC, MAX_CODE_ATTEMPTS, MAX_EMAILS_PER_ADDRESS } from '../emailSignIn';
import { EmailSignIn } from './emailSignInModel';

export interface NewEmailSignIn {
  readonly email: string;
  readonly ret: string;
  readonly tokenHash: string;
  readonly codeHash: string;
}

/** Who signed in, and where they were headed. */
export interface Redeemed {
  readonly email: string;
  readonly ret: string;
}

export type CodeResult =
  | ({ readonly status: 'ok' } & Redeemed)
  | { readonly status: 'wrong'; readonly attemptsLeft: number }
  | { readonly status: 'expired' };

/** Records a sign-in email about to be sent; null when this address already got its share of emails lately. */
export async function createEmailSignIn(s: NewEmailSignIn, now: Date): Promise<string | null> {
  const since = new Date(now.getTime() - EMAIL_WINDOW_SEC * 1000);
  const recent = await EmailSignIn.countDocuments({ email: s.email, createdAt: { $gte: since } }).exec();
  if (recent >= MAX_EMAILS_PER_ADDRESS) return null;
  const doc = await EmailSignIn.create({
    ...s, attempts: 0, createdAt: now, expiresAt: new Date(now.getTime() + EMAIL_SIGNIN_MAX_AGE_SEC * 1000),
  });
  return doc._id.toHexString();
}

const live = (now: Date) => ({ usedAt: { $exists: false }, expiresAt: { $gt: now } });

/** Drops a record whose email never went out, so it doesn't count against the address. */
export async function forgetEmailSignIn(id: string): Promise<void> {
  if (Types.ObjectId.isValid(id)) await EmailSignIn.deleteOne({ _id: new Types.ObjectId(id) }).exec();
}

/** Who the emailed link is for, without using it up (the confirm page shows it); null when it no longer works. */
export async function peekLink(tokenHash: string, now: Date): Promise<string | null> {
  const doc = await EmailSignIn.findOne({ tokenHash, ...live(now) }, { email: 1 }).lean().exec();
  return doc?.email ?? null;
}

/** Uses up the emailed link: who it was for, or null when it is unknown, used or expired. */
export async function redeemLink(tokenHash: string, now: Date): Promise<Redeemed | null> {
  const doc = await EmailSignIn.findOneAndUpdate({ tokenHash, ...live(now) }, { $set: { usedAt: now } }, { projection: { email: 1, ret: 1 } })
    .lean().exec();
  return doc && { email: doc.email, ret: doc.ret };
}

/** Checks a typed code against the email `id` sent: right uses it up, wrong counts against it. */
export async function redeemCode(id: string, codeHash: string, now: Date): Promise<CodeResult> {
  if (!Types.ObjectId.isValid(id)) return { status: 'expired' };
  const open = { _id: new Types.ObjectId(id), ...live(now), attempts: { $lt: MAX_CODE_ATTEMPTS } };
  const hit = await EmailSignIn.findOneAndUpdate({ ...open, codeHash }, { $set: { usedAt: now } }, { projection: { email: 1, ret: 1 } })
    .lean().exec();
  if (hit) return { status: 'ok', email: hit.email, ret: hit.ret };
  const miss = await EmailSignIn.findOneAndUpdate(open, { $inc: { attempts: 1 } }, { returnDocument: 'after', projection: { attempts: 1 } }).lean().exec();
  if (!miss) return { status: 'expired' };
  const attemptsLeft = MAX_CODE_ATTEMPTS - miss.attempts;
  return attemptsLeft > 0 ? { status: 'wrong', attemptsLeft } : { status: 'expired' };
}
