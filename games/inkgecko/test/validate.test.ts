import { describe, expect, it } from 'vitest';
import { CHAPTER_1 } from '../src/level/chapter1';
import { parseChapters } from '../src/level/validate';

const wire = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

describe('paid chapters from the server', () => {
  it('round-trips real levels', () => {
    expect(parseChapters(wire([CHAPTER_1]))).toEqual(wire([CHAPTER_1]));
  });

  it('throws out anything malformed', () => {
    expect(() => parseChapters({})).toThrow();
    expect(() => parseChapters([[{ ...CHAPTER_1[0], colours: 99 }]])).toThrow();
    expect(() => parseChapters([[{ ...CHAPTER_1[0], charms: ['laser'] }]])).toThrow();
    expect(() => parseChapters([[{ ...CHAPTER_1[0], shooter: { kind: 'hover' } }]])).toThrow();
    expect(() => parseChapters([[CHAPTER_1[0], CHAPTER_1[0]]])).toThrow();
  });
});
