import { describe, expect, it } from 'vitest';
import { CHAPTER_1 } from '../src/level/chapter1';
import { CHAPTER_2 } from '../src/level/chapter2';
import { CHAPTER_3 } from '../src/level/chapter3';
import { CHAPTER_4 } from '../src/level/chapter4';
import { CHAPTER_5 } from '../src/level/chapter5';
import { parseChapters } from '../src/level/validate';

const wire = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

describe('paid chapters from the server', () => {
  it('round-trips real levels', () => {
    expect(parseChapters(wire([CHAPTER_1]))).toEqual(wire([CHAPTER_1]));
    expect(parseChapters(wire([CHAPTER_2]))).toEqual(wire([CHAPTER_2]));
    expect(parseChapters(wire([CHAPTER_3, CHAPTER_4, CHAPTER_5]))).toEqual(wire([CHAPTER_3, CHAPTER_4, CHAPTER_5]));
    expect(() => parseChapters([[{ ...CHAPTER_1[0], stones: 0.9 }]])).toThrow();
  });

  it('throws out anything malformed', () => {
    expect(() => parseChapters({})).toThrow();
    expect(() => parseChapters([[{ ...CHAPTER_1[0], colours: 99 }]])).toThrow();
    expect(() => parseChapters([[{ ...CHAPTER_1[0], charms: ['laser'] }]])).toThrow();
    expect(() => parseChapters([[{ ...CHAPTER_1[0], shooter: { kind: 'hover' } }]])).toThrow();
    expect(() => parseChapters([[CHAPTER_1[0], CHAPTER_1[0]]])).toThrow();
    expect(() => parseChapters([[{ ...CHAPTER_1[0], shooter: { kind: 'hop', pads: [{ x: 1, y: 1 }] } }]])).toThrow();
    expect(() => parseChapters([[{ ...CHAPTER_1[0], tracks: [{ points: CHAPTER_1[0]!.tracks[0]!.points, tunnels: [{ from: 0.5, to: 0.2 }] }] }]])).toThrow();
  });
});
