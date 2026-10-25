/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { INKSNAKE_PAID_CHAPTERS } from '../content/paid';
import { CHAPTER_1 } from '../src/level/chapter1';
import { BUILT_CHAPTERS, FREE_CHAPTERS, isFreeEnd, loadedChapters, nextLevel } from '../src/level/levels';
import { parseChapters } from '../src/level/validate';

/** Every client source file's text, by path. */
const SOURCES = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });

describe('paid chapters stay out of the game bundle', () => {
  it('no client code imports the paid content', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(20);
    for (const [file, text] of Object.entries(SOURCES)) {
      const specs = [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!);
      for (const spec of specs) {
        expect(spec, file).not.toMatch(/content\/paid/);
        expect(spec, file).not.toMatch(/(^|\/)chapter([2-9]|\d\d)$/);
      }
    }
  });

  it('has every built chapter: one free, the rest paid', () => {
    expect(FREE_CHAPTERS + INKSNAKE_PAID_CHAPTERS.length).toBe(BUILT_CHAPTERS);
  });

  it('serves paid chapters the client can read', () => {
    expect(parseChapters(JSON.parse(JSON.stringify(INKSNAKE_PAID_CHAPTERS)))).toHaveLength(INKSNAKE_PAID_CHAPTERS.length);
  });

  it('a player without the full game has only chapter 1, ending at its last level', () => {
    expect(loadedChapters()).toHaveLength(1);
    const last = CHAPTER_1[CHAPTER_1.length - 1]!;
    expect(isFreeEnd(last.id)).toBe(true);
    expect(nextLevel(last.id)).toBeUndefined();
  });
});
