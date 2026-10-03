import type { KeyValueStore } from '@16bitink/game-sdk';

export type { KeyValueStore };

export interface LevelRecord {
  readonly bestScore: number;
  readonly blots: number;
}

export interface SaveData {
  readonly version: 1;
  readonly levels: Readonly<Record<string, LevelRecord>>;
}

export const SAVE_KEY = 'inkfish:save';
const EMPTY: SaveData = { version: 1, levels: {} };


function isRecord(value: unknown): value is LevelRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.bestScore === 'number' && typeof v.blots === 'number';
}

/** Parses untrusted storage content; anything malformed is dropped. */
export function parseSave(raw: string | null): SaveData {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return EMPTY;
    const levels = (data as { levels?: unknown }).levels;
    if (typeof levels !== 'object' || levels === null) return EMPTY;
    const valid = Object.entries(levels).filter(([, rec]) => isRecord(rec));
    return { version: 1, levels: Object.fromEntries(valid) as Record<string, LevelRecord> };
  } catch {
    return EMPTY;
  }
}

export function recordResult(save: SaveData, levelId: string, score: number, blots: number): SaveData {
  const prev = save.levels[levelId];
  const next: LevelRecord = {
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    blots: Math.max(prev?.blots ?? 0, blots),
  };
  return { ...save, levels: { ...save.levels, [levelId]: next } };
}

/** Levels open in order; `allOpen` (local dev flag) skips the progress requirement, not the level list. */
export function isLevelOpen(save: SaveData, orderedIds: readonly string[], levelId: string, allOpen = false): boolean {
  const index = orderedIds.indexOf(levelId);
  if (index <= 0) return index === 0;
  if (allOpen) return true;
  return save.levels[orderedIds[index - 1]!] !== undefined;
}

export function loadSave(store: KeyValueStore | undefined): SaveData {
  try {
    return parseSave(store?.getItem(SAVE_KEY) ?? null);
  } catch {
    return EMPTY;
  }
}

export function persistSave(store: KeyValueStore | undefined, save: SaveData): void {
  try {
    store?.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (err) {
    // Private mode / quota: progress just won't persist this session.
    console.warn('[inkfish] could not persist save', err);
  }
}
