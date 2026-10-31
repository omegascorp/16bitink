import type Phaser from 'phaser';
import { BOARD_TILE, paintBoard, paintGrassTile, paintRockTile, paintSkyTile } from '../art/board';
import { paintArmadillo } from '../art/armadillo';
import { paintGatePin } from '../art/gatePin';
import { paintSalamander } from '../art/salamander';
import { paintCrumb, paintRaft, paintRuby, paintSlab, RUBY_GLINTS } from '../art/volcanoBodies';
import { paintCinderTile, paintVolcanoRockTile, paintVolcanoSkyTile } from '../art/volcanoSurround';
import { LEDGE_T } from '../logic/ledges';
import { RAFT_HH, RAFT_HW } from '../logic/rafts';
import { RUBY_R } from '../logic/rubies';
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
import type { GuardAnimal, LedgeDef, LevelDef, PinDef, Ruin, VineDef } from '../logic/level';
import { ART_RES } from '../art/palette';

/** Every drawing baked into a texture once; later scenes reuse them. */
export const NIB_POSES: readonly NibPose[] = ['stand', 'walk0', 'walk1', 'walk2', 'walk3', 'swim', 'cheer'];
export const NIB_MARKS: readonly NibMark[] = ['soot', 'ink', 'tears', 'dizzy'];
export const COIN_TURNS = [0, 0.08, 0.2, 0.4] as const;

export const nibKey = (pose: NibPose, boil: number): string => `nib-${pose}-${boil}`;
export const shockKey = (mark: NibMark, boil: number): string => `nib-shock-${mark}-${boil}`;
/** A vine's texture, named by where it hangs: levels share nothing but the look. */
export const vineKey = (v: VineDef): string => `vine-${v.x}-${v.top}-${v.bottom}`;
/** A pin's texture, named by its size and kind: levels share pin ids (every level has its 'G'), never their pictures. */
export const pinKey = (pin: PinDef, lit: boolean): string => `pin-${pin.gate ? 'gate-' : ''}${Math.round(Math.hypot(pin.bx - pin.ax, pin.by - pin.ay))}-${pin.t}${lit ? '-lit' : ''}`;
/**
 * The kinds of guard: the boar, the spiky porcupine and the Great Boar (the
 * jungle's boss, painted this much bigger); the salamander, the armadillo
 * and the Old Salamander (the volcano's boss).
 */
export type GuardKind = 'boar' | 'porcupine' | 'boss' | 'salamander' | 'armadillo' | 'oldSalamander';
export const BOSS_SCALE = BOSS_R / BLOT_R;
export const guardKey = (kind: GuardKind, scared: boolean, boil: number): string => `guard-${kind}-${scared ? 'scared' : 'grump'}-${boil}`;

/** Which picture a guard gets: its animal, or its chapter's boss. */
export function guardKind(b: { readonly boss: boolean; readonly animal: GuardAnimal }): GuardKind {
  if (b.boss) return b.animal === 'salamander' ? 'oldSalamander' : 'boss';
  return b.animal;
}

/** The surroundings' tiles for a ruin: rock, sky and ground strip. */
export const surroundKeys = (ruin: Ruin): { rock: string; sky: string; ground: string } =>
  ruin === 'volcano' ? { rock: 'rock-tile-volcano', sky: 'sky-tile-volcano', ground: 'ground-tile-volcano' } : { rock: 'rock-tile', sky: 'sky-tile', ground: 'grass-tile' };
/** A slab's texture, by its width: ledges share nothing but the look. */
export const slabKey = (l: LedgeDef): string => `slab-${Math.round(l.x1 - l.x0)}`;
export const rubyKey = (glint: number): string => `ruby-${glint}`;

/** Paints a guard kind in one mood and boil frame. */
function paintGuard(kind: GuardKind, scared: boolean, boil: number): HTMLCanvasElement {
  const mood = scared ? 'scared' : 'grump';
  switch (kind) {
    case 'boar':
      return paintBoar(mood, boil);
    case 'porcupine':
      return paintPorcupine(mood, boil);
    case 'boss':
      return paintBoar(mood, boil, BOSS_SCALE, true);
    case 'salamander':
      return paintSalamander(mood, boil);
    case 'armadillo':
      return paintArmadillo(mood, boil);
    case 'oldSalamander':
      return paintSalamander(mood, boil, BOSS_SCALE, true);
  }
}

/** The chapter 1 guards, always baked; the others only for a level that has them. */
const JUNGLE_GUARDS: readonly GuardKind[] = ['boar', 'porcupine', 'boss'];

function levelGuards(level: LevelDef | undefined): GuardKind[] {
  const kinds = new Set<GuardKind>(JUNGLE_GUARDS);
  for (const b of level?.blots ?? []) kinds.add(guardKind({ boss: b.boss ?? false, animal: b.animal ?? (b.spiky ? 'porcupine' : 'boar') }));
  return [...kinds];
}

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
  const volcano = level?.ruin === 'volcano';
  if (volcano) {
    const keys = surroundKeys('volcano');
    add(keys.rock, paintVolcanoRockTile);
    add(keys.sky, paintVolcanoSkyTile);
    add(keys.ground, paintCinderTile);
  }
  const guards = levelGuards(level);
  for (let b = 0; b < BOIL; b++) {
    for (const pose of NIB_POSES) add(nibKey(pose, b), () => paintNib({ pose, mark: 'none', boil: b }));
    for (const mark of NIB_MARKS) add(shockKey(mark, b), () => paintNib({ pose: 'shock', mark, boil: b }));
    for (const scared of [false, true]) for (const kind of guards) add(guardKey(kind, scared, b), () => paintGuard(kind, scared, b));
  }
  add('boulder', () => paintBoulder(BOULDER_R));
  if (volcano) add('boulder-basalt', () => paintBoulder(BOULDER_R, true));
  if (level?.rafts?.length) add('raft', () => paintRaft(RAFT_HW, RAFT_HH));
  if (level?.rubies?.length) for (let g = 0; g < RUBY_GLINTS; g++) add(rubyKey(g), () => paintRuby(RUBY_R, g));
  if (level?.ledges?.length) add('crumb', paintCrumb);
  for (const l of level?.ledges ?? []) add(slabKey(l), () => paintSlab(l.x1 - l.x0, LEDGE_T * 2));
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
  add('dust', () => paintPuff('#a3968a'));
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
    const paint = pin.gate ? paintGatePin : paintPin;
    add(pinKey(pin, false), () => paint(len, pin.t, false));
    add(pinKey(pin, true), () => paint(len, pin.t, true));
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
