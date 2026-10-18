import type Phaser from 'phaser';
import { CRAB_ART, drawCrab, type CrabPose } from './creatures/crab';
import { drawJelly, drawJellyBell, JELLY_ART, type JellyPose } from './creatures/jelly';
import { drawLamprey, LAMPREY_ART, LAMPREY_STEPS } from './creatures/lamprey';
import { drawLeviathan, drawLeviathanAir, LEVIATHAN_ART, type LeviathanPose } from './creatures/leviathan';
import { makeDraw } from './kit';
import { ART_RES, BOIL, RED } from './palette';
import { LANDER_FINISH, render, type Finish } from './textures';

export type { CrabPose } from './creatures/crab';
export type { JellyPose } from './creatures/jelly';
export type { LeviathanPose } from './creatures/leviathan';
export { CRAB_ART } from './creatures/crab';
export { JELLY_ART } from './creatures/jelly';
export { LAMPREY_ART, LAMPREY_REACH, LAMPREY_STEPS } from './creatures/lamprey';
export { LEVIATHAN_ART } from './creatures/leviathan';

/**
 * Brine's creatures, baked for play: the shore crab (harmless, in the usual
 * ink), the bubble jelly, the rasp eel and the Leviathan (hostile, in madder
 * red: spec, "Creatures"). Each pose is drawn BOIL times slightly
 * differently for the line boil; the crab's frames are its walk cycle.
 * Origins as each drawing's frame says: `CRAB_ART` on the ground under its
 * middle, `JELLY_ART` at the bell's centre, `LAMPREY_ART` at the burrow mouth
 * on the wall face, `LEVIATHAN_ART` under the middle of its belly.
 */
export const BRINE_FAUNA_TEX = {
  crab: (pose: CrabPose, f: number) => `brine-crab-${pose}-${f}`,
  jelly: (pose: JellyPose, f: number) => `brine-jelly-${pose}-${f}`,
  /** `step` is an index into LAMPREY_STEPS. */
  lamprey: (step: number, f: number) => `brine-lamprey-${step}-${f}`,
  leviathan: (pose: LeviathanPose, f: number) => `brine-leviathan-${pose}-${f}`,
} as const;

/** Texture px per unit each is baked at (show at scale 1/res): the small ones finer, the giant at the scenery's resolution, as the Mother is. */
export const BRINE_FAUNA_RES = {
  crab: ART_RES * 1.5,
  jelly: ART_RES * 1.5,
  lamprey: ART_RES * 1.5,
  leviathan: ART_RES,
} as const;

/** Madder red for what can hurt you. */
export const RED_FINISH: Finish = { ...LANDER_FINISH, ink: RED };

const CRAB_POSES: readonly CrabPose[] = ['walk', 'tucked'];
const JELLY_POSES: readonly JellyPose[] = ['drift', 'pulse', 'burst'];
const LEVIATHAN_POSES: readonly LeviathanPose[] = ['sleep', 'stir', 'awake'];

interface Frame {
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
}

function bake(scene: Phaser.Scene, key: string, a: Frame, res: number, draw: (ctx: CanvasRenderingContext2D) => void, finish: Finish, after?: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  scene.textures.addCanvas(key, render(a.w, a.h, a.ox, a.oy, res, draw, finish, after));
}

/** Every pose of Brine's creatures, BOIL frames each; keys that already exist are skipped. */
export function bakeBrineFauna(scene: Phaser.Scene): void {
  const R = BRINE_FAUNA_RES;
  for (let f = 0; f < BOIL; f++) {
    CRAB_POSES.forEach((pose, i) => bake(scene, BRINE_FAUNA_TEX.crab(pose, f), CRAB_ART, R.crab, (ctx) => drawCrab(makeDraw(ctx, 7000 + i * 10 + f, f, 0), pose), LANDER_FINISH));
    JELLY_POSES.forEach((pose, i) => bake(scene, BRINE_FAUNA_TEX.jelly(pose, f), JELLY_ART, R.jelly, (ctx) => drawJelly(makeDraw(ctx, 7100 + i * 10 + f, f, 0, RED), pose), RED_FINISH, (ctx) => drawJellyBell(makeDraw(ctx, 7105 + i * 10 + f, f, 0, RED), pose)));
    LAMPREY_STEPS.forEach((reach, i) => bake(scene, BRINE_FAUNA_TEX.lamprey(i, f), LAMPREY_ART, R.lamprey, (ctx) => drawLamprey(makeDraw(ctx, 7200 + i * 10 + f, f, 0, RED), reach), RED_FINISH));
    LEVIATHAN_POSES.forEach((pose, i) => bake(scene, BRINE_FAUNA_TEX.leviathan(pose, f), LEVIATHAN_ART, R.leviathan, (ctx) => drawLeviathan(makeDraw(ctx, 7300 + i * 10 + f, f, 0, RED), pose), RED_FINISH, (ctx) => drawLeviathanAir(makeDraw(ctx, 7305 + i * 10 + f, f, 0, RED), pose)));
  }
}
