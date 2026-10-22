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

/** One game's live sales in one currency over a period. */
export interface GameSales {
  readonly game: string;
  readonly currency: string;
  /** Payments made in the period that are still paid. */
  readonly paid: number;
  /** Payments made in the period that were since refunded or disputed. */
  readonly refunded: number;
  /** What the paid ones brought in, in the smallest currency unit, after discounts. */
  readonly amount: number;
}

/** Live (real-money) sales paid in [from, to), per game and currency, best-selling first. Test-mode payments never count. */
export async function salesByGame(range: { readonly from: Date; readonly to: Date }): Promise<GameSales[]> {
  const isPaid = { $eq: ['$status', 'paid'] };
  return Purchase.aggregate<GameSales>([
    { $match: { livemode: true, paidAt: { $gte: range.from, $lt: range.to } } },
    {
      $group: {
        _id: { game: '$game', currency: '$currency' },
        paid: { $sum: { $cond: [isPaid, 1, 0] } },
        refunded: { $sum: { $cond: [isPaid, 0, 1] } },
        amount: { $sum: { $cond: [isPaid, '$amount', 0] } },
      },
    },
    { $project: { _id: 0, game: '$_id.game', currency: '$_id.currency', paid: 1, refunded: 1, amount: 1 } },
    { $sort: { paid: -1, game: 1, currency: 1 } },
  ]).exec();
}
