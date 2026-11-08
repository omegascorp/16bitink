import { xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { bodyProportions } from '../../../src/art/fishArt';
import type { Sprite } from '../sprites';
import type { Ribbon } from './story';

/** A screen point. */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

const OAR = ANATOMY.oarfish;
/** Texture px per column of the drawing: the ribbon is cut into thin slices, each laid along its curve. */
const COLUMN = 1.5;
/** Texture px each column shares with its neighbours. */
const OVERLAP = 0.6;

/**
 * The oarfish's drawing bent along a curve: the game's drawing cut into thin
 * columns (as the shared swimmer cuts a fish to bend its tail), each column
 * set on the ribbon at its place, turned to the curve's direction. `screen`
 * maps a world point to the screen; `clip` limits drawing to the columns
 * between two shares of the length (0 nose .. 1 tail), if wanted.
 */
export function drawRibbon(
  ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, ribbon: Ribbon, zoom: number, screen: (p: Pt) => Pt,
): void {
  const canvas = sprite.frames[boil % sprite.frames.length]!;
  const R = sprite.res;
  const side = canvas.width;
  const half = side / 2;
  const noseX = xAt(OAR, 0);
  const tailX = xAt(OAR, 1);
  const span = noseX - tailX;
  const hl = bodyProportions('oarfish').hl;
  // Screen px per sprite px along the ribbon, and across it (the squash).
  const along = (ribbon.length * zoom) / (2 * hl * R);
  const eps = (ribbon.length * 0.004);
  for (let x = noseX; x > tailX; x -= COLUMN) {
    const sx = (x - COLUMN / 2) * R;
    const f = (noseX - (x - COLUMN / 2)) / span;
    const s = f * ribbon.length;
    const p = screen(ribbon.at(s));
    const a = screen(ribbon.at(Math.max(0, s - eps)));
    const b = screen(ribbon.at(Math.min(ribbon.length, s + eps)));
    // The column's own x axis points to the nose, which is back along the ribbon.
    const angle = Math.atan2(a.y - b.y, a.x - b.x);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    // A column drawn with a little of its neighbours either side, so the seams between them close. The ribbon's back is up (it faces left, towards the viper).
    const wide = (COLUMN + 2 * OVERLAP) * R;
    const w = wide * along;
    ctx.scale(1, -1);
    ctx.drawImage(canvas, sx - OVERLAP * R, 0, wide, side, -w / 2, -half * along * ribbon.squash, w, side * along * ribbon.squash);
    ctx.restore();
  }
}

/** The ribbon's nose on the screen. */
export const noseOf = (ribbon: Ribbon, screen: (p: Pt) => Pt): Pt => screen(ribbon.at(0));

