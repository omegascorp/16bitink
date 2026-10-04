import { Types } from 'mongoose';
import type { PurchaseRecord, PurchaseStatus } from '../purchases';
import type { UserId } from '../userId';
import { Purchase, type PurchaseDoc } from './purchaseModel';

const FIELDS = 'sessionId game email userId paymentIntent amount currency livemode status paidAt -_id';

const toRecord = (d: PurchaseDoc): PurchaseRecord => ({ ...d, userId: d.userId ? d.userId.toHexString() : null });

/**
 * Saves a purchase. Safe to call twice (the success page and the webhook
 * both do): the first write wins, so a replayed checkout event can never
 * turn a refunded purchase back into a paid one.
 */
export async function savePurchase(record: PurchaseRecord): Promise<void> {
  const doc: PurchaseDoc = { ...record, userId: record.userId ? new Types.ObjectId(record.userId) : null };
  await Purchase.updateOne({ sessionId: record.sessionId }, { $setOnInsert: doc }, { upsert: true });
}

/** Marks every purchase paid by this payment intent (a refund or a chargeback). Returns how many changed. */
export async function setPaymentStatus(paymentIntent: string, status: PurchaseStatus): Promise<number> {
  const res = await Purchase.updateMany({ paymentIntent }, { $set: { status } });
  return res.modifiedCount;
}

export async function findPurchase(sessionId: string): Promise<PurchaseRecord | null> {
  const doc = await Purchase.findOne({ sessionId }, FIELDS).lean<PurchaseDoc>().exec();
  return doc ? toRecord(doc) : null;
}

/** Purchases made with this email, or while this user was signed in. */
export async function findPurchasesFor(email: string, userId: UserId): Promise<PurchaseRecord[]> {
  const docs = await Purchase.find({ $or: [{ email: email.toLowerCase() }, { userId: new Types.ObjectId(userId) }] }, FIELDS)
    .lean<PurchaseDoc[]>().exec();
  return docs.map(toRecord);
}

/** Purchases for several users at once (by their emails or user ids), for the admin list. */
export async function findPurchasesForUsers(users: readonly { readonly email: string; readonly id: UserId }[]): Promise<PurchaseRecord[]> {
  if (users.length === 0) return [];
  const docs = await Purchase.find({
    $or: [{ email: { $in: users.map((u) => u.email.toLowerCase()) } }, { userId: { $in: users.map((u) => new Types.ObjectId(u.id)) } }],
  }, FIELDS).lean<PurchaseDoc[]>().exec();
  return docs.map(toRecord);
}
