import { BOARD } from '../level/types';
import type { Rng } from './rng';

/** Windfalls that roll across the orchard: spit one for points and a charm. */
export const FRUIT_KINDS = ['apple', 'pear', 'plum'] as const;
export type FruitKind = (typeof FRUIT_KINDS)[number];

/** A new windfall about this often, s. */
export const FRUIT_EVERY = 10;
/** How fast it rolls, board px/s. */
export const FRUIT_SPEED = 80;
/** A shot this close to its centre hits it. */
export const FRUIT_HIT = 30;
/** Points for spitting one. */
export const FRUIT_POINTS = 100;

export interface Fruit {
  readonly id: number;
  readonly kind: FruitKind;
  x: number;
  readonly y: number;
  readonly vx: number;
}

/** A windfall rolling in from one side, somewhere between `top` and `bottom`. */
export function spawnFruit(rng: Rng, id: number, top: number, bottom: number): Fruit {
  const fromLeft = rng() < 0.5;
  return {
    id,
    kind: FRUIT_KINDS[Math.floor(rng() * FRUIT_KINDS.length)]!,
    x: fromLeft ? -FRUIT_HIT : BOARD.w + FRUIT_HIT,
    y: top + rng() * Math.max(0, bottom - top),
    vx: fromLeft ? FRUIT_SPEED : -FRUIT_SPEED,
  };
}

/** Rolls the fruit on; false once it has rolled off the far side. */
export function rollFruit(f: Fruit, dt: number): boolean {
  f.x += f.vx * dt;
  return f.vx > 0 ? f.x < BOARD.w + FRUIT_HIT * 2 : f.x > -FRUIT_HIT * 2;
}
