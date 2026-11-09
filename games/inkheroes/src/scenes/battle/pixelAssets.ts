import Phaser from 'phaser';
import { BATTLE_BG, HERO_ART, OBSTACLE_ART, UNIT_ART, type Pose, type StillArt, type UnitArt } from '../../art/pixel/manifest';
import { SCENERY } from '../../art/pixel/scenery';
import { figureArt, type FigureArt } from './standIns';
import type { BackdropSource } from './pixelBackdrop';
import type { PixelBuffer, Rgba } from './pixelRaster';
import { drawBadge } from './pixelRaster';
import { loadUiFont } from './pixelFont';
import { siegeArt } from './siegeView';
import { loadUiArt, texturePixels } from './pixelUi';
import { FACE, faceBox } from './pixelFaces';
import type { Pixels } from './pixelScenery';
import { heroArtId } from './heroArtId';

/**
 * The pixel battle's textures: the manifest's PNG strips and backgrounds
 * (loaded on demand, kept for the next battle) and the few tiny ones drawn
 * in code (projectiles, count badges, a stand-in rock). Every one is
 * filtered NEAREST, so a zoomed pixel stays a crisp square.
 */

export const POSES: readonly Pose[] = ['idle', 'walk', 'attack'];

export const PX_TEX = {
  unit: (id: string, pose: Pose) => `px-unit-${id}-${pose}`,
  hero: (id: string, pose: Pose) => `px-hero-${id}-${pose}`,
  bg: (terrain: string) => `px-bg-${terrain}`,
  scenery: (terrain: string) => `px-scenery-${terrain}`,
  obstacle: (kind: string) => `px-ob-${kind}`,
  badge: (side: number, n: number) => `px-badge-${side}-${n}`,
  stone: 'px-shot-stone',
  arrow: 'px-shot-arrow',
  rock: 'px-ob-fallback-rock',
} as const;

/** A unit's battle art: its own; a stand-in's, tinted (standIns.ts); or (an upgrade not drawn yet) its line's base unit's. Never missing. */
export const unitArt = (id: string): FigureArt => figureArt(id);

/** The square of an idle strip's first frame round the art's face point (see faceBox), `size` across. */
export function faceOf(scene: Phaser.Scene, key: string, art: UnitArt, size: number = FACE): Pixels {
  return texturePixels(scene, key, faceBox(art, size));
}

/**
 * A hero's art: the rival lord's (by his id when he has art of his own,
 * `HERO_ART.sethi`, else 'rival', Kassander), or a hero of the player's, by
 * their id when that hero has art of their own (`HERO_ART.ianthe`,
 * `HERO_ART.nyktimos`), else their class's: a Cleric Ianthe's, a Knight the
 * player's first hero's ('player', Rowan). Anything missing falls back to it.
 */
export function heroArt(who: 'player' | 'rival' = 'player', heroId?: string): { id: string; art: UnitArt } {
  const id = heroArtId(Object.keys(HERO_ART), who, heroId);
  return { id, art: HERO_ART[id]! };
}

export { heroArtId };

/** Every hero drawn, for the loaders: each one's poses come in with the rest. */
export const HERO_IDS: readonly string[] = Object.keys(HERO_ART);

/** The terrain a battle's backdrop is drawn for (water and anything unknown fight on grass). */
function backdropTerrain(terrain: string): string {
  return SCENERY[terrain] || BATTLE_BG[terrain] ? terrain : 'grass';
}

/** What a battle's backdrop is made from: the terrain's scenery parts when it has them, else its painting. */
export function backdropSource(terrain: string, seed: number): BackdropSource {
  const t = backdropTerrain(terrain);
  const scenery = SCENERY[t];
  return scenery ? { scenery, atlasKey: PX_TEX.scenery(t), seed } : { paintingKey: PX_TEX.bg(t) };
}

export function nearest(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** Loads what a battle needs and isn't loaded yet; resolves once every texture is in and filtered NEAREST. */
export function loadBattleArt(scene: Phaser.Scene, creatures: readonly string[], terrain: string, siege = false): Promise<void> {
  const keys: string[] = [];
  const sheet = (key: string, url: string, art: UnitArt): void => {
    keys.push(key);
    if (!scene.textures.exists(key)) scene.load.spritesheet(key, url, { frameWidth: art.w, frameHeight: art.h });
  };
  const image = (key: string, url: string): void => {
    keys.push(key);
    if (!scene.textures.exists(key)) scene.load.image(key, url);
  };
  for (const id of new Set(creatures)) {
    const art = unitArt(id);
    for (const pose of POSES) sheet(PX_TEX.unit(id, pose), art.url[pose], art);
  }
  for (const id of HERO_IDS) {
    const art = HERO_ART[id]!;
    for (const pose of POSES) sheet(PX_TEX.hero(id, pose), art.url[pose], art);
  }
  const bg = backdropTerrain(terrain);
  if (SCENERY[bg]) image(PX_TEX.scenery(bg), SCENERY[bg]!.url);
  else image(PX_TEX.bg(bg), BATTLE_BG[bg]!);
  for (const [kind, art] of Object.entries(OBSTACLE_ART)) image(PX_TEX.obstacle(kind), art.url);
  if (siege) for (const { key, url } of siegeArt()) image(key, url);
  keys.push(...loadUiArt(scene));
  makeCodeTextures(scene);
  const done = (): void => keys.forEach((k) => nearest(scene, k));
  // The UI's pixel font loads beside the textures; a failure leaves the fallback face, not a stuck battle.
  const font = loadUiFont().catch((e: unknown) => console.warn('battle UI font failed to load', e));
  if (!scene.load.list.size) {
    done();
    return font;
  }
  const art = new Promise<void>((resolve) => {
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      done();
      resolve();
    });
    scene.load.start();
  });
  return Promise.all([art, font]).then(() => undefined);
}

/** A texture from a pixel buffer (replacing one of the same key). */
export function bufferTexture(scene: Phaser.Scene, key: string, b: PixelBuffer): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, b.w, b.h)!;
  tex.context.putImageData(new ImageData(new Uint8ClampedArray(b.data), b.w, b.h), 0, 0);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** Draws `rows` (one string a row, a character per pixel keyed into `ink`; '.' is clear) as a texture. */
function glyphTexture(scene: Phaser.Scene, key: string, rows: readonly string[], ink: Readonly<Record<string, string>>): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, rows[0]!.length, rows.length)!;
  const ctx = tex.context;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = ink[ch];
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  }));
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** The slinger's stone, the centaur's arrow (pointing right) and a rock for obstacles without art yet. */
function makeCodeTextures(scene: Phaser.Scene): void {
  glyphTexture(scene, PX_TEX.stone, ['.a.', 'abc', '.c.'], { a: '#c9c2b4', b: '#9a9284', c: '#5f584e' });
  glyphTexture(scene, PX_TEX.arrow, ['ff.....h..', 'sssssssshh', 'ff.....h..'], { f: '#ece4d2', s: '#a07c4c', h: '#d6d6d0' });
  glyphTexture(scene, PX_TEX.rock, [
    '......dddddd........',
    '....ddbbbbbbdd......',
    '...dbbaaabbbbcdd....',
    '..dbaaaabbbbbbccd...',
    '.dbbaabbbbbbbbcccdd.',
    'dbbbbbbbbbbbbccccccd',
    'dcbbbbbbbbbccccccccd',
    'dccbbbbbcccccccccccd',
    '.dcccccccccccccccdd.',
    '..ddddddddddddddd...',
  ], { a: '#c8c0ae', b: '#9b9384', c: '#6e675b', d: '#2e2a24' });
}

/** The stand-in rock's feet: the middle of its bottom row. */
export const ROCK_FEET = { x: 10, y: 9 } as const;

/** The still standing on an obstacle hex: the manifest's rock or tree when there, else the stand-in rock. */
export function obstacleArt(wantTree: boolean): { key: string; footX: number; footY: number } {
  const pick: StillArt | undefined = (wantTree ? OBSTACLE_ART.tree : OBSTACLE_ART.rock) ?? OBSTACLE_ART.rock ?? OBSTACLE_ART.tree;
  if (!pick) return { key: PX_TEX.rock, footX: ROCK_FEET.x, footY: ROCK_FEET.y };
  const kind = pick === OBSTACLE_ART.tree ? 'tree' : 'rock';
  return { key: PX_TEX.obstacle(kind), footX: pick.footX, footY: pick.footY };
}

/** Badge colours by side: the player's navy, the neutral (or rival) brown-gold. */
const BADGE_COLOURS: readonly { fill: Rgba; top: Rgba }[] = [
  { fill: [54, 74, 150, 255], top: [150, 175, 235, 255] },
  { fill: [150, 105, 30, 255], top: [240, 200, 110, 255] },
];

/** The badge texture for side `side` showing `n`, drawn the first time it's needed. */
export function badgeTexture(scene: Phaser.Scene, side: number, n: number): string {
  const key = PX_TEX.badge(side, n);
  if (!scene.textures.exists(key)) bufferTexture(scene, key, drawBadge(n, BADGE_COLOURS[side === 0 ? 0 : 1]!));
  return key;
}
