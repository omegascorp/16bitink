import type { FishShape } from '../../../src/art/fishArt';
import { C, heightAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import type { Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import type { Fish } from './story';

/** Where things are on a fish (points along its body, the dad's brood pouch), and drawing one turned and rolled. */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A fish as drawSwimmer wants it, at the origin facing right: the caller turns it by `face` and rolls it by `up`. */
export const poseOf = (shape: FishShape, f: Fish): Pose => ({
  j: 0, shape, age: 0, x: 0, y: 0, length: f.len, facing: 1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

/**
 * A point of the drawing (texture px, fish facing right) on screen, bent
 * with the tail as drawSwimmer bends it, then tilted, turned and rolled with the fish.
 */
export function texToScreen(shape: FishShape, f: Fish, tx: number, ty: number): Pt {
  const a = ANATOMY[shape];
  const k = f.len / (2 * a.hl);
  const along = (C + a.hl - tx) / (2 * a.hl);
  const bend = Math.max(0, (along - 0.3) / 0.7);
  const dy = a.hh * (0.12 + 0.14 * f.effort) * bend * bend * Math.sin(f.beat - 2.4 * along);
  const lx = (tx - C) * k;
  const ly = (ty - C + dy) * k;
  const c = Math.cos(-f.tilt);
  const s = Math.sin(-f.tilt);
  return { x: f.x + f.face * (lx * c - ly * s), y: f.y + f.up * (lx * s + ly * c) };
}

/** A point on its body: `along` 0 nose .. 1 tail stalk, `side` -1 on its back .. 1 on its belly. */
export function bodyPoint(shape: FishShape, f: Fish, along: number, side: number): Pt {
  const a = ANATOMY[shape];
  return texToScreen(shape, f, C + a.hl - 2 * a.hl * along, C + side * heightAt(a, along));
}

/** Draws a fish turned by its `face` and rolled by its `up` (squeezed edge-on through either). */
export function drawFishAt(ctx: CanvasRenderingContext2D, sprite: Sprite, shape: FishShape, f: Fish, boil: number, look: SwimLook = {}): void {
  if (Math.abs(f.face) < 0.01 || Math.abs(f.up) < 0.01) return;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, f.up);
  drawSwimmer(ctx, sprite, poseOf(shape, f), boil, look);
  ctx.restore();
}

// ---------------------------------------------------------------- the brood pouch

/** The pouch runs along his belly over this stretch of his body (0 nose .. 1 tail stalk). */
export const POUCH_SPAN = [0.3, 0.62] as const;
const STEPS = 16;

/** How far the pouch bulges below his belly, px: a flat patch when empty, a fat sac when full, pinched by a contraction. */
export const pouchDepth = (fill: number, squeeze: number): number => (10 + 100 * fill) * (1 - 0.2 * squeeze);

export interface PouchShape {
  /** Along his belly, front to back. */
  readonly rim: readonly Pt[];
  /** The sac's outer edge, back to front. */
  readonly bulge: readonly Pt[];
}

function bellyNormal(f: Fish, along: number): Pt {
  const back = bodyPoint('pipefish', f, along, -1);
  const belly = bodyPoint('pipefish', f, along, 1);
  const d = Math.hypot(belly.x - back.x, belly.y - back.y) || 1;
  return { x: (belly.x - back.x) / d, y: (belly.y - back.y) / d };
}

export function pouchShape(f: Fish, fill: number, squeeze: number): PouchShape {
  const [a0, a1] = POUCH_SPAN;
  const depth = pouchDepth(fill, squeeze);
  const rim: Pt[] = [];
  const bulge: Pt[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const u = i / STEPS;
    const along = a0 + (a1 - a0) * u;
    const p = bodyPoint('pipefish', f, along, 0.8);
    const n = bellyNormal(f, along);
    // Fuller towards the front, like a drop hanging from his belly.
    const sag = depth * Math.sin(Math.PI * u) ** 0.75 * (1 + 0.15 * Math.cos(Math.PI * u));
    rim.push(p);
    bulge.push({ x: p.x + n.x * sag, y: p.y + n.y * sag });
  }
  return { rim, bulge: bulge.reverse() };
}

/** Where the babies come out: the seam at the bottom of the sac. */
export function pouchExit(f: Fish, fill: number): Pt {
  const { bulge } = pouchShape(f, fill, 0);
  return bulge[Math.round(STEPS * 0.45)]!;
}

/** The middle of the sac, for the lens's leader lines. */
export function pouchCentre(f: Fish, fill: number): Pt {
  const { rim, bulge } = pouchShape(f, fill, 0);
  const r = rim[STEPS / 2]!;
  const b = bulge[STEPS / 2]!;
  return { x: (r.x + b.x) / 2, y: (r.y + b.y) / 2 };
}
