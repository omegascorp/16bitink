import { PAPER_FILL } from '../../../src/art/fish/kit';
import { INK, type Pen, type Pt } from '../../../src/art/pen';
import { cap, closed, partial, pt, ribbon, run } from './ink';

/**
 * The axolotl's four thin legs, in its own units (see axolotl.ts): a ribbon
 * from shoulder to knee to foot, and thin toes with round tips. The near
 * front leg can be drawn only part grown (from a bud to the whole leg), and
 * its toes each at their own pop-in size.
 */

export const SKIN = '#f4b3c0';
export const SKIN_DARK = '#c97488';
const NEW_SKIN = '#ff9db4';

export interface LegDef {
  readonly from: Pt;
  readonly knee: Pt;
  readonly foot: Pt;
  /** Toe directions, radians, and lengths. */
  readonly toes: readonly (readonly [number, number])[];
  readonly width: number;
}

const FRONT_TOES: readonly (readonly [number, number])[] = [[-0.05, 14], [0.32, 15], [0.7, 14], [1.08, 11]];
const HIND_TOES: readonly (readonly [number, number])[] = [[0.1, 12], [0.45, 14], [0.85, 14], [1.25, 13], [1.7, 10]];
export const NEAR_FRONT: LegDef = { from: pt(46, 20), knee: pt(62, 38), foot: pt(58, 56), toes: FRONT_TOES, width: 8.5 };
export const NEAR_HIND: LegDef = { from: pt(-56, 20), knee: pt(-66, 40), foot: pt(-56, 57), toes: HIND_TOES, width: 9 };
export const FAR_HIND: LegDef = { from: pt(-66, 16), knee: pt(-78, 37), foot: pt(-70, 55), toes: HIND_TOES, width: 8 };

/** The leg grown to `k` of its size, about its shoulder: a little leg that gets bigger as it regrows. */
export const grownLeg = (leg: LegDef, k: number): LegDef => {
  const at = (p: Pt): Pt => pt(leg.from.x + (p.x - leg.from.x) * k, leg.from.y + (p.y - leg.from.y) * k);
  return { from: leg.from, knee: at(leg.knee), foot: at(leg.foot), toes: leg.toes.map(([a, len]) => [a, len * k] as const), width: leg.width * (0.55 + 0.45 * k) };
};

export const legLine = (leg: LegDef): Pt[] => [...run(leg.from, leg.knee, 8), ...run(leg.knee, leg.foot, 8).slice(1)];
export const toeTip = (leg: LegDef, i: number, scale = 1): Pt => {
  const [a, len] = leg.toes[i]!;
  return pt(leg.foot.x + Math.cos(a) * len * scale, leg.foot.y + 2 + Math.sin(a) * len * 0.7 * scale);
};

/** One toe: a thin tapering finger with a round tip. */
function toeShape(leg: LegDef, i: number, scale: number): Pt[] {
  const base = pt(leg.foot.x, leg.foot.y + 1);
  const tip = toeTip(leg, i, scale);
  return ribbon(run(base, tip, 5), (u) => (3.2 - 1.3 * u) * Math.min(1, scale)).shape;
}

/** The leg as one ribbon (from its root to `grow` of the way down), rounded at the end. */
export function legShape(leg: LegDef, grow: number): { readonly shape: Pt[]; readonly end: Pt } {
  const line = partial(legLine(leg), grow);
  const n = line.length;
  const end = line[n - 1]!;
  const prev = line[Math.max(0, n - 2)]!;
  const r = leg.width * (1 - 0.3 * grow) * (0.85 + 0.15 * grow);
  const { left, right } = ribbon(line, (u) => leg.width * (1 - 0.3 * u * grow) * (0.85 + 0.15 * grow));
  // The cap runs from the left side round the end to the right side.
  const round = cap(end, { x: end.x - prev.x, y: end.y - prev.y }, r).reverse();
  return { shape: [...left, ...round, ...[...right].reverse()], end };
}

export function drawLeg(pen: Pen, leg: LegDef, grow: number, toes: readonly number[], lw: number, far: boolean, fresh = 0, clear = 0): void {
  const { shape } = legShape(leg, grow);
  const wash = far ? SKIN_DARK : SKIN;
  const fill = (s: Pt[]): void => {
    pen.fill(s, PAPER_FILL, 1 - 0.85 * clear);
    pen.fill(s, wash, (far ? 0.75 : 0.85) * (1 - 0.45 * clear));
    if (fresh > 0) pen.fill(s, NEW_SKIN, fresh * (1 - 0.6 * clear));
    // See-through: a pale cold tint, like an X-ray.
    if (clear > 0.01) pen.fill(s, '#ffe3ea', 0.25 * clear);
  };
  toes.forEach((s, i) => {
    if (s <= 0.02) return;
    const toe = toeShape(leg, i, s);
    fill(toe);
    pen.stroke(closed(toe), lw * 0.7, INK, far ? 0.75 : 1, false);
  });
  fill(shape);
  if (!far) pen.hatch(shape, 2.6, 0.9, lw * 0.35, { color: SKIN_DARK, alpha: 0.5 * (1 - clear), onlyBelow: leg.knee.y - 6 });
  pen.stroke(closed(shape), lw, INK, far ? 0.75 : 1, !far);
}

/** The dashed outline of the whole leg and its toes, where the new one will grow. */
export function drawGhostLeg(ctx: CanvasRenderingContext2D, leg: LegDef, alpha: number, lw: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#fff6dc';
  ctx.lineWidth = lw * 1.1;
  ctx.setLineDash([lw * 3.2, lw * 2.6]);
  ctx.lineCap = 'round';
  const trace = (pts: readonly Pt[]): void => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
  };
  trace(legShape(leg, 1).shape);
  // The toes as dotted lines, fanned from the foot.
  ctx.setLineDash([lw * 1.2, lw * 1.8]);
  leg.toes.forEach((_, i) => {
    const tip = toeTip(leg, i);
    ctx.beginPath();
    ctx.moveTo(leg.foot.x, leg.foot.y + 1);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  });
  ctx.restore();
}
