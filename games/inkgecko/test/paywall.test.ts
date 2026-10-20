import { describe, expect, it } from 'vitest';
import { INKGECKO_PAID_CHAPTERS } from '../content/paid';
import { CHAPTER_1 } from '../src/level/chapter1';
import { installPaidChapters, isFreeEnd, levelById, loadedChapters, loadedLevels, nextLevel } from '../src/level/levels';
import { parseChapters } from '../src/level/validate';

declare global {
  interface ImportMeta {
    glob(pattern: string, options: { query: '?raw'; import: 'default'; eager: true }): Record<string, string>;
  }
}

/** Every client source file's text, by path. */
const SOURCES = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });

describe('paid chapters stay out of the game bundle', () => {
  it('no client code imports the paid content', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(20);
    for (const [file, text] of Object.entries(SOURCES)) {
      for (const spec of [...text.matchAll(/from '([^']+)'/g)].map((m) => m[1]!)) expect(spec, file).not.toMatch(/content\/paid/);
    }
  });

  it('serves paid chapters the client can read', () => {
    expect(parseChapters(JSON.parse(JSON.stringify(INKGECKO_PAID_CHAPTERS)))).toHaveLength(INKGECKO_PAID_CHAPTERS.length);
  });

  it('a player without the full game has only chapter 1, ending at its last level', () => {
    expect(loadedChapters()).toHaveLength(1);
    expect(loadedLevels().map((l) => l.id)).toEqual(CHAPTER_1.map((l) => l.id));
    expect(isFreeEnd(CHAPTER_1.at(-1)!.id)).toBe(true);
    expect(nextLevel(CHAPTER_1.at(-1)!.id)).toBeUndefined();
  });

  it('an owner gets the paid chapters after the free one', () => {
    const extra = [{ ...CHAPTER_1[0]!, id: 'pond-1', name: 'Pond' }];
    installPaidChapters([extra]);
    expect(levelById('pond-1')).toBeDefined();
    expect(nextLevel(CHAPTER_1.at(-1)!.id)?.id).toBe('pond-1');
    installPaidChapters([]);
  });
});
