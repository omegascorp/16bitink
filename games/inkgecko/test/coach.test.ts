import { describe, expect, it } from 'vitest';
import { Coach } from '../src/logic/coach';

describe('the coach', () => {
  it('shows a hint until the player does the thing', () => {
    const c = new Coach(['spit']);
    c.observe([], 0.1);
    expect(c.current(false)).toMatch(/Click/);
    expect(c.current(true)).toMatch(/Tap/);
    c.observe([{ type: 'spit', x: 0, y: 0, colour: 'red' }], 0.1);
    expect(c.current(false)).not.toBeNull();
    c.observe([{ type: 'pop', x: 0, y: 0, colour: 'red', count: 3, combo: 0, points: 30, line: 0, marbles: [] }], 0.1);
    expect(c.current(false)).toBeNull();
  });

  it('waits for its moment, then teaches the next thing', () => {
    const c = new Coach(['spit', 'swap']);
    c.observe([], 0.1);
    c.observe([{ type: 'pop', x: 0, y: 0, colour: 'red', count: 3, combo: 0, points: 30, line: 0, marbles: [] }], 0.1);
    expect(c.current(false)).toBeNull();
    c.observe([{ type: 'pop', x: 0, y: 0, colour: 'red', count: 3, combo: 0, points: 30, line: 0, marbles: [] }], 0.1);
    expect(c.current(false)).toMatch(/swap/i);
  });

  it('gives up after a while', () => {
    const c = new Coach(['pull']);
    c.observe([], 0.1);
    expect(c.current(false)).not.toBeNull();
    for (let i = 0; i < 120; i++) c.observe([], 0.1);
    expect(c.current(false)).toBeNull();
  });
});
