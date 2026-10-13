import type Phaser from 'phaser';
import { CRATES, type CrateKey } from '../logic/crates';
import { ORE_KINDS } from '../logic/ore';
import { CRATE_FRAME, drawCrate } from './crateArt';
import { makeDraw } from './kit';
import { drawLander, LANDER_H, LANDER_W } from './landerArt';
import { drawOrePiece } from './oreArt';
import { ART_RES, BOIL, type GroundStyle } from './palette';
import { makeCanvas } from './pen';
import { drawProspector, POSES, PROSPECTOR_FRAME, PROSPECTOR_GROUND, type Pose } from './prospectorArt';
import { drawRidges, drawSky, RIDGE_W, SKY_W } from './skyArt';

export const TEX = {
  prospector: (pose: Pose, f: number) => `prospector-${pose}-${f}`,
  lander: (f: number) => `lander-${f}`,
  crate: (kind: CrateKey, lit: boolean, f: number) => `crate-${kind}-${lit ? 'lit' : 'idle'}-${f}`,
  piece: (ore: string) => `piece-${ore}`,
  sky: 'sky',
  ridges: 'ridges',
} as const;

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

/** Every sprite, each drawn BOIL times slightly differently for the line boil. `skyHeight` is the sky down to the horizon. */
export function generateTextures(scene: Phaser.Scene, style: GroundStyle, skyHeight: number): void {
  const P = PROSPECTOR_FRAME;
  for (let f = 0; f < BOIL; f++) {
    POSES.forEach((pose, i) => bake(scene, TEX.prospector(pose, f), P, P, P / 2, P / 2, 2, (ctx) => drawProspector(makeDraw(ctx, 100 + i * 10 + f, f, PROSPECTOR_GROUND), pose)));
    bake(scene, TEX.lander(f), LANDER_W, LANDER_H, LANDER_W / 2, LANDER_H, ART_RES, (ctx) => drawLander(makeDraw(ctx, 200 + f, f, 0)));
    for (const kind of Object.keys(CRATES) as CrateKey[]) {
      for (const lit of [false, true]) {
        bake(scene, TEX.crate(kind, lit, f), CRATE_FRAME, CRATE_FRAME, CRATE_FRAME / 2, CRATE_FRAME / 2, ART_RES, (ctx) => drawCrate(makeDraw(ctx, 300 + f, f, 0), kind, lit));
      }
    }
  }
  ORE_KINDS.forEach((ore, i) => bake(scene, TEX.piece(ore.key), PIECE_FRAME, PIECE_FRAME, PIECE_FRAME / 2, PIECE_FRAME / 2, 3, (ctx) => drawOrePiece(ctx, ore, PIECE_FRAME, 500 + i, style.stone)));
  bake(scene, TEX.sky, SKY_W, skyHeight + SKY_SKIRT, 0, 0, 1, (ctx) => drawSky(makeDraw(ctx, 900, 0, 0), SKY_W, skyHeight + SKY_SKIRT, skyHeight, style));
  const ridge = skyHeight * 0.5;
  bake(scene, TEX.ridges, RIDGE_W, ridge + SKY_SKIRT, 0, 0, 1, (ctx) => drawRidges(makeDraw(ctx, 910, 0, 0), RIDGE_W, ridge + SKY_SKIRT, ridge, style));
}
