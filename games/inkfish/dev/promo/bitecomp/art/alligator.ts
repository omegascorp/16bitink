import type { KitEntry } from '../../foodchain/kit';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import type { DrawHead } from './contract';
import { drawCropped } from './crocCrop';
import { drawGator, GATOR_BITE, prepareGator } from './crocGator';

/** The head from the nose (at 144 after the reshape) to the back of the skull. */
const GATOR_HEAD = 86;

const blink = (t: number): number => {
  const u = ((t + 1.4) % 4.3) / 0.22;
  return u < 1 ? Math.sin(Math.PI * u) : 0;
};

/**
 * The American alligator: the saltwater croc's painting reshaped (a short, deep, rounded snout instead
 * of a long V), near-black olive skin, no teeth showing with the jaw shut.
 */
export const drawAlligator: DrawHead = (ctx, p) => {
  const k = p.size / GATOR_HEAD;
  const boil = Math.floor(p.t * BOIL_FPS) % BOIL_FRAMES;
  drawCropped(ctx, p, k, { x0: -135, x1: 45, y0: -70, y1: 105 }, 60, (c) => {
    drawGator(c, { x: -GATOR_BITE.x, y: -GATOR_BITE.y, len: 310, rot: 0, face: 1, beat: 0 }, { gape: p.jaw, lid: blink(p.t) }, boil);
  });
};

export async function prepare(): Promise<void> {
  prepareGator();
}

export const KIT: KitEntry = {
  name: 'alligator',
  draw: (ctx, w, h, t) => drawAlligator(ctx, { x: w * 0.72, y: h * 0.55, size: Math.min(w, h) * 0.55, jaw: 0.5 + 0.5 * Math.sin(t * 2), t }),
};
