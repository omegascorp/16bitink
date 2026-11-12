import { paintEel, type Pt } from './eel';
import type { Ribbon } from './story';

export type { Pt };

/** The moray's greatest half-depth, as a share of its length: thick and muscular, as the game's drawing (hh 19 to a length of 216), its depth squashed with the ribbon's. */
const HALF_DEPTH = 0.084;

/**
 * The moray painted along its ribbon (eel.ts): `screen` maps a world point to
 * the screen. It tapers to a point with the fin ridge wrapping round the tip,
 * which can run on a little past the ribbon's end.
 */
export function drawRibbon(ctx: CanvasRenderingContext2D, boil: number, ribbon: Ribbon, zoom: number, screen: (p: Pt) => Pt): void {
  paintEel(ctx, {
    spine: (f) => screen(ribbon.at(f * ribbon.length)),
    depth: ribbon.length * zoom * HALF_DEPTH * ribbon.squash,
    boil,
    fins: true,
  });
}

/** The ribbon's nose on the screen. */
export const noseOf = (ribbon: Ribbon, screen: (p: Pt) => Pt): Pt => screen(ribbon.at(0));
