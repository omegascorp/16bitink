import type { DrillSpec } from './drill';
import type { Loadout, Piece } from './gear';
import { worldOfChapter } from './starSystem';
import { AIR, type SuitSpec } from './suit';

/**
 * What each gear piece's mark gives (spec, "Gear"). A new mark beats the
 * old one at everything, so there's never a trade-off to puzzle over, and
 * the steps are even (no exponential curves): every piece you build is
 * worth about the same step forward.
 */
export const MARK_STEP = {
  /** Cell: energy per trip. */
  energy: { base: 100, per: 40 },
  /** Pack: bag slots (each stacks SUIT_STACK of one ore). */
  slots: { base: 4, per: 2 },
  /** Jetpack: seconds-of-thrust fuel (burns 10 a second). */
  fuel: { base: 60, per: 30 },
  /** Jetpack: top climb speed, px/s. */
  rise: { base: 240, per: 25 },
  /** Helmet: lamp reach in tiles. */
  lamp: { base: 4.5, per: 1.5 },
} as const;

const at = (s: { readonly base: number; readonly per: number }, mk: number): number => s.base + s.per * mk;

/** Hearts a suit of mark `mk` has: one more on every odd mark. */
const heartsAt = (mk: number): number => 3 + Math.ceil(mk / 2);
/** Shield bars a suit of mark `mk` has: one more on every even mark. */
const shieldAt = (mk: number): number => 1 + Math.floor(mk / 2);

/** The suit's numbers for a loadout: the cell's energy, the jetpack's tank, the pack's slots, the suit's hearts and shield, and life support. */
export function suitSpecFor(l: Loadout): SuitSpec {
  return {
    energy: at(MARK_STEP.energy, l.cell), fuel: at(MARK_STEP.fuel, l.jetpack), slots: at(MARK_STEP.slots, l.pack),
    hearts: heartsAt(l.suit), shield: shieldAt(l.suit), air: AIR.full,
  };
}

export interface JetSpec {
  /** Px/s² of thrust (gravity is 900). */
  readonly thrust: number;
  /** Top climb speed, px/s. */
  readonly maxRise: number;
  /** Fuel a second. */
  readonly burn: number;
}

export function jetFor(mk: number): JetSpec {
  return { thrust: 1650 + 100 * mk, maxRise: at(MARK_STEP.rise, mk), burn: 10 };
}

export function drillFor(l: Loadout, planet: number): DrillSpec {
  return { mk: l.drill, planet };
}

/** How far the helmet lamp lights, in tiles. */
export function lampFor(mk: number): number {
  return at(MARK_STEP.lamp, mk);
}

/** "Graphite's stone": the stone a drill of mark `mk` is built for, on chapter `mk`'s world. */
function stoneOf(mk: number): string {
  const name = worldOfChapter(mk)?.name;
  return name ? `${name}'s stone` : `planet ${mk}'s stone`;
}

/** What going from mark `mk - 1` to `mk` gives, in a few words, for the fabricator sheet. */
export function markGain(piece: Piece, mk: number): string {
  const was = mk - 1;
  switch (piece) {
    case 'drill': return `breaks ${stoneOf(mk)}`;
    case 'cell': return `energy ${at(MARK_STEP.energy, was)} → ${at(MARK_STEP.energy, mk)}`;
    case 'pack': return `bag ${at(MARK_STEP.slots, was)} → ${at(MARK_STEP.slots, mk)} slots`;
    case 'suit':
      return heartsAt(mk) > heartsAt(was) ? `hearts ${heartsAt(was)} → ${heartsAt(mk)}` : `shield ${shieldAt(was)} → ${shieldAt(mk)} bars`;
    case 'helmet': return `lamp ${lampFor(was)} → ${lampFor(mk)} tiles`;
    case 'jetpack': return `fuel ${at(MARK_STEP.fuel, was) / 10} → ${at(MARK_STEP.fuel, mk) / 10} s, faster climb`;
  }
}

/** What a piece at mark `mk` does now, in a few words. */
export function markStat(piece: Piece, mk: number): string {
  switch (piece) {
    case 'drill': return mk === 0 ? 'starter drill: soil only' : `breaks ${stoneOf(mk)}`;
    case 'cell': return `${at(MARK_STEP.energy, mk)} energy`;
    case 'pack': return `${at(MARK_STEP.slots, mk)} bag slots`;
    case 'suit': return `${heartsAt(mk)} hearts, ${shieldAt(mk)} shield bar${shieldAt(mk) > 1 ? 's' : ''}`;
    case 'helmet': return `lamp ${lampFor(mk)} tiles`;
    case 'jetpack': return `${at(MARK_STEP.fuel, mk) / 10} s of fuel`;
  }
}
