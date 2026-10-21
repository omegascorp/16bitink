import { CHAPTER_2 } from '../src/level/chapter2';
import { CHAPTER_3 } from '../src/level/chapter3';
import { CHAPTER_4 } from '../src/level/chapter4';
import { CHAPTER_5 } from '../src/level/chapter5';
import { CHAPTER_6 } from '../src/level/chapter6';
import { CHAPTER_7 } from '../src/level/chapter7';
import { CHAPTER_8 } from '../src/level/chapter8';
import { CHAPTER_9 } from '../src/level/chapter9';
import { CHAPTER_10 } from '../src/level/chapter10';
import type { LevelDef } from '../src/level/types';

/**
 * The full game's chapters (2 onwards). SERVER-ONLY: imported by the
 * website's content registry and served by /api/content/inkgecko to
 * verified owners. Never import this, or the chapter files, from the game's
 * client code or they ship to everyone (test/paywall.test.ts checks).
 */
export const INKGECKO_PAID_CHAPTERS: readonly (readonly LevelDef[])[] = [CHAPTER_2, CHAPTER_3, CHAPTER_4, CHAPTER_5, CHAPTER_6, CHAPTER_7, CHAPTER_8, CHAPTER_9, CHAPTER_10];
