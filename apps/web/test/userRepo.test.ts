import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { Purchase } from '../src/lib/db/purchaseModel';
import { User } from '../src/lib/db/userModel';
import { OAuthToken } from '../src/lib/db/oauthModel';
import { findAccessToken, issueTokens } from '../src/lib/db/oauthRepo';
import { countNewUsers, ensurePlayerId, findRole, listUsers, signInEmailUser, signInGoogleUser, syncAdminRoles } from '../src/lib/db/userRepo';
import { Grant } from '../src/lib/db/grantModel';
import { grantedGames, grantedGamesFor, grantGame, revokeGame } from '../src/lib/db/grantRepo';
import { isUserId } from '../src/lib/userId';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;

// Only this file's purchases: other DB test files run alongside it.
const OWN = { sessionId: /^cs_user_/ };
const google = { googleId: '109876543210', email: 'user-test@example.com', name: 'Ink' };

beforeAll(async () => {
  if (!uri) return;
  await connectDb(uri);
  await Promise.all([User.syncIndexes(), Purchase.syncIndexes(), Grant.syncIndexes()]);
});
afterAll(async () => {
  if (!uri) return;
  await Promise.all([User.deleteMany({}), Purchase.deleteMany(OWN), Grant.deleteMany({})]);
  await disconnectDb();
});

describe.skipIf(!uri)('users (MongoDB)', () => {
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Purchase.deleteMany(OWN)]);
  });

  it('creates a user on first sign-in and finds the same one after', async () => {
    const first = await signInGoogleUser(google, 'user', new Date('2026-10-01T00:00:00Z'));
    expect(isUserId(first)).toBe(true);
    const again = await signInGoogleUser({ ...google, email: 'new@example.com', name: 'Fish' }, 'user', new Date('2026-10-02T00:00:00Z'));
    expect(again).toBe(first);
    const user = await User.findById(first).lean().exec();
    expect(user).toMatchObject({ googleId: google.googleId, email: 'new@example.com', name: 'Fish', lastSignInAt: new Date('2026-10-02T00:00:00Z') });
  });

  it('counts the accounts made in a period, not admins', async () => {
    const before = new Date(Date.now() - 60_000);
    await signInGoogleUser(google, 'user', new Date());
    await signInGoogleUser({ ...google, googleId: '2', email: 'admin-test@example.com' }, 'admin', new Date());
    const after = new Date(Date.now() + 60_000);
    expect(await countNewUsers({ from: before, to: after })).toBe(1);
    expect(await countNewUsers({ from: after, to: new Date(after.getTime() + 60_000) })).toBe(0);
  });

  it('allows many users without a Google account, but one user per Google account', async () => {
    const other = { email: 'x@example.com', name: 'X', role: 'user', lastSignInAt: new Date() } as const;
    await User.create([other, { ...other, email: 'y@example.com' }]);
    await User.create({ ...other, googleId: google.googleId });
    await expect(User.create({ ...other, googleId: google.googleId })).rejects.toMatchObject({ code: 11000 });
  });

  it('survives two first sign-ins at once', async () => {
    const [a, b] = await Promise.all([signInGoogleUser(google, 'user', new Date()), signInGoogleUser(google, 'user', new Date())]);
    expect(a).toBe(b);
    expect(await User.countDocuments()).toBe(1);
  });
});

describe.skipIf(!uri)('signing in by email (MongoDB)', () => {
  const at = new Date('2026-10-24T00:00:00Z');

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('creates a user for a new address, named from it, and finds it again', async () => {
    const id = await signInEmailUser('ink.fish@example.com', 'user', at);
    expect(isUserId(id)).toBe(true);
    expect(await signInEmailUser('ink.fish@example.com', 'user', new Date(at.getTime() + 1000))).toBe(id);
    const user = await User.findById(id).lean().exec();
    expect(user).toMatchObject({ email: 'ink.fish@example.com', name: 'Ink', role: 'user', lastSignInAt: new Date(at.getTime() + 1000) });
    expect(user?.googleId).toBeUndefined();
  });

  it('signs in to the Google account with that address', async () => {
    const googleUser = await signInGoogleUser(google, 'user', at);
    expect(await signInEmailUser(google.email, 'user', at)).toBe(googleUser);
    expect(await User.countDocuments()).toBe(1);
    expect((await User.findById(googleUser).lean().exec())?.name).toBe('Ink');
  });

  it('a later Google sign-in with the same address joins the email account', async () => {
    const emailUser = await signInEmailUser(google.email, 'user', at);
    expect(await signInGoogleUser(google, 'user', new Date(at.getTime() + 1000))).toBe(emailUser);
    expect(await User.countDocuments()).toBe(1);
    expect(await User.findById(emailUser).lean().exec()).toMatchObject({ googleId: google.googleId, name: 'Ink' });
  });

  it('does not hand an email account that another Google account already claimed to a second one', async () => {
    const emailUser = await signInEmailUser(google.email, 'user', at);
    await signInGoogleUser(google, 'user', at);
    const other = await signInGoogleUser({ ...google, googleId: 'someone-else' }, 'user', at);
    expect(other).not.toBe(emailUser);
  });

  it('records the role it is given', async () => {
    const id = await signInEmailUser('admin-test@example.com', 'admin', at);
    expect(await findRole(id)).toBe('admin');
    await signInEmailUser('admin-test@example.com', 'user', at);
    expect(await findRole(id)).toBe('user');
  });
});

describe.skipIf(!uri)('roles and grants (MongoDB)', () => {
  const at = new Date('2026-10-01T00:00:00Z');
  const make = (n: number, role: 'user' | 'admin' = 'user'): Promise<string> =>
    signInGoogleUser({ googleId: `role-${n}`, email: `role-${n}@example.com`, name: `Role ${n}` }, role, new Date(at.getTime() + n * 1000));

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Grant.deleteMany({})]);
  });

  it('sign-in records the role it is given', async () => {
    const id = await make(1, 'admin');
    expect(await findRole(id)).toBe('admin');
    await signInGoogleUser({ googleId: 'role-1', email: 'role-1@example.com', name: 'Role 1' }, 'user', at);
    expect(await findRole(id)).toBe('user');
  });

  it('makes exactly the listed emails admins', async () => {
    const [a, b, c] = [await make(1, 'admin'), await make(2), await make(3)];
    expect(await syncAdminRoles(new Set(['role-2@example.com', 'nobody@example.com']))).toBe(2);
    expect([await findRole(a), await findRole(b), await findRole(c)]).toEqual(['user', 'admin', 'user']);
    expect(await syncAdminRoles(new Set(['role-2@example.com']))).toBe(0);
  });

  it('signs an admin who is removed out of connected apps', async () => {
    const [a, b] = [await make(1, 'admin'), await make(2, 'admin')];
    const [ta, tb] = [await issueTokens('c_role', a, at), await issueTokens('c_role', b, at)];
    await syncAdminRoles(new Set(['role-2@example.com']));
    expect(await findAccessToken(ta.accessToken, at)).toBeNull();
    expect(await findAccessToken(tb.accessToken, at)).not.toBeNull();
    await OAuthToken.deleteMany({ clientId: 'c_role' });
  });

  it('lists users newest first, searchable by email or name, a page at a time', async () => {
    for (const n of [1, 2, 3]) await make(n);
    const all = await listUsers({ search: '', page: 0, perPage: 2 });
    expect(all.total).toBe(3);
    expect(all.users.map((u) => u.email)).toEqual(['role-3@example.com', 'role-2@example.com']);
    expect((await listUsers({ search: 'ROLE 1', page: 0, perPage: 10 })).users.map((u) => u.email)).toEqual(['role-1@example.com']);
    // Regex characters in the search are taken literally.
    expect((await listUsers({ search: '.*', page: 0, perPage: 10 })).total).toBe(0);
  });

  it('gives each user one player id, kept from then on, and finds them by it', async () => {
    const [a, b] = [await make(1), await make(2)];
    const id = await ensurePlayerId(a);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(await ensurePlayerId(a)).toBe(id);
    const [x, y] = await Promise.all([ensurePlayerId(b), ensurePlayerId(b)]);
    expect(x).toBe(y);
    const typed = `${id.slice(0, 4).toLowerCase()}-${id.slice(4)}`;
    const found = await listUsers({ search: typed, page: 0, perPage: 10 });
    expect(found.users.map((u) => [u.email, u.playerId])).toEqual([['role-1@example.com', id]]);
  });

  it('draws another player id when one is taken', async () => {
    const [a, b] = [await make(1), await make(2)];
    await ensurePlayerId(a, () => 'AAAAAAAA');
    const draws = ['AAAAAAAA', 'BBBBBBBB'];
    expect(await ensurePlayerId(b, () => draws.shift()!)).toBe('BBBBBBBB');
  });

  it('grants and revokes games, once each', async () => {
    const [user, admin] = [await make(1), await make(2, 'admin')];
    await grantGame(user, 'inkfish', admin);
    await grantGame(user, 'inkfish', admin);
    expect(await grantedGames(user)).toEqual(['inkfish']);
    expect((await grantedGamesFor([user, admin])).get(user)).toEqual(['inkfish']);
    expect(await revokeGame(user, 'inkfish')).toBe(true);
    expect(await revokeGame(user, 'inkfish')).toBe(false);
    expect(await grantedGames(user)).toEqual([]);
  });
});
