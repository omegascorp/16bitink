import type { SliceJob } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import { CHARMS } from '../logic/charms';
import { COLOURS } from '../logic/colours';
import type { Place } from '../level/levels';
import type { LevelDef } from '../level/types';
import { BOARD } from '../level/types';
import { buildPath } from '../logic/path';
import { drawDragonfly, DRAGONFLY_FRAME } from './dragonflyArt';
import { drawBloom, drawBud, drawFruit, drawGeode, drawStone, FRUIT_FRAME, FRUITS } from './propsArt';
import { drawGeckoLines, drawGeckoSkin, GECKO_FRAME, GECKO_RES, type GeckoPose } from './geckoArt';
import { makeDraw } from './kit';
import { drawCharmMark, drawCharmToken, drawMarble, drawSplash, MARBLE_FRAME, MARBLE_RES, SPLASH_FRAME, TOKEN_FRAME } from './marbleArt';
import { ART_RES, BOIL, PAPER } from './palette';
import { makeCanvas } from './pen';
import { BURROW_FRAME, drawBranch, drawBurrow, drawGround, drawPad, drawPadRing, drawRaised, drawTrack, drawTunnel, drawWell, WELL_FRAME } from './placesArt';
import type { Pt } from './pen';

export const TEX = {
  marble: (colour: string, f: number) => `marble-${colour}-${f}`,
  mark: (charm: string) => `mark-${charm}`,
  token: (charm: string, f: number) => `token-${charm}-${f}`,
  splash: (colour: string) => `splash-${colour}`,
  geckoSkin: (pose: GeckoPose, f: number) => `gecko-skin-${pose}-${f}`,
  geckoLines: (pose: GeckoPose, f: number) => `gecko-lines-${pose}-${f}`,
  well: (f: number) => `well-${f}`,
  burrow: (f: number) => `burrow-${f}`,
  /** The Dragonfly in flight, wings spread (0) or swept (1). */
  dragonfly: (wing: number, f: number) => `dragonfly-${wing}-${f}`,
  fruit: (kind: string, f: number) => `fruit-${kind}-${f}`,
  bud: (f: number) => `bud-${f}`,
  bloom: 'bloom',
  stone: (f: number) => `stone-${f}`,
  geode: (f: number) => `geode-${f}`,
  paper: 'paper',
  /** A level's ground, tracks and branch, drawn when the level starts. */
  board: (levelId: string) => `board-${levelId}`,
  /** A level's tunnels, drawn over its marbles. */
  covers: (levelId: string) => `covers-${levelId}`,
} as const;

const PAPER_TILE = 256;
/** Texture px per unit of the dragonfly sprite, and of the fruit. */
export const DRAGONFLY_RES = 3;
export const FRUIT_RES = 3;
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
    for (const wing of [0, 1] as const) bake(TEX.dragonfly(wing, f), DRAGONFLY_FRAME, DRAGONFLY_RES, (ctx) => drawDragonfly(makeDraw(ctx, 540 + f, f, 0), wing));
    FRUITS.forEach((kind, k) => bake(TEX.fruit(kind, f), FRUIT_FRAME, FRUIT_RES, (ctx) => drawFruit(makeDraw(ctx, 560 + k * 10 + f, f, 0), kind)));
    bake(TEX.bud(f), MARBLE_FRAME, MARBLE_RES, (ctx) => drawBud(makeDraw(ctx, 590 + f, f, 0)));
    bake(TEX.stone(f), MARBLE_FRAME, MARBLE_RES, (ctx) => drawStone(makeDraw(ctx, 600 + f, f, 0), false));
    bake(TEX.geode(f), MARBLE_FRAME, MARBLE_RES, (ctx) => drawGeode(makeDraw(ctx, 610 + f, f, 0)));
    bake(TEX.burrow(f), BURROW_FRAME, 3, (ctx) => drawBurrow(makeDraw(ctx, 520 + f, f, 0)));
  }
  bake(TEX.bloom, SPLASH_FRAME, 2, (ctx) => drawBloom(makeDraw(ctx, 620, 0, 0)));
  return jobs;
}

/** Draws a level's ground: its place, its tracks' grooves, and the branch or lily pads the gecko stands on. */
export function bakeBoard(scene: Phaser.Scene, level: LevelDef, place: Place): string {
  const key = TEX.board(level.id);
  if (scene.textures.exists(key)) return key;
  const { canvas, ctx } = makeCanvas(BOARD.w * ART_RES, BOARD.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  // The place keeps its water, pots, trunks and boulders clear of the grooves and pads.
  const sh = level.shooter;
  // The branch a rail gecko runs along counts as a groove: nothing big may lie under it.
  const branch: Pt[] = sh.kind === 'rail' ? Array.from({ length: Math.ceil((sh.x1 - sh.x0 + 100) / 4) + 1 }, (_, i) => ({ x: sh.x0 - 50 + i * 4, y: sh.y + 4 })) : [];
  const keep = { grooves: [...level.tracks.map((t) => buildPath(t.points).pts), ...(branch.length ? [branch] : [])], pads: sh.kind === 'hop' ? sh.pads : [] };
  drawGround(makeDraw(ctx, 600 + level.id.length, 0, 0), place, BOARD.w, BOARD.h, keep);
  level.tracks.forEach((t, i) => drawTrack(makeDraw(ctx, 640 + i, 0, 0), buildPath(t.points).pts));
  const s = level.shooter;
  if (s.kind === 'rail') drawBranch(makeDraw(ctx, 680, 0, 0), s.x0 - 50, s.x1 + 50, s.y + 4);
  if (s.kind === 'hop') {
    s.pads.forEach((p, i) => {
      drawPad(makeDraw(ctx, 700 + i, 0, 0), place, p.x, p.y);
      drawPadRing(makeDraw(ctx, 720 + i, 0, 0), p.x, p.y);
    });
  }
  scene.textures.addCanvas(key, canvas);
  return key;
}

/**
 * Draws a level's tunnels on a clear layer to lie over the marbles, then
 * the decks carrying a crossing's upper track over them, or returns null if
 * it has none.
 */
export function bakeCovers(scene: Phaser.Scene, level: LevelDef, place: Place): string | null {
  if (!level.tracks.some((t) => t.tunnels?.length || t.raised?.length)) return null;
  const key = TEX.covers(level.id);
  if (scene.textures.exists(key)) return key;
  const { canvas, ctx } = makeCanvas(BOARD.w * ART_RES, BOARD.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  const paths = level.tracks.map((t) => buildPath(t.points));
  const stretch = (i: number, c: { from: number; to: number }): Pt[] => {
    const path = paths[i]!;
    return path.pts.filter((_, j) => path.cum[j]! >= c.from * path.length && path.cum[j]! <= c.to * path.length);
  };
  level.tracks.forEach((t, i) => (t.tunnels ?? []).forEach((c, k) => {
    const pts = stretch(i, c);
    if (pts.length > 1) drawTunnel(makeDraw(ctx, 760 + i * 10 + k, 0, 0), pts, place);
  }));
  level.tracks.forEach((t, i) => (t.raised ?? []).forEach((c, k) => {
    const pts = stretch(i, c);
    if (pts.length > 1) drawRaised(makeDraw(ctx, 800 + i * 10 + k, 0, 0), pts, place);
  }));
  scene.textures.addCanvas(key, canvas);
  return key;
}

/** Frees a level's baked ground and tunnels (they are big: a full board at ART_RES each). */
export function dropBoard(scene: Phaser.Scene, level: LevelDef): void {
  for (const key of [TEX.board(level.id), TEX.covers(level.id)]) if (scene.textures.exists(key)) scene.textures.remove(key);
}
