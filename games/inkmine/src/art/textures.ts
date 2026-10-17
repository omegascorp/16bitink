import type Phaser from 'phaser';
import { ORE_KINDS } from '../logic/ore';
import { CHARGE_FRAME, drawCharge, drawLineCharge, LINE_FRAME_W } from './chargeArt';
import { makeDraw } from './kit';
import { drawLander, drawLanderAir, LANDER_H, LANDER_W, SOUND, wreckCode } from './landerArt';
import { drawItem, ITEM_FRAME, ITEM_KINDS } from './itemArt';
import { drawPulseWreck, drawWreck, WRECK_FRAME } from './wreckArt';
import { drawLamplighter, drawOutpost, LAMPLIGHTER, OUTPOST_ART } from './lamplighterArt';
import { ASTER_WRECK, drawAsterBeam, drawAsterWreck } from './asterWreckArt';
import { drawPulseShot, SHOT_ART } from './aster/weapon';
import { ASTER_CAMP, ASTER_CRAFT_PICTURE, ASTER_PERSON, drawAsterBrinePicture, drawAsterCamp, drawAsterCraftPicture, drawAsterPerson, drawAsterPersonAir, drawSleepPod, drawSleepPodAir, SLEEP_POD, type AsterPose, type PodState } from './aster/camp';
import { drawGrazer, GRAZER_ART } from './creatures/grazer';
import { drawMotherMycel, MOTHER_ART } from './creatures/mother';
import { drawPuffball, drawSporeGlob, GLOB_ART, PUFFBALL_ART, type PuffPose } from './creatures/puffball';
import { drawTendril, TENDRIL_ART } from './creatures/tendril';
import { drawOrePiece } from './oreArt';
import { finishSprite } from './paint';
import { ART_RES, BLUE, BOIL, INK, RED, type GroundStyle } from './palette';
import { makeCanvas } from './pen';
import { lookKey, PIECES, type Look, type Piece, type ProspectorLook } from '../logic/gear';
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
  wreck: (piece: string, mk: number, f: number) => `wreck-${piece}-${mk}-${f}`,
  tech: (t: Tech, variant: TechVariant) => `tech-${techKey(t)}-${variant}`,
  lamplighter: (f: number) => `lamplighter-${f}`,
  outpost: (f: number) => `outpost-${f}`,
  asterWreck: (f: number) => `aster-wreck-${f}`,
  asterBeam: 'aster-beam',
  asterPod: (state: PodState, f: number) => `aster-pod-${state}-${f}`,
  asterPerson: (pose: AsterPose, f: number) => `aster-person-${pose}-${f}`,
  asterCamp: (f: number) => `aster-camp-${f}`,
  asterCraftPicture: 'aster-picture-craft',
  asterBrinePicture: 'aster-picture-brine',
  puffball: (pose: PuffPose, f: number) => `puffball-${pose}-${f}`,
  glob: (f: number) => `glob-${f}`,
  tendril: (step: number, grab: boolean, f: number) => `tendril-${step}-${grab ? 'grab' : 'open'}-${f}`,
  grazer: (pose: 'walk' | 'curled', f: number) => `grazer-${pose}-${f}`,
  mother: (beat: 0 | 1 | 2, f: number) => `mother-${beat}-${f}`,
  shot: (f: number) => `pulse-shot-${f}`,
  pulseWreck: (f: number) => `pulse-wreck-${f}`,
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
  /** The silhouette's ink (default the world's blue-black; madder for what can hurt you). */
  readonly ink?: string;
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
    finishSprite(canvas, { unit: res, ink: finish.ink ?? INK, line: finish.line, rim: finish.rim });
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

/** The Aster lander's wreck on Mycel and its beacon's light (in play, and on the card when you find it). Origin on the ground under its middle. */
export function bakeAsterWreck(scene: Phaser.Scene): void {
  const A = ASTER_WRECK;
  for (let f = 0; f < BOIL; f++) bake(scene, TEX.asterWreck(f), A.w, A.h, A.ox, A.oy, ART_RES, (ctx) => drawAsterWreck(makeDraw(ctx, 760 + f, f, 0)), LANDER_FINISH);
  bake(scene, TEX.asterBeam, 24, 24, 12, 12, ART_RES, (ctx) => drawAsterBeam(ctx, 11));
}

/** Texture px per unit for the pictures on the Aster's camp wall, as story cards show them. */
export const ASTER_PICTURE_RES = 3;
/** The Aster themself is inked in blue, as they're never a danger (spec, "The Aster"), with a fine silhouette so its thin legs keep their paint. */
export const ASTER_FINISH: Finish = { line: 0.55, rim: 0.6, ink: BLUE };

/**
 * The Aster's camp on Mycel: the sleep pod failing and open, the Aster
 * standing and speaking, the camp's props, and the two pictures from its
 * wall (once each, for story cards). Origins as `SLEEP_POD`, `ASTER_PERSON`
 * and `ASTER_CAMP` say: on the floor, under each one's middle.
 */
export function bakeAsterCamp(scene: Phaser.Scene): void {
  const P = SLEEP_POD;
  const A = ASTER_PERSON;
  const C = ASTER_CAMP;
  for (let f = 0; f < BOIL; f++) {
    (['failing', 'open'] as const).forEach((state, i) => bake(scene, TEX.asterPod(state, f), P.w, P.h, P.ox, P.oy, ART_RES, (ctx) => drawSleepPod(makeDraw(ctx, 5000 + i * 10 + f, f, 0), state), LANDER_FINISH, (ctx) => drawSleepPodAir(makeDraw(ctx, 5005 + i * 10 + f, f, 0), state)));
    (['stand', 'speak'] as const).forEach((pose, i) => bake(scene, TEX.asterPerson(pose, f), A.w, A.h, A.ox, A.oy, ART_RES, (ctx) => drawAsterPerson(makeDraw(ctx, 5020 + i * 10 + f, f, 0, BLUE), pose), ASTER_FINISH, (ctx) => drawAsterPersonAir(makeDraw(ctx, 5025 + i * 10 + f, f, 0, BLUE), pose)));
    bake(scene, TEX.asterCamp(f), C.w, C.h, C.ox, C.oy, ART_RES, (ctx) => drawAsterCamp(makeDraw(ctx, 5040 + f, f, 0)), LANDER_FINISH);
  }
  const W = ASTER_CRAFT_PICTURE;
  bake(scene, TEX.asterCraftPicture, W.w, W.h, W.ox, W.oy, ASTER_PICTURE_RES, (ctx) => drawAsterCraftPicture(makeDraw(ctx, 5050, 0, 0)));
  bake(scene, TEX.asterBrinePicture, W.w, W.h, W.ox, W.oy, ASTER_PICTURE_RES, (ctx) => drawAsterBrinePicture(makeDraw(ctx, 5051, 0, 0)));
}

/** The Aster's broken resonator lying in the world, baked when first needed. */
export function pulseWreckTexture(scene: Phaser.Scene, f: number): string {
  const key = TEX.pulseWreck(f);
  bake(scene, key, WRECK_FRAME, WRECK_FRAME, WRECK_FRAME / 2, WRECK_FRAME / 2, 3, (ctx) => drawPulseWreck(makeDraw(ctx, 1080 + f, f, 0)));
  return key;
}

/** How far down a tendril is drawn, in baked steps (its reach, 0..1, rounded to the nearest). */
export const TENDRIL_STEPS = [0, 1 / 3, 2 / 3, 1] as const;

/**
 * Mycel's creatures in every pose, and what flies (spat clots, the
 * pulse's rings). The hostile ones are inked in madder red, the grazers in
 * the usual ink (spec, "Art direction": red for danger only). Origins as
 * each drawing's constants say.
 */
export function bakeFauna(scene: Phaser.Scene): void {
  const red = (ctx: CanvasRenderingContext2D, seed: number, f: number) => makeDraw(ctx, seed, f, 0, RED);
  const RED_FINISH: Finish = { ...LANDER_FINISH, ink: RED };
  for (let f = 0; f < BOIL; f++) {
    const P = PUFFBALL_ART;
    (['idle', 'swell', 'spit', 'burst'] as const).forEach((pose, i) => bake(scene, TEX.puffball(pose, f), P.w, P.h, P.ox, P.oy, ART_RES * 1.5, (ctx) => drawPuffball(red(ctx, 900 + i * 10 + f, f), pose), RED_FINISH));
    bake(scene, TEX.glob(f), GLOB_ART.w, GLOB_ART.h, GLOB_ART.ox, GLOB_ART.oy, ART_RES * 1.5, (ctx) => drawSporeGlob(red(ctx, 950 + f, f)));
    const Td = TENDRIL_ART;
    TENDRIL_STEPS.forEach((reach, i) => {
      for (const grab of [false, true]) bake(scene, TEX.tendril(i, grab, f), Td.w, Td.h, Td.ox, Td.oy, ART_RES * 1.5, (ctx) => drawTendril(red(ctx, 960 + i * 10 + (grab ? 5 : 0) + f, f), reach, grab), RED_FINISH);
    });
    const G = GRAZER_ART;
    for (const pose of ['walk', 'curled'] as const) bake(scene, TEX.grazer(pose, f), G.w, G.h, G.ox, G.oy, ART_RES * 1.5, (ctx) => drawGrazer(makeDraw(ctx, 1000 + f + (pose === 'curled' ? 5 : 0), f, 0), pose), LANDER_FINISH);
    const M = MOTHER_ART;
    ([0, 1, 2] as const).forEach((beat) => bake(scene, TEX.mother(beat, f), M.w, M.h, M.ox, M.oy, ART_RES, (ctx) => drawMotherMycel(red(ctx, 1020 + beat * 10 + f, f), beat), RED_FINISH));
    bake(scene, TEX.shot(f), SHOT_ART.w, SHOT_ART.h, SHOT_ART.ox, SHOT_ART.oy, ART_RES * 1.5, (ctx) => drawPulseShot(makeDraw(ctx, 1060 + f, f, 0)));
  }
}

/** Mission items and ore pieces (also shown on the result card and the ship's page). Broken parts are baked as they're met (`wreckTexture`). */
export function bakePickups(scene: Phaser.Scene, rock: string): void {
  for (let f = 0; f < BOIL; f++) {
    ITEM_KINDS.forEach((kind, i) => bake(scene, TEX.item(kind, f), ITEM_FRAME, ITEM_FRAME, ITEM_FRAME / 2, ITEM_FRAME / 2, 3, (ctx) => drawItem(makeDraw(ctx, 400 + i * 10 + f, f, 0), kind)));
  }
  ORE_KINDS.forEach((ore, i) => bake(scene, TEX.piece(ore.key), PIECE_FRAME, PIECE_FRAME, PIECE_FRAME / 2, PIECE_FRAME / 2, 3, (ctx) => drawOrePiece(ctx, ore, PIECE_FRAME, 500 + i, rock)));
}

/** A broken part in the world, a piece of mark `mk` in boil frame `f`, baked the first time it's asked for. Returns its key. */
export function wreckTexture(scene: Phaser.Scene, piece: Piece, mk: number, f: number): string {
  const key = TEX.wreck(piece, mk, f);
  const seed = 460 + PIECES.indexOf(piece) * 10 + mk * 100 + f;
  bake(scene, key, WRECK_FRAME, WRECK_FRAME, WRECK_FRAME / 2, WRECK_FRAME / 2, 3, (ctx) => drawWreck(makeDraw(ctx, seed, f, 0), piece, mk));
  return key;
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
  const room = ridgeRoom(skyHeight);
  bake(scene, TEX.ridges(world, skyHeight), RIDGE_W, room + ridge + SKY_SKIRT, 0, 0, 1, (ctx) => {
    // Drawn below the room left over the horizon, so the tallest growths aren't cut off at the strip's top.
    ctx.translate(0, room);
    const d = makeDraw(ctx, 910, 0, 0);
    if (mycel) drawMycelRidges(d, RIDGE_W, ridge + SKY_SKIRT, ridge, style);
    else drawRidges(d, RIDGE_W, ridge + SKY_SKIRT, ridge, style);
  });
}

/** Room over the ridges' picture, px: the far forest's tallest caps rise past the strip's own height. The strip is placed this much higher. */
export function ridgeRoom(skyHeight: number): number {
  return skyHeight * 0.5;
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
