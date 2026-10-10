import type { Box } from './body';
import { PHYS } from './body';
import { isSolid, type Terrain } from './terrain';

/**
 * Steam vents (Ash & Basalt, beach 5): a narrow shaft in the rock that
 * blows steam on a steady rhythm. It hisses first (the warning), then
 * blows a column of steam that throws anything over it `height` tiles over
 * its rim:
 * crab, creatures and food alike. Steam never harms. Sand dropped into the
 * shaft plugs it, quiet until it's dug out again.
 */
export interface VentSpec {
  /** Column of the shaft. */
  readonly col: number;
  /** Tiles the steam throws a crab up. */
  readonly height: number;
  /** Seconds from one blow to the next. */
  readonly period: number;
  /** Seconds into its rhythm at the start, so vents don't all blow together. */
  readonly offset: number;
}

/** A vent in a built level: its spec, and the rows of its shaft (top open row, and the rock floor under it). */
export interface Vent extends VentSpec {
  readonly top: number;
  readonly floor: number;
}

export const VENT = {
  /** Rows of open shaft below the rim. */
  shaft: 2,
  /** Seconds it hisses before it blows: the warning. */
  hiss: 1.3,
  /** Seconds it blows. */
  blow: 0.7,
  /** Tiles either side of the shaft the steam column spreads. */
  spread: 0.35,
} as const;

export type VentPhase = 'quiet' | 'hiss' | 'blow';

export interface VentState {
  readonly phase: VentPhase;
  /** How far through the phase, 0..1. */
  readonly k: number;
  /** Which blow this is (counting from the start): a body is thrown once per blow. */
  readonly puff: number;
}

/** Where a vent is in its rhythm at `t` seconds: it blows at the end of each period, hissing just before. */
export function ventState(v: VentSpec, t: number): VentState {
  const u = t + v.offset;
  const puff = Math.floor(u / v.period);
  const into = u - puff * v.period;
  const blowAt = v.period - VENT.blow;
  const hissAt = blowAt - VENT.hiss;
  if (into >= blowAt) return { phase: 'blow', k: (into - blowAt) / VENT.blow, puff };
  if (into >= hissAt) return { phase: 'hiss', k: (into - hissAt) / VENT.hiss, puff };
  return { phase: 'quiet', k: into / hissAt, puff };
}

/** Plugged: sand somewhere in the shaft. */
export function plugged(t: Terrain, v: Vent): boolean {
  for (let y = v.top; y < v.floor; y++) if (isSolid(t, v.col, y)) return true;
  return false;
}

/** The column of steam while it blows: from the shaft floor up as high as it throws. */
export function plume(v: Vent, tile: number): Box {
  const x = (v.col - VENT.spread) * tile;
  const y = (v.top - v.height) * tile;
  return { x, y, w: (1 + VENT.spread * 2) * tile, h: (v.floor - (v.top - v.height)) * tile };
}

/**
 * Upward speed (px/s) that carries a body whose feet are at `feet` up to
 * `apex` (world y): every body a vent throws goes as high, whether it
 * stood on the rim or had dropped into the shaft.
 */
export function throwSpeed(feet: number, apex: number): number {
  return Math.sqrt(2 * PHYS.gravity * Math.max(0, feet - apex));
}

/** A vent blowing now: its index, which blow, the steam column, and the height (world y) it throws things up to. */
export interface Blast {
  readonly vent: number;
  readonly puff: number;
  readonly plume: Box;
  readonly apex: number;
}

/** The vents blowing at `t` (plugged ones stay quiet). */
export function blasts(vents: readonly Vent[], t: Terrain, time: number, tile: number): Blast[] {
  const out: Blast[] = [];
  vents.forEach((v, i) => {
    const s = ventState(v, time);
    if (s.phase === 'blow' && !plugged(t, v)) out.push({ vent: i, puff: s.puff, plume: plume(v, tile), apex: (v.top - v.height) * tile });
  });
  return out;
}
