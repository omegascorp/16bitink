import type { Pt } from '../../../../src/art/pen';
import { flecks, seeded, spline } from '../../crabbird/art/paint';
import { band, dab, fillShape, inkLine, softLine, turn, unitPx, within } from './ink';

/**
 * A marsh crab, painted from above and a little in front (its front is up the
 * screen): a broad olive to blue-grey shield with a toothed front edge and a
 * long spine at each side, short stalked eyes, two big claws on blue arms with
 * cream palms and pale finger tips, three pairs of walking legs and a pair of
 * flat swimming paddles. Like a blue crab, but never named: the species in
 * the photos isn't known. Washes, then flecks, then thin ink.
 *
 * Local units: the shield's middle at 0,0, about 236 across spine to spine.
 * Claws are posed in world px (story.ts aims them at an eye or a bill).
 */
export interface CrabClaw {
  /** Where the finger tips meet, world px. */
  readonly tip: Pt;
  /** Which way the hand points, world radians. */
  readonly angle: number;
  /** 0 shut .. 1 wide. */
  readonly open: number;
}

export interface CrabPose {
  readonly x: number;
  readonly y: number;
  /** Screen px per local unit. */
  readonly k: number;
  /** Radians: 0 is front up the screen. */
  readonly rot: number;
  /** The crab's left claw (screen left when front is up), then its right. */
  readonly claws: readonly [CrabClaw, CrabClaw];
  /** 0 legs braced on the ground .. 1 hanging. */
  readonly dangle: number;
  /** Leg kick phase, radians. */
  readonly kick: number;
  /** 0 .. 1: the defiant set of its eyes. */
  readonly glare: number;
  readonly alpha?: number;
}

const OLIVE = '#7d8762';
const OLIVE_LIT = '#b0b48a';
const SLATE = '#56708a';
const DEEP = '#33424f';
const BLUE = '#4f86c0';
const BLUE_LIT = '#9cc4e8';
const BLUE_DARK = '#2c4f7c';
const CREAM = '#f3ead2';
const CREAM_SHADE = '#cdbf9e';
const TIP = '#fbf4e6';

// ---------------------------------------------------------------- the shield

/** The toothed edge from beside the eyes out to the long side spine. */
function frontTeeth(side: number): Pt[] {
  const out: Pt[] = [];
  const n = 8;
  for (let i = 0; i <= n * 2; i++) {
    const u = i / (n * 2);
    const x = 26 + 84 * u;
    const y = -40 + 26 * u * u + 2 * u;
    const bump = i % 2 === 1 ? 6 : 0;
    out.push({ x: side * (x + bump * 0.5), y: y - bump });
  }
  return out;
}

const SHIELD: readonly Pt[] = (() => {
  const right = frontTeeth(1);
  const left = frontTeeth(-1).reverse();
  const rear = spline([{ x: 118, y: -10 }, { x: 86, y: 0 }, { x: 74, y: 22 }, { x: 40, y: 40 }, { x: 0, y: 46 }, { x: -40, y: 40 }, { x: -74, y: 22 }, { x: -86, y: 0 }, { x: -118, y: -10 }], 5);
  const brow = spline([{ x: -26, y: -40 }, { x: -12, y: -44 }, { x: 0, y: -41 }, { x: 12, y: -44 }, { x: 26, y: -40 }], 4);
  return [...brow, ...right, ...rear, ...left];
})();

function paintShield(ctx: CanvasRenderingContext2D, boil: number): void {
  const px = unitPx(ctx);
  const g = ctx.createLinearGradient(-60, -50, 50, 50);
  g.addColorStop(0, OLIVE_LIT);
  g.addColorStop(0.35, OLIVE);
  g.addColorStop(0.75, SLATE);
  g.addColorStop(1, DEEP);
  fillShape(ctx, SHIELD, g);
  within(ctx, SHIELD, () => {
    // The blue-grey shows through at the edges, the back falls into shade.
    const r = ctx.createRadialGradient(-6, -10, 10, 0, 0, 130);
    r.addColorStop(0, 'rgba(160,170,120,0)');
    r.addColorStop(0.6, 'rgba(90,120,150,0.18)');
    r.addColorStop(1, 'rgba(60,90,130,0.6)');
    ctx.fillStyle = r;
    ctx.fillRect(-130, -60, 260, 120);
    dab(ctx, -30, -22, 40, '230,226,180', 0.45, 0.6);
    dab(ctx, 20, 30, 60, '30,40,50', 0.35, 0.6);
    flecks(ctx, { x0: -110, y0: -46, x1: 110, y1: 46 }, 160, seeded(77), ['#4c5636', '#9fa47a', '#3e4a52', '#c9c79a'], 0.6, 3.2, 0.5);
    // The grooves and humps of the shield, raised a little in the light.
    const grooves: readonly (readonly Pt[])[] = [
      [{ x: -34, y: -20 }, { x: -20, y: 2 }, { x: -24, y: 26 }],
      [{ x: 34, y: -20 }, { x: 20, y: 2 }, { x: 24, y: 26 }],
      [{ x: -20, y: 4 }, { x: 0, y: 10 }, { x: 20, y: 4 }],
      [{ x: -64, y: -8 }, { x: -46, y: 6 }, { x: -50, y: 22 }],
      [{ x: 64, y: -8 }, { x: 46, y: 6 }, { x: 50, y: 22 }],
    ];
    for (const gr of grooves) {
      const line = spline([...gr], 5);
      softLine(ctx, line.map((p) => ({ x: p.x - 2, y: p.y - 2 })), 5, '#dfe0b8', 0.35);
      inkLine(ctx, line, 1.1, 0.45, boil);
    }
    softLine(ctx, spline([{ x: -100, y: -14 }, { x: -60, y: -30 }, { x: -20, y: -38 }], 5), 7 * px * 2, '#f2f0d2', 0.5);
  });
  inkLine(ctx, SHIELD, 2.2, 0.9, boil, true);
}

// ---------------------------------------------------------------- legs

interface LegSpec {
  readonly hip: Pt;
  readonly stand: readonly [Pt, Pt];
  readonly hang: readonly [Pt, Pt];
  readonly w: number;
}

/** Right side; the left mirrors it. Knee then foot. */
const LEGS: readonly LegSpec[] = [
  { hip: { x: 76, y: -6 }, stand: [{ x: 150, y: -40 }, { x: 186, y: 30 }], hang: [{ x: 120, y: 34 }, { x: 128, y: 118 }], w: 15 },
  { hip: { x: 70, y: 8 }, stand: [{ x: 142, y: -14 }, { x: 172, y: 60 }], hang: [{ x: 106, y: 50 }, { x: 108, y: 132 }], w: 15 },
  { hip: { x: 58, y: 22 }, stand: [{ x: 124, y: 16 }, { x: 146, y: 80 }], hang: [{ x: 88, y: 66 }, { x: 84, y: 140 }], w: 14 },
];
const PADDLE = { hip: { x: 40, y: 36 }, stand: { x: 92, y: 66 }, hang: { x: 62, y: 104 } } as const;

const mixPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

function segment(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w0: number, w1: number, boil: number): void {
  // A rounded knuckle at the joint, under the segment.
  const knob = Array.from({ length: 17 }, (_, i) => ({ x: a.x + Math.cos((i / 16) * Math.PI * 2) * w0 * 0.5, y: a.y + Math.sin((i / 16) * Math.PI * 2) * w0 * 0.5 }));
  fillShape(ctx, knob, '#5f7d9c');
  inkLine(ctx, knob, 1.2, 0.8, boil, true);
  const line = [a, { x: (a.x + b.x) / 2 + (b.y - a.y) * 0.04, y: (a.y + b.y) / 2 - (b.x - a.x) * 0.04 }, b];
  const { shape, left } = band(line, w0, w1);
  // Shaded across the segment, lit on its upper-left side.
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  if (n.x + n.y > 0) n = { x: -n.x, y: -n.y };
  const m = mixPt(a, b, 0.5);
  const g = ctx.createLinearGradient(m.x + n.x * w0 * 0.5, m.y + n.y * w0 * 0.5, m.x - n.x * w0 * 0.5, m.y - n.y * w0 * 0.5);
  g.addColorStop(0, BLUE_LIT);
  g.addColorStop(0.35, BLUE);
  g.addColorStop(0.8, BLUE_DARK);
  g.addColorStop(1, '#1f3656');
  fillShape(ctx, shape, g);
  softLine(ctx, left, w0 * 0.25, '#e6efe6', 0.4, 3);
  inkLine(ctx, shape, 1.4, 0.85, boil, true);
}

function paintLeg(ctx: CanvasRenderingContext2D, spec: LegSpec, side: number, dangle: number, kick: number, boil: number, i: number): void {
  const s = (p: Pt): Pt => ({ x: p.x * side, y: p.y });
  const swing = Math.sin(kick + i * 1.3 + (side > 0 ? 0 : 1.7)) * (4 + 10 * dangle);
  const knee = s(mixPt(spec.stand[0], spec.hang[0], dangle));
  const foot = s(mixPt(spec.stand[1], spec.hang[1], dangle));
  const k = { x: knee.x, y: knee.y + swing * 0.4 };
  const f = { x: foot.x + swing * side * 0.5, y: foot.y + swing };
  segment(ctx, s(spec.hip), k, spec.w, spec.w * 0.86, boil);
  segment(ctx, k, f, spec.w * 0.8, spec.w * 0.22, boil);
  // A dark claw-tip at the foot.
  inkLine(ctx, [mixPt(k, f, 0.86), f], 2.6, 0.8, boil);
}

function paintPaddle(ctx: CanvasRenderingContext2D, side: number, dangle: number, kick: number, boil: number): void {
  const hip = { x: PADDLE.hip.x * side, y: PADDLE.hip.y };
  const end = mixPt({ x: PADDLE.stand.x * side, y: PADDLE.stand.y }, { x: PADDLE.hang.x * side, y: PADDLE.hang.y }, dangle);
  const e = { x: end.x, y: end.y + Math.sin(kick * 1.4 + side) * 5 };
  segment(ctx, hip, e, 12, 9, boil);
  const a = Math.atan2(e.y - hip.y, e.x - hip.x);
  const paddle: Pt[] = Array.from({ length: 18 }, (_, i) => {
    const t = (i / 18) * Math.PI * 2;
    return turn({ x: e.x + 16 + Math.cos(t) * 20, y: e.y + Math.sin(t) * 12 }, e, a);
  });
  const g = ctx.createLinearGradient(e.x, e.y - 12, e.x, e.y + 12);
  g.addColorStop(0, BLUE_LIT);
  g.addColorStop(1, '#4b6784');
  fillShape(ctx, paddle, g);
  inkLine(ctx, paddle, 1.3, 0.8, boil, true);
}

// ---------------------------------------------------------------- claws

const SHOULDER: Pt = { x: 58, y: -30 };
const MERUS = 82;
const CARPUS = 36;
/** Wrist to where the finger tips meet, along the hand. */
const HAND = 96;

const PALM: readonly Pt[] = spline([
  { x: 0, y: -10 }, { x: 18, y: -17 }, { x: 44, y: -19 }, { x: 58, y: -12 }, { x: 62, y: 2 }, { x: 58, y: 14 }, { x: 36, y: 19 }, { x: 12, y: 16 }, { x: -2, y: 8 },
], 5, true);
/** The fixed finger, along the hand's lower edge. */
const FINGER: readonly Pt[] = spline([{ x: 54, y: 2 }, { x: 74, y: 4 }, { x: 92, y: 3 }, { x: 98, y: 1 }, { x: 90, y: 10 }, { x: 70, y: 14 }, { x: 54, y: 14 }], 4, true);
/** The moving finger, hinged at the top of the palm. */
const DACTYL: readonly Pt[] = spline([{ x: 52, y: -16 }, { x: 74, y: -14 }, { x: 94, y: -6 }, { x: 98, y: 0 }, { x: 88, y: -1 }, { x: 70, y: -3 }, { x: 54, y: -4 }], 4, true);
const HINGE: Pt = { x: 54, y: -10 };

/** The crab's own frame. */
function toLocal(p: CrabPose, w: Pt): Pt {
  const [dx, dy] = [(w.x - p.x) / p.k, (w.y - p.y) / p.k];
  const [c, s] = [Math.cos(-p.rot), Math.sin(-p.rot)];
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

/** Shoulder, elbow and wrist of a claw's arm in local units, and its hand angle. */
function armOf(p: CrabPose, side: number): { shoulder: Pt; elbow: Pt; wrist: Pt; angle: number; open: number; flip: number } {
  const c = p.claws[side < 0 ? 0 : 1];
  const tip = toLocal(p, c.tip);
  const angle = c.angle - p.rot;
  const wrist = { x: tip.x - Math.cos(angle) * HAND, y: tip.y - Math.sin(angle) * HAND };
  const shoulder = { x: SHOULDER.x * side, y: SHOULDER.y };
  const d = Math.hypot(wrist.x - shoulder.x, wrist.y - shoulder.y) || 1;
  const reach = Math.min(d, MERUS + CARPUS - 1);
  // The elbow bends out, away from the body.
  const along = (MERUS * MERUS - CARPUS * CARPUS + reach * reach) / (2 * reach);
  const h = Math.sqrt(Math.max(0, MERUS * MERUS - along * along));
  const [ux, uy] = [(wrist.x - shoulder.x) / d, (wrist.y - shoulder.y) / d];
  const n = { x: -uy, y: ux };
  const outward = n.x * side > 0 ? 1 : -1;
  const elbow = { x: shoulder.x + ux * along + n.x * h * outward, y: shoulder.y + uy * along + n.y * h * outward };
  // Keep the moving finger on the hand's outer side.
  const flip = Math.cos(angle) * side >= 0 ? 1 : -1;
  return { shoulder, elbow, wrist, angle, open: c.open, flip: side > 0 ? flip : -flip };
}

function paintArm(ctx: CanvasRenderingContext2D, p: CrabPose, side: number, boil: number): void {
  const a = armOf(p, side);
  segment(ctx, a.shoulder, a.elbow, 26, 22, boil);
  segment(ctx, a.elbow, a.wrist, 22, 20, boil);
  // A spine on the wrist joint.
  const sp = { x: a.elbow.x + (a.wrist.x - a.elbow.x) * 0.5, y: a.elbow.y + (a.wrist.y - a.elbow.y) * 0.5 };
  const nn = { x: -(a.wrist.y - a.elbow.y), y: a.wrist.x - a.elbow.x };
  const nl = Math.hypot(nn.x, nn.y) || 1;
  const spike = [{ x: sp.x + (nn.x / nl) * 8 - 4, y: sp.y + (nn.y / nl) * 8 }, { x: sp.x + (nn.x / nl) * 22, y: sp.y + (nn.y / nl) * 22 }, { x: sp.x + (nn.x / nl) * 8 + 4, y: sp.y + (nn.y / nl) * 8 }];
  fillShape(ctx, spike, BLUE_DARK);
}

function paintHand(ctx: CanvasRenderingContext2D, p: CrabPose, side: number, boil: number): void {
  const a = armOf(p, side);
  ctx.save();
  ctx.translate(a.wrist.x, a.wrist.y);
  ctx.rotate(a.angle);
  ctx.scale(1, a.flip);
  const px = unitPx(ctx);
  // Fixed finger first, under the palm's edge.
  const fg = ctx.createLinearGradient(54, 0, 98, 0);
  fg.addColorStop(0, '#5b7fa8');
  fg.addColorStop(0.55, CREAM);
  fg.addColorStop(1, TIP);
  fillShape(ctx, FINGER, fg);
  inkLine(ctx, FINGER, 1.5, 0.9, boil, true);
  for (let i = 0; i < 5; i++) inkLine(ctx, [{ x: 60 + i * 7, y: 3 }, { x: 62 + i * 7, y: 0 }], 1, 0.6, boil);
  // The palm: blue on top, cream underneath, a ridge along it.
  const pg = ctx.createLinearGradient(0, -19, 0, 19);
  pg.addColorStop(0, BLUE_LIT);
  pg.addColorStop(0.3, BLUE);
  pg.addColorStop(0.62, '#a8b9c4');
  pg.addColorStop(0.8, CREAM);
  pg.addColorStop(1, CREAM_SHADE);
  fillShape(ctx, PALM, pg);
  within(ctx, PALM, () => {
    dab(ctx, 26, -10, 18, '230,244,255', 0.6, 0.5);
    softLine(ctx, [{ x: 4, y: 2 }, { x: 30, y: 0 }, { x: 58, y: 2 }], 3, '#2c4f7c', 0.3);
    flecks(ctx, { x0: 0, y0: -18, x1: 60, y1: 0 }, 26, seeded(31 + side), ['#2c4f7c', '#cfe3f5'], 0.5, 2, 0.5);
  });
  inkLine(ctx, PALM, 1.8, 0.9, boil, true);
  inkLine(ctx, [{ x: 6, y: -4 }, { x: 32, y: -6 }, { x: 54, y: -4 }], 1, 0.45, boil);
  // The moving finger, swung open about its hinge.
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(-0.72 * a.open);
  ctx.translate(-HINGE.x, -HINGE.y);
  const dg = ctx.createLinearGradient(52, 0, 98, 0);
  dg.addColorStop(0, BLUE);
  dg.addColorStop(0.55, CREAM);
  dg.addColorStop(1, TIP);
  fillShape(ctx, DACTYL, dg);
  softLine(ctx, [{ x: 58, y: -13 }, { x: 86, y: -8 }], 2.4 * px * 2, '#ffffff', 0.5, 3);
  inkLine(ctx, DACTYL, 1.5, 0.9, boil, true);
  for (let i = 0; i < 5; i++) inkLine(ctx, [{ x: 60 + i * 7, y: -3 }, { x: 62 + i * 7, y: 0 }], 1, 0.6, boil);
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- eyes

function paintEyes(ctx: CanvasRenderingContext2D, glare: number, boil: number): void {
  for (const side of [-1, 1]) {
    const base = { x: 12 * side, y: -40 };
    const eye = { x: 19 * side, y: -55 };
    softLine(ctx, [base, eye], 9, '#6f7d63', 1, 2);
    inkLine(ctx, [base, eye], 1.2, 0.7, boil);
    ctx.save();
    const g = ctx.createRadialGradient(eye.x - 1.5, eye.y - 2, 0.5, eye.x, eye.y, 8);
    g.addColorStop(0, '#5c5a52');
    g.addColorStop(0.6, '#1d1c1e');
    g.addColorStop(1, '#0b0a0c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y, 7.4, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eye.x - 2.2, eye.y - 2.6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    inkLine(ctx, Array.from({ length: 13 }, (_, i) => ({ x: eye.x + Math.cos((i / 12) * Math.PI * 2) * 7.4, y: eye.y + Math.sin((i / 12) * Math.PI * 2) * 7 })), 1.1, 0.8, boil);
    if (glare > 0.02) {
      // A low, stubborn brow over each eye, angled down to the middle.
      const brow = [{ x: eye.x + side * 10, y: eye.y - 9 - 2 * glare }, { x: eye.x - side * 9, y: eye.y - 4 + 2 * glare }];
      inkLine(ctx, brow, 3.4, glare, boil);
    }
  }
}

// ---------------------------------------------------------------- the whole crab

/** A soft shadow under the crab (pass the ground's y in world px), drawn before it. */
export function drawCrabShadow(ctx: CanvasRenderingContext2D, p: CrabPose, groundY: number): void {
  dab(ctx, p.x, groundY, 170 * p.k, '40,40,30', 0.3 * (p.alpha ?? 1), 0.22);
}

/** Everything but the hands (draw them with drawCrabHands, after whatever they hold). */
export function drawCrab(ctx: CanvasRenderingContext2D, p: CrabPose, boil: number, hands = true): void {
  const alpha = p.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.k, p.k);
  LEGS.forEach((spec, i) => {
    paintLeg(ctx, spec, -1, p.dangle, p.kick, boil, i);
    paintLeg(ctx, spec, 1, p.dangle, p.kick, boil, i);
  });
  paintPaddle(ctx, -1, p.dangle, p.kick, boil);
  paintPaddle(ctx, 1, p.dangle, p.kick, boil);
  paintShield(ctx, boil);
  paintEyes(ctx, p.glare, boil);
  paintArm(ctx, p, -1, boil);
  paintArm(ctx, p, 1, boil);
  if (hands) {
    paintHand(ctx, p, -1, boil);
    paintHand(ctx, p, 1, boil);
  }
  ctx.restore();
}

export function drawCrabHands(ctx: CanvasRenderingContext2D, p: CrabPose, boil: number): void {
  const alpha = p.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.k, p.k);
  paintHand(ctx, p, -1, boil);
  paintHand(ctx, p, 1, boil);
  ctx.restore();
}

/** World px of a point in the crab's local units. */
export function crabToWorld(p: Pick<CrabPose, 'x' | 'y' | 'k' | 'rot'>, q: Pt): Pt {
  const [c, s] = [Math.cos(p.rot), Math.sin(p.rot)];
  return { x: p.x + (q.x * c - q.y * s) * p.k, y: p.y + (q.x * s + q.y * c) * p.k };
}

/** Where the claws rest when nothing is asked of them: raised a little in front, half open. */
export function restingClaws(x: number, y: number, k: number, rot: number, raise = 0, open = 0.35): readonly [CrabClaw, CrabClaw] {
  const p = { x, y, k, rot };
  const claw = (side: number): CrabClaw => {
    const local = { x: side * (96 + 20 * raise), y: -70 - 120 * raise };
    const w = crabToWorld(p, local);
    return { tip: w, angle: rot - Math.PI / 2 - side * (0.5 - 0.35 * raise), open };
  };
  return [claw(-1), claw(1)];
}
