import type { GameEvent } from '@16bitink/game-sdk';

/** What the tracker reads from the level in play: kept tiny so tests can fake it. */
export interface RunView {
  readonly pinsPulled: number;
  readonly pinsTotal: number;
  readonly coins: number;
  readonly coinsNeeded: number;
  readonly hasChest: boolean;
  readonly chestTaken: boolean;
}

export interface RunLevel {
  readonly id: string;
  readonly name: string;
  /** 1-based place in the game's level order, running across chapters (chapter 2 level 1 = 11). */
  readonly n: number;
}

/** Short words for how far a run got, e.g. "pins 2/4, gold 60%, chest 0/1". Gold is bucketed to 10% so equal situations read alike. */
export function progressNote(v: RunView): string {
  const need = Math.max(1, v.coinsNeeded);
  const gold = Math.min(100, Math.floor((v.coins / need) * 10) * 10);
  const chest = v.hasChest ? `, chest ${v.chestTaken ? 1 : 0}/1` : '';
  return `pins ${v.pinsPulled}/${v.pinsTotal}, gold ${gold}%${chest}`;
}

/**
 * One run of one level for the site's funnel: a `level_start` when it begins,
 * then exactly one `level_end` (win, lose or quit). A run is a try of the level
 * (a heart's rewind is part of the same run); a retry or leaving for the menu
 * mid-run ends it as `quit`.
 */
export class RunTracker {
  private ended = false;
  private readonly startedAt: number;

  constructor(
    private readonly level: RunLevel,
    private readonly send: (e: GameEvent) => void,
    private readonly view: () => RunView,
    private readonly now: () => number = Date.now,
  ) {
    this.startedAt = now();
    send({ type: 'level_start', level: level.id, n: level.n, name: level.name });
  }

  win(): void {
    this.end('win', undefined);
  }

  lose(cause: string): void {
    this.end('lose', cause);
  }

  /** Left mid-run (restart, another level, the menu); a no-op once the run has ended. */
  quit(): void {
    this.end('quit', undefined);
  }

  private end(result: 'win' | 'lose' | 'quit', cause: string | undefined): void {
    if (this.ended) return;
    this.ended = true;
    const v = this.view();
    this.send({
      type: 'level_end',
      level: this.level.id,
      n: this.level.n,
      name: this.level.name,
      result,
      seconds: Math.round((this.now() - this.startedAt) / 1000),
      score: v.coins,
      progress: progressNote(v),
      ...(cause ? { cause } : {}),
    });
  }
}
