import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { VisitorLink } from '../src/lib/db/visitorLinkModel';
import { linkVisitor, unlinkUsers, visitorsOf } from '../src/lib/db/visitorLinkRepo';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;

// Only this file's links: other DB test files run alongside it.
const OWN = { visitor: /^vl-/ };
const ANA = '65f0c0ffee0000000000b001';
const BEN = '65f0c0ffee0000000000b002';
const day = (d: number): Date => new Date(Date.UTC(2026, 10, d));

describe.skipIf(!uri)('visitor links (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await VisitorLink.syncIndexes();
  });
  beforeEach(async () => {
    await VisitorLink.deleteMany(OWN);
  });
  afterAll(async () => {
    await VisitorLink.deleteMany(OWN);
    await disconnectDb();
  });

  it('links a browser to the signed-in account, keeping when it was first seen', async () => {
    await linkVisitor('vl-browser-1', ANA, day(1));
    await linkVisitor('vl-browser-1', ANA, day(3));
    const [link] = await VisitorLink.find(OWN).lean();
    expect(link).toMatchObject({ visitor: 'vl-browser-1', firstAt: day(1), lastAt: day(3) });
    expect(link?.userId.toHexString()).toBe(ANA);
  });

  it('moves a browser to the newest account that signs in on it', async () => {
    await linkVisitor('vl-shared', ANA, day(1));
    await linkVisitor('vl-shared', BEN, day(5));
    const links = await VisitorLink.find(OWN).lean();
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ firstAt: day(5), lastAt: day(5) });
    expect(links[0]?.userId.toHexString()).toBe(BEN);
  });

  it('survives two first batches from one browser at once', async () => {
    await Promise.all([linkVisitor('vl-race', ANA, day(2)), linkVisitor('vl-race', ANA, day(2))]);
    expect(await VisitorLink.countDocuments({ visitor: 'vl-race' })).toBe(1);
  });

  it("lists each account's browsers, and forgets them when asked", async () => {
    await Promise.all([linkVisitor('vl-a1', ANA, day(1)), linkVisitor('vl-a2', ANA, day(2)), linkVisitor('vl-b1', BEN, day(2))]);
    const byUser = await visitorsOf([ANA, BEN, '65f0c0ffee0000000000b0ff']);
    expect([...(byUser.get(ANA) ?? [])].sort()).toEqual(['vl-a1', 'vl-a2']);
    expect(byUser.get(BEN)).toEqual(['vl-b1']);
    expect(byUser.size).toBe(2);
    expect(await visitorsOf([])).toEqual(new Map());

    expect(await unlinkUsers([ANA])).toBe(2);
    expect((await visitorsOf([ANA, BEN])).get(ANA)).toBeUndefined();
    expect(await unlinkUsers([])).toBe(0);
  });

  it('expires links as long after the last signed-in batch as events are kept', async () => {
    const indexes = await VisitorLink.collection.indexes();
    expect(indexes.find((i) => i.key.lastAt === 1)?.expireAfterSeconds).toBe(730 * 24 * 60 * 60);
    expect(indexes.find((i) => i.key.visitor === 1)?.unique).toBe(true);
  });
});
