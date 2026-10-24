import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { EmailSignIn } from '../src/lib/db/emailSignInModel';
import { createEmailSignIn, forgetEmailSignIn, peekLink, redeemCode, redeemLink } from '../src/lib/db/emailSignInRepo';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
const NOW = new Date('2026-10-24T12:00:00Z');
const later = (min: number): Date => new Date(NOW.getTime() + min * 60_000);
let n = 0;
const request = (email = 'fish@example.com') => ({ email, ret: '/play/inkmine?buy=inkmine', tokenHash: `tok-${++n}`, codeHash: `code-${n}` });

describe.skipIf(!uri)('email sign-in (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await EmailSignIn.syncIndexes();
  });
  beforeEach(async () => {
    await EmailSignIn.deleteMany({});
  });
  afterAll(async () => {
    await EmailSignIn.deleteMany({});
    await disconnectDb();
  });

  it('sends at most three emails to one address per 15 minutes', async () => {
    for (let i = 0; i < 3; i++) expect(await createEmailSignIn(request(), later(i))).toMatch(/^[0-9a-f]{24}$/);
    expect(await createEmailSignIn(request(), later(3))).toBeNull();
    expect(await createEmailSignIn(request('crab@example.com'), later(3))).not.toBeNull();
    expect(await createEmailSignIn(request(), later(16))).not.toBeNull();
  });

  it('a link works once, before it expires', async () => {
    const r = request();
    await createEmailSignIn(r, NOW);
    expect(await redeemLink(r.tokenHash, later(1))).toEqual({ email: 'fish@example.com', ret: '/play/inkmine?buy=inkmine' });
    expect(await redeemLink(r.tokenHash, later(2))).toBeNull();
    const old = request();
    await createEmailSignIn(old, NOW);
    expect(await redeemLink(old.tokenHash, later(16))).toBeNull();
    expect(await redeemLink('nope', NOW)).toBeNull();
  });

  it('the right code signs in once, and uses up the link too', async () => {
    const r = request();
    const id = (await createEmailSignIn(r, NOW))!;
    expect(await redeemCode(id, r.codeHash, later(1))).toEqual({ status: 'ok', email: 'fish@example.com', ret: r.ret });
    expect(await redeemCode(id, r.codeHash, later(1))).toEqual({ status: 'expired' });
    expect(await redeemLink(r.tokenHash, later(1))).toBeNull();
  });

  it('five wrong codes and it stops working, even for the right one', async () => {
    const r = request();
    const id = (await createEmailSignIn(r, NOW))!;
    for (const left of [4, 3, 2, 1]) expect(await redeemCode(id, 'wrong', later(1))).toEqual({ status: 'wrong', attemptsLeft: left });
    expect(await redeemCode(id, 'wrong', later(1))).toEqual({ status: 'expired' });
    expect(await redeemCode(id, r.codeHash, later(1))).toEqual({ status: 'expired' });
  });

  it('a code from another email, an expired one or a bad id does not sign in', async () => {
    const a = request();
    const b = request('crab@example.com');
    const idA = (await createEmailSignIn(a, NOW))!;
    await createEmailSignIn(b, NOW);
    expect((await redeemCode(idA, b.codeHash, later(1))).status).toBe('wrong');
    expect(await redeemCode(idA, a.codeHash, later(16))).toEqual({ status: 'expired' });
    expect(await redeemCode('not-an-id', a.codeHash, NOW)).toEqual({ status: 'expired' });
  });

  it('peeking at a link does not use it up', async () => {
    const r = request();
    await createEmailSignIn(r, NOW);
    expect(await peekLink(r.tokenHash, later(1))).toBe('fish@example.com');
    expect(await peekLink(r.tokenHash, later(1))).toBe('fish@example.com');
    expect(await redeemLink(r.tokenHash, later(1))).not.toBeNull();
    expect(await peekLink(r.tokenHash, later(1))).toBeNull();
  });

  it('an email that never went out does not count against the address', async () => {
    for (let i = 0; i < 2; i++) await createEmailSignIn(request(), NOW);
    const failed = (await createEmailSignIn(request(), NOW))!;
    await forgetEmailSignIn(failed);
    expect(await createEmailSignIn(request(), NOW)).not.toBeNull();
  });
});
