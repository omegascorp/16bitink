import type { Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { bowed, bowedLoop, fill, HAIR, HAIR_HI, HAIR_LINE, HAIR_SH, HAIR_SHINE, type Ink, INNER, line, OUTER, toward, within } from './humanSkin';

/**
 * The human's anime hair: big clumps with volume, swept forward into bangs
 * over the forehead and down over the ear, spiking back and down at the nape.
 * Flat base, one crisp shadow tone under a jagged edge, a highlight band
 * (the "angel ring") across the crown, clump lines from every notch.
 */

type Corner = readonly [number, number, number];

/** The hair's edge as clumps: each corner and the bulge of the segment leaving it. Front bang tip, up the front, over the top, down the back, then forward along the hairline. */
const CORNERS: readonly Corner[] = [
  // The front: the fringe's leading lock, a notch, the top lock swept forward over it.
  [62, -116, 0.1], [72, -162, -0.05], [96, -180, 0.13],
  // Over the top, broken into clumps by small notches.
  [64, -238, 0.1], [-8, -300, 0.1], [-110, -310, 0.1],
  // Down the back, a few clumps spiking back and down.
  [-186, -272, 0.1], [-232, -228, -0.06], [-220, -202, 0.1], [-256, -160, -0.06], [-234, -132, 0.1], [-248, -88, -0.06],
  [-220, -80, 0.08], [-226, -32, -0.07], [-198, -52, 0.07], [-188, -12, -0.07],
  // The nape, behind and over the ear.
  [-170, -42, -0.04], [-142, -62, -0.08], [-128, -100, 0.06], [-106, -114, 0.05],
  // In front of the ear: the sideburn and temple locks, then the fringe's tips.
  [-88, -106, 0.08], [-80, -72, -0.05], [-66, -106, 0.08], [-44, -88, -0.05], [-28, -128, 0.08], [-4, -106, -0.05],
  [6, -146, 0.1], [18, -116, -0.06], [30, -150, 0.1], [42, -120, -0.06], [52, -148, 0.08],
];

/** Clump lines: from a notch between clumps (a corner) in along the hair to a point. */
const CLUMPS: readonly (readonly [number, number, number])[] = [
  [1, 44, -190], [3, 40, -204], [4, 18, -246], [5, -88, -262],
  [22, -60, -146], [24, -18, -168], [26, 14, -184], [28, 38, -186], [30, 60, -188],
];
/** Notches round the back, whose lines run in toward the hair's mass. */
const NOTCHES = [6, 8, 10, 12, 14, 16, 20] as const;
const MASS: Pt = { x: -84, y: -176 };

export const HAIR_SHAPE: readonly Pt[] = bowedLoop(CORNERS, 10);
/** The corners of the bangs and side locks that hang over the face, back to front: their shadow falls on the skin. */
export const FRINGE: readonly Pt[] = bowedLoop(CORNERS, 10).slice(10 * 20);

/** The back and underside of the hair, turned from the light: the outline from the crown's back round to the nape, and a jagged edge back. */
const SHADOW: readonly Pt[] = (() => {
  const loop = bowedLoop(CORNERS, 10);
  const edge = loop.slice(10 * 6 - 4, 10 * 16 + 1);
  const inner = CORNERS.slice(6, 17).map(([x, y], i) => toward([{ x, y }], MASS, i % 2 ? 58 : 38)[0]!);
  return [...edge, ...spline([...inner].reverse(), 3)];
})();

const CENTRE: Pt = { x: -82, y: -150 };
const at = (a: number, r: number): Pt => ({ x: CENTRE.x + Math.cos(a) * r, y: CENTRE.y + Math.sin(a) * r });

/** The angel ring: a thin band round the crown with slim shine strands hanging from it along the hair. */
function ring(): Pt[][] {
  const band = (a0: number, a1: number): Pt[] => {
    const n = 12;
    const outer = Array.from({ length: n + 1 }, (_, i) => at(a0 + ((a1 - a0) * i) / n, 150));
    const inner = Array.from({ length: n + 1 }, (_, i) => at(a1 + ((a0 - a1) * i) / n, 143 - 2 * Math.sin((Math.PI * i) / n)));
    return [...outer, ...inner];
  };
  const out: Pt[][] = [band(-0.62, -1.5), band(-1.58, -2.5)];
  for (let i = 0; ; i++) {
    const a = -0.66 - i * 0.105;
    if (a < -2.46) break;
    if (Math.abs(a + 1.54) < 0.06) continue;
    const long = [26, 16, 22, 12, 20][i % 5]!;
    out.push([at(a + 0.04, 146), at(a - 0.006, 146 - long), at(a - 0.04, 146)]);
  }
  return out;
}
const RING = ring();

/** Clump lines over the top, where there are no notches: [from, to] along the hair. */
const STRANDS: readonly (readonly Pt[])[] = [
  [{ x: -70, y: -296 }, { x: -20, y: -272 }, { x: 26, y: -236 }, { x: 52, y: -196 }],
  [{ x: -150, y: -280 }, { x: -170, y: -246 }],
];

/** A single cowlick springing up from the crown and curling forward. */
const AHOGE_OUT: readonly Pt[] = bowed({ x: -60, y: -312 }, { x: 4, y: -352 }, -0.32, 12);
const AHOGE_IN: readonly Pt[] = bowed({ x: 4, y: -352 }, { x: -34, y: -314 }, 0.22, 10);

function drawAhoge(k: Ink): void {
  const { ctx } = k;
  const shape = [...AHOGE_OUT, ...AHOGE_IN.slice(1), { x: -36, y: -300 }, { x: -58, y: -300 }];
  fill(ctx, shape, HAIR);
  within(ctx, shape, () => fill(ctx, bowed({ x: -52, y: -318 }, { x: 0, y: -350 }, -0.3, 10).concat([{ x: -30, y: -300 }]), HAIR_HI));
  line(k, AHOGE_OUT, OUTER, { colour: HAIR_LINE, in: 0.25, out: 0.04 });
  line(k, AHOGE_IN, OUTER * 0.85, { colour: HAIR_LINE, in: 0.04, out: 0.5 });
}

export function drawHair(k: Ink): void {
  const { ctx } = k;
  const shape = HAIR_SHAPE;
  fill(ctx, shape, HAIR);
  within(ctx, shape, () => {
    fill(ctx, SHADOW, HAIR_SH);
    for (const piece of RING) fill(ctx, piece, HAIR_HI);
    // Rim light along the top front.
    const rim = toward(shape.slice(22, 46), CENTRE, 4.5);
    line(k, rim, 2.4, { colour: HAIR_SHINE, in: 0.3, out: 0.5, min: 0.4, alpha: 0.9 });
  });
  // Clump lines: from each notch in along the hair, and a few long flow lines over the top.
  for (const [i, ex, ey] of CLUMPS) {
    const [x, y] = CORNERS[i]!;
    line(k, bowed({ x, y }, { x: ex, y: ey }, -0.1, 10), INNER * 1.15, { colour: HAIR_LINE, in: 0, out: 0.8 });
  }
  for (const i of NOTCHES) {
    const [x, y] = CORNERS[i]!;
    const dx = MASS.x - x;
    const dy = MASS.y - y;
    const d = Math.hypot(dx, dy);
    const len = Math.min(46, d * 0.34);
    line(k, bowed({ x, y }, { x: x + (dx / d) * len, y: y + (dy / d) * len }, 0.08, 8), INNER * 1.15, { colour: HAIR_LINE, in: 0, out: 0.85 });
  }
  for (const s of STRANDS) line(k, spline(s, 6), INNER, { colour: HAIR_LINE, in: 0.3, out: 0.6, alpha: 0.85 });
  line(k, [...shape, shape[0]!, shape[1]!], OUTER * 1.05, { colour: HAIR_LINE, in: 0, out: 0 });
  drawAhoge(k);
}
