import type Phaser from 'phaser';
import { PLAYER_FISH } from '../levels/zones';
import { BONES_SIZE, drawBones, drawPan, PAN_SIZE } from './deathArt';
import { drawItem, ITEM_SIZE } from './itemArt';
import { DARK_TEX, drawDarkness, drawInkDrop, DROP_SIZE } from './twistArt';
import { ITEM_IDS } from '../levels/items';
import { drawCreature, FISH_TEX, type FishShape, type InkVariant } from './fishArt';
import { isCritter } from './critterArt';
import { DECOR_SIZE, drawDecor, type DecorId } from './decorArt';
import { xAt } from './fish/kit';
import { ANATOMY } from './fish/registry';
import { makeCanvas } from './pen';
import { BOAT_KINDS, BOAT_SPEC, CLOUD_SIZE, drawBoat, drawCloud } from './skyArt';
import { BIRD_FRAMES, BIRD_TEX, drawBird } from './birdArt';
import type { BirdId } from '../logic/birds';
import type { ShoreKind } from '../levels/shore';
import { drawShore, SHORE_SIZE } from './shoreArt';
import { ART_RES, drawBubble, drawWreck, drawHook, drawJelly, drawPaper, drawRock, drawWeed, type WeedKind } from './propArt';

export { ART_RES };

/** Number of redrawn frames cycled for the hand-drawn "line boil". */
export const BOIL_FRAMES = 3;
export const BOIL_FPS = 8;


export const fishKey = (shape: FishShape, variant: InkVariant, frame: number): string => `fish-${shape}-${variant}-${frame}`;
export const boilKey = (base: string, frame: number): string => `${base}-${frame}`;
export const WEED_KINDS: readonly WeedKind[] = [0, 1, 2];
export const CLOUD_COUNT = 3;
export const cloudKey = (i: number): string => `cloud-${i}`;
export const weedKey = (kind: WeedKind, frame: number): string => `weed-${kind}-${frame}`;
/** Prop texture sizes at in-game scale (textures are ART_RES times larger). */
export const WEED_SIZE = { w: 128, h: 256 } as const;
export const ROCK_SIZE = { w: 256, h: 128 } as const;

function add(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = makeCanvas(w, h);
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

/**
 * Generates every placeholder ink texture. When scanned pen drawings
 * arrive, load an atlas with the same keys instead and drop this call.
 */
export function generateInkTextures(scene: Phaser.Scene): void {
  for (let f = 0; f < BOIL_FRAMES; f++) {
    const seed = 101 + f * 977;
    const R = ART_RES;
    add(scene, boilKey('jelly', f), 128 * R, 128 * R, (ctx) => drawJelly(ctx, seed));
    add(scene, boilKey('hook', f), 48 * R, 76 * R, (ctx) => drawHook(ctx, seed));
    for (const kind of ITEM_IDS) add(scene, boilKey(`item-${kind}`, f), ITEM_SIZE * R, ITEM_SIZE * R, (ctx) => drawItem(ctx, kind, seed));
    add(scene, boilKey('drop', f), DROP_SIZE * R, DROP_SIZE * R, (ctx) => drawInkDrop(ctx, seed));
    for (const kind of WEED_KINDS) {
      const { w, h } = WEED_SIZE;
      add(scene, weedKey(kind, f), w * R, h * R, (ctx) => drawWeed(ctx, 7 + kind * 13, kind, f, w * R, h * R));
    }
  }
  // The player is never a predator to itself: light variant only. Other fish are drawn per level.
  ensureFishTextures(scene, PLAYER_FISH, ['light']);
  add(scene, 'bubble', 16 * ART_RES, 16 * ART_RES, (ctx) => drawBubble(ctx, 3));
  for (let i = 0; i < 3; i++) {
    const { w, h } = ROCK_SIZE;
    add(scene, `rock-${i}`, w * ART_RES, h * ART_RES, (ctx) => drawRock(ctx, 40 + i, w * ART_RES, h * ART_RES));
  }
  add(scene, 'bones', BONES_SIZE.w * ART_RES, BONES_SIZE.h * ART_RES, (ctx) => drawBones(ctx, 9));
  add(scene, 'pan', PAN_SIZE.w * ART_RES, PAN_SIZE.h * ART_RES, (ctx) => drawPan(ctx, 12));
  add(scene, 'darkness', DARK_TEX, DARK_TEX, drawDarkness);
  add(scene, 'paper', 512, 512, (ctx) => drawPaper(ctx, 512));
  for (const kind of BOAT_KINDS) add(scene, `boat-${kind}`, BOAT_SPEC[kind].w * ART_RES, BOAT_SPEC[kind].h * ART_RES, (ctx) => drawBoat(ctx, kind, 31));
  for (let i = 0; i < CLOUD_COUNT; i++) add(scene, cloudKey(i), CLOUD_SIZE.w * ART_RES, CLOUD_SIZE.h * ART_RES, (ctx) => drawCloud(ctx, 61 + i * 17));
  add(scene, 'wreck', 360 * ART_RES, 200 * ART_RES, (ctx) => drawWreck(ctx, 360 * ART_RES, 200 * ART_RES));
}

const frameSeed = (f: number): number => 101 + f * 977;

export const shoreKey = (kind: ShoreKind): string => `shore-${kind}`;

/** Horizon scenery for a level, drawn on demand. */
export function ensureShoreTextures(scene: Phaser.Scene, kinds: readonly ShoreKind[]): void {
  for (const kind of new Set(kinds)) add(scene, shoreKey(kind), SHORE_SIZE[kind].w * ART_RES, SHORE_SIZE[kind].h * ART_RES, (ctx) => drawShore(ctx, kind, 47));
}

export const birdKey = (kind: BirdId, frame: number): string => `bird-${kind}-${frame}`;

/** Wing frames for the birds a level uses (only sunlit levels have any). */
export function ensureBirdTextures(scene: Phaser.Scene, kinds: readonly BirdId[]): void {
  for (const kind of new Set(kinds)) {
    for (let f = 0; f < BIRD_FRAMES; f++) add(scene, birdKey(kind, f), BIRD_TEX.w * ART_RES, BIRD_TEX.h * ART_RES, (ctx) => drawBird(ctx, kind, f, 5 + f));
  }
}

/**
 * Draws the boil frames for these fish if they aren't cached yet. With ~65
 * species, drawing them all at boot would take seconds; a level only needs
 * its own handful.
 */
export function ensureFishTextures(scene: Phaser.Scene, shapes: readonly FishShape[], variants: readonly InkVariant[] = ['light', 'heavy']): void {
  for (const shape of new Set(shapes)) {
    for (const variant of variants) {
      for (let f = 0; f < BOIL_FRAMES; f++) {
        add(scene, fishKey(shape, variant, f), FISH_TEX, FISH_TEX, (ctx) => drawCreature(ctx, shape, variant, f, frameSeed(f)));
        addSwimFrames(scene, fishKey(shape, variant, f), shape);
      }
    }
  }
}

/** The tail piece reaches this far under the body, so no gap opens at the hinge when it swings. */
const TAIL_OVERLAP = 5;

/**
 * Where a fish texture splits into body and swinging tail (px from the left),
 * just inside the tail stalk; null for fish that swim by bending the whole
 * body (eels, the oarfish), which keep a single image.
 */
export function tailCut(shape: FishShape): number | null {
  if (isCritter(shape)) return null;
  const a = ANATOMY[shape];
  if (a.tail === 'point' || a.wave) return null;
  return Math.round(xAt(a, 1) + Math.max(5, a.hl * 0.08));
}

/**
 * 'body' and 'tail' frames on a fish texture, pivoting on the hinge: the body
 * on the fish's centre, the tail on the stalk. A custom pivot also makes
 * flipX mirror around that point instead of the frame's middle.
 */
function addSwimFrames(scene: Phaser.Scene, key: string, shape: FishShape): void {
  const cut = tailCut(shape);
  const tex = scene.textures.get(key);
  if (cut === null || tex.has('body')) return;
  const body = tex.add('body', 0, cut, 0, FISH_TEX - cut, FISH_TEX);
  const tail = tex.add('tail', 0, 0, 0, cut + TAIL_OVERLAP, FISH_TEX);
  // Adding a frame makes it the texture's default; keep the whole fish as the
  // default so plain images (map, intro card, end screens) still show the tail.
  tex.firstFrame = '__BASE';
  if (!body || !tail) return;
  Object.assign(body, { customPivot: true, pivotX: (FISH_TEX / 2 - cut) / (FISH_TEX - cut), pivotY: 0.5 });
  Object.assign(tail, { customPivot: true, pivotX: cut / (cut + TAIL_OVERLAP), pivotY: 0.5 });
}

/** Frees GPU memory held by fish textures not in `keep`. Player fish always stay. */
export function releaseFishTextures(scene: Phaser.Scene, keep: readonly FishShape[]): void {
  const kept = new Set<FishShape>([...keep, ...PLAYER_FISH]);
  for (const key of scene.textures.getTextureKeys()) {
    const shape = /^fish-(\w+)-(light|heavy)-\d+$/.exec(key)?.[1] as FishShape | undefined;
    if (shape && !kept.has(shape)) scene.textures.remove(key);
  }
}

/** Seabed scenery for a level (drawn on demand: only the kinds this level uses). */
export function ensureDecorTextures(scene: Phaser.Scene, kinds: readonly DecorId[]): void {
  for (const kind of kinds) {
    const { w, h } = DECOR_SIZE[kind];
    add(scene, `decor-${kind}`, w * ART_RES, h * ART_RES, (ctx) => drawDecor(ctx, kind, 101));
  }
}
