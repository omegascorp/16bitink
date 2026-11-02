import { randomCode } from '../base32';
import type { SubscriberRow } from '../subscribe';
import { Subscriber } from './subscriberModel';

const TOKEN_LENGTH = 20;

export type SubscribeResult = 'added' | 'already';

/** Puts an address on the list. Signing up twice keeps the first sign-up (and its token). */
export async function subscribe(email: string, source: string, now: Date): Promise<SubscribeResult> {
  const res = await Subscriber.updateOne(
    { email },
    { $setOnInsert: { email, source, token: randomCode(TOKEN_LENGTH), createdAt: now } },
    { upsert: true, timestamps: false },
  );
  return res.upsertedCount === 1 ? 'added' : 'already';
}

/** Takes the address with this unsubscribe token off the list. Returns whether there was one. */
export async function unsubscribe(token: string): Promise<boolean> {
  if (token.length !== TOKEN_LENGTH) return false;
  const res = await Subscriber.deleteOne({ token });
  return res.deletedCount === 1;
}

/** Takes this (normalized) address off the list: a signed-in player leaving from their account. Returns whether it was on it. */
export async function unsubscribeEmail(email: string): Promise<boolean> {
  const res = await Subscriber.deleteOne({ email });
  return res.deletedCount === 1;
}

/** Whether this (normalized) address is on the list. */
export async function isSubscribed(email: string): Promise<boolean> {
  return (await Subscriber.exists({ email }).exec()) !== null;
}

export async function countSubscribers(): Promise<number> {
  return Subscriber.countDocuments().exec();
}

/** Everyone on the list, oldest first, for export to an email tool. */
export async function listSubscribers(): Promise<SubscriberRow[]> {
  const docs = await Subscriber.find({}, { email: 1, source: 1, token: 1, createdAt: 1 }).sort({ createdAt: 1, _id: 1 }).lean().exec();
  return docs.map((d) => ({ email: d.email, source: d.source, token: d.token, createdAt: d.createdAt }));
}

/** Addresses added with `from <= createdAt < to`. */
export async function countNewSubscribers(range: { readonly from: Date; readonly to: Date }): Promise<number> {
  return Subscriber.countDocuments({ createdAt: { $gte: range.from, $lt: range.to } }).exec();
}
