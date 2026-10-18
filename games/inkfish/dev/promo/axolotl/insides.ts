import { halo } from '../../../src/art/glowArt';
import { ellipse, INK, type Pen, type Pt } from '../../../src/art/pen';
import type { LegLook } from './axolotl';
import { type LegDef, legLine, toeTip } from './legs';
import { drawTwinkle, partial, pt, ribbon, run } from './ink';
import type { Organ } from './story';

/**
 * What the see-through look shows: in the regrowing leg, its bones forming
 * and its muscles wrapping them (and the little bones in each toe); in the
 * whole body, the spine, and a glowing heart and brain whose cracks zip shut.
 * In the axolotl's own units (see axolotl.ts).
 */

export interface Insides {
  /** The whole body see-through, 0 .. 1. */
  readonly xray: number;
  /** Just the regrowing leg see-through, 0 .. 1. */
  readonly legXray: number;
  /** How far its bones have formed, and its muscles, 0 .. 1. */
  readonly bones: number;
  readonly muscles: number;
  readonly heart: Organ;
  readonly brain: Organ;
  /** The heart's beat, 0 .. ~1. */
  readonly beat: number;
}

const BONE = '#fff6e2';
const MUSCLE = '#e35a72';
const HEART = '#ff4b66';
const BRAIN = '#f6a2c9';
const SEAM = '#ffe28a';
export const HEART_AT_BODY = pt(66, 12);
export const BRAIN_AT_BODY = pt(93, -17);

/** A bone from a to b: a rod with a knob at each end. */
function bone(pen: Pen, a: Pt, b: Pt, w: number, lw: number, alpha: number): void {
  if (alpha <= 0.01 || Math.hypot(b.x - a.x, b.y - a.y) < 0.5) return;
  const { shape } = ribbon(run(a, b, 4), () => w);
  pen.fill(shape, BONE, alpha);
  for (const p of [a, b]) pen.fill(ellipse(p.x, p.y, w * 1.45, w * 1.45, 10), BONE, alpha);
  pen.hair([...shape, shape[0]!], lw * 0.4, INK, 0.6 * alpha);
}

/** A muscle bundle beside a bone: a long lens, striated along its length. */
function muscle(pen: Pen, a: Pt, b: Pt, side: number, w: number, lw: number, alpha: number): void {
  if (alpha <= 0.01) return;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const n = pt(-(b.y - a.y) / len, (b.x - a.x) / len);
  const off = (p: Pt, k: number): Pt => pt(p.x + n.x * k * side, p.y + n.y * k * side);
  const mid = run(off(a, w * 1.3), off(b, w * 1.3), 8);
  const { shape } = ribbon(mid, (u) => w * Math.sin(Math.PI * (0.08 + 0.84 * u)));
  pen.fill(shape, MUSCLE, 0.8 * alpha);
  for (const k of [-0.45, 0, 0.45]) pen.hair(run(off(a, w * (1.3 + k)), off(b, w * (1.3 + k)), 6).slice(1, -1), lw * 0.3, '#9e2a43', 0.7 * alpha);
  pen.hair([...shape, shape[0]!], lw * 0.4, '#7a1f33', 0.7 * alpha);
}

/** The leg's insides, as far as the leg (`look.grow`) and its bones and muscles have formed. */
export function drawLegInsides(pen: Pen, ins: Insides, leg: LegDef, look: LegLook, lw: number, clear: number): void {
  const line = legLine(leg);
  const at = (f: number): Pt => partial(line, f).at(-1)!;
  const reach = Math.min(look.grow, ins.bones);
  const upper = [0.06, 0.52] as const;
  const lower = [0.6, 0.94] as const;
  const a = clear;
  if (reach > upper[0]) {
    const end = at(Math.min(upper[1], reach));
    muscle(pen, at(upper[0]), end, 1, 2, lw, a * ins.muscles);
    muscle(pen, at(upper[0]), end, -1, 2, lw, a * ins.muscles);
    bone(pen, at(upper[0]), end, 1.5, lw, a);
  }
  if (reach > lower[0]) {
    const from = at(lower[0]);
    const to = at(Math.min(lower[1], reach));
    const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const n = pt(-(to.y - from.y) / len, (to.x - from.x) / len);
    muscle(pen, from, to, 1, 1.8, lw, a * ins.muscles);
    muscle(pen, from, to, -1, 1.8, lw, a * ins.muscles);
    for (const s of [1, -1]) bone(pen, pt(from.x + n.x * 1.4 * s, from.y + n.y * 1.4 * s), pt(to.x + n.x * 1.4 * s, to.y + n.y * 1.4 * s), 0.95, lw, a);
  }
  // The wrist and the bones in each toe, as the toes pop out.
  look.toes.forEach((s, i) => {
    if (s <= 0.05) return;
    const tip = toeTip(leg, i, s);
    const base = pt(leg.foot.x, leg.foot.y + 1);
    const p = (k: number): Pt => pt(base.x + (tip.x - base.x) * k, base.y + (tip.y - base.y) * k);
    bone(pen, p(0.2), p(0.52), 0.75, lw, a * ins.bones);
    bone(pen, p(0.62), p(0.86), 0.65, lw, a * ins.bones);
  });
  if (reach > 0.96) for (const k of [-1.5, 0, 1.5]) pen.fill(ellipse(leg.foot.x + k, leg.foot.y - 1, 1.1, 1.1, 8), BONE, a * ins.bones);
}

const heartShape = (c: Pt, s: number): Pt[] =>
  Array.from({ length: 44 }, (_, i) => {
    const th = (i / 44) * Math.PI * 2;
    return pt(c.x + (s * 16 * Math.sin(th) ** 3) / 16, c.y - (s * (13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th))) / 16);
  });

const brainShape = (c: Pt, rx: number, ry: number): Pt[] =>
  Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    const r = 1 + 0.07 * Math.sin(a * 7) + 0.04 * Math.sin(a * 11 + 1);
    return pt(c.x + Math.cos(a) * rx * r, c.y + Math.sin(a) * ry * r * (Math.sin(a) > 0 ? 0.85 : 1));
  });

/** A crack across an organ, zipping shut from its first end: the healed part a bright seam, the rest a dark gap. */
function drawCrack(pen: Pen, zig: readonly Pt[], mend: number, lw: number, alpha: number): void {
  const healed = partial(zig, mend);
  const open = partial([...zig].reverse(), 1 - mend);
  if (mend < 0.99) pen.stroke(open, lw * 0.9, INK, 0.9 * alpha, false);
  if (mend > 0.01) pen.hair(healed, lw * 0.55, SEAM, alpha);
}

function drawBurst(ctx: CanvasRenderingContext2D, c: Pt, u: number | null, reach: number): void {
  if (u === null) return;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const d = reach * (0.5 + 0.9 * u);
    drawTwinkle(ctx, pt(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d), 5.5 * (1 - u * 0.5), (1 - u) ** 1.2, '#fff3c4', u * 2);
  }
}

/** The whole body's insides: spine, heart and brain, glowing through the skin. */
export function drawInsides(ctx: CanvasRenderingContext2D, pen: Pen, ins: Insides, spineY: (x: number) => number, lw: number): void {
  const a = ins.xray;
  for (let x = 50; x > -192; x -= 7.5) {
    const s = 1 - Math.max(0, (-x - 40) / 200) * 0.65;
    const y = spineY(x) - 6;
    pen.fill(ellipse(x, y, 2.6 * s, 3.3 * s, 10), BONE, 0.75 * a);
    pen.hair([...ellipse(x, y, 2.6 * s, 3.3 * s, 10), pt(x + 2.6 * s, y)], lw * 0.3, INK, 0.45 * a);
  }
  // The heart, beating.
  const h = ins.heart;
  const hs = 12 * (1 + 0.1 * ins.beat);
  const hc = HEART_AT_BODY;
  halo(ctx, hc.x, hc.y, 40, '#ff3f5f', 0.75 * h.glow * (0.8 + 0.2 * ins.beat));
  const heart = heartShape(hc, hs);
  pen.fill(heart, HEART, a);
  pen.fill(heartShape(pt(hc.x - 3, hc.y - 3), hs * 0.4), '#ffb3c0', 0.6 * a);
  pen.stroke([...heart, heart[0]!], lw * 0.7, '#6e1424', a, false);
  drawCrack(pen, [pt(hc.x + 0.5, hc.y - hs * 0.45), pt(hc.x - 2.5, hc.y - hs * 0.1), pt(hc.x + 2.5, hc.y + hs * 0.2), pt(hc.x - 1.5, hc.y + hs * 0.5), pt(hc.x + 0.5, hc.y + hs * 0.85)], h.mend, lw, a);
  drawBurst(ctx, hc, h.burst, hs * 1.2);
  // The brain.
  const b = ins.brain;
  const bc = BRAIN_AT_BODY;
  halo(ctx, bc.x, bc.y, 40, '#ff8fd2', 0.7 * b.glow);
  const brain = brainShape(bc, 16, 10);
  pen.fill(brain, BRAIN, a);
  for (const [dx, dy, l] of [[-9, -3, 7], [-4, 3, 8], [3, -4, 7], [8, 2, 6]] as const) {
    pen.hair(Array.from({ length: 7 }, (_, i) => pt(bc.x + dx + (i / 6) * l - l / 2, bc.y + dy + 1.6 * Math.sin(i * 1.9))), lw * 0.35, '#a24c78', 0.85 * a);
  }
  pen.stroke([...brain, brain[0]!], lw * 0.7, '#5e1d40', a, false);
  drawCrack(pen, [pt(bc.x - 13, bc.y + 1), pt(bc.x - 7, bc.y - 3), pt(bc.x - 1, bc.y + 2), pt(bc.x + 5, bc.y - 2), pt(bc.x + 12, bc.y + 1)], b.mend, lw, a);
  drawBurst(ctx, bc, b.burst, 18);
}
