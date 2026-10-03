import { describe, expect, it } from 'vitest';
import { devUnlockAllowed } from '../src/lib/devUnlock';

describe('dev unlock guard', () => {
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
