import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { OAuthClient, OAuthToken } from '../src/lib/db/oauthModel';
import {
  claimRefresh, consumeCode, findAccessToken, findClient, issueCode, issueTokens, keepClient, registerClient, revokeUserTokens,
} from '../src/lib/db/oauthRepo';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
const ADMIN = '65f0c0ffee0000000000dd01';
const OTHER = '65f0c0ffee0000000000dd02';
const CLAUDE = 'https://claude.ai/api/mcp/auth_callback';
const NOW = new Date('2026-10-20T12:00:00Z');
const later = (ms: number): Date => new Date(NOW.getTime() + ms);

describe.skipIf(!uri)('OAuth storage (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await Promise.all([OAuthClient.syncIndexes(), OAuthToken.syncIndexes()]);
  });
  beforeEach(async () => {
    await Promise.all([OAuthClient.deleteMany({}), OAuthToken.deleteMany({})]);
  });
  afterAll(async () => {
    await Promise.all([OAuthClient.deleteMany({}), OAuthToken.deleteMany({})]);
    await disconnectDb();
  });

  it('registers a client and finds it again', async () => {
    const client = await registerClient({ redirectUris: [CLAUDE], clientName: 'Claude' }, NOW);
    expect(await findClient(client.clientId, NOW)).toEqual(client);
    expect(await findClient('c_nope', NOW)).toBeNull();
  });

  it('forgets a client nobody approved after a day, and keeps one in use for 30 days', async () => {
    const unused = await registerClient({ redirectUris: [CLAUDE], clientName: 'Unused' }, NOW);
    const used = await registerClient({ redirectUris: [CLAUDE], clientName: 'Used' }, NOW);
    await keepClient(used.clientId, NOW);
    const tomorrow = later(25 * 60 * 60_000);
    expect(await findClient(unused.clientId, tomorrow)).toBeNull();
    expect(await findClient(used.clientId, tomorrow)).not.toBeNull();
  });

  it('a code works once, for its own client, before it expires', async () => {
    const o = { clientId: 'c_a', userId: ADMIN, redirectUri: CLAUDE, codeChallenge: 'x'.repeat(43) };
    const code = await issueCode(o, NOW);
    expect(await consumeCode(code, 'c_other', NOW)).toBeNull();
    expect(await consumeCode(code, 'c_a', later(11 * 60_000))).toBeNull();
    expect(await consumeCode(code, 'c_a', NOW)).toEqual({ userId: ADMIN, redirectUri: CLAUDE, codeChallenge: o.codeChallenge });
    expect(await consumeCode(code, 'c_a', NOW)).toBeNull();
  });

  it('stores only hashes, never the tokens', async () => {
    const { accessToken, refreshToken } = await issueTokens('c_a', ADMIN, NOW);
    const ids = (await OAuthToken.find({}).lean()).map((d) => d._id);
    expect(ids).not.toContain(accessToken);
    expect(ids).not.toContain(refreshToken);
  });

  it('an access token names its admin for an hour', async () => {
    const { accessToken, expiresIn } = await issueTokens('c_a', ADMIN, NOW);
    expect(expiresIn).toBe(3600);
    expect(await findAccessToken(accessToken, NOW)).toMatchObject({ userId: ADMIN, clientId: 'c_a' });
    expect(await findAccessToken(accessToken, later(3601_000))).toBeNull();
  });

  it('a refresh token works once, and only for its client', async () => {
    const { refreshToken } = await issueTokens('c_a', ADMIN, NOW);
    expect(await claimRefresh(refreshToken, 'c_other', NOW)).toBeNull();
    const claimed = await claimRefresh(refreshToken, 'c_a', NOW);
    expect(claimed).toMatchObject({ userId: ADMIN });
    const next = await issueTokens('c_a', claimed!.userId, NOW, claimed!.family);
    expect(await findAccessToken(next.accessToken, NOW)).toMatchObject({ userId: ADMIN });
  });

  it('a refresh token used twice revokes every token from that sign-in, and only that one', async () => {
    const first = await issueTokens('c_a', ADMIN, NOW);
    const elsewhere = await issueTokens('c_b', ADMIN, NOW);
    const claimed = await claimRefresh(first.refreshToken, 'c_a', NOW);
    const next = await issueTokens('c_a', ADMIN, NOW, claimed!.family);
    // Someone replays the old one (a stolen copy, or the thief after the real client).
    expect(await claimRefresh(first.refreshToken, 'c_a', NOW)).toBeNull();
    expect(await findAccessToken(next.accessToken, NOW)).toBeNull();
    expect(await claimRefresh(next.refreshToken, 'c_a', NOW)).toBeNull();
    expect(await findAccessToken(elsewhere.accessToken, NOW)).not.toBeNull();
  });

  it('revoking a user signs them out of every app, leaving others alone', async () => {
    const mine = await issueTokens('c_a', ADMIN, NOW);
    const theirs = await issueTokens('c_a', OTHER, NOW);
    expect(await revokeUserTokens([ADMIN])).toBe(2);
    expect(await findAccessToken(mine.accessToken, NOW)).toBeNull();
    expect(await findAccessToken(theirs.accessToken, NOW)).not.toBeNull();
    expect(await revokeUserTokens([])).toBe(0);
  });
});
