import type { CreatureId } from './creatures';
import type { Hex } from './hex';
import type { Skills } from './skills';
import type { EffectKind, SpellId } from './spells';

export type Side = 0 | 1;

export interface Effect {
  readonly kind: EffectKind;
  readonly rounds: number;
}

/** One stack on the field. */
export interface Stack {
  readonly id: number;
  readonly side: Side;
  readonly creature: CreatureId;
  readonly count: number;
  /** HP left on the top creature. */
  readonly topHp: number;
  readonly startCount: number;
  readonly hex: Hex;
  readonly shots: number;
  readonly retaliationsLeft: number;
  /** The army slot it came from, to send survivors back. */
  readonly slot: number;
  readonly acted: boolean;
  readonly waited: boolean;
  readonly defending: boolean;
  /** Had its good-morale extra turn this round. */
  readonly moraleUsed: boolean;
  readonly effects: readonly Effect[];
}

/** What a hero brings to a battle. */
export interface BattleHero {
  readonly name: string;
  readonly attack: number;
  readonly defense: number;
  readonly power: number;
  readonly mana: number;
  readonly spells: readonly SpellId[];
  readonly skills: Skills;
  /** Morale and luck from skills and sites (the army's own bonuses are added per stack). */
  readonly morale: number;
  readonly luck: number;
}

export interface BattleState {
  readonly round: number;
  readonly stacks: readonly Stack[];
  readonly obstacles: readonly Hex[];
  readonly heroes: readonly [BattleHero | null, BattleHero | null];
  /** The stack whose turn it is (null once the battle is over). */
  readonly active: number | null;
  /** Whether each side's hero has cast this round. */
  readonly cast: readonly [boolean, boolean];
  readonly seed: number;
  readonly winner: Side | null;
}

export type Action =
  | { readonly type: 'move'; readonly to: Hex }
  | { readonly type: 'attack'; readonly target: number; readonly from: Hex }
  | { readonly type: 'shoot'; readonly target: number }
  | { readonly type: 'wait' }
  | { readonly type: 'defend' }
  | { readonly type: 'cast'; readonly spell: SpellId; readonly target: number };

/** What happened, in order, for the battle scene to animate. */
export type BattleEvent =
  | { readonly type: 'move'; readonly stack: number; readonly path: readonly Hex[]; readonly flies: boolean }
  | { readonly type: 'strike'; readonly stack: number; readonly target: number; readonly damage: number; readonly kills: number; readonly lucky: boolean; readonly retaliation: boolean; readonly ranged: boolean }
  | { readonly type: 'spell'; readonly side: Side; readonly spell: SpellId; readonly target: number; readonly amount: number; readonly kills: number }
  | { readonly type: 'wait'; readonly stack: number }
  | { readonly type: 'defend'; readonly stack: number }
  | { readonly type: 'morale'; readonly stack: number; readonly good: boolean }
  | { readonly type: 'turn'; readonly stack: number }
  | { readonly type: 'round'; readonly round: number }
  | { readonly type: 'end'; readonly winner: Side };

export interface Step {
  readonly state: BattleState;
  readonly events: readonly BattleEvent[];
}
