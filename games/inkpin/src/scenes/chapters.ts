import { CHAPTERS } from '../level';

/** Where a level sits: its chapter (from 1), its place in it (from 1), the chapter's size, and its level number counted across chapters (chapter 2's first level is Level 11). */
export interface ChapterPlace {
  readonly chapter: number;
  readonly number: number;
  readonly count: number;
  readonly level: number;
}

export function chapterPlace(levelId: string): ChapterPlace | null {
  let before = 0;
  for (const [c, levels] of CHAPTERS.entries()) {
    const i = levels.findIndex((l) => l.id === levelId);
    if (i >= 0) return { chapter: c + 1, number: i + 1, count: levels.length, level: before + i + 1 };
    before += levels.length;
  }
  return null;
}
