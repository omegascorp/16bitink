import type { CatalogGame } from '../data/games';

/**
 * What's in a game and how fresh it is, shaped for the chapter-tile
 * graphic on cards and game pages (components/GameStats.astro).
 */

const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const LONG = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** A catalog day (YYYY-MM-DD) as "Oct 3", or "Dec 31, 2025" when it isn't this year. */
export function formatDay(day: string, now: Date): string {
  const date = new Date(`${day}T00:00:00Z`);
  return (date.getUTCFullYear() === now.getUTCFullYear() ? SHORT : LONG).format(date);
}

export interface GameSize {
  readonly chapters: number;
  /** Chapters out so far; the rest are in development. */
  readonly ready: number;
  /** Null when the game doesn't count levels. */
  readonly levels: number | null;
}

export function gameSize(game: CatalogGame): GameSize | null {
  if (!game.size) return null;
  const { chapters, ready, levels } = game.size;
  return { chapters, ready: Math.min(ready ?? chapters, chapters), levels: levels ?? null };
}

/** One chapter's tile: free to play, out (in the full game), or still in development. */
export type ChapterTile = 'free' | 'out' | 'coming';

/** A tile per chapter, in order: `free` free ones, the rest of what's out, then what's coming. */
export function chapterTiles(size: GameSize, free: number): ChapterTile[] {
  return Array.from({ length: size.chapters }, (_, i): ChapterTile => (i >= size.ready ? 'coming' : i < free ? 'free' : 'out'));
}

export interface GameDates {
  readonly released: string | null;
  /** Null when it hasn't changed since release day. */
  readonly updated: string | null;
}

export function gameDates(game: CatalogGame, now: Date): GameDates {
  return {
    released: game.released ? formatDay(game.released, now) : null,
    updated: game.updated && game.updated !== game.released ? formatDay(game.updated, now) : null,
  };
}
