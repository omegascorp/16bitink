import type { KitEntry } from '../../foodchain/kit';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { drawSaltCroc as drawWholeCroc, prepareCroc } from '../../croc/art/saltCroc';
import type { DrawHead } from './contract';
import { drawCropped } from './crocCrop';

/** In the croc's own units: the bite on the snout's mouth line, and the head from the nose (159) to the back of the skull. */
export const CROC_BITE = { x: 135, y: 4.5 };
export const CROC_HEAD = 100;

/** A slow blink every few seconds. */
const blink = (t: number): number => {
  const u = (t % 3.7) / 0.22;
  return u < 1 ? Math.sin(Math.PI * u) : 0;
};

/** The painted saltwater crocodile's head and foreleg, facing right, the jaw turned on its hinge. */
export const drawSaltCroc: DrawHead = (ctx, p) => {
  const k = p.size / CROC_HEAD;
  const boil = Math.floor(p.t * BOIL_FPS) % BOIL_FRAMES;
  drawCropped(ctx, p, k, { x0: -165, x1: 40, y0: -62, y1: 85 }, 70, (c) => {
    drawWholeCroc(c, { x: -CROC_BITE.x, y: -CROC_BITE.y, len: 310, rot: 0, face: 1, beat: 0 }, { gape: p.jaw, lid: blink(p.t) }, boil);
  });
};

export async function prepare(): Promise<void> {
  prepareCroc();
}

export const KIT: KitEntry = {
  name: 'saltCroc',
  draw: (ctx, w, h, t) => drawSaltCroc(ctx, { x: w * 0.72, y: h * 0.55, size: Math.min(w, h) * 0.55, jaw: 0.5 + 0.5 * Math.sin(t * 2), t }),
};
