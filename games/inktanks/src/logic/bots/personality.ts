/**
 * Bot personalities (a small set, design doc "Bots") and per-chapter difficulty.
 */
export type PersonalityId = 'camper' | 'hunter' | 'looter' | 'coward' | 'player';

export interface Personality {
  readonly id: PersonalityId;
  /** Fight when my odds (their time to kill me ÷ my time to kill them) are at least this. */
  readonly engage: number;
  /** Flee below this share of HP. */
  readonly fleeHp: number;
  /** Start moving into the next circle this many seconds before it shrinks. */
  readonly rotateLead: number;
  /** How far a bot looks for loot, px. */
  readonly lootRange: number;
  /** How much loot is worth against everything else. */
  readonly lootBias: number;
  /** Goes looking for enemies it heard firing. */
  readonly roams: boolean;
  /** Sits still inside the circle when there's nothing to do. */
  readonly sits: boolean;
}

export const PERSONALITIES: Readonly<Record<PersonalityId, Personality>> = {
  camper: { id: 'camper', engage: 0.9, fleeHp: 0.3, rotateLead: 30, lootRange: 500, lootBias: 0.8, roams: false, sits: true },
  hunter: { id: 'hunter', engage: 0.6, fleeHp: 0.2, rotateLead: 8, lootRange: 550, lootBias: 0.7, roams: true, sits: false },
  looter: { id: 'looter', engage: 1.0, fleeHp: 0.35, rotateLead: 15, lootRange: 900, lootBias: 1.6, roams: false, sits: false },
  coward: { id: 'coward', engage: 1.5, fleeHp: 0.5, rotateLead: 35, lootRange: 600, lootBias: 1.0, roams: false, sits: true },
  player: { id: 'player', engage: 0.75, fleeHp: 0.3, rotateLead: 20, lootRange: 800, lootBias: 1.2, roams: true, sits: false },
};

export interface Difficulty {
  /** Standard spread of aim, radians. */
  readonly aimError: number;
  /** Seconds between decisions. */
  readonly reaction: number;
  /** Chance to keep range (retreat while firing) when it outranges the target. */
  readonly kite: number;
  /** Prefers the weakest visible enemy. */
  readonly focus: boolean;
  /** How much a supply drop is worth. */
  readonly greed: number;
}

export const CH1_BOTS: Difficulty = { aimError: 0.2, reaction: 0.4, kite: 0.3, focus: false, greed: 0.6 };
/** The player's stand-in in the sim: a decent casual player. */
export const PLAYER_BOT: Difficulty = { aimError: 0.14, reaction: 0.28, kite: 0.6, focus: true, greed: 0.8 };
export const ACE_BOT: Difficulty = { aimError: 0.1, reaction: 0.25, kite: 0.8, focus: true, greed: 0.3 };
