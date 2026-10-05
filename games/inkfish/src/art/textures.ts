import type Phaser from 'phaser';
import { PLAYER_FISH } from '../levels/zones';
import { BONES_SIZE, drawBones, drawPan, PAN_SIZE } from './deathArt';
import { drawItem, ITEM_SIZE } from './itemArt';
import { DARK_TEX, drawDarkness, drawInkBottle, BOTTLE_SIZE } from './twistArt';
import { ITEM_IDS } from '../levels/items';
import { drawCreature, FISH_TEX, fishLights, type FishShape, type InkVariant } from './fishArt';
import { drawFishGlow, drawSoftGlow, GLOW_TEX } from './glowArt';
import { drawJellyGlow, drawJellyKind, JELLY_TEX } from './jellyArt';
import { JELLY_INFO, type JellyId } from '../levels/jellies';
import { isCritter } from './critterArt';
import { drawSquidBody, drawSquidFin, drawSquidLimb, drawSquidPortrait, drawSquidPupil, isSquid, SQUID_TEX } from './squidArt';
import { DECOR_SIZE, drawDecor, type DecorId } from './decorArt';
import { drawDecorGlow, isGlowDecor } from './decorGlow';
import { xAt } from './fish/kit';
import { ANATOMY } from './fish/registry';
import { makeCanvas } from './pen';
import { atlasOf, originOf } from './atlas';
import { noteArt, rememberArt, takeArt } from './artCache';
import { BOAT_KINDS, BOAT_SPEC, CLOUD_SIZE, drawBoat, drawCloud } from './skyArt';
import { BIRD_FRAMES, BIRD_TEX, drawBird } from './birdArt';
import type { BirdId } from '../logic/birds';
import type { ShoreKind } from '../levels/shore';
import { drawShore, SHORE_SIZE } from './shoreArt';
import { ART_RES, drawBubble, drawHook, drawPaper, drawRock, drawWeed, type WeedKind } from './propArt';
import { BEND_FROM_RATIO } from '../logic/bend';

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

/** Drawings that must keep a texture of their own: tiled paper, and the darkness, whose opaque edge is stretched across the screen. */
const OWN_TEXTURE = new Set(['paper', 'darkness']);

/**
 * Makes texture `key` (w×h px) unless it exists: from the art cache when the
 * drawing was saved on an earlier visit, else by running `draw`. Most land in
 * the shared atlas (see atlas.ts).
 */
function add(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  noteArt(key);
  if (scene.textures.exists(key)) return;
  const cached = takeArt(key);
  const source = cached && cached.width === w && cached.height === h ? cached : drawn(key, w, h, draw);
  if (OWN_TEXTURE.has(key) || !atlasOf(scene.game).place(key, source, w, h)) {
    if (source instanceof HTMLCanvasElement) scene.textures.addCanvas(key, source);
    else {
      const { canvas, ctx } = makeCanvas(w, h);
      ctx.drawImage(source, 0, 0);
      scene.textures.addCanvas(key, canvas);
    }
  }
  cached?.close();
}

function drawn(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(w, h);
  draw(ctx);
  rememberArt(key, canvas);
  return canvas;
}

/**
 * Generates every placeholder ink texture. When scanned pen drawings
 * arrive, load an atlas with the same keys instead and drop this call.
 */
export function generateInkTextures(scene: Phaser.Scene): void {
  for (let f = 0; f < BOIL_FRAMES; f++) {
    const seed = 101 + f * 977;
    const R = ART_RES;
    add(scene, boilKey('hook', f), 48 * R, 76 * R, (ctx) => drawHook(ctx, seed));
    for (const kind of ITEM_IDS) add(scene, boilKey(`item-${kind}`, f), ITEM_SIZE * R, ITEM_SIZE * R, (ctx) => drawItem(ctx, kind, seed));
    add(scene, boilKey('inkbottle', f), BOTTLE_SIZE * R, BOTTLE_SIZE * R, (ctx) => drawInkBottle(ctx, seed));
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
  add(scene, GLOW_KEY, GLOW_TEX, GLOW_TEX, drawSoftGlow);
  add(scene, 'paper', 512, 512, (ctx) => drawPaper(ctx, 512));
  for (const kind of BOAT_KINDS) add(scene, `boat-${kind}`, BOAT_SPEC[kind].w * ART_RES, BOAT_SPEC[kind].h * ART_RES, (ctx) => drawBoat(ctx, kind, 31));
  for (let i = 0; i < CLOUD_COUNT; i++) add(scene, cloudKey(i), CLOUD_SIZE.w * ART_RES, CLOUD_SIZE.h * ART_RES, (ctx) => drawCloud(ctx, 61 + i * 17));
}

const frameSeed = (f: number): number => 101 + f * 977;

/** The plain soft dot (see glowArt.ts). */
export const GLOW_KEY = 'glow';
export const fishGlowKey = (shape: FishShape): string => `fishglow-${shape}`;

/** The glow layer for a fish that carries lights; null for fish that don't glow. */
export function ensureFishGlow(scene: Phaser.Scene, shape: FishShape): string | null {
  const lights = fishLights(shape);
  if (lights.length === 0) return null;
  add(scene, fishGlowKey(shape), FISH_TEX, FISH_TEX, (ctx) => drawFishGlow(ctx, lights));
  return fishGlowKey(shape);
}

export const jellyKey = (kind: JellyId, frame: number): string => `jelly-${kind}-${frame}`;
export const jellyGlowKey = (kind: JellyId): string => `jellyglow-${kind}`;

/** Boil frames (and the glow layer, for glowing kinds) for the jellies a level uses. */
export function ensureJellyTextures(scene: Phaser.Scene, kinds: readonly JellyId[]): void {
  const side = JELLY_TEX * ART_RES;
  for (const kind of new Set(kinds)) {
    for (let f = 0; f < BOIL_FRAMES; f++) add(scene, jellyKey(kind, f), side, side, (ctx) => drawJellyKind(ctx, kind, f, frameSeed(f)));
    if (JELLY_INFO[kind].glow) add(scene, jellyGlowKey(kind), side, side, (ctx) => drawJellyGlow(ctx, kind));
  }
}

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
    if (isSquid(shape)) {
      ensureSquidTextures(scene, variants);
      continue;
    }
    for (const variant of variants) {
      for (let f = 0; f < BOIL_FRAMES; f++) {
        add(scene, fishKey(shape, variant, f), FISH_TEX, FISH_TEX, (ctx) => drawCreature(ctx, shape, variant, f, frameSeed(f)));
        addSwimFrames(scene, fishKey(shape, variant, f), shape);
      }
    }
  }
}

export type SquidPart = 'body' | 'arm' | 'tentacle' | 'fin';
export const squidKey = (part: SquidPart, variant: InkVariant, frame: number): string => `squid-${part}-${variant}-${frame}`;
export const SQUID_PUPIL_KEY = 'squid-pupil';

/** The giant squid: its portrait under the usual fish key, and the parts its rig moves in play. */
function ensureSquidTextures(scene: Phaser.Scene, variants: readonly InkVariant[]): void {
  const { body, limb, fin, pupil, portrait } = SQUID_TEX;
  for (const variant of variants) {
    for (let f = 0; f < BOIL_FRAMES; f++) {
      const seed = frameSeed(f);
      add(scene, fishKey('giantsquid', variant, f), portrait.w, portrait.h, (ctx) => drawSquidPortrait(ctx, variant, seed));
      add(scene, squidKey('body', variant, f), body.w, body.h, (ctx) => drawSquidBody(ctx, variant, seed));
      add(scene, squidKey('arm', variant, f), limb.w, limb.h, (ctx) => drawSquidLimb(ctx, 'arm', variant, seed + 11));
      add(scene, squidKey('tentacle', variant, f), limb.w, limb.h, (ctx) => drawSquidLimb(ctx, 'tentacle', variant, seed + 23));
      add(scene, squidKey('fin', variant, f), fin.w, fin.h, (ctx) => drawSquidFin(ctx, variant, seed + 37));
    }
  }
  add(scene, SQUID_PUPIL_KEY, pupil.w, pupil.h, drawSquidPupil);
}

/** The tail piece reaches this far under the body, so no gap opens at the hinge when it swings. */
const TAIL_OVERLAP = 5;

/**
 * Where a fish texture splits into body and swinging tail (px from the left),
 * just inside the tail stalk; null for fish that swim by bending the whole
 * body (eels, the oarfish), which keep a single image.
 */
export function tailCut(shape: FishShape): number | null {
  if (isCritter(shape) || isSquid(shape)) return null;
  const a = ANATOMY[shape];
  if (a.tail === 'point' || a.wave) return null;
  return Math.round(xAt(a, 1) + Math.max(5, a.hl * 0.08));
}

/**
 * Swims by bending its whole body (see scenes/game/bendRig.ts): a fish whose
 * tail tapers to a point, or one so long and thin that swinging only its tail
 * fin would leave a rigid stick. Crawlers and the squid have rigs of their own.
 */
export function bendsToSwim(shape: FishShape): boolean {
  if (isCritter(shape) || isSquid(shape)) return false;
  const a = ANATOMY[shape];
  return tailCut(shape) === null || a.hl / a.hh >= BEND_FROM_RATIO;
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
  // The drawing may sit anywhere in an atlas page.
  const at = originOf(tex);
  const body = tex.add('body', 0, at.x + cut, at.y, FISH_TEX - cut, FISH_TEX);
  const tail = tex.add('tail', 0, at.x, at.y, cut + TAIL_OVERLAP, FISH_TEX);
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
  const atlas = atlasOf(scene.game);
  for (const key of scene.textures.getTextureKeys()) {
    const shape = /^fish-(\w+)-(light|heavy)-\d+$/.exec(key)?.[1] as FishShape | undefined;
    if (!shape || kept.has(shape)) continue;
    if (atlas.has(key)) atlas.remove(key);
    else scene.textures.remove(key);
  }
}

/** Seabed scenery for a level (drawn on demand: only the kinds this level uses). */
export function ensureDecorTextures(scene: Phaser.Scene, kinds: readonly DecorId[]): void {
  for (const kind of kinds) {
    const { w, h } = DECOR_SIZE[kind];
    add(scene, `decor-${kind}`, w * ART_RES, h * ART_RES, (ctx) => drawDecor(ctx, kind, 101));
    if (isGlowDecor(kind)) add(scene, decorGlowKey(kind), w * ART_RES, h * ART_RES, (ctx) => drawDecorGlow(ctx, kind, 101));
  }
}

export const decorGlowKey = (kind: DecorId): string => `decorglow-${kind}`;
