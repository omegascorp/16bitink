import { createRng, type Rng } from '../../logic/rng';
import { BOARD, type LevelDef, type SolidDef } from '../../level/types';
import { pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { rgba } from '../wash';

/**
 * What the reef's painters share: the sea's and the sand's colours, where a
 * level's cays and coral heads lie, a steady seed for a spot, and soft
 * round glazes (the reef is painted almost all in washes).
 */
export const DEEP = '#2c7891';
export const DEEP_DARK = '#1f5a78';
export const MID = '#4b9fa8';
export const TEAL = '#3f9c96';
export const SHALLOW = '#86cdbf';
export const LAGOON = '#b4e4d3';
export const SAND_UNDER = '#d8e2bd';
export const SAND = '#e8d6a6';
export const SAND_DRY = '#f3e8c8';
export const SAND_WET = '#c4b285';
export const SAND_DEEP = '#9c8a62';
export const FOAM = '#fbfaf1';
export const REEF_DARK = '#35666f';
export const ALGAE = '#6c8a58';
export const ALGAE_DEEP = '#435f3e';
export const RUBBLE = '#c9bfa0';
export const RUBBLE_DEEP = '#857a62';
export const WATER_INK = '#1d3f63';

export const W = BOARD.w;
export const H = BOARD.h;

/** A steady little random series for a spot (and a k to tell apart several at one spot). */
export const rngAt = (x: number, y: number, k = 0): Rng => createRng(Math.round(x * 131 + y * 71 + k * 977) + 7919);

export interface Cay {
  readonly c: Pt;
  /** The dry sand's radius (the level's land zone). */
  readonly r: number;
  /** The shallows' radius round it (the level's sand zone). */
  readonly shallows: number;
}

/** A level's cays: each land circle, with the shallows' circle round it. */
export function caysOf(level: LevelDef): Cay[] {
  const zones = level.zones ?? [];
  return zones.flatMap((z) => {
    if (z.kind !== 'land' || z.shape !== 'circle') return [];
    const sh = zones.find((s) => s.kind === 'sand' && s.shape === 'circle' && s.x === z.x && s.y === z.y);
    return [{ c: pt(z.x, z.y), r: z.r, shallows: sh && sh.shape === 'circle' ? sh.r : z.r + 36 }];
  });
}

export type Circle = Extract<SolidDef, { kind: 'circle' }>;

/** A level's coral heads (in the water) and its rocks (on the cays). */
export const coralsOf = (level: LevelDef): Circle[] => (level.solids ?? []).filter((s): s is Circle => s.kind === 'circle' && s.look === 'coral');

/** How far a point is from the nearest cay's shore (negative on the sand), and that cay. */
export function shoreDist(cays: readonly Cay[], x: number, y: number): number {
  let d = Infinity;
  for (const k of cays) d = Math.min(d, Math.hypot(x - k.c.x, y - k.c.y) - k.r);
  return d;
}

/** A soft round glaze of colour, densest in its middle (rx × ry, turned by rot). */
export function glazeAt(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rot: number, colour: string, alpha: number, hard = 0.55): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(colour, alpha));
  g.addColorStop(hard, rgba(colour, alpha * 0.8));
  g.addColorStop(1, rgba(colour, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/** An irregular ring of points round c, radius r wobbling by `rough`. */
export function wobblyRing(c: Pt, r: number, rng: Rng, rough = 0.1, n = 40): Pt[] {
  const ph = [rng() * TAU, rng() * TAU, rng() * TAU, rng() * TAU];
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const k = 1 + rough * (0.5 * Math.sin(2 * a + ph[0]!) + 0.3 * Math.sin(3 * a + ph[1]!) + 0.2 * Math.sin(5 * a + ph[2]!) + 0.12 * Math.sin(9 * a + ph[3]!));
    return pt(c.x + Math.cos(a) * r * k, c.y + Math.sin(a) * r * k);
  });
}

/** Fills a path on the canvas with one colour. */
export function fillPts(ctx: CanvasRenderingContext2D, pts: readonly Pt[], style: string | CanvasGradient): void {
  ctx.save();
  ctx.fillStyle = style;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
