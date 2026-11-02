import { drawGreatWhite } from '../foodchain/art/greatWhite';

/** The great white as drawGreatWhite takes it, for the kit's side-by-side comparison. */
export interface WhitePose {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly angle: number;
  readonly flip: boolean;
  readonly jaw: number;
  readonly worried: number;
  readonly tail: number;
}

export function drawWhite(ctx: CanvasRenderingContext2D, w: WhitePose, t: number): void {
  drawGreatWhite(ctx, w.x, w.y, w.len, w.angle, t, { jaw: w.jaw, tail: w.tail, worried: w.worried }, w.flip);
}
