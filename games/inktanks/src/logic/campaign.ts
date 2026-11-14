import type { Medals } from './mission/outcome';
import type { MissionType } from './level/types';

/**
 * The campaign's shape: 5 chapters × 10 levels, numbers running on (chapter 2
 * starts at Level 11), chapter 1 free. Which levels a player may open, and
 * why not: pure rules, so the map, the briefing and the tests agree.
 */
export const LEVELS_PER_CHAPTER = 10;
export const FREE_LEVELS = 10;
export const TOTAL_LEVELS = 50;

export interface ChapterInfo {
  /** 0-based. */
  readonly index: number;
  readonly name: string;
  /** The main rival clan. */
  readonly rival: string;
  readonly first: number;
  readonly last: number;
  readonly free: boolean;
}

const NAMES: readonly (readonly [string, string])[] = [
  ['Meadowlands', 'the Boars'],
  ['Dust Flats', 'the Weasels'],
  ['Mirefen', 'the Crows'],
  ['Frostridge', 'the Boars'],
  ['Ashfall', 'every clan'],
];

export const CHAPTERS: readonly ChapterInfo[] = NAMES.map(([name, rival], index) => ({
  index,
  name,
  rival,
  first: index * LEVELS_PER_CHAPTER + 1,
  last: (index + 1) * LEVELS_PER_CHAPTER,
  free: (index + 1) * LEVELS_PER_CHAPTER <= FREE_LEVELS,
}));

export function chapterOf(n: number): ChapterInfo {
  return CHAPTERS[Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor((n - 1) / LEVELS_PER_CHAPTER)))]!;
}

export const isPaidLevel = (n: number): boolean => n > FREE_LEVELS;

export type MedalBook = Readonly<Record<number, Medals>>;

export const passed = (medals: MedalBook, n: number): boolean => medals[n]?.[0] === true;

export const medalCount = (medals: MedalBook, n: number): number => (medals[n] ?? []).filter(Boolean).length;

/** Levels unlock in order: Level 1, then each one after a passed level. `allOpen` is the dev switch. */
export function levelOpen(medals: MedalBook, n: number, allOpen = false): boolean {
  if (n < 1 || n > TOTAL_LEVELS) return false;
  return allOpen || n === 1 || passed(medals, n - 1);
}

/**
 * Why a level can or can't be played:
 * - play: go to the briefing
 * - paywall: a paid level and the player doesn't own the full game (shows the host's offer)
 * - coming: the level isn't made yet (or an owner's paid levels haven't loaded)
 * - locked: the level before it isn't passed yet
 */
export type Gate = 'play' | 'paywall' | 'coming' | 'locked';

export interface GateContext {
  readonly medals: MedalBook;
  /** host.unlocked: the server confirmed the player owns the full game. */
  readonly owned: boolean;
  /** Whether the level's data is here (chapter 1 always; paid levels once loaded). */
  readonly available: (n: number) => boolean;
  readonly allOpen?: boolean;
  /** Chapters made so far (READY_CHAPTERS): what a player who doesn't own the game is offered. */
  readonly readyChapters?: number;
}

/** Chapters whose levels exist, shipped or paid (the site's size.ready). Raise it as each chapter lands. */
export const READY_CHAPTERS = 1;

export function gate(n: number, c: GateContext): Gate {
  if (n < 1 || n > TOTAL_LEVELS) return 'coming';
  // Only levels that exist are sold: a chapter still being made says "coming", owner or not.
  if (isPaidLevel(n) && !c.owned) return chapterOf(n).index < (c.readyChapters ?? READY_CHAPTERS) ? 'paywall' : 'coming';
  if (!c.available(n)) return 'coming';
  return levelOpen(c.medals, n, c.allOpen) ? 'play' : 'locked';
}

/** The level to highlight on the map: the first open, unpassed one that exists; else the last passed one. */
export function nextLevel(c: GateContext): number {
  let last = 1;
  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    const g = gate(n, c);
    if (g !== 'play') break;
    last = n;
    if (!passed(c.medals, n)) return n;
  }
  return last;
}

export type SpotState = 'locked' | 'open' | 'next' | 'done';

export function spotState(n: number, c: GateContext, next: number): SpotState {
  const g = gate(n, c);
  if (g !== 'play') return 'locked';
  if (passed(c.medals, n)) return n === next ? 'next' : 'done';
  return n === next ? 'next' : 'open';
}

export const MISSION_NAMES: Readonly<Record<MissionType, string>> = {
  assault: 'Assault', raid: 'Raid', escort: 'Escort', hold: 'Hold', ace: 'Ace', rescue: 'Rescue', ambush: 'Ambush',
  salvage: 'Salvage', breakout: 'Breakout', recon: 'Recon', capture: 'Capture', chase: 'Chase', fortress: 'Fortress',
};
