import type { Chapter, ChapterInfo, LevelDef } from './types';
import { zoneInfo } from './zones';

/** Every playable level in order, across chapters. */
export function allLevels(chapters: readonly Chapter[]): LevelDef[] {
  return chapters.flatMap((c) => c.levels);
}

/** Zone/player info for the chapter a level belongs to. */
export function chapterOf(level: LevelDef): ChapterInfo {
  return zoneInfo(level.chapter);
}
