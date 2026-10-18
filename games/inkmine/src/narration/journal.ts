import type { KeyValueStore } from '@16bitink/game-sdk';

/**
 * Every story line heard so far, newest last, so one missed while playing
 * can be heard or read again (spec, "Narration"). Kept in the browser's
 * storage, apart from the save: losing it loses nothing of the game.
 */
export interface JournalEntry {
  /** The narrator's line (or, for a card without one, its words). */
  readonly key: string;
  readonly title: string;
  readonly text: string;
}

const KEY = 'inkmine:journal';
/** Entries kept, oldest dropped first. */
const MAX = 120;

/** The journal as stored; anything unreadable is an empty one. */
export function readJournal(store: KeyValueStore | undefined): JournalEntry[] {
  try {
    const data: unknown = JSON.parse(store?.getItem(KEY) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((e): e is JournalEntry => typeof e === 'object' && e !== null && typeof e.key === 'string' && typeof e.title === 'string' && typeof e.text === 'string');
  } catch {
    return [];
  }
}

/** The journal with `spec` heard now: moved to the end if it was there, and saved. */
export function remember(store: KeyValueStore | undefined, spec: { readonly line?: string; readonly title: string; readonly text: string }): JournalEntry[] {
  const key = spec.line ?? spec.text;
  const next = [...readJournal(store).filter((e) => e.key !== key), { key, title: spec.title, text: spec.text }].slice(-MAX);
  try {
    store?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the journal just won't keep it.
  }
  return next;
}
