import { RED_FINISH } from '../src/art/brineFauna';
import { drawRockslide, ROCKSLIDE_ART, type RockslidePose } from '../src/art/creatures/rockslide';
import { drawRockcrab, ROCKCRAB_ART, TALUS_STYLE, type RockcrabPose } from '../src/art/creatures/rockcrab';
import { BEETLE_ART, drawBeetle, type BeetlePose } from '../src/art/creatures/beetle';
import { drawSkate, SKATE_ART, SKATE_STEPS } from '../src/art/creatures/skate';
import { makeDraw } from '../src/art/kit';
import { ART_RES, RED } from '../src/art/palette';
import { drawProspector, PROSPECTOR_FRAME, PROSPECTOR_GROUND } from '../src/art/prospector';
import { boulder } from '../src/art/talusGround';
import { LANDER_FINISH, PROSPECTOR_FINISH, render, type Finish } from '../src/art/textures';
import { evenLoadout, prospectorLook } from '../src/logic/gear';

// Dev page section: Talus's creatures, the dew beetle in blue ink and the hostile ones in red: big, then at play size.

type Section = (title: string, note: string) => HTMLDivElement;
type Figure = (row: HTMLElement, label: string, canvas: HTMLCanvasElement) => void;

interface Art {
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
}

/** Small creatures bake finer than the scenery (brineFauna.ts). */
const SMALL_RES = ART_RES * 1.5;

/** Talus's backdrop: the dusty peach sky over the rust soil of the flats. */
const FLATS = `linear-gradient(${TALUS_STYLE.sky} 0%, ${TALUS_STYLE.sky} calc(100% - var(--floor)), ${TALUS_STYLE.soil} calc(100% - var(--floor)))`;

function shown(c: HTMLCanvasElement, a: Art, scale: number, bg = FLATS): HTMLCanvasElement {
  c.style.width = `${a.w * scale}px`;
  c.style.background = bg;
  c.style.setProperty('--floor', `${(a.h - a.oy) * scale}px`);
  return c;
}

const art = (a: Art, res: number, draw: (ctx: CanvasRenderingContext2D) => void, finish?: Finish): HTMLCanvasElement => render(a.w, a.h, a.ox, a.oy, res, draw, finish);

const rockcrab = (pose: RockcrabPose, res: number, f = 0): HTMLCanvasElement => art(ROCKCRAB_ART, res, (ctx) => drawRockcrab(makeDraw(ctx, 8000 + f, f, 0, pose === 'boulder' ? undefined : RED), pose), pose === 'boulder' ? LANDER_FINISH : RED_FINISH);

const skate = (reach: number, res: number, f = 0): HTMLCanvasElement => art(SKATE_ART, res, (ctx) => drawSkate(makeDraw(ctx, 8100 + f, f, 0, RED), reach), RED_FINISH);

const beetle = (pose: BeetlePose, res: number, f = 0): HTMLCanvasElement => art(BEETLE_ART, res, (ctx) => drawBeetle(makeDraw(ctx, 8200 + f, f, 0), pose), LANDER_FINISH);

const rockslide = (pose: RockslidePose, res: number, f = 0): HTMLCanvasElement => art(ROCKSLIDE_ART, res, (ctx) => drawRockslide(makeDraw(ctx, 8300 + f, f, 0, RED), pose), RED_FINISH);

/** Talus's deep caves: the dark stone of the Throne's roots over a cave floor. */
const CAVE = `linear-gradient(#7a4a3c 0%, #5c3329 calc(100% - var(--floor)), ${TALUS_STYLE.deep} calc(100% - var(--floor)))`;

/** A creature beside the prospector, on one canvas at `res`, the prospector standing on the creature's ground line to its left. */
function withProspector(c: HTMLCanvasElement, a: Art, res: number): HTMLCanvasElement {
  const P = PROSPECTOR_FRAME;
  const out = document.createElement('canvas');
  out.width = (a.w + P) * res;
  out.height = Math.max(a.h, a.oy + P / 2) * res;
  const ctx = out.getContext('2d')!;
  const top = Math.max(0, P / 2 - a.oy + PROSPECTOR_GROUND);
  const p = render(P, P, P / 2, P / 2, res, (x) => drawProspector(makeDraw(x, 100, 0, PROSPECTOR_GROUND), 'idle', prospectorLook(evenLoadout(4))), PROSPECTOR_FINISH);
  ctx.drawImage(p, 0, (a.oy - P / 2 - PROSPECTOR_GROUND + top) * res);
  ctx.drawImage(c, P * res, top * res);
  return out;
}

/**
 * The mimicry test: the boulder crab disguised between two real loose-rock
 * boulders on Talus ground, all at one resolution, as the eye meets them in play.
 */
function lineup(res: number, f = 0): HTMLCanvasElement {
  const W = 150;
  const H = ROCKCRAB_ART.h;
  const out = document.createElement('canvas');
  out.width = W * res;
  out.height = H * res;
  const ctx = out.getContext('2d')!;
  const ground = ROCKCRAB_ART.oy;
  ctx.save();
  ctx.scale(res, res);
  boulder(ctx, 28, ground - 28 * 0.42, 28, 812345, TALUS_STYLE);
  boulder(ctx, 122, ground - 32 * 0.42, 32, 2004417, TALUS_STYLE);
  ctx.restore();
  ctx.drawImage(rockcrab('boulder', res, f), (75 - ROCKCRAB_ART.ox) * res, 0);
  return out;
}

function rockcrabSection(section: Section, figure: Figure): void {
  const row = section('Talus: the boulder crab', 'A mimic. Disguised it is a boulder in the normal ink, drawn with the loose rock\'s own stone (tells: a seam low on the front, two eye nubs laid flat). Revealed, in red: reared up with both claws open, then three scuttle steps. Then between two real boulders, at play size, and beside the prospector.');
  figure(row, 'boulder', shown(rockcrab('boulder', 8), ROCKCRAB_ART, 6));
  figure(row, 'rear', shown(rockcrab('rear', 8), ROCKCRAB_ART, 6));
  for (const f of [0, 1, 2]) figure(row, `run ${f}`, shown(rockcrab('run', 8, f), ROCKCRAB_ART, 6));
  const L = { w: 150, h: ROCKCRAB_ART.h, ox: 0, oy: ROCKCRAB_ART.oy };
  figure(row, 'among boulders (crab in the middle)', shown(lineup(6), L, 5));
  figure(row, 'among boulders 2x', shown(lineup(SMALL_RES), L, 2));
  figure(row, 'among boulders 1x', shown(lineup(SMALL_RES), L, 1));
  for (const pose of ['boulder', 'rear'] as const) figure(row, `${pose} 1x`, shown(rockcrab(pose, SMALL_RES), ROCKCRAB_ART, 1));
  for (const f of [0, 1, 2]) figure(row, `run ${f} 1x`, shown(rockcrab('run', SMALL_RES, f), ROCKCRAB_ART, 1));
  for (const pose of ['boulder', 'rear'] as const) {
    const pair = withProspector(rockcrab(pose, 2), ROCKCRAB_ART, 2);
    figure(row, `${pose} with the prospector 2x`, shown(pair, { w: ROCKCRAB_ART.w + PROSPECTOR_FRAME, h: pair.height / 2, ox: 0, oy: pair.height / 2 - (ROCKCRAB_ART.h - ROCKCRAB_ART.oy) }, 2));
  }
}

function skateSection(section: Section, figure: Figure): void {
  const row = section('Talus: the sand skate', 'A burrower, in red: under the crust (a cracked bulge, the ridge\'s tip, two eyes), then striking up at reach 0.25, 0.5, 0.75 and 1 on its tail, ventral side to us, out of a spray of sand and crust chips. Then at play size, and beside the prospector.');
  SKATE_STEPS.forEach((reach) => figure(row, `reach ${reach}`, shown(skate(reach, 8), SKATE_ART, 5)));
  figure(row, 'reach 1 frame 1', shown(skate(1, 8, 1), SKATE_ART, 5));
  figure(row, 'reach 0 frame 2', shown(skate(0, 8, 2), SKATE_ART, 5));
  SKATE_STEPS.forEach((reach) => figure(row, `${reach} 1x`, shown(skate(reach, SMALL_RES), SKATE_ART, 1)));
  for (const reach of [0, 1]) {
    const pair = withProspector(skate(reach, 2), SKATE_ART, 2);
    figure(row, `reach ${reach} with the prospector 2x`, shown(pair, { w: SKATE_ART.w + PROSPECTOR_FRAME, h: pair.height / 2, ox: 0, oy: pair.height / 2 - (SKATE_ART.h - SKATE_ART.oy) }, 2));
  }
}

function beetleSection(section: Section, figure: Figure): void {
  const row = section('Talus: the dew beetle', 'Harmless, in blue: three steps of its tripod gait on long legs (its boil frames are the walk cycle), its bumpy back beaded with frost-melt; then tucked flat against a dust storm. Then at play size, and beside the prospector.');
  for (const f of [0, 1, 2]) figure(row, `walk ${f}`, shown(beetle('walk', 10, f), BEETLE_ART, 8));
  figure(row, 'tucked', shown(beetle('tucked', 10), BEETLE_ART, 8));
  for (const f of [0, 1, 2]) figure(row, `walk ${f} 1x`, shown(beetle('walk', SMALL_RES, f), BEETLE_ART, 1));
  figure(row, 'tucked 1x', shown(beetle('tucked', SMALL_RES), BEETLE_ART, 1));
  const pair = withProspector(beetle('walk', 2), BEETLE_ART, 2);
  figure(row, 'with the prospector 2x', shown(pair, { w: BEETLE_ART.w + PROSPECTOR_FRAME, h: pair.height / 2, ox: 0, oy: pair.height / 2 - (BEETLE_ART.h - BEETLE_ART.oy) }, 2));
}

function rockslideSection(section: Section, figure: Figure): void {
  const row = section('Talus: the Rockslide', 'Talus\'s giant, in red, 9 × 5 tiles: asleep (a mound of boulders in a cave, a claw half buried and a shut eye slit the only hints), stirring (stones tumbling off, eyes opening, a leg tip out of the gravel), awake (risen on its legs, the heap on its back, claws forward, eyes up, gravel streaming). Then at play size with the prospector.');
  const POSES: readonly RockslidePose[] = ['sleep', 'stir', 'awake'];
  for (const pose of POSES) figure(row, pose, shown(rockslide(pose, 4), ROCKSLIDE_ART, 2.2, CAVE));
  figure(row, 'awake frame 1', shown(rockslide('awake', 3, 1), ROCKSLIDE_ART, 1.5, CAVE));
  figure(row, 'sleep on Talus ground', shown(rockslide('sleep', 3, 2), ROCKSLIDE_ART, 1.5));
  for (const pose of POSES) {
    const pair = withProspector(rockslide(pose, ART_RES), ROCKSLIDE_ART, ART_RES);
    figure(row, `${pose} 1x with the prospector`, shown(pair, { w: ROCKSLIDE_ART.w + PROSPECTOR_FRAME, h: pair.height / ART_RES, ox: 0, oy: pair.height / ART_RES - (ROCKSLIDE_ART.h - ROCKSLIDE_ART.oy) }, 1, CAVE));
  }
}

export function talusFaunaSections(section: Section, figure: Figure): void {
  rockcrabSection(section, figure);
  skateSection(section, figure);
  beetleSection(section, figure);
  rockslideSection(section, figure);
}
