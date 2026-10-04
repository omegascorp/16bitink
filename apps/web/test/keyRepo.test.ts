import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { Grant } from '../src/lib/db/grantModel';
import { grantedGames, revokeGame } from '../src/lib/db/grantRepo';
import { Key } from '../src/lib/db/keyModel';
import { createKeys, deleteUnusedKey, listKeys, redeemKey } from '../src/lib/db/keyRepo';
import { User } from '../src/lib/db/userModel';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
// Only this file's users and grants: other DB test files run alongside it.
const ADMIN = '65f0c0ffee0000000000bb01';
const A = '65f0c0ffee0000000000bb02';
const B = '65f0c0ffee0000000000bb03';
const OWN_USERS = { _id: { $in: [ADMIN, A, B] } };
const OWN_GRANTS = { userId: { $in: [A, B] } };
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

  it('creates unused keys for a game', async () => {
    const codes = await createKeys({ game: 'inkfish', count: 3, note: 'Some Channel', createdBy: ADMIN });
    expect(new Set(codes).size).toBe(3);
    const { keys, total } = await listKeys({ page: 0, perPage: 10 });
    expect(total).toBe(3);
    expect(keys.every((k) => k.game === 'inkfish' && k.note === 'Some Channel' && k.redeemed === null)).toBe(true);
  });

  it('redeeming unlocks the game and shows who redeemed it', async () => {
    const [code] = await createKeys({ game: 'inkfish', count: 1, note: '', createdBy: ADMIN });
    expect(await redeemKey(code!, A, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await grantedGames(A)).toEqual(['inkfish']);
    const { keys } = await listKeys({ page: 0, perPage: 10 });
    expect(keys[0]?.redeemed).toEqual({ email: 'creator@example.com', at: NOW });
  });

  it('a key works once: the same user may retry, nobody else can use it', async () => {
    const [code] = await createKeys({ game: 'inkfish', count: 1, note: '', createdBy: ADMIN });
    await redeemKey(code!, A, NOW);
    expect(await redeemKey(code!, A, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await redeemKey(code!, B, NOW)).toEqual({ ok: false, reason: 'used' });
    expect(await grantedGames(B)).toEqual([]);
  });

  it('redeeming again does not undo an admin revoke', async () => {
    const [code] = await createKeys({ game: 'inkfish', count: 1, note: '', createdBy: ADMIN });
    await redeemKey(code!, A, NOW);
    await revokeGame(A, 'inkfish');
    expect(await redeemKey(code!, A, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await grantedGames(A)).toEqual([]);
  });

  it('a retry finishes a redeem whose grant failed', async () => {
    const [code] = await createKeys({ game: 'inkfish', count: 1, note: '', createdBy: ADMIN });
    await Key.updateOne({ code }, { $set: { redeemedBy: A, redeemedAt: NOW } });
    expect(await redeemKey(code!, A, NOW)).toEqual({ ok: true, game: 'inkfish' });
    expect(await grantedGames(A)).toEqual(['inkfish']);
  });

  it('two users racing for one key: exactly one wins', async () => {
    const [code] = await createKeys({ game: 'inkfish', count: 1, note: '', createdBy: ADMIN });
    const results = await Promise.all([redeemKey(code!, A, NOW), redeemKey(code!, B, NOW)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it('an unknown key unlocks nothing', async () => {
    expect(await redeemKey('0000000000000000', A, NOW)).toEqual({ ok: false, reason: 'unknown' });
  });

  it('deletes only unused keys', async () => {
    const [used, unused] = await createKeys({ game: 'inkfish', count: 2, note: '', createdBy: ADMIN });
    await redeemKey(used!, A, NOW);
    expect(await deleteUnusedKey(used!)).toBe(false);
    expect(await deleteUnusedKey(unused!)).toBe(true);
    expect(await redeemKey(unused!, B, NOW)).toEqual({ ok: false, reason: 'unknown' });
  });
});
