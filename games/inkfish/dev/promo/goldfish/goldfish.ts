import { bezier, bottomAt, C, PAPER_FILL, topAt, type Anatomy, type Kit } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { ellipse, type Pt } from '../../../src/art/pen';
import type { Pose } from '../chain';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';

/**
 * A common goldfish (Carassius auratus), new to the promos: the game has no
 * goldfish, so it is drawn here with the game's own fish kit, on the
 * clownfish's body length and eye (so the swimmer's bend and mouth fit it):
 * a deeper, rounder body, orange-gold with a pale gold belly, big scales,
 * a tall soft dorsal fin and a flowing twin fan tail.
 */

const BASE = ANATOMY.clownfish;
const ORANGE = '#ee7a1c';
const GOLD = '#f4b13a';
const FIN = '#f39a3a';
const SHINE = '#fff3c4';

/** One lobe of the fan tail: a broad veil fanning out from the tail stalk, its trailing edge in soft ripples. */
function lobe(k: Kit, spread: number, reach: number, alpha: number): void {
  const root = { x: k.x(1) + 4, y: C };
  const L = k.a.hh * reach;
  const S = k.a.hh * spread;
  const top = { x: root.x, y: topAt(k.a, 0.97) + 2 };
  const bot = { x: root.x, y: bottomAt(k.a, 0.97) - 2 };
  // The far edge ripples: three scallops between the upper and lower tips, a notch in the middle.
  const upTip = { x: root.x - L * 0.92, y: C - S };
  const loTip = { x: root.x - L * 0.92, y: C + S };
  const notch = { x: root.x - L * 0.55, y: C };
  const edge: Pt[] = [
    ...bezier(top, { x: root.x - L * 0.3, y: C - S * 0.95 }, upTip, 10),
    ...bezier(upTip, { x: root.x - L * 1.08, y: C - S * 0.45 }, { x: root.x - L * 0.78, y: C - S * 0.28 }, 8),
    ...bezier({ x: root.x - L * 0.78, y: C - S * 0.28 }, { x: root.x - L * 0.62, y: C - S * 0.12 }, notch, 6),
    ...bezier(notch, { x: root.x - L * 0.62, y: C + S * 0.12 }, { x: root.x - L * 0.78, y: C + S * 0.28 }, 6),
    ...bezier({ x: root.x - L * 0.78, y: C + S * 0.28 }, { x: root.x - L * 1.08, y: C + S * 0.45 }, loTip, 8),
    ...bezier(loTip, { x: root.x - L * 0.3, y: C + S * 0.95 }, bot, 10),
  ];
  const shape = [root, ...edge];
  k.pen.fill(shape, PAPER_FILL, alpha);
  k.pen.fill(shape, FIN, 0.34 * alpha);
  // Fine rays fanning from the stalk, and a deeper orange towards the root.
  k.pen.clipped(shape, () => k.pen.fill(ellipse(root.x, root.y, L * 0.45, S * 0.55, 18), ORANGE, 0.22 * alpha));
  for (let i = 1; i < 18; i++) {
    const p = edge[Math.round((i / 18) * (edge.length - 1))]!;
    k.pen.hair([root, { x: (root.x + p.x) / 2 + k.pen.jitter(0.8), y: (root.y + p.y) / 2 }, p], 0.5, k.ink, 0.5 * alpha);
  }
  k.pen.stroke(edge, 1.15, k.ink, alpha, false);
}

/** The twin fan tail, drawn first, behind the body: the far lobe paler and a little higher. */
function fanTail(k: Kit): void {
  k.pen.ctx.save();
  k.pen.ctx.translate(2, -4);
  lobe(k, 1.12, 1.4, 0.6);
  k.pen.ctx.restore();
  lobe(k, 1.25, 1.55, 1);
}

/** Orange-gold all over, a paler gold belly, and the wet shine along the back. */
function goldExtras(k: Kit): void {
  k.pen.fill(k.body, ORANGE, 0.5);
  k.pen.clipped(k.body, () => {
    const belly: Pt[] = [];
    for (let t = 0.05; t <= 0.98; t += 0.03) belly.push({ x: k.x(t), y: C + k.h(t) * 0.25 });
    for (let t = 0.98; t >= 0.05; t -= 0.03) belly.push({ x: k.x(t), y: bottomAt(k.a, t) + 4 });
    k.pen.fill(belly, GOLD, 0.55);
    const shine: Pt[] = [];
    for (let t = 0.2; t <= 0.7; t += 0.04) shine.push({ x: k.x(t), y: topAt(k.a, t) + k.h(t) * 0.32 });
    k.pen.stroke(shine, 2.6, SHINE, 0.75, false);
  });
  // The gill cover a touch redder, as on a real goldfish.
  k.pen.fill(ellipse(k.x(0.2), C + 2, k.h(0.2) * 0.42, k.h(0.2) * 0.7, 16), '#d9531c', 0.2);
}

export const GOLDFISH: Anatomy = {
  hl: BASE.hl,
  hh: BASE.hh,
  eye: BASE.eye,
  peak: 0.36,
  blunt: 0.9,
  peduncle: 0.34,
  tail: 'point',
  tailSize: 1,
  dorsal: { from: 0.28, to: 0.7, height: 0.85 },
  anal: { from: 0.72, to: 0.88, height: 0.55 },
  pectoral: 0.55,
  pelvic: true,
  scales: true,
  mouth: 'small',
  wash: ORANGE,
  finWash: FIN,
  finAlpha: 0.3,
  lateral: true,
  under: fanTail,
  extras: goldExtras,
};

/** The goldfish's sprite (`res` sprite px per texture px), on the clownfish's body. */
export const makeGoldfish = (res: number): Sprite => makeSprite('clownfish', res, 'light', GOLDFISH);

/** A fish on screen. `face` runs -1 (left) .. 1 (right), through 0 as it turns. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly face: number;
  /** Nose up, radians. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  /** Mouth open, 0 .. 1. */
  readonly jaw: number;
  /** Eyes shut happily after a meal. */
  readonly happy: boolean;
}

/** A fish as drawSwimmer wants it, at the origin facing right: the caller turns it by `face`. */
const poseOf = (f: Fish): Pose => ({
  j: 0, shape: 'clownfish', age: 0, x: 0, y: 0, length: f.len, facing: 1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

/** Where its nose is on screen (for touching the lever and catching food). */
export function noseOf(f: Fish): Pt {
  const half = f.len / 2;
  return { x: f.x + f.face * half * Math.cos(f.tilt), y: f.y - half * Math.sin(f.tilt) };
}

/** Draws a fish turned by its `face` (squeezed edge-on through a turn). */
export function drawGoldfish(ctx: CanvasRenderingContext2D, sprite: Sprite, f: Fish, boil: number): void {
  if (Math.abs(f.face) < 0.01) return;
  const look: SwimLook = { jaw: f.jaw, eyes: f.happy ? 'happy' : null };
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  drawSwimmer(ctx, sprite, poseOf(f), boil, look);
  ctx.restore();
}
