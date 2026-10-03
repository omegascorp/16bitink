import type { PurchaseRecord, PurchaseStatus } from '../purchases';
import { Purchase } from './purchaseModel';

const FIELDS = 'sessionId game email googleSub paymentIntent amount currency livemode status paidAt -_id';

/**
 * Saves a purchase. Safe to call twice (the success page and the webhook
 * both do): the first write wins, so a replayed checkout event can never
 * turn a refunded purchase back into a paid one.
 */
export async function savePurchase(record: PurchaseRecord): Promise<void> {
  // A copy: Mongoose adds its version key to the update object it is given.
  await Purchase.updateOne({ sessionId: record.sessionId }, { $setOnInsert: { ...record } }, { upsert: true });
}

/** Marks every purchase paid by this payment intent (a refund or a chargeback). Returns how many changed. */
export async function setPaymentStatus(paymentIntent: string, status: PurchaseStatus): Promise<number> {
  const res = await Purchase.updateMany({ paymentIntent }, { $set: { status } });
  return res.modifiedCount;
}

export async function findPurchase(sessionId: string): Promise<PurchaseRecord | null> {
  return Purchase.findOne({ sessionId }, FIELDS).lean<PurchaseRecord>().exec();
}

/** Purchases made with this email, or while this Google account was signed in. */
export async function findPurchasesFor(email: string, googleSub: string): Promise<PurchaseRecord[]> {
  return Purchase.find({ $or: [{ email: email.toLowerCase() }, { googleSub }] }, FIELDS).lean<PurchaseRecord[]>().exec();
}
