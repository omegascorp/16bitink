import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { Subscriber } from '../src/lib/db/subscriberModel';
import { countSubscribers, listSubscribers, subscribe, unsubscribe } from '../src/lib/db/subscriberRepo';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
const NOW = new Date('2026-10-20T12:00:00Z');

describe.skipIf(!uri)('Sunday email list (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await Subscriber.syncIndexes();
  });
  beforeEach(async () => {
    await Subscriber.deleteMany({});
  });
  afterAll(async () => {
    await Subscriber.deleteMany({});
    await disconnectDb();
  });

  it('adds an address once, keeping where it first signed up', async () => {
    expect(await subscribe('a@example.com', '/games/inkfish', NOW)).toBe('added');
    expect(await subscribe('a@example.com', '/', NOW)).toBe('already');
    expect(await countSubscribers()).toBe(1);
    const [only] = await listSubscribers();
    expect(only).toMatchObject({ email: 'a@example.com', source: '/games/inkfish' });
    expect(only!.token).toMatch(/^[0-9A-Z]{20}$/);
  });

  it('removes an address by its unsubscribe token only', async () => {
    await subscribe('a@example.com', '/', NOW);
    await subscribe('b@example.com', '/', NOW);
    const [first] = await listSubscribers();
    expect(await unsubscribe('NOT-A-TOKEN')).toBe(false);
    expect(await unsubscribe(first!.token)).toBe(true);
    expect(await unsubscribe(first!.token)).toBe(false);
    expect(await countSubscribers()).toBe(1);
  });

  it('gives each address its own token', async () => {
    await subscribe('a@example.com', '/', NOW);
    await subscribe('b@example.com', '/', NOW);
    const tokens = (await listSubscribers()).map((s) => s.token);
    expect(new Set(tokens).size).toBe(2);
  });
});
