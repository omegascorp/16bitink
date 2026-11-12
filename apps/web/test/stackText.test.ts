import { describe, expect, it } from 'vitest';
import { cleanStack, firstFrames, MAX_STACK } from '../src/lib/stackText';

describe('cleanStack', () => {
  it('drops the message line, query strings and fragments', () => {
    const stack = 'Error: boom\n    at f (https://16bit.ink/_astro/a.js?v=2&t=secret:1:2)\n    at g (https://16bit.ink/x.js#frag:3:4)';
    const out = cleanStack(stack, 'Error: boom');
    expect(out).toBe('at f (https://16bit.ink/_astro/a.js:1:2)\n    at g (https://16bit.ink/x.js:3:4)');
    expect(out).not.toMatch(/secret|frag|boom/);
  });

  it('cuts long stacks and gives nothing for non-strings or empty ones', () => {
    expect(cleanStack('x'.repeat(5000))).toHaveLength(MAX_STACK);
    expect(cleanStack(undefined)).toBeUndefined();
    expect(cleanStack('Error: only', 'Error: only')).toBeUndefined();
  });
});

describe('firstFrames', () => {
  it('keeps the first lines on one line', () => {
    expect(firstFrames('a@x.js:1:1\nb@y.js:2:2\nc@z.js:3:3', 2)).toBe('a@x.js:1:1 | b@y.js:2:2');
    expect(firstFrames(null)).toBeNull();
  });
});
