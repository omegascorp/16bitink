import type { SliceJob } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import { CREATURE_IDS, type CreatureId } from '../logic/creatures';
import { RESOURCES, type Resource } from '../logic/resources';
import { creatureArt } from './creatures';
import { CREATURE_RES, FRAME_H, FRAME_W, GROUND_Y, POSE_FRAMES, poseAt, type PoseKind } from './creatures/types';
import { drawHero } from './heroArt';
import { BANNER } from './palette';
import { makeCanvas, releaseScratch, shrink } from './pen';
import { drawResourceIcon } from './sites';

export type BannerKey = keyof typeof BANNER;
/** Anything with poses: a creature, or a hero under a banner. */
export type Figure = CreatureId | `hero-${BannerKey}`;
export const heroFigure = (banner: BannerKey): Figure => `hero-${banner}`;

export const TEX = {
  /** Frame `i` of a figure's pose (see creatures/types.ts POSE_FRAMES). */
  figure: (fig: Figure, kind: PoseKind, i: number) => `fig-${fig}-${kind}-${i}`,
  /** A creature's idle frame (frame 0 is how it stands in lists and portraits). */
  creature: (id: CreatureId, f: number) => `fig-${id}-idle-${f}`,
  hero: (banner: BannerKey, f: number) => `fig-hero-${banner}-idle-${f}`,
  icon: (r: Resource) => `res-${r}`,
} as const;

export const ICON_RES = 3;
export const ICON_SIZE = 28;

/** Bakes a canvas into a texture under `key` (a plain image texture: addCanvas would keep a second copy). */
function bake(scene: Phaser.Scene, key: string, w: number, h: number, res: number, paint: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = makeCanvas(Math.ceil(w * res), Math.ceil(h * res));
  ctx.scale(res, res);
  paint(ctx);
  scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
}

export function freeTexture(scene: Phaser.Scene, key: string): void {
  if (!scene.textures.exists(key)) return;
  const source = scene.textures.get(key).getSourceImage();
  scene.textures.remove(key);
  if (source instanceof HTMLCanvasElement) shrink(source);
}

/** Paints frame `i` of a figure's pose. */
function figureJob(scene: Phaser.Scene, fig: Figure, kind: PoseKind, i: number): SliceJob {
  return () => bake(scene, TEX.figure(fig, kind, i), FRAME_W, FRAME_H, CREATURE_RES, (ctx) => {
    ctx.translate(FRAME_W / 2, GROUND_Y);
    // The pen is reseeded a frame at a time, so the lines shimmer as the figure moves.
    const pose = poseAt(kind, i);
    if (fig.startsWith('hero-')) drawHero(ctx, 4242, i % 3, BANNER[fig.slice(5) as BannerKey], pose);
    else creatureArt(fig as CreatureId)(ctx, 1000 + CREATURE_IDS.indexOf(fig as CreatureId) * 17, i % 3, pose);
  });
}

export const ALL_FIGURES: readonly Figure[] = [...CREATURE_IDS, heroFigure('player'), heroFigure('rival')];

/** The frames of `kinds` for `figures` not painted yet (walks and attacks are painted when a battle or a map opens). */
export function poseJobs(scene: Phaser.Scene, figures: readonly Figure[], kinds: readonly PoseKind[]): SliceJob[] {
  const jobs = figures.flatMap((fig) => kinds.flatMap((kind) => Array.from({ length: POSE_FRAMES[kind] }, (_, i) => i)
    .filter((i) => !scene.textures.exists(TEX.figure(fig, kind, i)))
    .map((i) => figureJob(scene, fig, kind, i))));
  return jobs.length ? [...jobs, () => releaseScratch()] : [];
}

/** Everything drawn once at boot: every creature and hero standing, and the resource icons. */
export function textureJobs(scene: Phaser.Scene): SliceJob[] {
  return [
    // Every figure standing (the rest of its idle loop is painted when a map or battle needs it).
    ...ALL_FIGURES.map((fig) => figureJob(scene, fig, 'idle', 0)),
    ...RESOURCES.map((r) => () => bake(scene, TEX.icon(r), ICON_SIZE, ICON_SIZE, ICON_RES, (ctx) => {
      ctx.translate(ICON_SIZE / 2, ICON_SIZE / 2);
      drawResourceIcon(ctx, r, 21);
    })),
    () => releaseScratch(),
  ];
}
