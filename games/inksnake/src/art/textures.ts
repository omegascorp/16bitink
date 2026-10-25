import type { SliceJob } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import { CHAPTER_1 } from '../level/chapter1';
import { BOARD, type LevelDef, type Place } from '../level/types';
import { BOSS_ENTRIES } from '../logic/chapters/index';
import type { SnakeId } from '../logic/species';
import { CRITTER_ART, type CritterKind } from './critters/index';
import { makeDraw } from './kit';
import { ART_RES, BOIL, PAPER } from './palette';
import { makeCanvas, releaseScratch, shrink } from './pen';
import { placeArt } from './places/index';
import { isRivalArt, snakeArt } from './snakes/index';
import { SNAKE_W, stripLength, type SpriteArt } from './types';

export const TEX = {
  paper: 'paper',
  critter: (kind: string, pose: string, f: number) => `critter-${kind}-${pose}-${f}`,
  /** A snake's body strip (one long painting, see SnakeArt). */
  strip: (id: string) => `strip-${id}`,
  belly: (id: string) => `belly-${id}`,
  head: (id: string, pose: string, f: number) => `head-${id}-${pose}-${f}`,
  tongue: (id: string, f: number) => `tongue-${id}-${f}`,
  /** A soft round shadow, for anything off the ground. */
  shadow: 'soft-shadow',
  /** A level's ground, solid things and nests, drawn when the level starts. */
  board: (levelId: string) => `board-${levelId}`,
  /** A level's cover, drawn over the snake. */
  covers: (levelId: string) => `covers-${levelId}`,
} as const;

/** Texture px per board px of a snake's strip. */
export const STRIP_RES = 3;
const PAPER_TILE = 256;
const SHADOW_R = 64;

/**
 * A finished painting as a plain image texture: addCanvas would make a
 * CanvasTexture, which reads every pixel back and keeps a second copy.
 */
function addPainted(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
}

/** Removes a texture and empties the canvas it was painted on, so its memory goes now. */
export function freeTexture(scene: Phaser.Scene, key: string): void {
  if (!scene.textures.exists(key)) return;
  const source = scene.textures.get(key).getSourceImage();
  scene.textures.remove(key);
  if (source instanceof HTMLCanvasElement) shrink(source);
}

/** One pose of a sprite, in boil frame f, as a texture. */
function bakeSprite(scene: Phaser.Scene, key: string, art: SpriteArt, pose: string, f: number, seed: number): void {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = makeCanvas(Math.ceil(art.frame * art.res), Math.ceil(art.frame * art.res));
  ctx.scale(art.res, art.res);
  ctx.translate(art.frame / 2, art.frame / 2);
  art.draw(makeDraw(ctx, seed + f, f, 0), pose);
  addPainted(scene, key, canvas);
}

function seedOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

/** Every pose of a critter in every boil frame, one job each. */
export function critterJobs(scene: Phaser.Scene, kind: CritterKind): SliceJob[] {
  const art = CRITTER_ART[kind];
  if (!art) return [];
  return art.poses.flatMap((pose, i) => Array.from({ length: BOIL }, (_, f) => () => bakeSprite(scene, TEX.critter(kind, pose, f), art, pose, f, seedOf(kind) + i * 10)));
}

/** A snake's strip, head poses and tongue. */
export function snakeJobs(scene: Phaser.Scene, id: SnakeId | string): SliceJob[] {
  const art = snakeArt(id);
  const jobs: SliceJob[] = [() => {
    const key = TEX.strip(id);
    if (scene.textures.exists(key)) return;
    const len = stripLength(art.period);
    const { canvas, ctx } = makeCanvas(Math.ceil(len * STRIP_RES), SNAKE_W * STRIP_RES);
    ctx.scale(STRIP_RES, STRIP_RES);
    art.drawStrip(makeDraw(ctx, 11, 0, 0), len);
    addPainted(scene, key, canvas);
  }];
  const belly = art.drawBelly;
  if (belly) {
    jobs.push(() => {
      const key = TEX.belly(id);
      if (scene.textures.exists(key)) return;
      const len = stripLength(art.period);
      const { canvas, ctx } = makeCanvas(Math.ceil(len * STRIP_RES), SNAKE_W * STRIP_RES);
      ctx.scale(STRIP_RES, STRIP_RES);
      belly(makeDraw(ctx, 13, 0, 0), len);
      addPainted(scene, key, canvas);
    });
  }
  for (let f = 0; f < BOIL; f++) {
    art.head.poses.forEach((pose, i) => jobs.push(() => bakeSprite(scene, TEX.head(id, pose, f), art.head, pose, f, 300 + i * 10)));
    jobs.push(() => bakeSprite(scene, TEX.tongue(id, f), art.tongue, 'flick', f, 400));
  }
  return jobs;
}

/** The critters a level needs, by kind (bosses are baked when their level starts). */
export function levelCritters(level: LevelDef): CritterKind[] {
  const kinds = new Set<CritterKind>(level.prey.map((p) => p.kind));
  for (const e of level.enemies ?? []) kinds.add(e.kind);
  if (level.boss) kinds.add(level.boss.kind);
  return [...kinds];
}

/**
 * What boot paints: paper, the soft shadow, the free chapter's snake and
 * every critter its first levels meet (the boss waits for its level).
 */
export function textureJobs(scene: Phaser.Scene): SliceJob[] {
  const kinds = new Set<CritterKind>(CHAPTER_1.flatMap(levelCritters).filter((k) => !(k in BOSS_ENTRIES)));
  return [
    () => bakePaper(scene),
    () => bakeShadow(scene),
    ...snakeJobs(scene, 'corn'),
    ...[...kinds].flatMap((k) => critterJobs(scene, k)),
  ];
}

/** Whatever a level needs that isn't painted yet (its snake, its critters, its boss): run before it starts. */
export function bakeForLevel(scene: Phaser.Scene, level: LevelDef): void {
  const kinds = levelCritters(level);
  // Rival snakes are drawn as snakes; everything else as sprites.
  for (const job of [...snakeJobs(scene, level.snake), ...kinds.flatMap((k) => (isRivalArt(k) ? snakeJobs(scene, k) : critterJobs(scene, k)))]) job();
  releaseScratch();
}

/** Frees a boss's poses (leaving its level for another). */
export function freeBosses(scene: Phaser.Scene, keep?: string): void {
  for (const kind of Object.keys(BOSS_ENTRIES)) {
    if (kind === keep) continue;
    const art = CRITTER_ART[kind];
    if (!art) continue;
    for (const pose of art.poses) for (let f = 0; f < BOIL; f++) freeTexture(scene, TEX.critter(kind, pose, f));
  }
}

function bakePaper(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.paper)) return;
  const { canvas, ctx } = makeCanvas(PAPER_TILE, PAPER_TILE);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAPER_TILE, PAPER_TILE);
  addPainted(scene, TEX.paper, canvas);
}

function bakeShadow(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.shadow)) return;
  const size = SHADOW_R * 2;
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(SHADOW_R, SHADOW_R, 0, SHADOW_R, SHADOW_R, SHADOW_R);
  g.addColorStop(0, 'rgba(38,49,106,0.55)');
  g.addColorStop(0.6, 'rgba(38,49,106,0.3)');
  g.addColorStop(1, 'rgba(38,49,106,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  addPainted(scene, TEX.shadow, canvas);
}

/** The shadow texture's radius, px (sprites scale it to the size they need). */
export const SHADOW_TEX_R = SHADOW_R;

/** Draws a level's board: its place's ground, the nests and the solid things. */
export function bakeBoard(scene: Phaser.Scene, level: LevelDef, place: Place): string {
  const key = TEX.board(level.id);
  if (scene.textures.exists(key)) return key;
  const art = placeArt(place);
  const { canvas, ctx } = makeCanvas(BOARD.w * ART_RES, BOARD.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  const seed = seedOf(level.id);
  art.ground(makeDraw(ctx, 600 + seed, 0, 0), level);
  (level.nests ?? []).forEach((n, i) => art.nest(makeDraw(ctx, 640 + i, 0, 0), n));
  (level.solids ?? []).forEach((s, i) => art.solid(makeDraw(ctx, 700 + i + seed, 0, 0), s));
  releaseScratch();
  addPainted(scene, key, canvas);
  return key;
}

/** Draws a level's cover on a clear layer that lies over the snake, or returns null if it has none. */
export function bakeCovers(scene: Phaser.Scene, level: LevelDef, place: Place): string | null {
  if (!level.cover?.length) return null;
  const key = TEX.covers(level.id);
  if (scene.textures.exists(key)) return key;
  const art = placeArt(place);
  const { canvas, ctx } = makeCanvas(BOARD.w * ART_RES, BOARD.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  level.cover.forEach((c, i) => art.cover(makeDraw(ctx, 800 + i, 0, 0), c));
  releaseScratch();
  addPainted(scene, key, canvas);
  return key;
}

/** Frees every baked board but `keep`'s: a level played again starts on the board it already has. */
export function dropBoards(scene: Phaser.Scene, keep?: LevelDef): void {
  const kept = keep ? [TEX.board(keep.id), TEX.covers(keep.id)] : [];
  for (const key of scene.textures.getTextureKeys()) {
    if ((key.startsWith('board-') || key.startsWith('covers-')) && !kept.includes(key)) freeTexture(scene, key);
  }
}
