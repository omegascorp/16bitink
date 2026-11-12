import type { GameEvent, LevelRef } from '@16bitink/game-sdk';

/** What the player pressed. */
export type InputKind = 'touch' | 'mouse' | 'pen' | 'key';

/** The first press in a level run, `ms` after the run started. */
export interface LevelInput extends LevelRef {
  readonly type: 'level_input';
  readonly ms: number;
  readonly input: InputKind;
}

export interface LevelInputWatch {
  /** Every event the game reports: a level start opens a run, its end closes it. */
  readonly onGameEvent: (e: GameEvent) => void;
  /** A press anywhere on the page: the first one in an open run is reported. */
  readonly onInput: (kind: InputKind) => void;
}

interface OpenRun {
  readonly ref: LevelRef;
  readonly start: number;
}

/**
 * Times each level run's first press, for every game alike: a run that ends
 * (or whose tab closes) without one is a player who never worked out what to
 * press. The tap that started the level comes before its `level_start`, so it
 * never counts.
 */
export function watchLevelInput(now: () => number, send: (e: LevelInput) => void): LevelInputWatch {
  let open: OpenRun | null = null;
  return {
    onGameEvent: (e) => {
      if (e.type === 'level_start') open = { ref: { level: e.level, n: e.n, ...(e.name ? { name: e.name } : {}) }, start: now() };
      else if (e.type === 'level_end') open = null;
    },
    onInput: (kind) => {
      if (!open) return;
      const { ref, start } = open;
      open = null;
      send({ type: 'level_input', ...ref, ms: Math.max(0, Math.round(now() - start)), input: kind });
    },
  };
}

/** A pointer's kind as the stats name it (an unknown one counts as a mouse). */
export const pointerKind = (pointerType: string): InputKind => (pointerType === 'touch' ? 'touch' : pointerType === 'pen' ? 'pen' : 'mouse');
