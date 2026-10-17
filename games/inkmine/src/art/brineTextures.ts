import type Phaser from 'phaser';
import { ASTER_CRAFT, drawAsterCraft, drawAsterCraftAir, type CraftState } from './asterCraftArt';
import { makeDraw } from './kit';
import { ART_RES, BLUE, BOIL } from './palette';
import { drawTidesinger, drawTidesingerAir, TIDE_POSES, TIDESINGER, type TidePose } from './tidesinger/body';
import { drawCopperSandPicture, drawCraftSinkingPicture, drawTubeDrillPicture, TIDE_PICTURE } from './tidesinger/pictures';
import { AIR_BELL, drawAirBell, drawAirBellAir, drawReefHome, drawReefHomeAir, REEF_HOME } from './tidesinger/reef';
import { ASTER_PICTURE_RES, LANDER_FINISH, render, type Finish } from './textures';

/**
 * Brine's people and what's theirs, baked for play and for the story cards:
 * the Tidesingers in each pose, their reef home, the air bell (empty, and
 * with the Aster crew in it), the Aster craft as it's sunk, raised and
 * mended, and the three card pictures. Each figure is drawn BOIL times
 * slightly differently for the line boil, finished as textures.ts finishes
 * the Aster camp; the pictures are baked once, as the Aster's wall pictures
 * are.
 */
export const BRINE_TEX = {
  tidesinger: (pose: TidePose, f: number) => `tidesinger-${pose}-${f}`,
  reefHome: (f: number) => `reef-home-${f}`,
  airBell: (crew: 0 | 3, f: number) => `air-bell-${crew}-${f}`,
  asterCraft: (state: CraftState, f: number) => `aster-craft-${state}-${f}`,
  craftSinkingPicture: 'tide-picture-sinking',
  copperSandPicture: 'tide-picture-copper',
  tubeDrillPicture: 'tide-picture-drill',
} as const;

/** The Tidesingers are inked in blue, as they're never a danger (spec, "The Tidesingers"), with a fine silhouette so their lobes and tails keep their paint. */
export const TIDESINGER_FINISH: Finish = { line: 0.6, rim: 0.65, ink: BLUE };
/** Texture px per unit for a Tidesinger: drawn finer than the scenery, as the Lamplighters are. */
export const TIDESINGER_RES = ART_RES * 1.5;

const CRAFT_STATES: readonly CraftState[] = ['sunk', 'raised', 'mended'];

function bake(scene: Phaser.Scene, key: string, a: { readonly w: number; readonly h: number; readonly ox: number; readonly oy: number }, res: number, draw: (ctx: CanvasRenderingContext2D) => void, finish?: Finish, after?: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  scene.textures.addCanvas(key, render(a.w, a.h, a.ox, a.oy, res, draw, finish, after));
}

/**
 * Everything of Brine's people. Origins as each drawing's frame says:
 * `TIDESINGER` at the middle of its body, `REEF_HOME`, `AIR_BELL` and
 * `ASTER_CRAFT` on the floor under their middles, `TIDE_PICTURE` at its
 * centre.
 */
export function bakeBrine(scene: Phaser.Scene): void {
  for (let f = 0; f < BOIL; f++) {
    TIDE_POSES.forEach((pose, i) => bake(scene, BRINE_TEX.tidesinger(pose, f), TIDESINGER, TIDESINGER_RES, (ctx) => drawTidesinger(makeDraw(ctx, 6000 + i * 10 + f, f, 0, BLUE), pose), TIDESINGER_FINISH, (ctx) => drawTidesingerAir(makeDraw(ctx, 6005 + i * 10 + f, f, 0, BLUE), pose)));
    bake(scene, BRINE_TEX.reefHome(f), REEF_HOME, ART_RES, (ctx) => drawReefHome(makeDraw(ctx, 6100 + f, f, 0)), LANDER_FINISH, (ctx) => drawReefHomeAir(makeDraw(ctx, 6105 + f, f, 0)));
    ([0, 3] as const).forEach((crew, i) => bake(scene, BRINE_TEX.airBell(crew, f), AIR_BELL, ART_RES, (ctx) => drawAirBell(makeDraw(ctx, 6200 + i * 10 + f, f, 0), crew), LANDER_FINISH, (ctx) => drawAirBellAir(makeDraw(ctx, 6205 + i * 10 + f, f, 0))));
    CRAFT_STATES.forEach((state, i) => bake(scene, BRINE_TEX.asterCraft(state, f), ASTER_CRAFT, ART_RES, (ctx) => drawAsterCraft(makeDraw(ctx, 6400 + i * 10 + f, f, 0), state), LANDER_FINISH, (ctx) => drawAsterCraftAir(makeDraw(ctx, 6405 + i * 10 + f, f, 0), state)));
  }
  bake(scene, BRINE_TEX.craftSinkingPicture, TIDE_PICTURE, ASTER_PICTURE_RES, (ctx) => drawCraftSinkingPicture(makeDraw(ctx, 6500, 0, 0)));
  bake(scene, BRINE_TEX.copperSandPicture, TIDE_PICTURE, ASTER_PICTURE_RES, (ctx) => drawCopperSandPicture(makeDraw(ctx, 6501, 0, 0)));
  bake(scene, BRINE_TEX.tubeDrillPicture, TIDE_PICTURE, ASTER_PICTURE_RES, (ctx) => drawTubeDrillPicture(makeDraw(ctx, 6502, 0, 0)));
}
