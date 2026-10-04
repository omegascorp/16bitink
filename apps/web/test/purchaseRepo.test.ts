import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { Purchase } from '../src/lib/db/purchaseModel';
import { claimPurchase, claimPurchasesByEmail, findPurchase, findPurchasesFor, findPurchasesForUsers, savePurchase, setPaymentStatus } from '../src/lib/db/purchaseRepo';
import type { PurchaseRecord } from '../src/lib/purchases';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
// Only this file's purchases: other DB test files run alongside it.
const OWN = { sessionId: /^cs_test_/ };
const A = '65f0c0ffee0000000000aa01';
const B = '65f0c0ffee0000000000aa03';

const record: PurchaseRecord = {
  sessionId: 'cs_test_1', game: 'inkfish', email: 'fish@example.com', userId: '65f0c0ffee0000000000aa01', customerId: 'cus_1', paymentIntent: 'pi_1',
  amount: 499, currency: 'usd', livemode: false, status: 'paid', paidAt: new Date('2026-10-01T00:00:00Z'),
};

describe.skipIf(!uri)('purchase repository (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await Purchase.syncIndexes();
  });
  beforeEach(async () => {
    await Purchase.deleteMany(OWN);
  });
  afterAll(async () => {
    await Purchase.deleteMany(OWN);
    await disconnectDb();
  });

  it('saves and finds a purchase', async () => {
    await savePurchase(record);
    expect(await findPurchase('cs_test_1')).toEqual(record);
  });

  it('saving twice keeps one record', async () => {
    await savePurchase(record);
    await savePurchase(record);
    expect(await Purchase.countDocuments(OWN)).toBe(1);
  });

  it('a replayed checkout never undoes a refund', async () => {
    await savePurchase(record);
    expect(await setPaymentStatus('pi_1', 'refunded')).toBe(1);
    await savePurchase(record);
    expect((await findPurchase('cs_test_1'))?.status).toBe('refunded');
  });

  it('finds purchases by user only', async () => {
    await savePurchase(record);
    await savePurchase({ ...record, sessionId: 'cs_test_2', userId: '65f0c0ffee0000000000aa02' });
    await savePurchase({ ...record, sessionId: 'cs_test_3', userId: null });
    expect((await findPurchasesFor(A)).map((p) => p.sessionId)).toEqual(['cs_test_1']);
    expect((await findPurchasesForUsers([A, '65f0c0ffee0000000000aa02'])).map((p) => p.sessionId).sort()).toEqual(['cs_test_1', 'cs_test_2']);
  });

  it('a user claims signed-out purchases made with their email (any case), never anyone else\'s', async () => {
    await savePurchase({ ...record, userId: null });
    await savePurchase({ ...record, sessionId: 'cs_test_2', userId: B });
    await savePurchase({ ...record, sessionId: 'cs_test_3', email: 'other@example.com', userId: null });
    expect(await claimPurchasesByEmail('FISH@example.com', A)).toBe(1);
    expect(await claimPurchasesByEmail('fish@example.com', A)).toBe(0);
    expect((await findPurchasesFor(A)).map((p) => p.sessionId)).toEqual(['cs_test_1']);
    expect((await findPurchase('cs_test_2'))?.userId).toBe(B);
  });

  it('a user claims an unowned purchase by its session, once', async () => {
    await savePurchase({ ...record, email: 'other@example.com', userId: null });
    expect(await claimPurchase('cs_test_1', A)).toBe(true);
    expect(await claimPurchase('cs_test_1', B)).toBe(false);
    expect((await findPurchase('cs_test_1'))?.userId).toBe(A);
  });

  it('returns null for an unknown session', async () => {
    expect(await findPurchase('cs_nope')).toBeNull();
  });
});
