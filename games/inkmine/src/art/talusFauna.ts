import type Phaser from 'phaser';
import { RED_FINISH } from './brineFauna';
import { BEETLE_ART, drawBeetle, type BeetlePose } from './creatures/beetle';
import { drawRockcrab, ROCKCRAB_ART, type RockcrabPose } from './creatures/rockcrab';
import { drawRockslide, ROCKSLIDE_ART, type RockslidePose } from './creatures/rockslide';
import { drawSkate, SKATE_ART, SKATE_STEPS } from './creatures/skate';
import { makeDraw } from './kit';
import { ART_RES, BOIL, RED } from './palette';
import { LANDER_FINISH, render, type Finish } from './textures';

export type { BeetlePose } from './creatures/beetle';
export type { RockcrabPose } from './creatures/rockcrab';
export type { RockslidePose } from './creatures/rockslide';
export { BEETLE_ART } from './creatures/beetle';
export { ROCKCRAB_ART } from './creatures/rockcrab';
export { ROCKSLIDE_ART } from './creatures/rockslide';
export { SKATE_ART, SKATE_STEPS } from './creatures/skate';

/**
 * Talus's creatures, baked for play: the dew beetle (harmless, in the
 * usual ink), the boulder crab, the sand skate and the Rockslide (hostile,
 * in madder red: spec, "Creatures"). The boulder crab sitting still is the
 * exception: it's a boulder, so it's baked in the ink and the light outline
 * of the loose rock round it. Each pose is drawn BOIL times slightly
 * differently for the line boil; the walkers' frames are their steps.
 */
export const TALUS_FAUNA_TEX = {
  rockcrab: (pose: RockcrabPose, f: number) => `talus-rockcrab-${pose}-${f}`,
  /** `step` is an index into SKATE_STEPS. */
  skate: (step: number, f: number) => `talus-skate-${step}-${f}`,
  beetle: (pose: BeetlePose, f: number) => `talus-beetle-${pose}-${f}`,
  rockslide: (pose: RockslidePose, f: number) => `talus-rockslide-${pose}-${f}`,
} as const;

/** Texture px per unit each is baked at (show at scale 1/res): the small ones finer, the giant at the scenery's resolution. */
export const TALUS_FAUNA_RES = {
  rockcrab: ART_RES * 1.5,
  skate: ART_RES * 1.5,
  beetle: ART_RES * 1.5,
  rockslide: ART_RES,
} as const;

/** A boulder's outline is the loose rock's, not a creature's firmer one: a heavier line would give it away. */
const BOULDER_FINISH: Finish = { line: 0.3, rim: 0.3 };

const CRAB_POSES: readonly RockcrabPose[] = ['boulder', 'rear', 'run'];
const BEETLE_POSES: readonly BeetlePose[] = ['walk', 'tucked'];
const ROCKSLIDE_POSES: readonly RockslidePose[] = ['sleep', 'stir', 'awake'];

interface Frame {
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
}

function bake(scene: Phaser.Scene, key: string, a: Frame, res: number, draw: (ctx: CanvasRenderingContext2D) => void, finish: Finish): void {
  if (scene.textures.exists(key)) return;
  scene.textures.addCanvas(key, render(a.w, a.h, a.ox, a.oy, res, draw, finish));
}

/** Every pose of Talus's creatures, BOIL frames each; keys that already exist are skipped. */
export function bakeTalusFauna(scene: Phaser.Scene): void {
  const R = TALUS_FAUNA_RES;
  for (let f = 0; f < BOIL; f++) {
    CRAB_POSES.forEach((pose, i) => {
      const hidden = pose === 'boulder';
      bake(scene, TALUS_FAUNA_TEX.rockcrab(pose, f), ROCKCRAB_ART, R.rockcrab, (ctx) => drawRockcrab(makeDraw(ctx, 7400 + i * 10 + f, f, 0, hidden ? undefined : RED), pose), hidden ? BOULDER_FINISH : RED_FINISH);
    });
    SKATE_STEPS.forEach((reach, i) => bake(scene, TALUS_FAUNA_TEX.skate(i, f), SKATE_ART, R.skate, (ctx) => drawSkate(makeDraw(ctx, 7500 + i * 10 + f, f, 0, RED), reach), RED_FINISH));
    BEETLE_POSES.forEach((pose, i) => bake(scene, TALUS_FAUNA_TEX.beetle(pose, f), BEETLE_ART, R.beetle, (ctx) => drawBeetle(makeDraw(ctx, 7600 + i * 10 + f, f, 0), pose), LANDER_FINISH));
    ROCKSLIDE_POSES.forEach((pose, i) => bake(scene, TALUS_FAUNA_TEX.rockslide(pose, f), ROCKSLIDE_ART, R.rockslide, (ctx) => drawRockslide(makeDraw(ctx, 7700 + i * 10 + f, f, 0, RED), pose), RED_FINISH));
  }
}
