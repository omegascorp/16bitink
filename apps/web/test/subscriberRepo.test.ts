import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { Subscriber } from '../src/lib/db/subscriberModel';
import { countNewSubscribers, countSubscribers, isSubscribed, listSubscribers, subscribe, unsubscribe, unsubscribeEmail } from '../src/lib/db/subscriberRepo';

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

  it('takes an address off by the address itself (a signed-in player)', async () => {
    await subscribe('a@example.com', '/', NOW);
    expect(await unsubscribeEmail('a@example.com')).toBe(true);
    expect(await isSubscribed('a@example.com')).toBe(false);
    expect(await unsubscribeEmail('a@example.com')).toBe(false);
  });

  it('knows whether an address is on the list', async () => {
    expect(await isSubscribed('a@example.com')).toBe(false);
    await subscribe('a@example.com', '/', NOW);
    expect(await isSubscribed('a@example.com')).toBe(true);
  });

  it('adds an address once, keeping where it first signed up', async () => {
    expect(await subscribe('a@example.com', '/games/inkfish', NOW)).toBe('added');
    expect(await subscribe('a@example.com', '/', NOW)).toBe('already');
    expect(await countSubscribers()).toBe(1);
    const [only] = await listSubscribers();
    expect(only).toMatchObject({ email: 'a@example.com', source: '/games/inkfish' });
    expect(only!.token).toMatch(/^[0-9A-Z]{20}$/);
  });

  it('counts the addresses added in a period', async () => {
    await subscribe('a@example.com', '/', new Date('2026-10-02T00:00:00Z'));
    await subscribe('b@example.com', '/', NOW);
    expect(await countNewSubscribers({ from: new Date('2026-10-10T00:00:00Z'), to: new Date('2026-10-21T00:00:00Z') })).toBe(1);
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
