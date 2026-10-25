import { BOIL_FRAMES } from '../../../src/art/textures';
import { clamp01, ramp, smooth } from '../short';
import type { Sprite } from '../sprites';
import { drawDogfish, onDogfish, type Swim } from './dogfish';
import { blend, curlArm, type Pt, shareAt, spline } from './geom';
import { ARM_W, type Body, drawArm, drawBody, drawWeb, FAR, NEAR, rootOf } from './octoArt';
import { cycles, EIGHT_AT, IT_AT, WRAPS_AT } from './story';
import { bubbleBurst, drawBubbles, drawRays, drawSpecks, drawVignette, drawWash } from './water';

/**
 * Open dark water: the hook (the octopus with its arms wrapped round a
 * dogfish, pulling it in to its mouth) and the count (the same catch, the
 * arms wrapping one at a time, 1 to 8). The hook runs on its own clock, `h`,
 * from just before the loop point through the first two seconds, so the end
 * of the loop flows into frame 1.
 */

const SCALE = 1.4;
/** The catch is drawn in its own px, then zoomed in so it fills the frame: world point `at` lands on screen point `to`. */
export const SEA_VIEW = { zoom: 1.55, at: { x: 560, y: 800 }, to: { x: 540, y: 880 } } as const;
export const seaToScreen = (p: Pt): Pt => ({ x: SEA_VIEW.to.x + (p.x - SEA_VIEW.at.x) * SEA_VIEW.zoom, y: SEA_VIEW.to.y + (p.y - SEA_VIEW.at.y) * SEA_VIEW.zoom });
/** How far through the hook's pull the catch is at hook time h (the count holds it at the start). */
const pullAt = (h: number): number => smooth((h + 1.3) / 3.6);

/** The octopus at hook time h. */
export function seaBody(h: number): Body {
  const pull = pullAt(h);
  return {
    x: 556,
    y: 784 + 10 * pull,
    angle: 0.05 + 0.025 * Math.sin(h * 2.1),
    scale: SCALE,
    lean: -0.04 + 0.04 * Math.sin(h * 1.7),
    breathe: 1 + 0.025 * Math.sin(h * 3.4),
    gaze: { x: -0.55, y: 0.8 },
    lid: 0,
    brow: 0.55,
    flush: 0.45,
    lineK: 1,
  };
}

/** The dogfish at hook time h: struggling, drawn slowly up towards the mouth. */
export function seaShark(h: number): Swim {
  const pull = pullAt(h);
  return {
    x: 540 + 4 * pull,
    y: 935 - 30 * pull,
    length: 540,
    facing: -1,
    tilt: 0.08 + 0.045 * Math.sin(h * 5.3),
    beat: h * 2 * Math.PI * 1.9,
    effort: 1,
  };
}

/** Where each arm first meets the shark (share along it, +1 its nose), and which way it spirals along it. */
// Chosen to leave the shark's head, both dorsal fins and its tail in clear view.
const BAND: Readonly<Record<number, number>> = { 0: -0.74, 1: -0.2, 2: 0.0, 3: 0.62, 4: 0.5, 5: 0.36, 6: -0.6, 7: -0.88 };
const TURN: Readonly<Record<number, number>> = { 0: -1, 1: -1, 2: 1, 3: 1, 4: -1, 5: -1, 6: 1, 7: 1 };

export interface ArmPath {
  readonly path: Pt[];
  /** The stretches (shares of its length) that pass in front of the shark; the rest is behind it. */
  readonly front: readonly (readonly [number, number])[];
}

/**
 * Arm i wrapped round the shark. A front arm comes down over its flank,
 * under its belly, up behind it and over its back again, the tip curled on
 * its side; a back arm goes behind it from the top and comes round under its
 * belly onto its flank. Either way the arm spirals, so the shark reads as
 * wrapped up.
 */
export function wrappedArm(body: Body, shark: Swim, i: number, h: number, squeeze: number): ArmPath {
  const root = rootOf(body, i);
  const u = BAND[i]!;
  const k = TURN[i]! * 0.17;
  const w = (n: number): number => 5 * Math.sin(h * 3.1 + i * 1.9 + n);
  const P = (du: number, v: number, n = 0): Pt => {
    const p = onDogfish(shark, u + du, v);
    return { x: p.x + w(n), y: p.y + w(n + 2) };
  };
  const top = 1.04 - 0.06 * squeeze;
  const out = { x: (root.x - body.x) * 0.55, y: 30 * body.scale };
  const splay = { x: root.x + out.x, y: root.y + out.y };
  if ((NEAR as readonly number[]).includes(i)) {
    const ctrl = [
      root, splay, P(0.04, 1.75, 1), P(0, top), P(-k * 0.25, 0), P(-k * 0.45, -1.02),
      P(-k * 0.75, -1.55, 2), P(-k * 1.05, -0.4), P(-k * 1.2, 0.8), P(-k * 1.35, 1.4, 3),
      P(-k * 1.6, 1.62, 4), P(-k * 1.78, 1.32, 5),
    ];
    const path = spline(ctrl, 8);
    return { path, front: [[0, shareAt(path, ctrl[5]!)]] };
  }
  const ctrl = [
    root, splay, P(-0.03, 1.8, 1), P(0, top), P(k * 0.3, 0), P(k * 0.5, -1.05),
    P(k * 0.8, -1.55, 2), P(k * 1.15, -1.25, 3), P(k * 1.35, -0.4), P(k * 1.25, 0.25, 4), P(k * 1.0, 0.15, 5),
  ];
  const path = spline(ctrl, 8);
  return { path, front: [[shareAt(path, ctrl[7]!), 1]] };
}

/** Arm i reaching out, free, before it wraps (the count). */
function freeArm(body: Body, i: number, t: number): Pt[] {
  const HEADING: Readonly<Record<number, number>> = { 0: 0.3, 1: 1.0, 2: 2.15, 3: 2.85, 4: 3.6, 5: -2.15, 6: -1.0, 7: -0.45 };
  const CURL: Readonly<Record<number, number>> = { 0: 1.9, 1: 1.4, 2: -1.4, 3: -1.9, 4: 2.3, 5: 1.7, 6: -1.7, 7: -2.3 };
  const far = (FAR as readonly number[]).includes(i);
  return curlArm(rootOf(body, i), HEADING[i]!, (far ? 420 : 500) * (SCALE / 1.3), CURL[i]!, 0.35, cycles(9, t) + i, 30);
}

/** The order the arms wrap in during the count (left to right across the shark). */
export const WRAP_ORDER = [3, 4, 5, 2, 1, 6, 0, 7] as const;
const WRAP_S = 0.4;
/** Each wrap starts on its count: the first on "wraps", the eighth on "eight". */
export const wrapStart = (k: number): number => WRAPS_AT - 0.06 + (k * (EIGHT_AT + 0.04 - WRAPS_AT)) / 7;
/** How far arm i has wrapped at video time t in the count, 0..1. */
export const wrapOf = (i: number, t: number): number => {
  const k = WRAP_ORDER.indexOf(i as (typeof WRAP_ORDER)[number]);
  return smooth(clamp01((t - wrapStart(k)) / WRAP_S));
};

/** The arms tighten in pulses as the shark thrashes. */
const squeezeAt = (h: number): number => 0.5 + 0.5 * Math.sin(h * 5.7);

export interface SeaState {
  readonly body: Body;
  readonly shark: Swim;
  readonly arms: readonly ArmPath[];
  readonly squeeze: number;
}

/** Everything in the sea at video time t: the hook (count false, on the hook clock h) or the count. */
export function seaAt(t: number, h: number, count: boolean): SeaState {
  const body = count ? { ...seaBody(-1.3), lid: 0.18, brow: 0.6, gaze: { x: -0.2, y: 0.8 } } : seaBody(h);
  const shark = count ? { ...seaShark(-1.3), beat: t * 2 * Math.PI * 2.2, tilt: 0.08 + 0.04 * Math.sin(t * 6) } : seaShark(h);
  const squeeze = count ? 0 : squeezeAt(h);
  const arms = Array.from({ length: 8 }, (_, i): ArmPath => {
    const wrapped = wrappedArm(body, shark, i, count ? t : h, squeeze);
    if (!count) return wrapped;
    const u = wrapOf(i, t);
    if (u >= 1) return wrapped;
    const path = blend(freeArm(body, i, t), wrapped.path, u, 80);
    return { path, front: u > 0.8 ? wrapped.front : (NEAR as readonly number[]).includes(i) ? [[0, 1]] : [] };
  });
  return { body, shark, arms, squeeze };
}

const armSeed = (i: number, boil: number): number => 4001 + i * 131 + (boil % BOIL_FRAMES) * 977;

/** The stretches of an arm behind the shark: everything not in front. */
function behind(front: readonly (readonly [number, number])[]): [number, number][] {
  const out: [number, number][] = [];
  let at = 0;
  for (const [a, b] of front) {
    if (a > at) out.push([at, a]);
    at = b;
  }
  if (at < 1) out.push([at, 1]);
  return out;
}

/** The whole sea scene. */
export function drawSea(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, dogfish: Sprite, s: SeaState, t: number, h: number, boil: number, count: boolean): void {
  drawWash(ctx, paper, count ? 'rgba(24,50,74,0.95)' : 'rgba(16,56,68,0.94)', 'rgba(3,10,16,0.98)', 0, 1750);
  drawRays(ctx, t, 0.1, 0, 1500);
  // A soft pool of light behind the catch.
  const glow = ctx.createRadialGradient(560, 760, 60, 560, 800, 640);
  glow.addColorStop(0, 'rgba(120,180,175,0.22)');
  glow.addColorStop(1, 'rgba(120,180,175,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1920);
  drawSpecks(ctx, t);
  ctx.save();
  ctx.translate(SEA_VIEW.to.x, SEA_VIEW.to.y);
  ctx.scale(SEA_VIEW.zoom, SEA_VIEW.zoom);
  ctx.translate(-SEA_VIEW.at.x, -SEA_VIEW.at.y);
  const b = boil % BOIL_FRAMES;
  const w0 = ARM_W * s.body.scale;
  const flush = s.body.flush;
  const look = (i: number, far: boolean): Parameters<typeof drawArm>[2] => ({ w0: w0 * (far ? 0.92 : 1), seed: armSeed(i, b), side: TURN[i]! > 0 ? 1 : -1, far, flush, wEnd: 0.06 });
  const isFar = (i: number): boolean => (FAR as readonly number[]).includes(i);
  // Behind the body: the back arms' roots and webs.
  for (const i of FAR) drawArm(ctx, s.arms[i]!.path, { ...look(i, true), to: s.arms[i]!.front[0]?.[0] ?? 1 });
  drawWeb(ctx, s.arms[4]!.path, s.arms[5]!.path, 0.14, 51 + b, w0, { far: true, flush });
  drawWeb(ctx, s.arms[5]!.path, s.arms[6]!.path, 0.14, 52 + b, w0, { far: true, flush });
  drawWeb(ctx, s.arms[6]!.path, s.arms[7]!.path, 0.14, 53 + b, w0, { far: true, flush });
  drawBody(ctx, s.body, 7001 + b * 977);
  // Behind the shark: the front arms' stretches under and behind it.
  for (const i of NEAR) for (const [a, z] of behind(s.arms[i]!.front)) drawArm(ctx, s.arms[i]!.path, { ...look(i, false), from: Math.max(0, a - 0.005), to: z });
  drawDogfish(ctx, dogfish, s.shark, boil, { jaw: 0.5 + 0.12 * Math.sin(t * 7), squash: 1 - 0.035 * s.squeeze, eyes: null });
  // In front of the shark: the back arms coming round its belly, then the front arms and their webs.
  for (const i of FAR) for (const [a, z] of s.arms[i]!.front) drawArm(ctx, s.arms[i]!.path, { ...look(i, false), from: a, to: z });
  drawWeb(ctx, s.arms[3]!.path, s.arms[4]!.path, 0.07, 54 + b, w0, { flush });
  drawWeb(ctx, s.arms[7]!.path, s.arms[0]!.path, 0.07, 55 + b, w0, { flush });
  drawWeb(ctx, s.arms[0]!.path, s.arms[1]!.path, 0.08, 56 + b, w0, { flush });
  drawWeb(ctx, s.arms[1]!.path, s.arms[2]!.path, 0.08, 57 + b, w0, { flush });
  drawWeb(ctx, s.arms[2]!.path, s.arms[3]!.path, 0.08, 58 + b, w0, { flush });
  for (const i of [...NEAR].reverse()) for (const [a, z] of s.arms[i]!.front) if (!isFar(i)) drawArm(ctx, s.arms[i]!.path, { ...look(i, false), from: a, to: z });
  // Bubbles shaken out of the struggle.
  drawBubbles(ctx, [
    ...bubbleBurst(onDogfish(s.shark, -0.95, 0.3), (((h + 1.3) % 1.1) + 1.1) % 1.1, 5, 77, 50, 9),
    ...bubbleBurst(onDogfish(s.shark, 0.95, 0.8), (((h + 0.75) % 1.4) + 1.4) % 1.4, 4, 91, 40, 8),
  ]);
  ctx.restore();
  drawVignette(ctx, 0.65);
}

/** Where to write arm i's count: evenly along the shark's flank, nose to tail, so 1 to 8 read like a ruler. */
export function countSpot(s: SeaState, i: number): Pt {
  const k = WRAP_ORDER.indexOf(i as (typeof WRAP_ORDER)[number]);
  return seaToScreen(onDogfish(s.shark, 0.62 - k * 0.21, 0.05));
}

/** The count fades in from the first wrap. */
export const countAlpha = (t: number): number => ramp(t, IT_AT, IT_AT + 0.15);

/** The hook's slow drift in (1 = none), the same at the loop's end as its start. */
export const seaZoom = (h: number): number => 1 + 0.035 * smooth((h + 1.25) / 3.5);
