import { isUnlocked, type Progress } from '../../logic/save';

/**
 * done: cleared; current: where the gecko waits, the next to play; open:
 * playable; closed: not reached yet; locked: the full game's, not owned;
 * draft: its chapter isn't built yet.
 */
export type NodeState = 'done' | 'current' | 'open' | 'closed' | 'locked' | 'draft';

/** A chapter as the map sees it: playable, the full game's (not owned or not fetched), or not built yet. */
export interface ChapterSlot {
  readonly kind: 'playable' | 'locked' | 'draft';
  readonly levelIds: readonly string[];
}

export interface MapStates {
  readonly states: ReadonlyMap<string, NodeState>;
  /** Where the gecko stands: the first playable level not cleared, else the last cleared. */
  readonly current: string;
}

/**
 * Every level's state on the map. `order` is the play order of the levels
 * this player can play; `allOpen` opens them all (local development).
 */
export function mapStates(chapters: readonly ChapterSlot[], progress: Progress, order: readonly string[], allOpen = false): MapStates {
  const states = new Map<string, NodeState>();
  const open = (id: string): boolean => allOpen || isUnlocked(progress, order, id);
  const next = order.find((id) => !progress.levels[id] && open(id));
  const lastDone = [...order].reverse().find((id) => progress.levels[id]);
  const current = next ?? lastDone ?? order[0] ?? '';
  for (const c of chapters) {
    for (const id of c.levelIds) {
      if (c.kind !== 'playable') states.set(id, c.kind);
      else if (id === current && !progress.levels[id]) states.set(id, 'current');
      else if (progress.levels[id]) states.set(id, 'done');
      else states.set(id, open(id) ? 'open' : 'closed');
    }
  }
  return { states, current };
}

/** Placeholder ids for a chapter the map shows but can't load: ten pockets to draw. */
export function standInIds(kind: 'locked' | 'draft', chapter: number, count = 10): string[] {
  return Array.from({ length: count }, (_, i) => `${kind}-${chapter + 1}-${i + 1}`);
}
