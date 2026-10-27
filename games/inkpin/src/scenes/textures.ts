import type Phaser from 'phaser';
import { paintBoard, paintGrassTile, paintRockTile, paintSkyTile } from '../art/board';
import { paintLantern, paintNib, paintSack, type NibMark, type NibPose } from '../art/nib';
import { BOIL } from '../art/palette';
import { COIN_SIZE, paintBlot, paintChest, paintCoin, paintFlame, paintGlow, paintIdol, paintPin, paintPuff } from '../art/props';
import type { LevelDef } from '../logic/level';
import { ART_RES } from '../art/palette';

/** Every drawing baked into a texture once; later scenes reuse them. */
export const NIB_POSES: readonly NibPose[] = ['stand', 'walk0', 'walk1', 'walk2', 'walk3', 'swim', 'cheer'];
export const NIB_MARKS: readonly NibMark[] = ['soot', 'ink', 'tears', 'dizzy'];
export const COIN_TURNS = [0, 0.35, 0.7, 0.9] as const;

export const nibKey = (pose: NibPose, boil: number): string => `nib-${pose}-${boil}`;
export const shockKey = (mark: NibMark, boil: number): string => `nib-shock-${mark}-${boil}`;
export const pinKey = (id: string, lit: boolean): string => `pin-${id}${lit ? '-lit' : ''}`;

export function bakeTextures(scene: Phaser.Scene, level: LevelDef): void {
  const tx = scene.textures;
  const add = (key: string, paint: () => HTMLCanvasElement): void => {
    if (!tx.exists(key)) tx.addCanvas(key, paint());
  };
  add(`board-${level.id}`, () => paintBoard(level));
  add('rock-tile', paintRockTile);
  add('sky-tile', paintSkyTile);
  add('grass-tile', paintGrassTile);
  for (let b = 0; b < BOIL; b++) {
    for (const pose of NIB_POSES) add(nibKey(pose, b), () => paintNib({ pose, mark: 'none', boil: b }));
    for (const mark of NIB_MARKS) add(shockKey(mark, b), () => paintNib({ pose: 'shock', mark, boil: b }));
    add(`blot-grump-${b}`, () => paintBlot('grump', b));
    add(`blot-scared-${b}`, () => paintBlot('scared', b));
  }
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
  for (const pin of level.pins) {
    const len = Math.hypot(pin.bx - pin.ax, pin.by - pin.ay);
    add(pinKey(pin.id, false), () => paintPin(len, pin.t, false));
    add(pinKey(pin.id, true), () => paintPin(len, pin.t, true));
  }
}
