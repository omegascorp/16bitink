import type { SliceJob } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import { CHARMS } from '../logic/charms';
import { COLOURS } from '../logic/colours';
import type { LevelDef } from '../level/types';
import { BOARD } from '../level/types';
import { buildPath } from '../logic/path';
import { drawGeckoLines, drawGeckoSkin, GECKO_FRAME, GECKO_RES, type GeckoPose } from './geckoArt';
import { makeDraw } from './kit';
import { drawCharmMark, drawCharmToken, drawMarble, drawSplash, MARBLE_FRAME, MARBLE_RES, SPLASH_FRAME, TOKEN_FRAME } from './marbleArt';
import { ART_RES, BOIL, PAPER } from './palette';
import { makeCanvas } from './pen';
import { BURROW_FRAME, drawBranch, drawBurrow, drawGarden, drawTrack, drawWell, WELL_FRAME } from './placesArt';

export const TEX = {
  marble: (colour: string, f: number) => `marble-${colour}-${f}`,
  mark: (charm: string) => `mark-${charm}`,
  token: (charm: string, f: number) => `token-${charm}-${f}`,
  splash: (colour: string) => `splash-${colour}`,
  geckoSkin: (pose: GeckoPose, f: number) => `gecko-skin-${pose}-${f}`,
  geckoLines: (pose: GeckoPose, f: number) => `gecko-lines-${pose}-${f}`,
  well: (f: number) => `well-${f}`,
  burrow: (f: number) => `burrow-${f}`,
  paper: 'paper',
  /** A level's ground, tracks and branch, drawn when the level starts. */
  board: (levelId: string) => `board-${levelId}`,
} as const;

const PAPER_TILE = 256;
const POSES: readonly GeckoPose[] = ['idle', 'spit'];

/** Draws into a square canvas of `units`·`res` px with the origin at its centre. */
function bakeNow(scene: Phaser.Scene, key: string, units: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = makeCanvas(units * res, units * res);
  ctx.scale(res, res);
  ctx.translate(units / 2, units / 2);
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

function bakePaper(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.paper)) return;
  const { canvas, ctx } = makeCanvas(PAPER_TILE, PAPER_TILE);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAPER_TILE, PAPER_TILE);
  scene.textures.addCanvas(TEX.paper, canvas);
}

/**
 * Every shared sprite, one job per drawing, so the boot can run them a slice
 * at a time and show its progress. Each has BOIL frames for the line boil.
 */
export function textureJobs(scene: Phaser.Scene): SliceJob[] {
  const jobs: SliceJob[] = [() => bakePaper(scene)];
  const bake = (key: string, units: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void): void => {
    jobs.push(() => bakeNow(scene, key, units, res, draw));
  };
  COLOURS.forEach((colour, i) => {
    for (let f = 0; f < BOIL; f++) bake(TEX.marble(colour, f), MARBLE_FRAME, MARBLE_RES, (ctx) => drawMarble(makeDraw(ctx, 100 + i * 10 + f, f, 0), colour));
    bake(TEX.splash(colour), SPLASH_FRAME, 2, (ctx) => drawSplash(makeDraw(ctx, 200 + i, 0, 0), colour));
  });
  CHARMS.forEach((charm, i) => {
    bake(TEX.mark(charm), MARBLE_FRAME, MARBLE_RES, (ctx) => drawCharmMark(makeDraw(ctx, 300 + i, 0, 0), charm));
    for (let f = 0; f < BOIL; f++) bake(TEX.token(charm, f), TOKEN_FRAME, 3, (ctx) => drawCharmToken(makeDraw(ctx, 320 + i * 10 + f, f, 0), charm));
  });
  for (let f = 0; f < BOIL; f++) {
    for (const pose of POSES) {
      // The same seed for skin and lines, so they register.
      bake(TEX.geckoSkin(pose, f), GECKO_FRAME, GECKO_RES, (ctx) => drawGeckoSkin(makeDraw(ctx, 400 + f, f, 0), pose));
      bake(TEX.geckoLines(pose, f), GECKO_FRAME, GECKO_RES, (ctx) => drawGeckoLines(makeDraw(ctx, 400 + f, f, 0), pose));
    }
    bake(TEX.well(f), WELL_FRAME, 3, (ctx) => drawWell(makeDraw(ctx, 500 + f, f, 0)));
    bake(TEX.burrow(f), BURROW_FRAME, 3, (ctx) => drawBurrow(makeDraw(ctx, 520 + f, f, 0)));
  }
  return jobs;
}

/** Draws a level's ground: the garden, its tracks' grooves and, on rail levels, the branch. Replaces any earlier drawing of it. */
export function bakeBoard(scene: Phaser.Scene, level: LevelDef): string {
  const key = TEX.board(level.id);
  if (scene.textures.exists(key)) return key;
  const { canvas, ctx } = makeCanvas(BOARD.w * ART_RES, BOARD.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  drawGarden(makeDraw(ctx, 600 + level.id.length, 0, 0), BOARD.w, BOARD.h);
  level.tracks.forEach((t, i) => drawTrack(makeDraw(ctx, 640 + i, 0, 0), buildPath(t.points).pts));
  if (level.shooter.kind === 'rail') drawBranch(makeDraw(ctx, 680, 0, 0), level.shooter.x0 - 50, level.shooter.x1 + 50, level.shooter.y + 4);
  scene.textures.addCanvas(key, canvas);
  return key;
}
