import { describe, expect, it } from 'vitest';
import { devCheatsAllowed, devUnlockAllowed } from '../src/lib/devUnlock';

describe('dev unlock guard (DEV_UNLOCK and DEV_ALL_LEVELS)', () => {
  it('works only when the flag is on and the request is local', () => {
    expect(devUnlockAllowed('true', 'localhost')).toBe(true);
    expect(devUnlockAllowed('true', '127.0.0.1')).toBe(true);
    expect(devUnlockAllowed('true', '[::1]')).toBe(true);
  });

  it('stays off without the flag, whatever the host', () => {
    expect(devUnlockAllowed(undefined, 'localhost')).toBe(false);
    expect(devUnlockAllowed('1', 'localhost')).toBe(false);
    expect(devUnlockAllowed('false', 'localhost')).toBe(false);
  });

  it('refuses real hosts even if the flag leaks into production', () => {
    expect(devUnlockAllowed('true', '16bit.ink')).toBe(false);
    expect(devUnlockAllowed('true', 'localhost.16bit.ink')).toBe(false);
    expect(devUnlockAllowed('true', 'evil-localhost')).toBe(false);
  });
});

describe('local host check', () => {
  it('knows this machine from the real site', async () => {
    const { isLocalHost } = await import('../src/lib/devUnlock');
    expect(isLocalHost('localhost')).toBe(true);
    expect(isLocalHost('16bit.ink')).toBe(false);
  });
});

describe('game cheats (DEV_ALL_LEVELS, for admins)', () => {
  it('are for a signed-in admin with the flag on, on this machine', () => {
    expect(devCheatsAllowed('true', 'localhost', 'admin')).toBe(true);
  });

  it('stay off for anyone else, and everywhere else', () => {
    expect(devCheatsAllowed('true', 'localhost', 'user')).toBe(false);
    expect(devCheatsAllowed('true', 'localhost', null)).toBe(false);
    expect(devCheatsAllowed(undefined, 'localhost', 'admin')).toBe(false);
    expect(devCheatsAllowed('true', '16bit.ink', 'admin')).toBe(false);
  });
});
