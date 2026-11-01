import type { VineEvent, VineSave } from './vines';
import type { Boulder } from './boulders';
import type { Creature } from './creatures';
import type { BreathState } from './breath';
import type { Blot } from './guards';
import type { LedgeEvent, LedgeSave } from './ledges';
import type { GuardAnimal, PinDef } from './level';
import type { GrainEvent, GrainsSave } from './particles';
import type { FireEvent } from './fire';
import type { FrogEvent } from './frog';
import type { TombEvent, TombSave } from './tomb';
import type { RubyEvent, RubySave } from './rubies';

/** The World's public types: how a level is lost, what Nib is told, what the World reports, and what it saves. */

export type LossCause = 'burnt' | 'inked' | 'pricked' | 'melted' | 'drained' | 'crushed' | 'fell' | 'gassed' | 'blasted' | 'sealed';

/**
 * What the player has told Nib to do: stay put, walk one way (arrow keys,
 * joystick), climb a vine up or down, or go to a spot (a tap: on the floor,
 * or on a vine, when it has a height).
 */
export type NibOrder =
  | { readonly kind: 'stay' }
  | { readonly kind: 'walk'; readonly dir: -1 | 1 }
  | { readonly kind: 'climb'; readonly dir: -1 | 1 }
  | { readonly kind: 'goto'; readonly x: number; readonly y?: number };
/** A loss to a guard (caught or pricked) says which animal, when the level names it (chapter 2 on), for the loss line. */
export type Status = { readonly state: 'playing' } | { readonly state: 'won' } | { readonly state: 'lost'; readonly cause: LossCause; readonly by?: GuardAnimal };

export type WorldEvent =
  | GrainEvent
  | { readonly type: 'pull'; readonly id: string }
  | { readonly type: 'blocked'; readonly id: string; readonly by: string }
  | { readonly type: 'gateIn'; readonly id: string }
  | { readonly type: 'gateJammed'; readonly id: string }
  | { readonly type: 'collect'; readonly id: number; readonly x: number; readonly y: number }
  | { readonly type: 'goal' }
  | { readonly type: 'washed'; readonly x: number; readonly y: number }
  | { readonly type: 'scorched'; readonly x: number; readonly y: number }
  | { readonly type: 'stomped'; readonly x: number; readonly y: number }
  | { readonly type: 'bonk'; readonly x: number; readonly y: number }
  | { readonly type: 'drained'; readonly x: number; readonly y: number }
  | { readonly type: 'splash'; readonly x: number; readonly y: number }
  | { readonly type: 'chest'; readonly x: number; readonly y: number }
  | VineEvent
  | { readonly type: 'crateBurnt'; readonly x: number; readonly y: number }
  | LedgeEvent
  | RubyEvent
  | TombEvent
  | Exclude<FireEvent, { readonly type: 'steam' | 'crack' }>
  | FrogEvent
  | { readonly type: 'blasted'; readonly x: number; readonly y: number }
  | { readonly type: 'breath'; readonly x: number; readonly y: number }
  | { readonly type: 'jump' };

export interface PinState {
  readonly def: PinDef;
  pulledAt: number | null;
  /** The step a gate pin last went back in, for the art; null if it never has. */
  pushedAt: number | null;
}

/** Everything that changes in a World as it plays, to wind back to (a heart lost). */
export interface WorldSave {
  readonly grains: GrainsSave;
  readonly pulled: readonly (number | null)[];
  readonly pushed: readonly (number | null)[];
  readonly nib: Creature;
  readonly blots: readonly Blot[];
  readonly boulders: readonly Boulder[];
  readonly coinsCollected: number;
  readonly chestTaken: boolean;
  readonly goalMet: boolean;
  readonly steps: number;
  readonly status: Status;
  readonly quietSteps: number;
  readonly order: NibOrder;
  readonly stalled: number;
  /** The vine Nib holds, by index. */
  readonly climbing: number | null;
  readonly vines: readonly VineSave[];
  readonly ledges: readonly LedgeSave[];
  readonly rubies: readonly RubySave[];
  readonly goldLostTo: 'melted' | 'drained';
  readonly tomb: TombSave;
  readonly bowls: readonly boolean[];
  readonly broken: readonly boolean[];
  readonly gasTouch: number;
  readonly calmSteps: number;
  readonly breath: BreathState;
}
