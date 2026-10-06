import type { KeyValueStore } from '@16bitink/game-sdk';

/** Best result in one level. */
export interface LevelRecord {
  /** Ink blots earned, 1..3. */
  readonly blots: number;
  /** Fastest finish, seconds. */
  readonly bestTime: number;
}

/** Saved progress, keyed by level id (ids are permanent). */
export interface Progress {
  readonly levels: Readonly<Record<string, LevelRecord>>;
}

export const EMPTY_PROGRESS: Progress = { levels: {} };
const KEY = 'inkcrab.progress.v1';
export const MAX_BLOTS = 3;

/**
 * Ink blots for a finished level: one for finishing, one for beating the
 * par time, one for losing no lives.
 */
export function blotsFor(time: number, parTime: number, livesLost: number): number {
  return 1 + (time <= parTime ? 1 : 0) + (livesLost === 0 ? 1 : 0);
}

const isRecord = (v: unknown): v is LevelRecord => {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return Number.isInteger(r.blots) && (r.blots as number) >= 1 && (r.blots as number) <= MAX_BLOTS
    && typeof r.bestTime === 'number' && Number.isFinite(r.bestTime) && r.bestTime >= 0;
};

/** Untrusted saved data to progress: anything malformed is dropped, never thrown. */
export function parseProgress(raw: unknown): Progress {
  if (typeof raw !== 'object' || raw === null) return EMPTY_PROGRESS;
  const levels = (raw as { levels?: unknown }).levels;
  if (typeof levels !== 'object' || levels === null) return EMPTY_PROGRESS;
  const kept = Object.entries(levels as Record<string, unknown>).filter(([id, r]) => /^[a-z0-9-]{1,64}$/.test(id) && isRecord(r));
  return { levels: Object.fromEntries(kept) as Record<string, LevelRecord> };
}

/** Keeps the better of the old and new results for a level. */
export function recordResult(p: Progress, id: string, blots: number, time: number): Progress {
  const old = p.levels[id];
  const next: LevelRecord = old
    ? { blots: Math.max(old.blots, blots), bestTime: Math.min(old.bestTime, time) }
    : { blots, bestTime: time };
  return { levels: { ...p.levels, [id]: next } };
}

/** The first level is always open; each next one opens once the one before it is finished. */
export function isUnlocked(p: Progress, order: readonly string[], id: string): boolean {
  const i = order.indexOf(id);
  if (i < 0) return false;
  return i === 0 || p.levels[order[i - 1]!] !== undefined;
}

export function loadProgress(store: KeyValueStore | undefined): Progress {
  try {
    const raw = store?.getItem(KEY);
    return raw ? parseProgress(JSON.parse(raw)) : EMPTY_PROGRESS;
  } catch (err) {
    console.warn('[inkcrab] could not read saved progress', err);
    return EMPTY_PROGRESS;
  }
}

export function saveProgress(store: KeyValueStore | undefined, p: Progress): void {
  try {
    store?.setItem(KEY, JSON.stringify(p));
  } catch (err) {
    console.warn('[inkcrab] could not save progress', err);
  }
}
