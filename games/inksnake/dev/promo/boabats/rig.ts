import { route } from '../krait/path';
import { type BodyPose, drawBody, drawSprite, type Pt, type Sprite, type Strip } from '../sprites';
import type { BatPose } from './fruitBat';
import { JAW_ART, type EyeState } from './cubanHead';

/**
 * The hanging Cuban boa: its body laid along a spine from the head up into
 * the ceiling (the ceiling is drawn over its end), the side-on jaws hung
 * from hinges on the neck as heartbeat/boaRig.ts hangs them (upright
 * whichever way the head points), a bat held between the jaws, and the head
 * turning to face the camera.
 */
export interface BoaCast {
  readonly body: Strip;
  readonly upper: Readonly<Record<EyeState, Sprite>>;
  readonly lower: Sprite;
  readonly front: Sprite;
  readonly tongue: Sprite;
}

export interface BatCast {
  readonly big: Readonly<Record<BatPose, Sprite>>;
  readonly mid: Readonly<Record<BatPose, Sprite>>;
  readonly far: Readonly<Record<BatPose, Sprite>>;
}

export interface Held {
  readonly pose: BatPose;
  readonly scale: number;
  /** Turn from the head's heading (radians), and how far along the head from the rim (share of its length, + = back). */
  readonly turn: number;
  readonly back: number;
  /** Bat-relative nudge (px) across the jaw. */
  readonly across?: number;
}

export interface Boa {
  /** The middle of the mouth's rim, the way the head points, its length and the neck's width. */
  readonly rim: Pt;
  readonly heading: number;
  readonly len: number;
  readonly neck: number;
  /** The body's width as a share of the neck's, once past the neck. */
  readonly girth: number;
  /** The spine from just behind the hinge up into the ceiling. */
  readonly knots: readonly Pt[];
  /** The gape at the rim, each side of the axis (px). */
  readonly gape: number;
  readonly eye: EyeState;
  readonly held?: Held;
  /** 0 side-on .. 1 facing the camera. */
  readonly turn?: number;
  readonly tongue?: number;
  readonly offset?: number;
}

export interface Frame {
  readonly e: Pt;
  /** Across the head, towards its crown: always the screen-upper side. */
  readonly up: Pt;
  /** How the side-on sprites are flipped so their crown is on `up`. */
  readonly flip: number;
}

export function frameOf(heading: number): Frame {
  const e = { x: Math.cos(heading), y: Math.sin(heading) };
  const left = { x: -e.y, y: e.x };
  return left.y <= 0 ? { e, up: left, flip: -1 } : { e, up: { x: e.y, y: -e.x }, flip: 1 };
}

export const along = (p: Pt, f: Frame, forward: number, up: number): Pt => ({ x: p.x + f.e.x * forward + f.up.x * up, y: p.y + f.e.y * forward + f.up.y * up });

export const hingeOf = (b: Boa): Pt => along(b.rim, frameOf(b.heading), -b.len, 0);

function spineOf(b: Boa): { spine: Pt[]; widths: number[] } {
  const f = frameOf(b.heading);
  // Head-on, the neck runs away from us behind the face: it ends at the hinge.
  const start = (b.turn ?? 0) >= 0.5 ? [] : [along(b.rim, f, -b.len * 0.6, 0)];
  // Short slices: on the outside of a bend, long ones fan apart and show seams (combing).
  const r = route([...start, hingeOf(b), ...b.knots], 2);
  const n = Math.ceil(r.length / 2);
  const spine = Array.from({ length: n + 1 }, (_, i) => r.at((i / n) * r.length));
  const grow = b.len * 2.2;
  const widths = spine.map((_, i) => {
    const d = (i / n) * r.length;
    const k = Math.min(1, d / grow);
    return b.neck * (1 + (b.girth - 1) * k * k * (3 - 2 * k));
  });
  return { spine, widths };
}

function drawJaw(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, hinge: Pt, tip: Pt, flip: number, alpha = 1): void {
  const rotation = Math.atan2(tip.y - hinge.y, tip.x - hinge.x);
  drawSprite(ctx, sprite, boil, { x: hinge.x, y: hinge.y, rotation, flip, scale: Math.hypot(tip.x - hinge.x, tip.y - hinge.y) / JAW_ART, alpha });
}

/** The held bat, set between the jaws. */
function drawHeld(ctx: CanvasRenderingContext2D, bats: BatCast, boil: number, b: Boa, f: Frame): void {
  const h = b.held!;
  const at = along(b.rim, f, -h.back * b.len, h.across ?? 0);
  drawSprite(ctx, bats.big[h.pose], boil, { x: at.x, y: at.y, scale: h.scale, rotation: b.heading + h.turn });
}

/** Head-on: the front sprite, squeezed across as it comes round. */
function drawFront(ctx: CanvasRenderingContext2D, cast: BoaCast, boil: number, b: Boa, k: number): void {
  const at = hingeOf(b);
  const s = (b.neck * 1.45) / 33;
  ctx.save();
  ctx.translate(at.x, at.y + b.neck * 0.15);
  ctx.scale(0.86 * (0.45 + 0.55 * k), 1);
  drawSprite(ctx, cast.front, boil, { x: 0, y: 0, scale: s });
  ctx.restore();
}

/** The body as the game lays it, with a dark brown contour over the strip's edge (thicker as the body is). */
function drawBoaBody(ctx: CanvasRenderingContext2D, strip: Strip, boil: number, pose: BodyPose, line: number): void {
  drawBody(ctx, strip, boil, pose);
  const n = pose.spine.length;
  const side = (s: 1 | -1): Pt[] => pose.spine.map((p, i) => {
    const a = pose.spine[Math.max(0, i - 1)]!;
    const c = pose.spine[Math.min(n - 1, i + 1)]!;
    const l = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const half = (pose.widths[i]! / 2 - line * 0.3) * s;
    return { x: p.x - ((a.y - c.y) / l) * half, y: p.y + ((a.x - c.x) / l) * half };
  });
  ctx.save();
  ctx.strokeStyle = '#140b07';
  ctx.lineWidth = line;
  ctx.lineJoin = 'round';
  for (const edge of [side(1), side(-1)]) {
    ctx.beginPath();
    edge.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}

/** Solid skin in the head's colours under the back of the head, fading into the body's pattern behind the jaws' corner: no see-through joint. */
function drawNeckSkin(ctx: CanvasRenderingContext2D, b: Boa, f: Frame): void {
  const half = b.neck * 0.5;
  const a = along(b.rim, f, -b.len * 0.55, 0);
  const z = along(b.rim, f, -b.len * 1.2, 0);
  const g = ctx.createLinearGradient(a.x, a.y, z.x, z.y);
  g.addColorStop(0, 'rgba(106,81,57,1)');
  g.addColorStop(0.5, 'rgba(96,72,50,0.9)');
  g.addColorStop(1, 'rgba(96,72,50,0)');
  const quad = [along(b.rim, f, -b.len * 0.55, half * 0.92), along(b.rim, f, -b.len * 1.2, half * 0.95), along(b.rim, f, -b.len * 1.2, -half * 0.95), along(b.rim, f, -b.len * 0.55, -half * 0.92)];
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  quad.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCheek(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.save();
  ctx.fillStyle = '#3a2618';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawBoa(ctx: CanvasRenderingContext2D, cast: BoaCast, bats: BatCast, boil: number, b: Boa): void {
  const { spine, widths } = spineOf(b);
  drawBoaBody(ctx, cast.body, boil, { spine, widths, along: (b.neck * b.girth) / 24, offset: b.offset ?? 30 }, Math.max(4, b.neck * 0.06));
  const turn = b.turn ?? 0;
  if (turn >= 0.5) {
    drawFront(ctx, cast, boil, b, (turn - 0.5) / 0.5);
    return;
  }
  // Foreshortened as it begins to turn.
  const len = b.len * (1 - 1.1 * turn);
  const head = { ...b, len, rim: along(hingeOf(b), frameOf(b.heading), len, 0) };
  const f = frameOf(b.heading);
  const open = Math.min(1, (b.gape * 2) / 120);
  // Shut on a catch, the jaws meet at their corner and part only at the front, round the bat.
  const hinge = b.held ? 0.06 : 0.04 + 0.68 * open;
  const half = b.neck / 2;
  const hingeU = along(head.rim, f, -len, half * hinge);
  const hingeL = along(head.rim, f, -len, -half * hinge);
  const tongue = b.tongue ?? 0;
  if (tongue > 0) drawSprite(ctx, cast.tongue, boil, { ...along(head.rim, f, (b.len / 8) * tongue - b.len * 0.05, -b.neck * 0.02), rotation: b.heading, scale: b.len / 62 });
  // A held bat sits behind both jaws, its body showing between them; the jaws' corner is solid skin.
  if (b.held) drawHeld(ctx, bats, boil, head, f);
  drawNeckSkin(ctx, head, f);
  drawCheek(ctx, [hingeU, along(head.rim, f, -len * 0.42, b.gape * 0.55), along(head.rim, f, -len * 0.42, -b.gape * 0.55), hingeL]);
  drawJaw(ctx, cast.lower, boil, hingeL, along(head.rim, f, 0, -b.gape), f.flip);
  drawJaw(ctx, cast.upper[b.eye], boil, hingeU, along(head.rim, f, 0, b.gape), f.flip);
}

/** Knots for a boa hanging from the ceiling at x, its head's hinge at `hinge`, slid `lift` px up into the rock and swaying `sway` px. */
export function hangingKnots(x: number, hinge: Pt, dir: number, lift: number, sway: number, heading = Math.PI / 2): Pt[] {
  const top = -1300;
  // A loose S as it hangs, not a rigid tube.
  // The neck first runs straight back from the jaws' corner, so it never kinks there (a kink combs the strip).
  const pts: Pt[] = [
    { x: hinge.x - Math.cos(heading) * 120, y: hinge.y - Math.sin(heading) * 120 },
    { x: hinge.x - Math.cos(heading) * 120 * 0.5 - dir * 20, y: hinge.y - 230 },
    { x: x - dir * 30, y: hinge.y - 380 },
    { x: x + dir * 34, y: (hinge.y - 380 + 380) / 2 },
    { x: x - dir * 18, y: 380 },
    { x, y: 0 },
    { x: x + dir * 8, y: top },
  ];
  return pts.map((p) => {
    const k = Math.max(0, Math.min(1, (p.y - 300) / (hinge.y - 300)));
    return { x: p.x + sway * k, y: p.y - lift };
  });
}
