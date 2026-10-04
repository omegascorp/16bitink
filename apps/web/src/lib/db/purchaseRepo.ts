import { Types } from 'mongoose';
import type { PurchaseRecord, PurchaseStatus } from '../purchases';
import type { UserId } from '../userId';
import { Purchase, type PurchaseDoc } from './purchaseModel';

const FIELDS = 'sessionId game email userId customerId paymentIntent amount currency livemode status paidAt -_id';

const toRecord = (d: PurchaseDoc): PurchaseRecord => ({ ...d, userId: d.userId ? d.userId.toHexString() : null });

const oid = (id: UserId): Types.ObjectId => new Types.ObjectId(id);

/**
 * Saves a purchase. Safe to call twice (the success page and the webhook
 * both do): the first write wins, so a replayed checkout event can never
 * turn a refunded purchase back into a paid one.
 */
export async function savePurchase(record: PurchaseRecord): Promise<void> {
  const doc: PurchaseDoc = { ...record, userId: record.userId ? oid(record.userId) : null };
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

/**
 * Gives a user the purchases made with their (verified) email while nobody
 * was signed in. A purchase already belonging to a user is never moved.
 * Returns how many were claimed.
 */
export async function claimPurchasesByEmail(email: string, userId: UserId): Promise<number> {
  const res = await Purchase.updateMany({ email: email.toLowerCase(), userId: null }, { $set: { userId: oid(userId) } });
  return res.modifiedCount;
}

/** Gives a user one purchase nobody owns yet (proven by its ownership cookie). Returns whether it was claimed. */
export async function claimPurchase(sessionId: string, userId: UserId): Promise<boolean> {
  const res = await Purchase.updateOne({ sessionId, userId: null }, { $set: { userId: oid(userId) } });
  return res.modifiedCount === 1;
}

/** A user's purchases. */
export async function findPurchasesFor(userId: UserId): Promise<PurchaseRecord[]> {
  const docs = await Purchase.find({ userId: oid(userId) }, FIELDS).lean<PurchaseDoc[]>().exec();
  return docs.map(toRecord);
}

/** Purchases of several users at once, for the admin list. */
export async function findPurchasesForUsers(userIds: readonly UserId[]): Promise<PurchaseRecord[]> {
  if (userIds.length === 0) return [];
  const docs = await Purchase.find({ userId: { $in: userIds.map(oid) } }, FIELDS).lean<PurchaseDoc[]>().exec();
  return docs.map(toRecord);
}
