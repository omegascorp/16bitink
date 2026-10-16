import { INK, Pen, type Pt } from '../../../src/art/pen';
import type { Fish, Surfer } from './story';

/**
 * The surfer and the seal as seen from below: dark silhouettes against the
 * bright surface, inked with the game's pen and redrawn each boil frame (the
 * same shapes, a different wobble). Both are drawn nose to the right in their
 * own px and mirrored to face left.
 */

const SIL = '#262c34';
const SIL_SOFT = '#3b4550';
const SIL_EDGE = '#141519';
/** The board's rail catching the light. */
const RAIL = '#8fa6b6';

const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 31 + boil * 977, 1.3);

/** Points along a closed loop through `pts`, smoothed (Catmull-Rom), `n` per span. */
function smoothLoop(pts: readonly Pt[], n = 6): Pt[] {
  const out: Pt[] = [];
  const at = (i: number): Pt => pts[(i + pts.length) % pts.length]!;
  for (let i = 0; i < pts.length; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < n; k++) {
      const s = k / n;
      const s2 = s * s;
      const s3 = s2 * s;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return out;
}

/** A shape filled dark, cross-hatched faintly inside, and inked round. */
function inkShape(pen: Pen, outline: readonly Pt[], fill = SIL, width = 3): void {
  pen.fill(outline, fill, 0.94);
  pen.hatch(outline, 9, -0.7, 0.9, { color: SIL_EDGE, alpha: 0.35 });
  pen.closed(outline, width, SIL_EDGE);
}

/** A tapering limb from a to b, filled and inked along its sides, with rounded ends. */
function limb(pen: Pen, a: Pt, b: Pt, wa: number, wb: number): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  const side = (p: Pt, w: number, s: number): Pt => ({ x: p.x + (n.x * w * s) / 2, y: p.y + (n.y * w * s) / 2 });
  const outline = [side(a, wa, 1), side(b, wb, 1), side(b, wb, -1), side(a, wa, -1)];
  pen.fill(outline, SIL, 0.96);
  pen.dot(b.x, b.y, wb / 2, SIL, 0.96);
  pen.dot(a.x, a.y, wa / 2, SIL, 0.96);
  pen.stroke([side(a, wa, 1), side(b, wb, 1)], 2.4, SIL_EDGE);
  pen.stroke([side(a, wa, -1), side(b, wb, -1)], 2.4, SIL_EDGE);
}

// ---------------------------------------------------------------- the surfer

const BOARD: readonly Pt[] = smoothLoop([
  { x: -178, y: -6 }, { x: -150, y: -9 }, { x: 0, y: -9 }, { x: 120, y: -10 }, { x: 188, y: -18 }, { x: 198, y: -15 },
  { x: 166, y: 6 }, { x: 60, y: 15 }, { x: -100, y: 15 }, { x: -172, y: 8 },
]);
const TORSO: readonly Pt[] = smoothLoop([
  { x: -50, y: -8 }, { x: -54, y: -36 }, { x: -10, y: -48 }, { x: 60, y: -54 }, { x: 104, y: -46 }, { x: 112, y: -16 }, { x: 60, y: -8 },
]);
const SHOULDER: Pt = { x: 88, y: -30 };
const HEAD: Pt = { x: 138, y: -52 };
const ARM_LEN = 116;

/** A hand's place in the stroke: forward and in, a long pull deep under the board, out and low over the water. */
function handAt(stroke: number): Pt {
  const a = stroke % (Math.PI * 2);
  const down = Math.sin(a) > 0 ? 0.92 * Math.sin(a) : 0.3 * Math.sin(a);
  return { x: SHOULDER.x + ARM_LEN * Math.cos(a) * 0.9, y: SHOULDER.y + ARM_LEN * down + 10 };
}

/** One arm, bent at the elbow, from the shoulder to the hand. */
function drawArm(pen: Pen, stroke: number): void {
  const hand = handAt(stroke);
  const mid = { x: (SHOULDER.x + hand.x) / 2, y: (SHOULDER.y + hand.y) / 2 };
  const bend = 12 * Math.sin(stroke);
  const elbow = { x: mid.x - bend, y: mid.y + 6 };
  limb(pen, SHOULDER, elbow, 28, 21);
  limb(pen, elbow, hand, 21, 15);
  pen.dot(hand.x, hand.y, 11, SIL, 1);
}

/**
 * A surfer lying on a short board, paddling: the board on the surface, the
 * body on the deck with the head up, legs trailing off the tail into the
 * water, and both arms pulling, half a stroke apart.
 */
export function drawSurfer(ctx: CanvasRenderingContext2D, s: Surfer, scale: number, boil: number): void {
  const pen = penFor(ctx, 7, boil);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(-scale, scale);
  drawArm(pen, s.stroke + Math.PI);
  // The legs, knees on the tail, shins and feet hanging down into the water.
  const kick = 4 * Math.sin(s.stroke * 2);
  for (const [dx, dy] of [[0, 0], [8, -6]] as const) {
    const hip = { x: -40 + dx, y: -24 + dy };
    const knee = { x: -142 + dx, y: -20 + dy };
    const foot = { x: -196 + dx, y: 20 + dy + kick * (dx ? -1 : 1) };
    limb(pen, hip, knee, 36, 24);
    limb(pen, knee, foot, 23, 15);
    pen.stroke([foot, { x: foot.x - 16, y: foot.y + 8 }], 11, SIL_EDGE);
  }
  inkShape(pen, BOARD, SIL_SOFT);
  pen.hair(BOARD.slice(0, BOARD.length / 2), 1.6, RAIL, 0.7);
  inkShape(pen, TORSO);
  limb(pen, { x: 104, y: -36 }, { x: 124, y: -46 }, 26, 22);
  inkShape(pen, smoothLoop([
    { x: HEAD.x - 22, y: HEAD.y + 4 }, { x: HEAD.x - 14, y: HEAD.y - 20 }, { x: HEAD.x + 10, y: HEAD.y - 25 },
    { x: HEAD.x + 27, y: HEAD.y - 5 }, { x: HEAD.x + 16, y: HEAD.y + 18 }, { x: HEAD.x - 8, y: HEAD.y + 20 },
  ]));
  drawArm(pen, s.stroke);
  // A ring of ripples where the board breaks the surface.
  pen.hair([{ x: -190, y: 2 }, { x: -230, y: 0 }, { x: -260, y: 3 }], 1.6, INK, 0.45);
  pen.hair([{ x: 205, y: -6 }, { x: 240, y: -4 }, { x: 270, y: -6 }], 1.6, INK, 0.45);
  ctx.restore();
}

// ---------------------------------------------------------------- the seal

/** A seal's body, nose right, length 260: a round head on a short neck, a fat middle, tapering to the hind flippers. */
const SEAL_BODY: readonly Pt[] = smoothLoop([
  { x: 132, y: 6 }, { x: 118, y: -12 }, { x: 96, y: -22 }, { x: 70, y: -20 }, { x: 20, y: -34 }, { x: -50, y: -30 },
  { x: -100, y: -16 }, { x: -118, y: -4 }, { x: -100, y: 12 }, { x: -40, y: 28 }, { x: 30, y: 32 }, { x: 80, y: 20 }, { x: 116, y: 14 },
]);

/** A fan-shaped flipper from `root`, pointing `angle` (radians, 0 = back along the body), `len` long. */
function flipper(pen: Pen, root: Pt, angle: number, len: number, width: number): void {
  const dir = { x: -Math.cos(angle), y: Math.sin(angle) };
  const n = { x: -dir.y, y: dir.x };
  const tip = { x: root.x + dir.x * len, y: root.y + dir.y * len };
  inkShape(pen, smoothLoop([
    { x: root.x + (n.x * width) / 3, y: root.y + (n.y * width) / 3 },
    { x: tip.x + (n.x * width) / 2, y: tip.y + (n.y * width) / 2 },
    { x: tip.x + dir.x * 6, y: tip.y + dir.y * 6 },
    { x: tip.x - (n.x * width) / 2, y: tip.y - (n.y * width) / 2 },
    { x: root.x - (n.x * width) / 3, y: root.y - (n.y * width) / 3 },
  ], 4), SIL, 2.4);
}

/** The seal swimming: hind flippers sweeping, the fore flipper tucked and paddling; squeezed edge-on as it turns. */
export function drawSeal(ctx: CanvasRenderingContext2D, f: Fish, boil: number): void {
  if (Math.abs(f.face) < 0.01) return;
  const pen = penFor(ctx, 13, boil);
  const k = f.len / 260;
  const sweep = Math.sin(f.beat) * (0.25 + 0.3 * f.effort);
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face * k, k);
  ctx.rotate(-f.tilt);
  flipper(pen, { x: -112, y: 2 }, 0.35 + sweep, 52, 30);
  flipper(pen, { x: -112, y: -2 }, -0.3 + sweep, 50, 28);
  // The far fore flipper, behind the body.
  flipper(pen, { x: 46, y: 18 }, 1.25 + 0.3 * Math.sin(f.beat + 1.2), 46, 22);
  inkShape(pen, SEAL_BODY);
  // A paler belly where the light from above wraps round it.
  pen.hair([{ x: -90, y: 14 }, { x: -30, y: 27 }, { x: 40, y: 29 }, { x: 90, y: 17 }], 2, SIL_SOFT, 0.9);
  flipper(pen, { x: 52, y: 20 }, 1.1 + 0.35 * Math.sin(f.beat), 52, 24);
  // Eye, nostril and whiskers.
  pen.dot(104, -6, 4.5, '#0c0d10', 1);
  pen.dot(105, -7.5, 1.4, RAIL, 0.9);
  pen.dot(128, 2, 2, '#0c0d10', 1);
  for (const dy of [-2, 3, 8]) pen.hair([{ x: 122, y: 6 }, { x: 140, y: 6 + dy * 1.5 }, { x: 154, y: 8 + dy * 2.2 }], 1, RAIL, 0.7);
  ctx.restore();
}
