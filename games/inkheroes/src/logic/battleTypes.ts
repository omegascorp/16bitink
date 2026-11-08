import type { CreatureId, TownFaction } from './creatures';
import type { Hex } from './hex';
import type { Siege, SiegePart, WallPart } from './siege';
import type { Skills } from './skills';
import type { EffectKind, SpellId } from './spells';

export type Side = 0 | 1;

export interface Effect {
  readonly kind: EffectKind;
  /** Rounds left (poison counts its stack's turns instead; a ward lasts until spent). */
  readonly rounds: number;
  /** A ward: the damage it will still soak. */
  readonly left?: number;
  /** Poison: the damage each tick takes. */
  readonly dose?: number;
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
  /** Up on this tower (its index in TOWERS): it shoots from there, out of reach of any blow, until the tower falls. */
  readonly tower?: number;
  /** Has risen again once this battle (a Bennu's rebirth). */
  readonly reborn?: boolean;
}

/** What a hero brings to a battle. */
export interface BattleHero {
  readonly name: string;
  readonly attack: number;
  readonly defense: number;
  readonly power: number;
  readonly mana: number;
  readonly spells: readonly SpellId[];
  /** Ankhs carried: the Rite of Osiris spends one. */
  readonly ankhs?: number;
  readonly skills: Skills;
  /** Morale and luck from skills and sites (the army's own bonuses are added per stack). */
  readonly morale: number;
  readonly luck: number;
  /** A lord with a town of his own to ride to: he can leave a lost battle (H3's retreat), giving up his army. */
  readonly canFlee?: boolean;
  /** Their people (none: the Greeks'), for how the battle speaks of their war machine. */
  readonly faction?: TownFaction;
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
  /** The side whose hero left the field (the other side won). */
  readonly fled?: Side;
  /** The walls, in a battle at a fortified town. */
  readonly siege?: Siege;
}

export type Action =
  | { readonly type: 'move'; readonly to: Hex }
  | { readonly type: 'attack'; readonly target: number; readonly from: Hex }
  | { readonly type: 'shoot'; readonly target: number }
  | { readonly type: 'wait' }
  | { readonly type: 'defend' }
  /** A Catapult's turn: where the stone lands is the dice's. */
  | { readonly type: 'catapult' }
  /** A siege ramp's first turn: its workers begin a ramp against stretch `part` (the finest begins two, one action each). */
  | { readonly type: 'ramp'; readonly part: WallPart }
  /** Strikes the gate or a tower by hand from head hex `from`, walking there first. */
  | { readonly type: 'bash'; readonly part: SiegePart; readonly from: Hex }
  | { readonly type: 'cast'; readonly spell: SpellId; readonly target: number }
  /** The side's hero leaves the field with what is left of the army lost to them. */
  | { readonly type: 'flee' };

/** What happened, in order, for the battle scene to animate. */
export type BattleEvent =
  | { readonly type: 'move'; readonly stack: number; readonly path: readonly Hex[]; readonly flies: boolean }
  /** `damage` is what got through; `soaked`, what a ward took first. */
  | { readonly type: 'strike'; readonly stack: number; readonly target: number; readonly damage: number; readonly kills: number; readonly lucky: boolean; readonly retaliation: boolean; readonly ranged: boolean; readonly soaked?: number }
  | { readonly type: 'spell'; readonly side: Side; readonly spell: SpellId; readonly target: number; readonly amount: number; readonly kills: number }
  | { readonly type: 'wait'; readonly stack: number }
  | { readonly type: 'defend'; readonly stack: number }
  | { readonly type: 'heal'; readonly stack: number; readonly target: number; readonly amount: number }
  | { readonly type: 'morale'; readonly stack: number; readonly good: boolean }
  /** A strike that landed cursed or poisoned its target. */
  | { readonly type: 'afflict'; readonly stack: number; readonly effect: 'curse' | 'poison' }
  /** Poison ate at a stack as its turn began. */
  | { readonly type: 'poison'; readonly stack: number; readonly damage: number; readonly kills: number }
  /** A stack wiped out rose again with `count` creatures. */
  | { readonly type: 'rebirth'; readonly stack: number; readonly count: number }
  /** A stack turned to stone, or (`lost`) the turn that costs it. */
  | { readonly type: 'stone'; readonly stack: number; readonly lost: boolean }
  /** A stone from a catapult: `blows` 0 is a miss. */
  | { readonly type: 'siege'; readonly stack: number; readonly part: SiegePart; readonly blows: number; readonly down: boolean }
  /** A ramp begun (`stage` 0) or grown a stage at a round's start; done once `stage` reaches `need`. */
  | { readonly type: 'ramp'; readonly stack: number; readonly part: WallPart; readonly stage: number; readonly need: number }
  /** A company struck `part` by hand: `left` strikes more bring it down. */
  | { readonly type: 'bash'; readonly stack: number; readonly part: SiegePart; readonly left: number }
  /** A walker in the moat. */
  | { readonly type: 'moat'; readonly stack: number; readonly damage: number; readonly kills: number }
  /** A tower fell: the company on it stands on the ground at `to`. */
  | { readonly type: 'fall'; readonly stack: number; readonly to: Hex }
  | { readonly type: 'turn'; readonly stack: number }
  | { readonly type: 'round'; readonly round: number }
  /** A hero left the field: the side's companies go with them. */
  | { readonly type: 'flee'; readonly side: Side }
  | { readonly type: 'end'; readonly winner: Side };

export interface Step {
  readonly state: BattleState;
  readonly events: readonly BattleEvent[];
}
