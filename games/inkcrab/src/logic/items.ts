import type { Body, Box } from './body';
import { shellPx, SHELLS, type ShellKind } from './shells';

/** Anything the crab can pick up: food to eat, shells to move into. */
export type FoodKind = 'crumb' | 'hopper' | 'worm' | 'molecrab' | 'clam' | 'fish';

export const FOOD_KINDS: readonly FoodKind[] = ['crumb', 'hopper', 'worm', 'molecrab', 'clam', 'fish'];

export type ItemKind =
  | { readonly type: 'food'; readonly food: FoodKind; readonly points: number }
  | { readonly type: 'shell'; readonly shell: ShellKind };

export interface Item extends Body {
  readonly id: number;
  readonly kind: ItemKind;
  /** Inside the sand: shown as a faint highlighter smudge until dug out. */
  readonly buried: boolean;
}

/** A fish's worth depends on its size (see critterPoints); this is the smallest. */
export const FOOD_POINTS: Readonly<Record<FoodKind, number>> = { crumb: 1, hopper: 2, worm: 2, molecrab: 3, clam: 4, fish: 2 };

/** Tiles below the surface where mole crabs start to outnumber worms, and where clams begin. */
const SHALLOW = 4;
const DEEP = 8;

/**
 * What lives buried at a depth (tiles below the surface), for a roll in
 * 0..1: lugworms and hoppers near the top, mole crabs below them, clams
 * deepest, so digging further pays more.
 */
export function buriedFood(depth: number, roll: number): FoodKind {
  if (depth <= SHALLOW) return roll < 0.6 ? 'worm' : 'hopper';
  if (depth <= DEEP) return roll < 0.65 ? 'molecrab' : 'worm';
  return roll < 0.6 ? 'clam' : 'molecrab';
}

export function food(kind: FoodKind): ItemKind {
  return { type: 'food', food: kind, points: FOOD_POINTS[kind] };
}

export function shell(kind: ShellKind): ItemKind {
  return { type: 'shell', shell: kind };
}

export function itemSize(kind: ItemKind): { w: number; h: number } {
  if (kind.type === 'shell') {
    const px = shellPx(SHELLS[kind.shell].maxSize);
    return { w: px * 0.8, h: px * 0.6 };
  }
  return { crumb: { w: 8, h: 6 }, hopper: { w: 11, h: 7 }, worm: { w: 12, h: 6 }, molecrab: { w: 10, h: 8 }, clam: { w: 12, h: 9 }, fish: { w: 14, h: 7 } }[kind.food];
}

/** An item with its top-left at (x, y). */
export function makeItem(id: number, kind: ItemKind, x: number, y: number, buried: boolean): Item {
  return { id, kind, x, y, ...itemSize(kind), vx: 0, vy: 0, onGround: false, buried };
}

export function centre(b: Box): { x: number; y: number } {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

export function overlaps(a: Box, b: Box, pad = 0): boolean {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}
