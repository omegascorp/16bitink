import type Phaser from 'phaser';
import { ORE_KINDS } from '../logic/ore';
import { CHARGE_FRAME, drawCharge, drawLineCharge, LINE_FRAME_W } from './chargeArt';
import { makeDraw } from './kit';
import { drawLander, LANDER_H, LANDER_W, SOUND, wreckCode } from './landerArt';
import { drawItem, ITEM_FRAME, ITEM_KINDS } from './itemArt';
import { drawOrePiece } from './oreArt';
import { ART_RES, BOIL, type GroundStyle } from './palette';
import { makeCanvas } from './pen';
import { lookKey, type Look, type ProspectorLook } from '../logic/gear';
import type { Wreck } from '../logic/repairs';
import { drawProspector, POSES, PROSPECTOR_FRAME, PROSPECTOR_GROUND, type Pose } from './prospector';
import { drawRidges, drawSky, RIDGE_W, SKY_W } from './skyArt';

export const TEX = {
  prospector: (pose: Pose, look: ProspectorLook, f: number) => `prospector-${lookKey(look)}-${pose}-${f}`,
  lander: (look: Look, f: number, wreck: Wreck = SOUND) => `lander-${look}-${wreckCode(wreck)}-${f}`,
  charge: (kind: 'charge' | 'lineCharge', lit: boolean, f: number) => `charge-${kind}-${lit ? 'lit' : 'idle'}-${f}`,
  piece: (ore: string) => `piece-${ore}`,
  item: (kind: string, f: number) => `item-${kind}-${f}`,
  sky: (h: number) => `sky-${h}`,
  ridges: (h: number) => `ridges-${h}`,
} as const;

/** Texture px per unit for the prospector: drawn finer than the rest, as the eye goes to them. */
export const PROSPECTOR_RES = 4;
/** Frame size of a loose piece of ore. */
export const PIECE_FRAME = 24;

/** Draws into a canvas of `w`×`h` units at `res` px a unit; `ox`, `oy` is where the drawing's origin sits. */
function bake(scene: Phaser.Scene, key: string, w: number, h: number, ox: number, oy: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = makeCanvas(Math.ceil(w * res), Math.ceil(h * res));
  ctx.scale(res, res);
  ctx.translate(ox, oy);
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

/** How far the sky layers carry on below the horizon, under the ground's dips. */
export const SKY_SKIRT = 240;

/** The prospector in every pose and the lander (as broken as it still is), for a look: in play and on the ship's page. */
export function bakeCharacters(scene: Phaser.Scene, look: ProspectorLook, landerLook: Look, wreck: Wreck = SOUND): void {
  const P = PROSPECTOR_FRAME;
  for (let f = 0; f < BOIL; f++) {
    POSES.forEach((pose, i) => bake(scene, TEX.prospector(pose, look, f), P, P, P / 2, P / 2, PROSPECTOR_RES, (ctx) => drawProspector(makeDraw(ctx, 100 + i * 10 + f, f, PROSPECTOR_GROUND), pose, look)));
    bake(scene, TEX.lander(landerLook, f, wreck), LANDER_W, LANDER_H, LANDER_W / 2, LANDER_H, ART_RES, (ctx) => drawLander(makeDraw(ctx, 200 + f, f, 0), landerLook, wreck));
  }
}

/** Mission items and ore pieces (also shown on the result card and the ship's page). */
export function bakePickups(scene: Phaser.Scene, rock: string): void {
  for (let f = 0; f < BOIL; f++) {
    ITEM_KINDS.forEach((kind, i) => bake(scene, TEX.item(kind, f), ITEM_FRAME, ITEM_FRAME, ITEM_FRAME / 2, ITEM_FRAME / 2, 3, (ctx) => drawItem(makeDraw(ctx, 400 + i * 10 + f, f, 0), kind)));
  }
  ORE_KINDS.forEach((ore, i) => bake(scene, TEX.piece(ore.key), PIECE_FRAME, PIECE_FRAME, PIECE_FRAME / 2, PIECE_FRAME / 2, 3, (ctx) => drawOrePiece(ctx, ore, PIECE_FRAME, 500 + i, rock)));
}

/** Every sprite, each drawn BOIL times slightly differently for the line boil. `skyHeight` is the sky down to the horizon. */
export function generateTextures(scene: Phaser.Scene, style: GroundStyle, skyHeight: number, look: ProspectorLook, landerLook: Look, wreck: Wreck = SOUND): void {
  bakeCharacters(scene, look, landerLook, wreck);
  bakePickups(scene, style.stone);
  for (let f = 0; f < BOIL; f++) {
    for (const lit of [false, true]) {
      bake(scene, TEX.charge('charge', lit, f), CHARGE_FRAME, CHARGE_FRAME, CHARGE_FRAME / 2, CHARGE_FRAME / 2, ART_RES * 1.5, (ctx) => drawCharge(makeDraw(ctx, 300 + f, f, 0), lit));
      bake(scene, TEX.charge('lineCharge', lit, f), LINE_FRAME_W, CHARGE_FRAME, LINE_FRAME_W / 2, CHARGE_FRAME / 2, ART_RES * 1.5, (ctx) => drawLineCharge(makeDraw(ctx, 310 + f, f, 0), lit));
    }
  }
  bake(scene, TEX.sky(skyHeight), SKY_W, skyHeight + SKY_SKIRT, 0, 0, 1, (ctx) => drawSky(makeDraw(ctx, 900, 0, 0), SKY_W, skyHeight + SKY_SKIRT, skyHeight, style));
  const ridge = skyHeight * 0.5;
  bake(scene, TEX.ridges(skyHeight), RIDGE_W, ridge + SKY_SKIRT, 0, 0, 1, (ctx) => drawRidges(makeDraw(ctx, 910, 0, 0), RIDGE_W, ridge + SKY_SKIRT, ridge, style));
}
