import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { Purchase } from '../src/lib/db/purchaseModel';
import { findPurchase, findPurchasesFor, savePurchase, setPaymentStatus } from '../src/lib/db/purchaseRepo';
import type { PurchaseRecord } from '../src/lib/purchases';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;

const record: PurchaseRecord = {
  sessionId: 'cs_test_1', game: 'inkfish', email: 'fish@example.com', googleSub: 'g-1', paymentIntent: 'pi_1',
  amount: 499, currency: 'usd', livemode: false, status: 'paid', paidAt: new Date('2026-10-01T00:00:00Z'),
};

describe.skipIf(!uri)('purchase repository (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await Purchase.syncIndexes();
  });
  beforeEach(async () => {
    await Purchase.deleteMany({});
  });
  afterAll(async () => {
    await Purchase.deleteMany({});
    await disconnectDb();
  });

  it('saves and finds a purchase', async () => {
    await savePurchase(record);
    expect(await findPurchase('cs_test_1')).toEqual(record);
  });

  it('saving twice keeps one record', async () => {
    await savePurchase(record);
    await savePurchase(record);
    expect(await Purchase.countDocuments()).toBe(1);
  });

  it('a replayed checkout never undoes a refund', async () => {
    await savePurchase(record);
    expect(await setPaymentStatus('pi_1', 'refunded')).toBe(1);
    await savePurchase(record);
    expect((await findPurchase('cs_test_1'))?.status).toBe('refunded');
  });

  it('finds purchases by email (any case) or by Google account', async () => {
    await savePurchase(record);
    await savePurchase({ ...record, sessionId: 'cs_test_2', email: 'other@example.com', googleSub: 'g-2' });
    await savePurchase({ ...record, sessionId: 'cs_test_3', email: 'someone@example.com', googleSub: 'g-1' });
    const found = await findPurchasesFor('FISH@example.com', 'g-1');
    expect(found.map((p) => p.sessionId).sort()).toEqual(['cs_test_1', 'cs_test_3']);
  });

  it('returns null for an unknown session', async () => {
    expect(await findPurchase('cs_nope')).toBeNull();
  });
});
