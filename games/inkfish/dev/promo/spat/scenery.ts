import { makeCanvas } from '../../../src/art/pen';
import { drawWeed } from '../../../src/art/propArt';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { VIDEO } from '../short';
import type { View } from '../gameplay/fish';

/**
 * The kelp forest behind the chase: the game's own kelp drawing (stalk,
 * ruffled blades, holdfast), drawn big and faint, standing in the world so it
 * slides by as the camera pans. Far stalks drift by slower (parallax) and
 * paler; every stalk sways twice a loop, so the forest is the same at the seam.
 */

/** The game draws a weed on a 256 x 512 canvas (128 x 256 at ART_RES 2). */
const WEED = { w: 256, h: 512 } as const;
/** Canvas px per weed px: crisp lines when drawn up to ~2.6x. */
const RES = 2;

interface Stalk {
  /** World x of the holdfast. */
  readonly x: number;
  /** Screen px per weed px. */
  readonly scale: number;
  /** How far it moves with the camera (1 = with the fish; less is further back). */
  readonly depth: number;
  readonly alpha: number;
  readonly seed: number;
  readonly mirror: boolean;
  readonly phase: number;
}

const STALKS: readonly Stalk[] = [
  { x: -1500, scale: 2.2, depth: 0.55, alpha: 0.14, seed: 7, mirror: false, phase: 0.3 },
  { x: -980, scale: 2.4, depth: 0.55, alpha: 0.14, seed: 11, mirror: true, phase: 1.9 },
  { x: -460, scale: 2.1, depth: 0.55, alpha: 0.14, seed: 23, mirror: false, phase: 3.1 },
  { x: 60, scale: 2.3, depth: 0.55, alpha: 0.14, seed: 31, mirror: true, phase: 4.4 },
  { x: 560, scale: 2.2, depth: 0.55, alpha: 0.14, seed: 41, mirror: false, phase: 5.2 },
  { x: -1820, scale: 2.9, depth: 0.85, alpha: 0.26, seed: 53, mirror: true, phase: 0.9 },
  { x: -1100, scale: 3.0, depth: 0.85, alpha: 0.26, seed: 61, mirror: false, phase: 2.6 },
  { x: -300, scale: 2.8, depth: 0.85, alpha: 0.26, seed: 73, mirror: true, phase: 3.7 },
  { x: 480, scale: 3.0, depth: 0.85, alpha: 0.26, seed: 83, mirror: false, phase: 5.9 },
];

/** Where the seabed would be: below the frame, under the bar and buttons. */
const BED_Y = VIDEO.height + 160;

export type Kelp = (ctx: CanvasRenderingContext2D, v: View, focusX: number, boil: number, t: number, loopS: number) => void;

export function makeKelp(): Kelp {
  const art = STALKS.map((s) =>
    Array.from({ length: BOIL_FRAMES }, (_, f) => {
      const { canvas, ctx } = makeCanvas(WEED.w * RES, WEED.h * RES);
      ctx.scale(RES, RES);
      drawWeed(ctx, s.seed, 0, f, WEED.w, WEED.h);
      return canvas;
    }),
  );
  return (ctx, v, focusX, boil, t, loopS) => {
    STALKS.forEach((s, i) => {
      const w = WEED.w * s.scale;
      const h = WEED.h * s.scale;
      const x = focusX + (s.x - v.x) * s.depth;
      if (x < -w || x > VIDEO.width + w) return;
      const sway = 0.035 * Math.sin((2 * Math.PI * 2 * t) / loopS + s.phase);
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.translate(x, BED_Y);
      ctx.rotate(sway);
      ctx.scale(s.mirror ? -1 : 1, 1);
      ctx.drawImage(art[i]![boil % BOIL_FRAMES]!, -w / 2, -h, w, h);
      ctx.restore();
    });
  };
}
