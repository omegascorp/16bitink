import type Phaser from 'phaser';
import { ORE_KINDS } from '../logic/ore';
import { CHARGE_FRAME, drawCharge, drawLineCharge, LINE_FRAME_W } from './chargeArt';
import { makeDraw } from './kit';
import { drawLander, drawLanderAir, LANDER_H, LANDER_W, SOUND, wreckCode } from './landerArt';
import { drawItem, ITEM_FRAME, ITEM_KINDS } from './itemArt';
import { drawWreck, WRECK_FRAME } from './wreckArt';
import { drawLamplighter, drawOutpost, LAMPLIGHTER, OUTPOST_ART } from './lamplighterArt';
import { drawOrePiece } from './oreArt';
import { finishSprite } from './paint';
import { ART_RES, BLUE, BOIL, INK, type GroundStyle } from './palette';
import { makeCanvas } from './pen';
import { lookKey, PIECES, type Look, type ProspectorLook } from '../logic/gear';
import type { Wreck } from '../logic/repairs';
import { drawProspector, POSES, PROSPECTOR_FRAME, PROSPECTOR_GROUND, type Pose } from './prospector';
import { drawRidges, RIDGE_W } from './ridgeArt';
import { drawSky, SKY_W } from './skyArt';
import { drawMycelRidges, drawMycelSky } from './mycelSky';
import { drawStarship, drawStarshipAir, shipLookKey, STARSHIP_ART, type ShipLook } from './starship';
import { drawStar, drawWorld, STAR_ART, worldFrame } from './systemArt';
import { WORLDS } from '../logic/starSystem';
import { drawTech, TECH_FRAME, type TechVariant } from './techArt';
import { techKey, type Tech } from '../logic/tech';

export const TEX = {
  prospector: (pose: Pose, look: ProspectorLook, f: number) => `prospector-${lookKey(look)}-${pose}-${f}`,
  lander: (look: Look, f: number, wreck: Wreck = SOUND) => `lander-${look}-${wreckCode(wreck)}-${f}`,
  charge: (kind: 'charge' | 'lineCharge', lit: boolean, f: number) => `charge-${kind}-${lit ? 'lit' : 'idle'}-${f}`,
  piece: (ore: string) => `piece-${ore}`,
  item: (kind: string, f: number) => `item-${kind}-${f}`,
  wreck: (piece: string, f: number) => `wreck-${piece}-${f}`,
  tech: (t: Tech, variant: TechVariant) => `tech-${techKey(t)}-${variant}`,
  lamplighter: (f: number) => `lamplighter-${f}`,
  outpost: (f: number) => `outpost-${f}`,
  sky: (world: string, h: number) => `sky-${world}-${h}`,
  ridges: (world: string, h: number) => `ridges-${world}-${h}`,
  world: (id: string) => `world-${id}`,
  star: 'star',
  ship: (look: ShipLook, size: ShipSize) => `ship-${size}-${shipLookKey(look)}`,
} as const;

/** Texture px per unit for the prospector: drawn finer than the rest, as the eye goes to them. */
export const PROSPECTOR_RES = 4;
/** Frame size of a loose piece of ore. */
export const PIECE_FRAME = 24;

/** How a figure is finished once drawn: its silhouette line's width in drawing units, and its rim of light. */
export interface Finish {
  readonly line: number;
  readonly rim: number;
}

/** The prospector's finish: a firm silhouette, as the eye goes to them. */
export const PROSPECTOR_FINISH: Finish = { line: 0.6, rim: 0.7 };
export const LANDER_FINISH: Finish = { line: 0.85, rim: 0.55 };

/**
 * Draws into a new canvas of `w`×`h` units at `res` px a unit; `ox`, `oy`
 * is where the drawing's origin sits. A `finish`ed figure then gets the
 * scene's light painted over it (and only over it): warm from the glow on
 * the upper left, cool shade to the lower right, a rim of light on its lit
 * edges and one ink silhouette round it, so it has volume against a painted
 * sky rather than reading as a flat cut-out. Also used by the dev page.
 */
export function render(w: number, h: number, ox: number, oy: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void, finish?: Finish, after?: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.ceil(w * res), Math.ceil(h * res));
  ctx.scale(res, res);
  ctx.translate(ox, oy);
  draw(ctx);
  if (finish) {
    light(ctx, canvas.width, canvas.height);
    finishSprite(canvas, { unit: res, ink: INK, line: finish.line, rim: finish.rim });
  }
  // What's round a figure (a shadow, smoke, a glow) goes on after its finish, so it isn't outlined.
  after?.(ctx);
  return canvas;
}

function bake(scene: Phaser.Scene, key: string, w: number, h: number, ox: number, oy: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void, finish?: Finish, after?: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  scene.textures.addCanvas(key, render(w, h, ox, oy, res, draw, finish, after));
}

function light(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(w * 0.15, h * 0.05, w * 0.85, h * 0.95);
  g.addColorStop(0, 'rgba(255, 236, 196, 0.16)');
  g.addColorStop(0.45, 'rgba(255, 236, 196, 0)');
  g.addColorStop(0.6, 'rgba(40, 40, 80, 0)');
  g.addColorStop(1, 'rgba(40, 40, 80, 0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** How far the sky layers carry on below the horizon, under the ground's dips. */
export const SKY_SKIRT = 240;

/** The prospector in every pose and the lander (as broken as it still is), for a look: in play and on the ship's page. */
export function bakeCharacters(scene: Phaser.Scene, look: ProspectorLook, landerLook: Look, wreck: Wreck = SOUND): void {
  const P = PROSPECTOR_FRAME;
  for (let f = 0; f < BOIL; f++) {
    POSES.forEach((pose, i) => bake(scene, TEX.prospector(pose, look, f), P, P, P / 2, P / 2, PROSPECTOR_RES, (ctx) => drawProspector(makeDraw(ctx, 100 + i * 10 + f, f, PROSPECTOR_GROUND), pose, look), PROSPECTOR_FINISH));
    bake(scene, TEX.lander(landerLook, f, wreck), LANDER_W, LANDER_H, LANDER_W / 2, LANDER_H, ART_RES, (ctx) => drawLander(makeDraw(ctx, 200 + f, f, 0), landerLook, wreck), LANDER_FINISH, (ctx) => drawLanderAir(makeDraw(ctx, 250 + f, f, 0), landerLook, wreck));
  }
}

/** The Lamplighters and their outpost (in play, and on the cards where they talk). Origin at the middle of their footing. */
export function bakeLamplighters(scene: Phaser.Scene): void {
  const L = LAMPLIGHTER;
  const O = OUTPOST_ART;
  for (let f = 0; f < BOIL; f++) {
    // Drawn in blue, as they're never a danger (spec, "The Lamplighters").
    bake(scene, TEX.lamplighter(f), L.w, L.h, L.w * 0.62, L.h - 2, ART_RES * 1.5, (ctx) => drawLamplighter(makeDraw(ctx, 700 + f, f, 0, BLUE)), LANDER_FINISH);
    bake(scene, TEX.outpost(f), O.w, O.h, O.w / 2, O.h - 2, ART_RES, (ctx) => drawOutpost(makeDraw(ctx, 720 + f, f, 0)), LANDER_FINISH);
  }
}

/** Mission items and ore pieces (also shown on the result card and the ship's page). */
export function bakePickups(scene: Phaser.Scene, rock: string): void {
  for (let f = 0; f < BOIL; f++) {
    ITEM_KINDS.forEach((kind, i) => bake(scene, TEX.item(kind, f), ITEM_FRAME, ITEM_FRAME, ITEM_FRAME / 2, ITEM_FRAME / 2, 3, (ctx) => drawItem(makeDraw(ctx, 400 + i * 10 + f, f, 0), kind)));
    PIECES.forEach((piece, i) => bake(scene, TEX.wreck(piece, f), WRECK_FRAME, WRECK_FRAME, WRECK_FRAME / 2, WRECK_FRAME / 2, 3, (ctx) => drawWreck(makeDraw(ctx, 460 + i * 10 + f, f, 0), piece)));
  }
  ORE_KINDS.forEach((ore, i) => bake(scene, TEX.piece(ore.key), PIECE_FRAME, PIECE_FRAME, PIECE_FRAME / 2, PIECE_FRAME / 2, 3, (ctx) => drawOrePiece(ctx, ore, PIECE_FRAME, 500 + i, rock)));
}

/** Every sprite, each drawn BOIL times slightly differently for the line boil. `skyHeight` is the sky down to the horizon. */
export function generateTextures(scene: Phaser.Scene, world: string, style: GroundStyle, skyHeight: number, look: ProspectorLook, landerLook: Look, wreck: Wreck = SOUND): void {
  bakeCharacters(scene, look, landerLook, wreck);
  bakePickups(scene, style.stone);
  bakeLamplighters(scene);
  for (let f = 0; f < BOIL; f++) {
    for (const lit of [false, true]) {
      bake(scene, TEX.charge('charge', lit, f), CHARGE_FRAME, CHARGE_FRAME, CHARGE_FRAME / 2, CHARGE_FRAME / 2, ART_RES * 1.5, (ctx) => drawCharge(makeDraw(ctx, 300 + f, f, 0), lit));
      bake(scene, TEX.charge('lineCharge', lit, f), LINE_FRAME_W, CHARGE_FRAME, LINE_FRAME_W / 2, CHARGE_FRAME / 2, ART_RES * 1.5, (ctx) => drawLineCharge(makeDraw(ctx, 310 + f, f, 0), lit));
    }
  }
  // Each world has its own sky and horizon: Graphite's airless night and crater rims, Mycel's hazy day and fungal forest.
  const mycel = world === 'mycel';
  bake(scene, TEX.sky(world, skyHeight), SKY_W, skyHeight + SKY_SKIRT, 0, 0, 1, (ctx) => {
    const d = makeDraw(ctx, 900, 0, 0);
    if (mycel) drawMycelSky(d, SKY_W, skyHeight + SKY_SKIRT, skyHeight);
    else drawSky(d, SKY_W, skyHeight + SKY_SKIRT, skyHeight, style);
  });
  const ridge = skyHeight * 0.5;
  bake(scene, TEX.ridges(world, skyHeight), RIDGE_W, ridge + SKY_SKIRT, 0, 0, 1, (ctx) => {
    const d = makeDraw(ctx, 910, 0, 0);
    if (mycel) drawMycelRidges(d, RIDGE_W, ridge + SKY_SKIRT, ridge, style);
    else drawRidges(d, RIDGE_W, ridge + SKY_SKIRT, ridge, style);
  });
}

/** The star map's star and worlds (SystemScene); its ship is baked by `shipTexture`. */
export function bakeSystem(scene: Phaser.Scene): void {
  WORLDS.forEach((w, i) => {
    const f = worldFrame(w);
    bake(scene, TEX.world(w.id), f, f, f / 2, f / 2, 3, (ctx) => drawWorld(makeDraw(ctx, 800 + i, 0, 0), w));
  });
  bake(scene, TEX.star, STAR_ART.w, STAR_ART.h, STAR_ART.w, STAR_ART.h / 2, 1.5, (ctx) => drawStar(makeDraw(ctx, 790, 0, 0)));
}

/** The starship's two sizes: big on the Starship tab, small on the star map and the story cards. */
export type ShipSize = 'big' | 'small';
/** Texture px per unit for the Starship tab's picture: about twice the CSS px it's shown at, for sharp lines. */
export const SHIP_RES = 5;
/** A fine silhouette for the big picture, so its detail carries it. */
export const SHIP_FINISH: Finish = { line: 0.5, rim: 0.5 };
/** Small, the silhouette is heavier, so the ship still reads as one shape. */
export const SHIP_MAP_RES = 2;
export const SHIP_MAP_FINISH: Finish = { line: 1.5, rim: 0.5 };

/** The starship as it stands (`look`), baked the first time it's asked for at that size. Returns its key. */
export function shipTexture(scene: Phaser.Scene, look: ShipLook, size: ShipSize): string {
  const key = TEX.ship(look, size);
  const S = STARSHIP_ART;
  const [res, finish] = size === 'big' ? [SHIP_RES, SHIP_FINISH] : [SHIP_MAP_RES, SHIP_MAP_FINISH];
  bake(scene, key, S.w, S.h, S.w / 2, S.h / 2, res, (ctx) => drawStarship(makeDraw(ctx, 796, 0, 0), look), finish, (ctx) => drawStarshipAir(makeDraw(ctx, 797, 0, 0), look));
  return key;
}

/** Texture px per unit for a technology slot's picture: drawn large, as the detail card shows it big. */
export const TECH_RES = 5;
const TECH_FINISH: Finish = { line: 0.7, rim: 0.6 };

/** A technology slot's picture (the lander's menu), baked the first time it's asked for. Returns its key. */
export function techTexture(scene: Phaser.Scene, t: Tech, variant: TechVariant): string {
  const key = TEX.tech(t, variant);
  const seed = 600 + [...key].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  bake(scene, key, TECH_FRAME, TECH_FRAME, TECH_FRAME / 2, TECH_FRAME / 2, TECH_RES, (ctx) => drawTech(makeDraw(ctx, seed, 0, 0), t, variant), TECH_FINISH);
  return key;
}
