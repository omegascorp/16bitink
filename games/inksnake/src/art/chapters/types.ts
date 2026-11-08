import type Phaser from 'phaser';
import type { World } from '../../logic/world';
import type { PlaceArt } from '../places/types';
import type { SnakeArt, SpriteArt } from '../types';

/**
 * A chapter's own layer over the board, for what changes as it's played
 * (sun patches drifting, bubbles rising, an eel's hole, a lure wiggling):
 * made when a level starts, updated every frame, destroyed with the level.
 * Depths: the board is 1, prey 2.6, the snake 3.4–3.6, cover 5, fliers 6,
 * night 6.8, words 7.
 */
export interface ChapterView {
  update(world: World, time: number, dt: number): void;
  destroy(): void;
}

/** What a pose picker sees of a critter. */
export interface PoseSubject {
  readonly mode: string;
  /** Seconds into its mode (enemies), or left in it (prey). */
  readonly age: number;
  readonly alt: number;
  readonly data?: Readonly<Record<string, number>>;
}

export type PosePicker = (c: PoseSubject, time: number) => string;

/** Two phases of a walk or run, `rate` steps a second. */
export const phase = (time: number, rate: number): 0 | 1 => (Math.floor((time / 1000) * rate) % 2 === 0 ? 0 : 1);

/**
 * What a chapter adds to the art: its snake, its place's boards, and its
 * critters (prey, enemies, boss) by kind, each with its own poses (the
 * chapter's views pick poses by name, see scenes/game/crittersView.ts).
 */
export interface ChapterArt {
  readonly snake?: SnakeArt;
  readonly place?: PlaceArt;
  readonly critters?: Readonly<Record<string, SpriteArt>>;
  /** Its rival snakes' drawings, by enemy kind (drawn like the player's snake). */
  readonly rivals?: Readonly<Record<string, SnakeArt>>;
  /**
   * How each of its critters picks a pose from what it's doing, when the
   * shared rules (scenes/game/crittersView.ts) don't cover it: given the
   * critter (its mode, seconds in that mode, a prey's own data) and the
   * time in ms. A pose the art doesn't have falls back to its first.
   */
  readonly poseOf?: Readonly<Record<string, PosePicker>>;
  /** Its own layer over the board (see ChapterView), if it needs one. */
  readonly view?: (scene: Phaser.Scene, world: World) => ChapterView;
}
