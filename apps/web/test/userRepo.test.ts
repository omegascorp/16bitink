import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { Purchase } from '../src/lib/db/purchaseModel';
import { User } from '../src/lib/db/userModel';
import { findRole, listUsers, signInGoogleUser, syncAdminRoles } from '../src/lib/db/userRepo';
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

  it('survives two first sign-ins at once', async () => {
    const [a, b] = await Promise.all([signInGoogleUser(google, 'user', new Date()), signInGoogleUser(google, 'user', new Date())]);
    expect(a).toBe(b);
    expect(await User.countDocuments()).toBe(1);
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

  it('lists users newest first, searchable by email or name, a page at a time', async () => {
    for (const n of [1, 2, 3]) await make(n);
    const all = await listUsers({ search: '', page: 0, perPage: 2 });
    expect(all.total).toBe(3);
    expect(all.users.map((u) => u.email)).toEqual(['role-3@example.com', 'role-2@example.com']);
    expect((await listUsers({ search: 'ROLE 1', page: 0, perPage: 10 })).users.map((u) => u.email)).toEqual(['role-1@example.com']);
    // Regex characters in the search are taken literally.
    expect((await listUsers({ search: '.*', page: 0, perPage: 10 })).total).toBe(0);
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
