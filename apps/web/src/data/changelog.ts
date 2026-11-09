import { GAME_ENTRIES, SITE_ENTRIES } from './changelogEntries';
import type { CatalogGame } from './games';

/**
 * What changed in each game, for players: the changelog pages
 * (/games/<slug>/changelog and /changelog) and a game page's "Latest update".
 * Write it for players: what they can see or feel, never internals.
 */

export interface ChangelogEntry {
  /** The day it went out (YYYY-MM-DD, UTC). Newest first; a big day can have several. */
  readonly date: string;
  /** A few words: "Chapter 3: the Talus". */
  readonly title: string;
  /** One line each, in the past tense: "Added…", "Fixed…". */
  readonly changes: readonly string[];
}

/** slug -> the game's entries, newest first; the last one is its release day. Bump the game's `updated` with each new entry. */
export const CHANGELOG: Readonly<Record<string, readonly ChangelogEntry[]>> = GAME_ENTRIES;

/** Changes to the site that every game's players notice: sign-in, prices, no ads. */
export const SITE_CHANGELOG: readonly ChangelogEntry[] = SITE_ENTRIES;

export function changelogFor(slug: string): readonly ChangelogEntry[] {
  return CHANGELOG[slug] ?? [];
}

export function latestUpdate(slug: string): ChangelogEntry | undefined {
  return changelogFor(slug)[0];
}

/** One line of the all-games page: a game's entry, or the site's (game null). */
export interface Update {
  readonly game: CatalogGame | null;
  readonly entry: ChangelogEntry;
}

const today = (now: Date): string => now.toISOString().slice(0, 10);

/** Every listed game's entries and the site's, newest first, leaving out anything dated after today (UTC). */
export function allUpdates(games: readonly CatalogGame[], now: Date): readonly Update[] {
  const until = today(now);
  const updates: Update[] = [
    ...games.flatMap((game) => changelogFor(game.slug).map((entry) => ({ game, entry }))),
    ...SITE_CHANGELOG.map((entry) => ({ game: null, entry })),
  ];
  return updates
    .filter((u) => u.entry.date <= until)
    .sort((a, b) => (a.entry.date === b.entry.date ? 0 : a.entry.date < b.entry.date ? 1 : -1));
}
