import { describe, expect, it } from 'vitest';
import { closeness, pickTip, TIPS, tipsFor } from '../src/scenes/result/tips';

describe('result tips', () => {
  it('leaves out tips for other ways of standing', () => {
    expect(tipsFor('pivot').some((t) => t.only)).toBe(false);
    expect(tipsFor('rail').filter((t) => t.only).map((t) => t.only)).toEqual(['rail']);
    expect(tipsFor('hop').filter((t) => t.only).map((t) => t.only)).toEqual(['hop']);
  });

  it('rotates through every suitable tip before repeating', () => {
    const n = tipsFor('pivot').length;
    const seen = new Set(Array.from({ length: n }, (_, i) => pickTip(i, 'pivot', false)));
    expect(seen.size).toBe(n);
    expect(pickTip(n, 'pivot', false)).toBe(pickTip(0, 'pivot', false));
  });

  it('copes with any turn number', () => {
    expect(pickTip(-1, 'rail', true)).toBe(pickTip(tipsFor('rail').length - 1, 'rail', true));
    expect(pickTip(2.7, 'hop', false)).toBe(pickTip(2, 'hop', false));
  });

  it('words tips for touch screens or a mouse', () => {
    expect(pickTip(0, 'pivot', true)).toBe(TIPS[0]!.touch);
    expect(pickTip(0, 'pivot', false)).toBe(TIPS[0]!.mouse);
    expect(TIPS.every((t) => t.mouse.length > 0 && t.touch.length > 0)).toBe(true);
  });

  it('finds kinder words the closer the bar came', () => {
    expect(closeness(0.95)).toBe('So close!');
    expect(closeness(0.6)).toBe('Over halfway there');
    expect(closeness(0.3)).toBe('A good start');
    expect(closeness(0)).toBe('It takes a few goes');
  });
});
