/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { INKPIN_PAID_CHAPTERS } from '../content/paid';
import { BUILT_CHAPTERS, CHAPTER_1, CHAPTERS, FREE_CHAPTERS, installPaidChapters, isFreeEnd, LEVELS } from '../src/level';
import { ALL_CHAPTERS, ALL_LEVELS } from '../src/level/paid';
import { parseChapters, parseLevel } from '../src/level/validate';

/** Every client source file's text, by path. */
const SOURCES = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });
/** The only files that may name the paid chapters: the list itself and the checker of what arrives. */
const SERVER_ONLY = ['../src/level/paid.ts'];

describe('paid chapters stay out of the game bundle', () => {
  it('no client code imports the paid content or the chapter 2/3 level files', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(20);
    for (const [file, text] of Object.entries(SOURCES)) {
      if (file.includes('/level/ch2/') || file.includes('/level/ch3/') || SERVER_ONLY.includes(file)) continue;
      const specs = [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!);
      for (const spec of specs) {
        expect(spec, file).not.toMatch(/content\/paid/);
        expect(spec, file).not.toMatch(/(^|\/)paid$/);
        expect(spec, file).not.toMatch(/(^|\/)ch[23]\//);
      }
    }
  });

  it('has every built chapter: one free, the rest paid', () => {
    expect(FREE_CHAPTERS + INKPIN_PAID_CHAPTERS.length).toBe(BUILT_CHAPTERS);
    expect(ALL_CHAPTERS).toHaveLength(BUILT_CHAPTERS);
  });

  it('serves paid chapters the client can read, unchanged by JSON', () => {
    const wire: unknown = JSON.parse(JSON.stringify(INKPIN_PAID_CHAPTERS));
    const parsed = parseChapters(wire);
    expect(parsed).toHaveLength(INKPIN_PAID_CHAPTERS.length);
    expect(parsed).toEqual(INKPIN_PAID_CHAPTERS);
  });

  it('rejects a malformed payload with a clear error', () => {
    const wire = JSON.parse(JSON.stringify(INKPIN_PAID_CHAPTERS)) as Record<string, unknown>[][];
    expect(() => parseChapters('nope')).toThrow(/chapters/);
    expect(() => parseChapters([[]])).toThrow(/chapter 2/);
    expect(() => parseChapters([[{ ...wire[0]![0], rooms: undefined }]])).toThrow(/rooms/);
    expect(() => parseChapters([[{ ...wire[0]![0], nib: { x: null, y: 1 } }]])).toThrow(/nib/);
    expect(() => parseChapters([[{ ...wire[0]![0], walls: [{ ax: 1 }] }]])).toThrow(/walls/);
    expect(() => parseChapters([[{ ...wire[0]![0], bars: [9999] }]])).toThrow(/bars/);
    expect(() => parseChapters([[{ ...wire[0]![0], id: CHAPTER_1[0]!.id }]])).toThrow(/repeated level id/);
    expect(() => parseChapters([[wire[0]![0], wire[0]![0]]])).toThrow(/repeated level id/);
    expect(() => parseLevel({ ...wire[0]![0], solution: ['@x'] })).toThrow(/solution/);
  });

  it('a player without the full game has only chapter 1, ending at its last level', () => {
    expect(CHAPTERS).toHaveLength(1);
    expect(LEVELS).toHaveLength(CHAPTER_1.length);
    expect(isFreeEnd(CHAPTER_1[CHAPTER_1.length - 1]!.id)).toBe(true);
    expect(isFreeEnd(ALL_LEVELS[CHAPTER_1.length]!.id)).toBe(false);
  });

  it('installing the paid chapters adds them after chapter 1', () => {
    installPaidChapters(parseChapters(JSON.parse(JSON.stringify(INKPIN_PAID_CHAPTERS))));
    try {
      expect(CHAPTERS).toHaveLength(BUILT_CHAPTERS);
      expect(LEVELS.map((l) => l.id)).toEqual(ALL_LEVELS.map((l) => l.id));
    } finally {
      installPaidChapters([]);
    }
    expect(LEVELS).toHaveLength(CHAPTER_1.length);
  });
});
