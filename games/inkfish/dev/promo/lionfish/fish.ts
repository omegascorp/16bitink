import type { FishShape } from '../../../src/art/fishArt';
import { C, heightAt, topAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import type { Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';

/** Fish on screen as the story moves them, and points on them (the lionfish's spines, its body). */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

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
  readonly jaw: number;
  /** A swallowed meal's swelling, 0 .. 1. */
  readonly lump: number;
  readonly alpha: number;
}

/** A fish as drawSwimmer wants it, at the origin facing right: the caller turns it by `face`. */
const poseAtOrigin = (shape: FishShape, f: Fish): Pose => ({
  j: 0, shape, age: 0, x: 0, y: 0, length: f.len, facing: 1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

/** The same in screen space, for a fish facing squarely one way (the mouth and the suck-in need it). */
export const screenPoseOf = (shape: FishShape, f: Fish): Pose => ({
  ...poseAtOrigin(shape, f), x: f.x, y: f.y, facing: f.face < 0 ? -1 : 1,
});

/** Draws a fish turned by its `face` (squeezed edge-on through a turn). */
export function drawFishAt(ctx: CanvasRenderingContext2D, sprite: Sprite, shape: FishShape, f: Fish, boil: number, look: SwimLook = {}): void {
  if (Math.abs(f.face) < 0.01 || f.alpha <= 0) return;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  drawSwimmer(ctx, sprite, poseAtOrigin(shape, f), boil, { alpha: f.alpha, ...look });
  ctx.restore();
}

/** A point of the drawing (texture px, fish facing right) on screen, tilted and turned with the fish (the head doesn't bend). */
export function texToScreen(shape: FishShape, f: Fish, tx: number, ty: number): Pt {
  const k = f.len / (2 * ANATOMY[shape].hl);
  const lx = (tx - C) * k;
  const ly = (ty - C) * k;
  const c = Math.cos(-f.tilt);
  const s = Math.sin(-f.tilt);
  return { x: f.x + f.face * (lx * c - ly * s), y: f.y + lx * s + ly * c };
}

/** A point on its body: `along` 0 nose .. 1 tail stalk, `side` -1 on its back .. 1 on its belly. */
export function bodyPoint(shape: FishShape, f: Fish, along: number, side: number): Pt {
  const a = ANATOMY[shape];
  return texToScreen(shape, f, xAt(a, along), C + side * heightAt(a, along));
}

/**
 * The lionfish's twelve venomous dorsal spines, base and tip, as its
 * drawing places them (art/fish/species/reef.ts).
 */
export function spinesOf(f: Fish): readonly { readonly base: Pt; readonly tip: Pt }[] {
  const a = ANATOMY.lionfish;
  return Array.from({ length: 12 }, (_, i) => {
    const t = 0.18 + i * 0.037;
    const base = { x: xAt(a, t), y: topAt(a, t) + 3 };
    const len = a.hh * (2.0 - i * 0.07);
    const tip = { x: base.x - len * (0.22 + i * 0.03), y: base.y - len };
    return { base: texToScreen('lionfish', f, base.x, base.y), tip: texToScreen('lionfish', f, tip.x, tip.y) };
  });
}

/** The tips of the lionfish's fanned pectoral rays (its lowest points), as its drawing places them. */
export function finTipsOf(f: Fish): readonly Pt[] {
  const a = ANATOMY.lionfish;
  const root = { x: xAt(a, 0.32), y: C + heightAt(a, 0.32) * 0.2 };
  return Array.from({ length: 15 }, (_, i) => {
    const ang = (80 + i * 7) * (Math.PI / 180);
    const len = a.hh * (1.9 + Math.sin((i / 14) * Math.PI) * 0.7);
    return texToScreen('lionfish', f, root.x + Math.cos(ang) * len, root.y + Math.sin(ang) * len);
  });
}
