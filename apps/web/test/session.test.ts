import { describe, expect, it } from 'vitest';
import { signEntitlement } from '../src/lib/entitlement';
import { signFlow, signSession, verifyFlow, verifySession, type UserSession } from '../src/lib/session';

const SECRET = 'x'.repeat(40);
const NOW = 1_800_000_000;
const session: UserSession = { v: 1, sub: '123', email: 'fish@example.com', name: 'Ink Fish', games: ['inkfish'], iat: NOW, exp: NOW + 60 };

describe('user session tokens', () => {
  it('round-trip while fresh', async () => {
    expect(await verifySession(await signSession(session, SECRET), SECRET, NOW)).toEqual(session);
  });

  it('expire', async () => {
    expect(await verifySession(await signSession(session, SECRET), SECRET, NOW + 61)).toBeNull();
  });

  it('reject a wrong secret and garbage', async () => {
    const token = await signSession(session, SECRET);
    expect(await verifySession(token, 'y'.repeat(40), NOW)).toBeNull();
    for (const t of [undefined, '', 'a.b', 'a.b.c']) expect(await verifySession(t, SECRET, NOW)).toBeNull();
  });

  it('cannot be swapped with other signed tokens', async () => {
    const own = await signEntitlement({ v: 1, g: 'inkfish', s: 'cs_1', iat: NOW }, SECRET);
    expect(await verifySession(own, SECRET, NOW)).toBeNull();
    const flow = await signFlow({ v: 1, state: 's', nonce: 'n', verifier: 'v', ret: '/', exp: NOW + 60 }, SECRET);
    expect(await verifySession(flow, SECRET, NOW)).toBeNull();
  });
});

describe('sign-in flow tokens', () => {
  const flow = { v: 1, state: 's', nonce: 'n', verifier: 'v', ret: '/games/inkfish', exp: NOW + 600 } as const;

  it('round-trip while fresh', async () => {
    expect(await verifyFlow(await signFlow(flow, SECRET), SECRET, NOW)).toEqual(flow);
  });

  it('expire', async () => {
    expect(await verifyFlow(await signFlow(flow, SECRET), SECRET, NOW + 601)).toBeNull();
  });

  it('are not sessions', async () => {
    expect(await verifyFlow(await signSession(session, SECRET), SECRET, NOW)).toBeNull();
  });
});
