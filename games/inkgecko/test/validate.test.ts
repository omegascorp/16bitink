import { describe, expect, it } from 'vitest';
import { CHAPTER_1 } from '../src/level/chapter1';
import { CHAPTER_2 } from '../src/level/chapter2';
import { CHAPTER_3 } from '../src/level/chapter3';
import { CHAPTER_4 } from '../src/level/chapter4';
import { CHAPTER_5 } from '../src/level/chapter5';
import { CHAPTER_6 } from '../src/level/chapter6';
import { CHAPTER_7 } from '../src/level/chapter7';
import { CHAPTER_8 } from '../src/level/chapter8';
import { CHAPTER_9 } from '../src/level/chapter9';
import { CHAPTER_10 } from '../src/level/chapter10';
import { parseChapters } from '../src/level/validate';

const wire = (v: unknown): unknown => JSON.parse(JSON.stringify(v));
/** A good paid level to break one thing in at a time. */
const BASE = wire({ ...CHAPTER_1[0]!, id: 'test-1' }) as Record<string, unknown>;
const POINTS = CHAPTER_1[0]!.tracks[0]!.points;
const tryLevel = (changes: Record<string, unknown>): unknown => parseChapters([[{ ...BASE, ...changes }]]);

describe('paid chapters from the server', () => {
  it('round-trips real levels', () => {
    expect(parseChapters(wire([CHAPTER_2]))).toEqual(wire([CHAPTER_2]));
    expect(parseChapters(wire([CHAPTER_3, CHAPTER_4, CHAPTER_5]))).toEqual(wire([CHAPTER_3, CHAPTER_4, CHAPTER_5]));
    expect(parseChapters(wire([CHAPTER_6, CHAPTER_7, CHAPTER_8]))).toEqual(wire([CHAPTER_6, CHAPTER_7, CHAPTER_8]));
    expect(parseChapters(wire([CHAPTER_9, CHAPTER_10]))).toEqual(wire([CHAPTER_9, CHAPTER_10]));
    expect(tryLevel({})).toHaveLength(1);
  });

  it('throws out anything malformed', () => {
    expect(() => parseChapters({})).toThrow();
    expect(() => tryLevel({ colours: 99 })).toThrow();
    expect(() => tryLevel({ charms: ['laser'] })).toThrow();
    expect(() => tryLevel({ shooter: { kind: 'hover' } })).toThrow();
    expect(() => parseChapters([[BASE, BASE]])).toThrow();
    expect(() => tryLevel({ shooter: { kind: 'hop', pads: [{ x: 1, y: 1 }] } })).toThrow();
    expect(() => tryLevel({ tracks: [{ points: POINTS, tunnels: [{ from: 0.5, to: 0.2 }] }] })).toThrow();
  });

  it("won't take a free level's id: saves and unlocks are keyed by it", () => {
    expect(() => parseChapters(wire([CHAPTER_1]))).toThrow(/duplicate/);
    expect(() => tryLevel({ id: CHAPTER_1[3]!.id })).toThrow(/duplicate/);
    expect(() => tryLevel({ id: 'constructor' })).toThrow();
  });

  it('throws out levels that could never be played', () => {
    expect(() => tryLevel({ stones: 0.9 })).toThrow();
    expect(() => tryLevel({ stones: 0.25, buds: 0.25 })).toThrow(/buds and stones/);
    expect(() => tryLevel({ charms: ['slow', 'slow'] })).toThrow();
    expect(() => tryLevel({ tracks: [{ points: [{ x: 5, y: 5 }, { x: 5, y: 5 }] }] })).toThrow(/short/);
    expect(() => tryLevel({ tracks: [{ points: POINTS, tunnels: [{ from: 0, to: 1 }] }] })).toThrow(/tunnels/);
    expect(() => tryLevel({ tracks: [{ points: POINTS, tunnels: [{ from: 0.1, to: 0.4 }, { from: 0.3, to: 0.5 }] }] })).toThrow(/tunnels/);
    expect(() => tryLevel({ tracks: [{ points: POINTS, raised: [{ from: 0.3, to: 0.5 }, { from: 0.1, to: 0.4 }] }] })).toThrow(/raised/);
    expect(() => tryLevel({ shooter: { kind: 'hop', pads: [{ x: -200, y: 300 }, { x: 600, y: 300 }] } })).toThrow(/pad/);
    expect(() => tryLevel({ shooter: { kind: 'hop', pads: [{ x: 600, y: 300 }, { x: 620, y: 310 }] } })).toThrow(/pads/);
    expect(() => tryLevel({ pillars: [{ x: 600, y: 300, r: 500 }] })).toThrow(/pillar/);
    expect(() => tryLevel({ dark: 'yes' })).toThrow(/dark/);
  });
});
