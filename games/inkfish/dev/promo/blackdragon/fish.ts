import type { FishShape } from '../../../src/art/fishArt';
import { fishLights } from '../../../src/art/fishArt';
import { C, heightAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import type { Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import type { Fish } from './story';

/** Where things are on the fish: points along their bodies, their lights, and the blackdragon as a black cut-out. */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A fish as drawSwimmer wants it, at the origin facing right: the caller turns it by `face`. */
export const poseOf = (shape: FishShape, f: Fish): Pose => ({
  j: 0, shape, age: 0, x: 0, y: 0, length: f.len, facing: 1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

/** The same in screen space, for a fish facing squarely one way (drawSwimmer's mouth and the suck-in need it). */
export const screenPoseOf = (shape: FishShape, f: Fish): Pose => ({
  ...poseOf(shape, f), x: f.x, y: f.y, facing: f.face < 0 ? -1 : 1,
});

/**
 * A point of the drawing (texture px, fish facing right) on screen, bent
 * with the tail as drawSwimmer bends it, then tilted and turned with the fish.
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
  return { x: f.x + f.face * (lx * c - ly * s), y: f.y + lx * s + ly * c };
}

/** A point on its body: `along` 0 nose .. 1 tail stalk, `side` -1 on its back .. 1 on its belly. */
export function bodyPoint(shape: FishShape, f: Fish, along: number, side: number): Pt {
  const a = ANATOMY[shape];
  return texToScreen(shape, f, C + a.hl - 2 * a.hl * along, C + side * heightAt(a, along));
}

/** Its glowing spots on screen, with their size there. */
export function lightsOf(shape: FishShape, f: Fish): readonly (Pt & { readonly r: number; readonly color: string })[] {
  const k = f.len / (2 * ANATOMY[shape].hl);
  return fishLights(shape).map((l) => ({ ...texToScreen(shape, f, l.x, l.y), r: l.r * k, color: l.color }));
}

/** Draws a fish turned by its `face` (squeezed edge-on through a turn). */
export function drawFishAt(ctx: CanvasRenderingContext2D, sprite: Sprite, shape: FishShape, f: Fish, boil: number, look: SwimLook = {}): void {
  if (Math.abs(f.face) < 0.01) return;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  drawSwimmer(ctx, sprite, poseOf(shape, f), boil, look);
  ctx.restore();
}

/** Near-black: what 0.05% reflectance looks like next to anything else. */
export const ULTRA_BLACK = '#020203';

/**
 * The blackdragon as the camera sees it: its drawing filled solid
 * ultra-black, fins, whisker and all, with only a glint in its eye.
 */
export function silhouette(sprite: Sprite, shape: FishShape): Sprite {
  const a = ANATOMY[shape];
  const R = sprite.res;
  const frames = sprite.frames.map((frame) => {
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(frame, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = ULTRA_BLACK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    const ex = (C + a.hl - 2 * a.hl * a.eye.t) * R;
    const ey = (C - heightAt(a, a.eye.t) * 0.3) * R;
    const r = a.eye.r * R;
    ctx.strokeStyle = '#2b2d36';
    ctx.lineWidth = r * 0.25;
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d8dce8';
    ctx.beginPath();
    ctx.arc(ex + r * 0.3, ey - r * 0.3, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  });
  return { ...sprite, frames };
}
