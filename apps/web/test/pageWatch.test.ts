import { describe, expect, it } from 'vitest';
import { networkType } from '../src/lib/client/analytics';
import { createErrorGate, errorReport, MAX_ERRORS_PER_PAGE, scrollPercent } from '../src/lib/client/pageWatch';

describe('scrollPercent', () => {
  it('is how far down the page the bottom of the screen got', () => {
    expect(scrollPercent(0, 800, 3200)).toBe(25);
    expect(scrollPercent(1200, 800, 3200)).toBe(63);
    expect(scrollPercent(2400, 800, 3200)).toBe(100);
  });

  it('is 100 for a page that fits on the screen, and never over 100', () => {
    expect(scrollPercent(0, 800, 600)).toBe(100);
    expect(scrollPercent(5000, 800, 3200)).toBe(100);
    expect(scrollPercent(0, 800, 0)).toBe(100);
  });
});

describe('errorReport', () => {
  const origin = 'https://16bit.ink';

  it('keeps the message and where it happened, without our own origin or query strings', () => {
    expect(errorReport('TypeError: x is undefined', `${origin}/_astro/a.js?v=2`, 1, 20, origin)).toEqual({ error: 'TypeError: x is undefined', source: '/_astro/a.js:1:20' });
  });

  it('keeps another origin as its host only', () => {
    expect(errorReport('Script error.', 'https://cdn.example/x/y.js', 0, 0, origin)).toEqual({ error: 'Script error.', source: 'cdn.example' });
  });

  it('drops query strings from URLs in the message', () => {
    expect(errorReport("Failed to fetch https://16bit.ink/api/x?token=abc 'y'", '', 0, 0, origin).error).toBe("Failed to fetch https://16bit.ink/api/x 'y'");
  });

  it('trims what the server would refuse, and names an error with no message', () => {
    expect(errorReport('x'.repeat(500), '', 0, 0, origin)?.error).toHaveLength(200);
    expect(errorReport('', undefined, 0, 0, origin)).toEqual({ error: 'Unknown error' });
  });
});

describe('createErrorGate', () => {
  it('lets each message through once, and only a few per page', () => {
    const pass = createErrorGate();
    expect(pass('a')).toBe(true);
    expect(pass('a')).toBe(false);
    const more = Array.from({ length: MAX_ERRORS_PER_PAGE + 2 }, (_, i) => pass(`m${i}`));
    expect(more.filter(Boolean)).toHaveLength(MAX_ERRORS_PER_PAGE - 1);
  });
});

describe('networkType', () => {
  it('reports only the connection types the server knows', () => {
    expect(networkType({ effectiveType: '3g' })).toBe('3g');
    expect(networkType({ effectiveType: 'wifi' })).toBeUndefined();
    expect(networkType(undefined)).toBeUndefined();
  });
});
