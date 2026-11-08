import type { LevelDef, ZoneKind } from '../../level/types';
import type { Enemy, EnemyCtx, EnemyEvent, Prompt } from '../enemyTypes';
import type { Prey, PreyKind } from '../preyTypes';
import type { Rng } from '../rng';
import type { Snake } from '../snake';
import type { Pt } from '../vec';

/** The ability's key (E) or button: held now, and pressed this frame. */
export interface AbilityInput {
  readonly held: boolean;
  readonly pressed: boolean;
  /** The player is steering this frame (a pointer moved, a key is held): playing dead or burying ends when you move. */
  readonly steering: boolean;
}

/** What a snake's ability can see and do. */
export interface AbilityCtx {
  readonly snake: Snake;
  readonly level: LevelDef;
  readonly elapsed: number;
  readonly rng: Rng;
  readonly enemies: readonly Enemy[];
  /** The boss, if the level has one (it's in `enemies` too). */
  readonly boss: Enemy | null;
  /** What enemies see, to hand to Enemy.frighten. */
  readonly enemyCtx: EnemyCtx;
  readonly prey: readonly Prey[];
  inZone(p: Pt, kind: ZoneKind): boolean;
  /** Costs the snake a life (unless it's safe): running out of breath, freezing… */
  hurt(cause: string, at: Pt): boolean;
  /** Puts new prey on the board (a bird coming down to a lure), or null if there's no room. */
  spawnPrey(kind: PreyKind, at: Pt): Prey | null;
  emit(e: EnemyEvent): void;
}

/**
 * A snake's own ability (one per species, see the design doc), made fresh
 * for each level. `step` runs every frame before the snake moves: it may
 * hold the snake still, change its speed or turning, cloak it from hunters,
 * keep a meter (breath, warmth), and act on enemies and prey near it.
 * Enemies that can be scared or frozen implement Enemy.frighten / freeze.
 */
export interface Ability {
  readonly id: string;
  /** The button's label and the hint's name for it ("Play dead"). */
  readonly label: string;
  /** Whether it has a key and button (passive abilities like breath don't). */
  readonly button: boolean;
  /** 0..1: how ready it is (1 ready, less while it recharges), for the button. */
  readonly charge: number;
  /** Whether it's in use now (the button lights up). */
  readonly active: boolean;
  step(ctx: AbilityCtx, input: AbilityInput, dt: number): void;
  /** What the player should do now, if the ability has something to say ("glide to the next tree"), shown over the board. Optional. */
  prompt?(snake: Snake): Prompt | null;
}

/** A snake's ability, made fresh for a level. */
export type AbilityMaker = (level: LevelDef) => Ability;
