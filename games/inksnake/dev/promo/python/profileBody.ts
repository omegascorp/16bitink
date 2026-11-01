import { type Draw, normals, shade } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import { mix } from '../../../src/art/wash';
import type { Pt } from '../sprites';

/**
 * The olive python's skin, side on: a plain olive-brown body lit along the
 * back and darker down the flank, small smooth scales in staggered rows and
 * the broad pale belly plates along the bottom. Where the skin is stretched
 * over a meal the rows pull apart and the pale skin between the scales shows.
 * Used for the coil behind (unstretched) and the neck round the croc.
 */

export const OLIVE = {
  lit: '#a69853',
  back: '#8b7e43',
  flank: '#665c31',
  deep: '#3e3820',
  belly: '#d6cc93',
  bellyLine: '#9c9160',
  skin: '#a89a7c',
} as const;

/**
 * A body side on: its spine (any direction), the half depth at each point,
 * how stretched the skin is there (0..1), and optionally how far (art units)
 * the scale columns bow forward at mid-depth, wrapping round a round meal.
 */
export interface BodySide {
  readonly spine: readonly Pt[];
  readonly halves: readonly number[];
  readonly stretch: readonly number[];
  readonly bow?: readonly number[];
}

/** Normals turned to face up the screen, so the back stays on top whichever way the body runs. */
function upright(spine: readonly Pt[]): Pt[] {
  return normals(spine).map((n) => (n.y > 0.2 ? { x: -n.x, y: -n.y } : n));
}

/** Points at depth v (-1 the top edge .. 1 the bottom edge) along the body. */
export function across(b: BodySide, v: number): Pt[] {
  const n = upright(b.spine);
  return b.spine.map((p, i) => ({ x: p.x + n[i]!.x * b.halves[i]! * -v, y: p.y + n[i]!.y * b.halves[i]! * -v }));
}

/** The body's outline: top edge then bottom edge back. */
export function outline(b: BodySide): Pt[] {
  return [...across(b, -1), ...across(b, 1).reverse()];
}

/** A band of the body between depths v0 and v1. */
const band = (b: BodySide, v0: number, v1: number): Pt[] => [...across(b, v0), ...across(b, v1).reverse()];

const SCALE_STEP = 2.5;
const ROWS = 9;

/** Paints the body (clipped by the caller): its washes, the pale skin where stretched, scales, belly plates, shading. */
export function paintBody(d: Draw, b: BodySide, shape: readonly Pt[]): void {
  const { pen } = d;
  const ctx = pen.ctx;
  pen.fill(shape, OLIVE.flank, 1);
  pen.fill(band(b, -1, -0.55), OLIVE.lit, 0.9);
  pen.fill(band(b, -0.6, -0.05), OLIVE.back, 0.85);
  pen.fill(band(b, 0.3, 0.55), OLIVE.deep, 0.35);
  // Round: darker towards the top and bottom edges.
  pen.fill(band(b, -1, -0.82), OLIVE.deep, 0.3);
  pen.fill(band(b, 0.82, 1), OLIVE.deep, 0.3);
  // The stretched skin between the scales, column by column.
  const top = across(b, -1);
  const bot = across(b, 1);
  for (let i = 0; i + 1 < b.spine.length; i++) {
    const st = Math.max(b.stretch[i]!, b.stretch[i + 1]!);
    if (st <= 0.02) continue;
    pen.fill([top[i]!, top[i + 1]!, bot[i + 1]!, bot[i]!], OLIVE.skin, Math.min(0.85, st));
  }
  // Round over the meal: shade towards its top and down its lower flank, a lit band between.
  const upper = across(b, -0.62);
  const lower = across(b, 0.2);
  const belly = across(b, 0.6);
  for (let i = 0; i + 1 < b.spine.length; i++) {
    const st = Math.max(b.stretch[i]!, b.stretch[i + 1]!);
    if (st <= 0.05) continue;
    pen.fill([top[i]!, top[i + 1]!, upper[i + 1]!, upper[i]!], OLIVE.deep, 0.3 * st);
    pen.fill([lower[i]!, lower[i + 1]!, belly[i + 1]!, belly[i]!], OLIVE.deep, 0.28 * st);
  }
  // Scales: staggered rows over the back and flank, the same size however far the skin is pulled.
  const n = upright(b.spine);
  const every = Math.max(1, Math.round(SCALE_STEP / Math.max(0.5, Math.hypot(b.spine[1]!.x - b.spine[0]!.x, b.spine[1]!.y - b.spine[0]!.y))));
  ctx.save();
  for (let i = 0, col = 0; i < b.spine.length; i += every, col++) {
    const p = b.spine[i]!;
    const h = b.halves[i]!;
    const st = b.stretch[i]!;
    const ang = Math.atan2(n[i]!.x, -n[i]!.y);
    const bow = b.bow?.[i] ?? 0;
    // Forward along the body (the way its columns bow): the left of the upright normal.
    const fx = n[i]!.y;
    const fy = -n[i]!.x;
    for (let r = 0; r < ROWS; r++) {
      const v = -0.93 + ((r + (col % 2) * 0.5) / ROWS) * 1.38;
      const wrap = bow * (1 - v * v);
      const x = p.x - n[i]!.x * h * v + fx * wrap;
      const y = p.y - n[i]!.y * h * v + fy * wrap;
      const k = (v + 1) / 1.45;
      ctx.fillStyle = mix(mix(OLIVE.lit, OLIVE.flank, k), OLIVE.back, 0.25 * (1 - st));
      ctx.globalAlpha = 0.6 + 0.4 * st;
      ctx.beginPath();
      ctx.ellipse(x, y, 1.45 - 0.2 * st, 1.25 - 0.15 * st, ang, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35 + 0.25 * st;
      ctx.strokeStyle = OLIVE.deep;
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      ctx.ellipse(x, y, 1.45 - 0.2 * st, 1.25 - 0.15 * st, ang, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Light catching the skin stretched round the meal: pale arcs bowing round its girth.
  for (let i = 0; i < b.spine.length; i += every * 4) {
    const st = b.stretch[i]!;
    const bow = b.bow?.[i] ?? 0;
    if (st < 0.3) continue;
    const arc = [-0.95, -0.6, -0.25, 0.1, 0.45].map((v) => {
      const wrap = bow * (1 - v * v);
      return { x: b.spine[i]!.x - n[i]!.x * b.halves[i]! * v + n[i]!.y * wrap, y: b.spine[i]!.y - n[i]!.y * b.halves[i]! * v - n[i]!.x * wrap };
    });
    pen.hair(arc, 0.55, PAPER_FILL, 0.16 * st);
  }
  // The belly plates along the bottom, wide and pale, pulled apart where stretched.
  const bellyTop = across(b, 0.56);
  for (let i = 0; i + every < b.spine.length; i += every) {
    const j = i + Math.max(1, Math.round(every * (1 - 0.4 * b.stretch[i]!)));
    if (j >= b.spine.length) break;
    pen.fill([bellyTop[i]!, bellyTop[j]!, bot[j]!, bot[i]!], OLIVE.belly, 0.92);
    pen.hair([bellyTop[i]!, bot[i]!], 0.3, OLIVE.bellyLine, 0.7);
  }
  shade(d, shape, 0.32);
  // Wet sheen along the back.
  pen.hair(across(b, -0.66).filter((_, i) => i % 3 === 0), 0.7, PAPER_FILL, 0.28);
}
