import type Phaser from 'phaser';
import { BOARD_TILE, paintBoard, paintGrassTile, paintRockTile, paintSkyTile } from '../art/board';
import { paintLantern, paintNib, paintSack, type NibMark, type NibPose } from '../art/nib';
import { BOIL } from '../art/palette';
import { paintBoar } from '../art/boar';
import { paintBoulder } from '../art/boulder';
import { paintCrate } from '../art/crate';
import { paintSeed, paintVine } from '../art/vine';
import { paintPorcupine } from '../art/porcupine';
import { BOULDER_R } from '../logic/boulders';
import { BLOT_R, BOSS_R } from '../logic/world';
import { COIN_SIZE, paintChest, paintCoin, paintFlame, paintGlow, paintHeart, paintIdol, paintPin, paintPuff } from '../art/props';
import type { LevelDef, PinDef, VineDef } from '../logic/level';
import { ART_RES } from '../art/palette';

/** Every drawing baked into a texture once; later scenes reuse them. */
export const NIB_POSES: readonly NibPose[] = ['stand', 'walk0', 'walk1', 'walk2', 'walk3', 'swim', 'cheer'];
export const NIB_MARKS: readonly NibMark[] = ['soot', 'ink', 'tears', 'dizzy'];
export const COIN_TURNS = [0, 0.08, 0.2, 0.4] as const;

export const nibKey = (pose: NibPose, boil: number): string => `nib-${pose}-${boil}`;
export const shockKey = (mark: NibMark, boil: number): string => `nib-shock-${mark}-${boil}`;
/** A vine's texture, named by where it hangs: levels share nothing but the look. */
export const vineKey = (v: VineDef): string => `vine-${v.x}-${v.top}-${v.bottom}`;
/** A pin's texture, named by its size: levels share pin ids (every level has its 'G'), never their pictures. */
export const pinKey = (pin: PinDef, lit: boolean): string => `pin-${Math.round(Math.hypot(pin.bx - pin.ax, pin.by - pin.ay))}-${pin.t}${lit ? '-lit' : ''}`;
/** The kinds of guard: the boar, the spiky porcupine, and the Great Boar (the boss, painted this much bigger). */
export type GuardKind = 'boar' | 'porcupine' | 'boss';
export const BOSS_SCALE = BOSS_R / BLOT_R;
export const guardKey = (kind: GuardKind, scared: boolean, boil: number): string => `guard-${kind}-${scared ? 'scared' : 'grump'}-${boil}`;

/** Bakes the shared drawings, and the level's board and pins when there's a level (the map has none). */
export function bakeTextures(scene: Phaser.Scene, level?: LevelDef): void {
  const tx = scene.textures;
  const add = (key: string, paint: () => HTMLCanvasElement): void => {
    if (!tx.exists(key)) tx.addCanvas(key, paint());
  };
  if (level) bakeBoard(scene, level);
  add('rock-tile', paintRockTile);
  add('sky-tile', paintSkyTile);
  add('grass-tile', paintGrassTile);
  for (let b = 0; b < BOIL; b++) {
    for (const pose of NIB_POSES) add(nibKey(pose, b), () => paintNib({ pose, mark: 'none', boil: b }));
    for (const mark of NIB_MARKS) add(shockKey(mark, b), () => paintNib({ pose: 'shock', mark, boil: b }));
    for (const scared of [false, true]) {
      const mood = scared ? 'scared' : 'grump';
      add(guardKey('boar', scared, b), () => paintBoar(mood, b));
      add(guardKey('porcupine', scared, b), () => paintPorcupine(mood, b));
      add(guardKey('boss', scared, b), () => paintBoar(mood, b, BOSS_SCALE, true));
    }
  }
  add('boulder', () => paintBoulder(BOULDER_R));
  add('crate', () => paintCrate(BOULDER_R));
  add('seed', paintSeed);
  add('heart', () => paintHeart(true));
  add('heart-empty', () => paintHeart(false));
  add('sack', paintSack);
  add('lantern', () => paintLantern(true));
  add('chest-closed', () => paintChest(false));
  add('chest-open', () => paintChest(true));
  for (let f = 0; f < 3; f++) add(`flame-${f}`, () => paintFlame(f));
  add('glow', paintGlow);
  add('idol', paintIdol);
  add('steam', () => paintPuff('#ffffff'));
  add('smoke', () => paintPuff('#5f5a63'));
  if (!tx.exists('coins')) {
    // One strip of coins at different turns, as frames for the coin blitter.
    const strip = document.createElement('canvas');
    const cell = COIN_SIZE * ART_RES;
    strip.width = cell * COIN_TURNS.length;
    strip.height = cell;
    const ctx = strip.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    COIN_TURNS.forEach((t, i) => ctx.drawImage(paintCoin(t), i * cell, 0));
    const tex = tx.addCanvas('coins', strip);
    COIN_TURNS.forEach((_, i) => tex?.add(i, 0, i * cell, 0, cell, cell));
  }
  (level?.vines ?? []).forEach((v, i) => add(vineKey(v), () => paintVine(v, i)));
  for (const pin of level?.pins ?? []) {
    const len = Math.hypot(pin.bx - pin.ax, pin.by - pin.ay);
    add(pinKey(pin, false), () => paintPin(len, pin.t, false));
    add(pinKey(pin, true), () => paintPin(len, pin.t, true));
  }
}

/** A level's board tiles: each one's texture key and left edge (board px). */
export interface BoardTile {
  readonly key: string;
  readonly x: number;
  readonly w: number;
}

/** The level's painted board, in tiles, once: the map's level card shows it, and the level starts on it. */
export function bakeBoard(scene: Phaser.Scene, level: LevelDef): BoardTile[] {
  const { view } = level;
  const tiles: BoardTile[] = [];
  for (let x = view.x, i = 0; x < view.x + view.w; x += BOARD_TILE, i++) {
    const w = Math.min(BOARD_TILE, view.x + view.w - x);
    const key = `board-${level.id}-${i}`;
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, paintBoard(level, x, w));
    tiles.push({ key, x, w });
  }
  return tiles;
}
