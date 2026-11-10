import { createRng } from '../../../src/logic/rng';
import { capsule, closed, cub, oval, pt, ribbon } from '../../../src/art/kit';
import { M } from '../../../src/art/chapters/rainforestCrittersMonitorHead';
import { PAPER_FILL } from '../../../src/art/palette';
import { Pen, type Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { rgba } from '../../../src/art/wash';

/**
 * The Asian water monitor (Varanus salvator) in three-quarter profile, the
 * whole animal, facing +x: long neck and narrow head held up, a deep trunk
 * on four sprawling legs with long clawed toes, more than half its length a
 * tail flattened for swimming that drags behind. Painted in layered washes
 * on the game's monitor colours (rainforestCrittersMonitorHead.ts M): dark
 * olive-black, lit olive along the back, rows of pale yellow eye-spots
 * across it, a pale yellowish belly barred dark, the tail banded; fine
 * granular scales; a dark band back from the eye; a realistic eye with a
 * catchlight; a firm, not heavy, outline. Drawn live in its own units (about
 * 240 long, the ground at y = 0) so its legs can walk.
 */
export const MONITOR_LENGTH = 240;

export interface MonitorPose {
  /** Gait phase in cycles (it walks forward as it rises, backs off as it falls). */
  readonly gait: number;
  /** How far the head is lifted, radians, and the forked tongue out (0..1). */
  readonly lift: number;
  readonly tongue: number;
  /** The tail's slow sway, radians of phase. */
  readonly sway: number;
}

const LINE = '#16170f';
const C = {
  lit: '#7d7d4d', back: '#5c5e3c', flank: '#3a3c27', low: '#2a2b1c', belly: '#d8cf98', bellyDeep: '#a49a62', bar: '#3a3826',
  spot: M.ocellus, spotDeep: '#9c8a3c', iris: '#b88a3a', irisLit: '#e2bd6a', irisDeep: '#3d2a10',
} as const;

/** The body's spine from the neck back to the tail's tip, and its depth there. */
const SPINE: readonly (readonly [number, number, number])[] = [
  [74, -34, 10], [64, -31, 11.5], [52, -27, 16], [38, -25, 19.5], [22, -24, 20.5], [6, -24, 19.5], [-8, -23, 17],
  [-22, -20, 12.5], [-38, -15, 9.6], [-56, -10, 7.6], [-76, -6, 5.6], [-96, -4, 3.9], [-114, -3.2, 2.4], [-130, -3.4, 0.7],
];

function bodyOf(sway: number): { spine: Pt[]; depth: number[] } {
  const knots = SPINE.map(([x, y], i) => pt(x, y + (i > 7 ? Math.sin(sway + i * 0.55) * (i - 7) * 0.35 : 0)));
  const spine: Pt[] = [];
  const depth: number[] = [];
  for (let i = 0; i < knots.length - 1; i++) {
    const a = knots[Math.max(0, i - 1)]!;
    const b = knots[i]!;
    const c = knots[i + 1]!;
    const e = knots[Math.min(knots.length - 1, i + 2)]!;
    for (let k = 0; k < 6; k++) {
      const u = k / 6;
      const u2 = u * u;
      const u3 = u2 * u;
      spine.push(pt(
        0.5 * (2 * b.x + (-a.x + c.x) * u + (2 * a.x - 5 * b.x + 4 * c.x - e.x) * u2 + (-a.x + 3 * b.x - 3 * c.x + e.x) * u3),
        0.5 * (2 * b.y + (-a.y + c.y) * u + (2 * a.y - 5 * b.y + 4 * c.y - e.y) * u2 + (-a.y + 3 * b.y - 3 * c.y + e.y) * u3),
      ));
      depth.push(SPINE[i]![2] + (SPINE[i + 1]![2] - SPINE[i]![2]) * u);
    }
  }
  spine.push(knots[knots.length - 1]!);
  depth.push(SPINE[SPINE.length - 1]![2]);
  return { spine, depth };
}

/** Where a limb's middle joint falls, from its root `a` to its end `b`, `l1` and `l2` long, bent to `side`. */
function knee(a: Pt, b: Pt, l1: number, l2: number, side: 1 | -1): Pt {
  const d = Math.min(Math.hypot(b.x - a.x, b.y - a.y), l1 + l2 - 0.01);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const off = Math.acos(Math.max(-1, Math.min(1, cos))) * side;
  return pt(a.x + Math.cos(ang + off) * l1, a.y + Math.sin(ang + off) * l1);
}

interface Leg {
  readonly root: Pt;
  readonly home: number;
  readonly fore: boolean;
  readonly far: boolean;
  readonly phase: number;
}

const LEGS: readonly Leg[] = [
  { root: pt(44, -20), home: 52, fore: true, far: true, phase: 0.5 },
  { root: pt(-12, -18), home: -8, fore: false, far: true, phase: 0 },
  { root: pt(48, -17), home: 56, fore: true, far: false, phase: 0 },
  { root: pt(-8, -15), home: -4, fore: false, far: false, phase: 0.5 },
];

const STRIDE = 22;

/** The foot on the ground (or swinging forward, lifted) at a gait phase. */
function footAt(l: Leg, gait: number): Pt {
  const f = (((gait + l.phase) % 1) + 1) % 1;
  const lift = l.far ? -5 : 0;
  if (f < 0.7) return pt(l.home + STRIDE * (0.5 - f / 0.7), lift);
  const s = (f - 0.7) / 0.3;
  return pt(l.home + STRIDE * (-0.5 + s), lift - 7 * Math.sin(s * Math.PI));
}

function drawLeg(pen: Pen, l: Leg, gait: number): void {
  const foot = footAt(l, gait);
  const ankle = pt(foot.x - (l.fore ? 2 : 6), foot.y - 4);
  const mid = knee(l.root, ankle, l.fore ? 13 : 15, l.fore ? 12 : 14, l.fore ? -1 : 1);
  const tone = l.far ? C.low : C.flank;
  const upper = capsule(l.root, mid, l.fore ? 9 : 11, 6.5);
  const lower = capsule(mid, ankle, 6.5, 4.6);
  for (const s of [upper, lower]) {
    pen.fill(s, PAPER_FILL, 1);
    pen.fill(s, tone, 0.96);
    pen.clipped(s, () => {
      glaze(pen.ctx, mid.x - 2, mid.y - 3, 6, 4, 0, l.far ? C.flank : C.back, 0.6);
      for (let i = 0; i < 14; i++) pen.dot(mid.x + pen.jitter(7), mid.y + pen.jitter(7), 0.55, l.far ? C.flank : C.spot, l.far ? 0.4 : 0.55);
    });
    pen.stroke(closed(s), 0.8, LINE, 0.9, false);
  }
  // Five long toes splayed on the ground, each ending in a dark hooked claw.
  for (let k = 0; k < 5; k++) {
    const a = -0.9 + k * 0.42 + (l.fore ? 0.2 : 0);
    const len = 6 + 2.6 * Math.sin((k / 4) * Math.PI);
    const tip = pt(ankle.x + Math.cos(a) * len + 2, foot.y + 0.4 - Math.max(0, Math.sin(a)) * 0.6 - (k === 0 ? 1.4 : 0));
    const toe = cub(ankle, pt(ankle.x + 2, ankle.y + 2), pt(tip.x - 2, tip.y), tip, 6);
    pen.stroke(toe, 1.7, LINE, 0.9, false);
    pen.stroke(toe, 0.9, tone, 1, false);
    pen.stroke([tip, pt(tip.x + 2.2, tip.y + 0.6)], 0.8, M.claw, 1, false);
  }
}

function paintBody(pen: Pen, shape: readonly Pt[], spine: readonly Pt[], depth: readonly number[], seed: number): void {
  const { ctx } = pen;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, -48, 0, -2);
    g.addColorStop(0, C.lit);
    g.addColorStop(0.3, C.back);
    g.addColorStop(0.62, C.flank);
    g.addColorStop(1, C.low);
    ctx.fillStyle = g;
    ctx.fillRect(-140, -60, 260, 62);
    // The belly: a pale yellowish band along the underside, barred dark, in shade.
    const low = spine.map((p, i) => pt(p.x, p.y + depth[i]! * 0.5));
    const up = spine.map((p, i) => pt(p.x, p.y + depth[i]! * 0.14));
    const belly = [...low, ...up.reverse()];
    pen.fill(belly, C.belly, 0.9);
    pen.clipped(belly, () => {
      for (let i = 2; i < spine.length - 30; i += 3) {
        const p = spine[i]!;
        pen.fill(oval(p.x, p.y + depth[i]! * 0.36, 1.3, depth[i]! * 0.22, 8), C.bar, 0.55);
      }
      const s = ctx.createLinearGradient(0, -30, 0, -2);
      s.addColorStop(0, rgba(C.bellyDeep, 0.1));
      s.addColorStop(1, rgba(C.low, 0.6));
      ctx.fillStyle = s;
      ctx.fillRect(-140, -60, 260, 62);
    });
    // Rows of pale yellow eye-spots across the back and flank, the tail banded pale.
    const rng = createRng(seed);
    for (let i = 4; i < spine.length - 2; i += 4) {
      const p = spine[i]!;
      const d = depth[i]!;
      const tail = p.x < -26;
      if (tail) {
        if (i % 8 === 0) pen.fill(ribbon([pt(p.x + 1.4, p.y - d * 0.55), pt(p.x - 0.6, p.y + d * 0.2)], () => 2.6).shape, C.spot, 0.55);
        continue;
      }
      for (let r = 0; r < 3; r++) {
        const y = p.y - d * (0.42 - r * 0.22);
        const rad = (1.6 - r * 0.25) * (0.85 + 0.3 * rng());
        pen.fill(oval(p.x + rng() - 0.5, y, rad, rad * 0.8, 12), C.spot, 0.85 - r * 0.15);
        pen.fill(oval(p.x + rng() - 0.5, y, rad * 0.45, rad * 0.36, 10), C.spotDeep, 0.6);
      }
    }
    // Fine granular scales, the light along the back, the round of the body.
    for (let i = 0; i < 900; i++) {
      const k = Math.floor(rng() * spine.length);
      const p = spine[k]!;
      const d = depth[k]!;
      pen.dot(p.x + (rng() - 0.5) * 6, p.y + (rng() - 0.5) * d, 0.32, rng() < 0.3 ? C.lit : LINE, 0.22);
    }
    for (let i = 6; i < spine.length - 12; i += 10) glaze(ctx, spine[i]!.x, spine[i]!.y - depth[i]! * 0.38, 9, 1.8, 0, PAPER_FILL, 0.2);
  });
}

/** The head, its root at the neck's front, lifted by `lift`: long, narrow, flat-topped, the nostril near the snout. */
function drawHead(pen: Pen, root: Pt, lift: number, tongue: number): void {
  const { ctx } = pen;
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(-lift);
  const top = cub(pt(-6, -6.4), pt(4, -8.6), pt(14, -8.4), pt(24, -6), 10);
  const snout = cub(pt(24, -6), pt(28, -5), pt(31, -3.6), pt(31.4, -1.4), 6);
  const chin = cub(pt(31.4, -1.4), pt(29, 1.4), pt(18, 3.2), pt(-6, 5.6), 10);
  const head = [...top, ...snout.slice(1), ...chin.slice(1)];
  if (tongue > 0) {
    const len = 14 * tongue;
    const base = pt(30.6, -0.6);
    const tip = pt(base.x + len, base.y + 0.8);
    pen.stroke([base, tip], 1.4, M.tongue, 1, false);
    pen.stroke([tip, pt(tip.x + 4 * tongue, tip.y - 2)], 1, M.tongue, 1, false);
    pen.stroke([tip, pt(tip.x + 4 * tongue, tip.y + 2)], 1, M.tongue, 1, false);
  }
  pen.fill(head, PAPER_FILL, 1);
  pen.clipped(head, () => {
    const g = ctx.createLinearGradient(0, -9, 0, 5);
    g.addColorStop(0, C.lit);
    g.addColorStop(0.45, C.back);
    g.addColorStop(0.7, '#8e8a5e');
    g.addColorStop(1, C.belly);
    ctx.fillStyle = g;
    ctx.fillRect(-8, -10, 42, 16);
    // The dark band back from the eye, a pale line over it; the mouth's line.
    pen.fill(ribbon(cub(pt(12, -3.4), pt(6, -2.6), pt(0, -1.2), pt(-6, 0), 8), (u) => 2.6 - 0.6 * u).shape, C.low, 0.85);
    pen.hair(cub(pt(13, -5.4), pt(6, -4.6), pt(0, -3.4), pt(-6, -2.4), 8), 0.7, C.spot, 0.6);
    glaze(ctx, 16, -7, 10, 1.3, 0.05, PAPER_FILL, 0.3);
    for (let i = 0; i < 70; i++) pen.dot(-4 + pen.rng() * 32, -8 + pen.rng() * 11, 0.28, LINE, 0.22);
    for (let i = 0; i < 6; i++) glaze(ctx, -2 + i * 2.5, 3.5, 0.9, 1.4, 0, C.bar, 0.45);
  });
  pen.hair(cub(pt(31, -0.8), pt(24, 0.2), pt(16, 1.2), pt(8, 2.4), 8), 0.55, LINE, 0.9);
  pen.fill(oval(27.4, -4, 0.9, 0.6, 10), LINE, 0.95);
  // The eye: a bronze iris, round pupil, its rim, the brow's shade, a catchlight.
  const e = pt(13.6, -3.6);
  pen.fill(oval(e.x, e.y, 2.4, 2.2, 16), C.low, 0.8);
  const ball = oval(e.x, e.y, 1.75, 1.65, 18);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(e.x - 0.3, e.y + 0.3, 0.1, e.x, e.y, 1.8);
    g.addColorStop(0, C.irisLit);
    g.addColorStop(0.55, C.iris);
    g.addColorStop(1, C.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
    pen.fill(oval(e.x + 0.1, e.y, 0.8, 0.8, 12), '#0a0805', 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - 2.4)), C.low, 0.55);
  });
  pen.hair(closed(ball), 0.3, LINE, 1);
  pen.dot(e.x - 0.6, e.y - 0.6, 0.42, PAPER_FILL, 1);
  pen.stroke([...top, ...snout.slice(1)], 0.85, LINE, 1, false);
  pen.stroke(chin, 0.75, LINE, 1, false);
  ctx.restore();
}

/**
 * The monitor with its feet at `at` (screen px), `scale` px per unit,
 * facing right (`face` 1) or left (-1).
 */
export function drawMonitor(ctx: CanvasRenderingContext2D, at: Pt, scale: number, face: 1 | -1, pose: MonitorPose, boil: number, alpha = 1): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(at.x, at.y);
  ctx.scale(scale * face, scale);
  const pen = new Pen(ctx, 41000 + boil * 17, 0.35);
  // Its soft shadow on the mud.
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,4,0.3)';
  ctx.beginPath();
  ctx.ellipse(-10, 0.5, 110, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const { spine, depth } = bodyOf(pose.sway);
  const shape = ribbon(spine, (u) => depth[Math.round(u * (depth.length - 1))]!).shape;
  for (const l of LEGS.filter((g) => g.far)) drawLeg(pen, l, pose.gait);
  paintBody(pen, shape, spine, depth, 41500);
  pen.stroke(closed(shape), 0.95, LINE, 1, false);
  for (const l of LEGS.filter((g) => !g.far)) drawLeg(pen, l, pose.gait);
  drawHead(pen, pt(spine[0]!.x - 4, spine[0]!.y + 0.6), pose.lift, pose.tongue);
  ctx.restore();
}
