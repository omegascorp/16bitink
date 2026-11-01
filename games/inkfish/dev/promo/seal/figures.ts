import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { drawBlueShark as paintBlueShark, prepareShark, type SharkLook } from './art/blueShark';
import { drawCapeFurSeal, prepareSeal, type SealLook } from './art/capeFurSeal';
import { onAnimal, pinned, type Placed, type WhitePose } from './story';

export { onAnimal, pinned };
export type { SealLook, SealMood } from './art/capeFurSeal';
export type { SharkLook } from './art/blueShark';

/**
 * The animals of the short, all painted like the food-chain video's great
 * white: the Cape fur seal (./art/capeFurSeal.ts), the blue shark
 * (./art/blueShark.ts) and the great white itself
 * (../foodchain/art/greatWhite.ts). The seal and the blue shark are drawn
 * nose to the right in their own units (310 long, middle at 0,0) and scaled,
 * turned and mirrored by the Placed they are drawn with.
 */

/** The seal, nose right in its own units. */
export function drawSeal(ctx: CanvasRenderingContext2D, p: Placed, look: SealLook, boil: number): void {
  drawCapeFurSeal(ctx, p, look, boil);
}

/** The blue shark, nose right in its own units (a tail beat from `p.beat`). */
export function drawBlueShark(ctx: CanvasRenderingContext2D, p: Placed, look: SharkLook, boil: number): void {
  paintBlueShark(ctx, p, look, boil);
}

/** A little blue shark icon, nose right, `len` long. */
export function drawSharkIcon(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, boil: number, face: 1 | -1 = 1): void {
  paintBlueShark(ctx, { x, y, len, rot: 0, face, beat: 0 }, {}, boil);
}

/** The great white (centre, length, heading; `flip` for swimming left, back still up). `t` picks the boil frame. */
export function drawWhite(ctx: CanvasRenderingContext2D, w: WhitePose, t: number): void {
  drawGreatWhite(ctx, w.x, w.y, w.len, w.angle, t, { jaw: w.jaw, tail: w.tail, worried: w.worried }, w.flip);
}

/** Bakes the seal's and the blue shark's sprites at the size the short opens on. */
export function prepareFigures(): void {
  prepareSeal();
  prepareShark();
}
