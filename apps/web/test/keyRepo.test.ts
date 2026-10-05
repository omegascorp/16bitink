import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { Grant } from '../src/lib/db/grantModel';
import { grantedGames, revokeGame } from '../src/lib/db/grantRepo';
import { Key } from '../src/lib/db/keyModel';
import { createKey, deleteUnusedKey, listKeys, redeemKey } from '../src/lib/db/keyRepo';
import { User } from '../src/lib/db/userModel';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
// Only this file's users and grants: other DB test files run alongside it.
const ADMIN = '65f0c0ffee0000000000bb01';
const A = '65f0c0ffee0000000000bb02';
const B = '65f0c0ffee0000000000bb03';
const C = '65f0c0ffee0000000000bb04';
const OWN_USERS = { _id: { $in: [ADMIN, A, B, C] } };
const OWN_GRANTS = { userId: { $in: [A, B, C] } };
const NOW = new Date('2026-10-04T12:00:00Z');

describe.skipIf(!uri)('activation keys (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await Promise.all([Key.syncIndexes(), Grant.syncIndexes(), User.syncIndexes()]);
  });
  beforeEach(async () => {
    await Promise.all([Key.deleteMany({}), Grant.deleteMany(OWN_GRANTS), User.deleteMany(OWN_USERS)]);
    await User.create({ _id: A, email: 'creator@example.com', name: 'Creator', lastSignInAt: NOW, role: 'user' });
  });
  afterAll(async () => {
    await Promise.all([Key.deleteMany({}), Grant.deleteMany(OWN_GRANTS), User.deleteMany(OWN_USERS)]);
    await disconnectDb();
  });

  it('creates one unused key for a game, for N accounts', async () => {
    const code = await createKey({ game: 'inkfish', uses: 3, note: 'Some Channel', createdBy: ADMIN });
    const { keys, total } = await listKeys({ page: 0, perPage: 10 });
    expect(total).toBe(1);
    expect(keys[0]).toMatchObject({ code, game: 'inkfish', note: 'Some Channel', uses: 3, redemptions: [] });
  });

  it('redeeming unlocks the game and shows who redeemed it', async () => {
    const code = await createKey({ game: 'inkfish', uses: 1, note: '', createdBy: ADMIN });
    expect(await redeemKey(code, A, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await grantedGames(A)).toEqual(['inkfish']);
    const { keys } = await listKeys({ page: 0, perPage: 10 });
    expect(keys[0]?.redemptions).toEqual([{ email: 'creator@example.com', at: NOW }]);
  });

  it('a single-use key works once: the same user may retry, nobody else can use it', async () => {
    const code = await createKey({ game: 'inkfish', uses: 1, note: '', createdBy: ADMIN });
    await redeemKey(code, A, NOW);
    expect(await redeemKey(code, A, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await redeemKey(code, B, NOW)).toEqual({ ok: false, reason: 'used' });
    expect(await grantedGames(B)).toEqual([]);
  });

  it('redeeming again does not undo an admin revoke', async () => {
    const code = await createKey({ game: 'inkfish', uses: 1, note: '', createdBy: ADMIN });
    await redeemKey(code, A, NOW);
    await revokeGame(A, 'inkfish');
    expect(await redeemKey(code, A, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await grantedGames(A)).toEqual([]);
  });

  it('a retry finishes a redeem whose grant failed', async () => {
    const code = await createKey({ game: 'inkfish', uses: 1, note: '', createdBy: ADMIN });
    await Key.updateOne({ code }, { $set: { redemptions: [{ userId: A, at: NOW }] } });
    expect(await redeemKey(code, A, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await grantedGames(A)).toEqual(['inkfish']);
  });

  it('two users racing for one key: exactly one wins', async () => {
    const code = await createKey({ game: 'inkfish', uses: 1, note: '', createdBy: ADMIN });
    const results = await Promise.all([redeemKey(code, A, NOW), redeemKey(code, B, NOW)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it('a key for N accounts unlocks the game for N different accounts, then is used up', async () => {
    const code = await createKey({ game: 'inkfish', uses: 2, note: '', createdBy: ADMIN });
    expect(await redeemKey(code, A, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await redeemKey(code, A, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await redeemKey(code, B, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await redeemKey(code, C, NOW)).toEqual({ ok: false, reason: 'used' });
    expect(await grantedGames(B)).toEqual(['inkfish']);
    expect(await grantedGames(C)).toEqual([]);
    const { keys } = await listKeys({ page: 0, perPage: 10 });
    expect(keys[0]?.redemptions).toHaveLength(2);
  });

  it('many users racing for a key for N accounts: exactly N win', async () => {
    const code = await createKey({ game: 'inkfish', uses: 2, note: '', createdBy: ADMIN });
    const results = await Promise.all([A, B, C].map((u) => redeemKey(code, u, NOW)));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
  });

  it('one user retrying in parallel uses the key only once', async () => {
    const code = await createKey({ game: 'inkfish', uses: 2, note: '', createdBy: ADMIN });
    await Promise.all([redeemKey(code, A, NOW), redeemKey(code, A, NOW)]);
    expect(await redeemKey(code, B, NOW)).toEqual({ ok: true, game: 'inkfish' });
  });

  it('keys made before multi-use keys keep working as single-use', async () => {
    const legacy = { game: 'inkfish', note: '', createdBy: new Types.ObjectId(ADMIN), createdAt: NOW };
    await Key.collection.insertMany([
      { ...legacy, code: 'AAAAAAAAAAAAAAAA' },
      { ...legacy, code: 'BBBBBBBBBBBBBBBB', redeemedBy: new Types.ObjectId(A), redeemedAt: NOW, granted: true },
    ]);
    expect(await redeemKey('AAAAAAAAAAAAAAAA', B, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await redeemKey('AAAAAAAAAAAAAAAA', C, NOW)).toEqual({ ok: false, reason: 'used' });
    expect(await redeemKey('BBBBBBBBBBBBBBBB', A, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await redeemKey('BBBBBBBBBBBBBBBB', C, NOW)).toEqual({ ok: false, reason: 'used' });
    expect(await grantedGames(A)).toEqual([]);
    const { keys } = await listKeys({ page: 0, perPage: 10 });
    expect(keys.find((k) => k.code === 'BBBBBBBBBBBBBBBB')).toMatchObject({ uses: 1, redemptions: [{ email: 'creator@example.com', at: NOW }] });
    expect(await deleteUnusedKey('BBBBBBBBBBBBBBBB')).toBe(false);
  });

  it('an unknown key unlocks nothing', async () => {
    expect(await redeemKey('0000000000000000', A, NOW)).toEqual({ ok: false, reason: 'unknown' });
  });

  it('deletes only unused keys', async () => {
    const used = await createKey({ game: 'inkfish', uses: 5, note: '', createdBy: ADMIN });
    const unused = await createKey({ game: 'inkfish', uses: 5, note: '', createdBy: ADMIN });
    await redeemKey(used, A, NOW);
    expect(await deleteUnusedKey(used)).toBe(false);
    expect(await deleteUnusedKey(unused)).toBe(true);
    expect(await redeemKey(unused, B, NOW)).toEqual({ ok: false, reason: 'unknown' });
  });
});
