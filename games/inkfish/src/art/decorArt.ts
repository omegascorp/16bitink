import { drawDeepDecor, type DeepDecorId } from './decorDeep';
import { drawGlowDecor, type GlowDecorId } from './decorGlow';
import { drawLostDecor, type LostDecorId } from './decorLost';
import { drawShallowDecor, type ShallowDecorId } from './decorShallow';

/**
 * Things lying on the seabed (static scenery, no gameplay): shells, corals,
 * sponges, bones, lost human objects. Each zone draws from its own set, and
 * each level picks its own mix so no two seabeds look alike.
 *
 * Drawing contract (every decor file): the canvas is DECOR_SIZE[kind] times
 * ART_RES; the object stands on the canvas's bottom edge (the game places it
 * with origin (0.5, 1) on the sand, sunk a few px), centred horizontally.
 */
export type DecorId = ShallowDecorId | DeepDecorId | GlowDecorId | LostDecorId;

/** In-game size (world px) of each decor texture; the canvas is ART_RES times larger. */
export const DECOR_SIZE: Readonly<Record<DecorId, { readonly w: number; readonly h: number }>> = {
  // Shallow and reef (decorShallow.ts)
  starfish: { w: 64, h: 40 },
  mussels: { w: 96, h: 48 },
  scallops: { w: 80, h: 40 },
  sanddollar: { w: 56, h: 24 },
  pebbles: { w: 120, h: 36 },
  anemone: { w: 72, h: 80 },
  seapen: { w: 40, h: 110 },
  braincoral: { w: 140, h: 90 },
  staghorn: { w: 140, h: 120 },
  seafan: { w: 120, h: 150 },
  tubesponge: { w: 90, h: 130 },
  giantclam: { w: 150, h: 90 },
  // Deep sea (decorDeep.ts)
  brittlestar: { w: 80, h: 30 },
  sealily: { w: 60, h: 150 },
  glasssponge: { w: 70, h: 140 },
  nodules: { w: 130, h: 30 },
  tubeworms: { w: 110, h: 130 },
  blacksmoker: { w: 120, h: 220 },
  whalebones: { w: 300, h: 110 },
  // Deep sea scenery that glows (decorGlow.ts)
  umbellula: { w: 80, h: 190 },
  bamboocoral: { w: 150, h: 140 },
  volcano: { w: 340, h: 260 },
  // Lost human-made things (decorLost.ts)
  anchor: { w: 130, h: 150 },
  amphora: { w: 130, h: 80 },
  lobsterpot: { w: 120, h: 90 },
  cannon: { w: 170, h: 70 },
};

export const DECOR_IDS = Object.keys(DECOR_SIZE) as DecorId[];

/** Draws one decor piece into a canvas of DECOR_SIZE[kind] * ART_RES. */
export function drawDecor(ctx: CanvasRenderingContext2D, kind: DecorId, seed: number): void {
  if (drawShallowDecor(ctx, kind as ShallowDecorId, seed)) return;
  if (drawDeepDecor(ctx, kind as DeepDecorId, seed)) return;
  if (drawGlowDecor(ctx, kind as GlowDecorId, seed)) return;
  drawLostDecor(ctx, kind as LostDecorId, seed);
}
