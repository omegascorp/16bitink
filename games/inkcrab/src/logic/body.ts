import { isSolid, type Terrain } from './terrain';

/** Physics for crabs and loose items: an axis-aligned box on the tile grid. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Body extends Box {
  readonly vx: number;
  readonly vy: number;
  readonly onGround: boolean;
}

export const PHYS = {
  gravity: 900,
  maxFall: 420,
  /** Ledges up to this many tiles (or about half the body) are walked up. */
  stepTiles: 1,
  /** px/s a body standing with its middle over a drop slides off the edge. */
  slip: 90,
} as const;

/** What a body moves through: air, or water (gentler fall). */
export interface Medium {
  readonly gravity: number;
  readonly maxFall: number;
}

export const AIR: Medium = { gravity: PHYS.gravity, maxFall: PHYS.maxFall };
/** Underwater things sink slowly. */
export const WATER: Medium = { gravity: PHYS.gravity * 0.35, maxFall: PHYS.maxFall * 0.3 };

const EPS = 1e-6;

export function boxHitsSolid(t: Terrain, b: Box, tile: number): boolean {
  const x0 = Math.floor(b.x / tile);
  const x1 = Math.floor((b.x + b.w - EPS) / tile);
  const y0 = Math.floor(b.y / tile);
  const y1 = Math.floor((b.y + b.h - EPS) / tile);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (isSolid(t, x, y)) return true;
  return false;
}

/** Moves `dist` along one axis in sub-tile steps, stopping flush against the first solid tile. */
function sweep(t: Terrain, b: Box, axis: 'x' | 'y', dist: number, tile: number): { box: Box; hit: boolean } {
  const stepLen = tile / 4;
  let box = b;
  let left = dist;
  while (Math.abs(left) > EPS) {
    const d = Math.sign(left) * Math.min(stepLen, Math.abs(left));
    const next = { ...box, [axis]: box[axis] + d };
    if (!boxHitsSolid(t, next, tile)) {
      box = next;
      left -= d;
      continue;
    }
    // Snap flush to the tile boundary we ran into.
    const edge = d > 0
      ? Math.floor((box[axis] + (axis === 'x' ? box.w : box.h) + d) / tile) * tile - (axis === 'x' ? box.w : box.h)
      : Math.ceil((box[axis] + d) / tile) * tile;
    const flush = { ...box, [axis]: edge };
    return { box: boxHitsSolid(t, flush, tile) ? box : flush, hit: true };
  }
  return { box, hit: false };
}

/** Leaps upward at `speed` px/s; only from the ground. */
export function jump(b: Body, speed: number): Body {
  return b.onGround ? { ...b, vy: -speed, onGround: false } : b;
}

/**
 * One-way tiles a body can stand on from above but passes through from
 * below and the sides: the tops of mangrove roots (see roots.ts).
 */
export type Ledge = (x: number, y: number) => boolean;

/**
 * One physics step: walk with `intent` (-1..1) at `speed` px/s, fall, step up
 * small ledges. With `ledge`, a falling body lands on the tops of those tiles too.
 */
export function moveBody(t: Terrain, b: Body, intent: number, speed: number, dt: number, tile: number, medium: Medium = AIR, ledge?: Ledge): Body {
  const vx = intent * speed;
  let box: Box = b;
  const dx = vx * dt;
  if (dx !== 0) {
    const flat = sweep(t, box, 'x', dx, tile);
    box = flat.box;
    if (flat.hit && b.onGround) {
      const maxStep = Math.max(tile * PHYS.stepTiles, b.h * 0.5);
      for (let lift = 1; lift <= maxStep; lift += 1) {
        const up = { ...b, y: b.y - lift, x: b.x + dx };
        if (!boxHitsSolid(t, up, tile) && !boxHitsSolid(t, { ...b, y: b.y - lift }, tile)) {
          box = up;
          break;
        }
      }
    }
    if (ledge && b.onGround) box = stepOntoLedge(t, box, ledge, tile);
  }
  const vy = Math.min(medium.maxFall, b.vy + medium.gravity * dt);
  const fall = sweep(t, box, 'y', vy * dt, tile);
  const top = ledge && vy > 0 ? ledgeCrossed(box, fall.box, ledge, tile) : null;
  if (top !== null) return { ...fall.box, y: top - b.h, vx, vy: 0, onGround: true };
  const onGround = fall.hit && vy > 0;
  const landed = onGround ? slipOff(t, fall.box, intent, dt, tile) : fall.box;
  return { ...landed, vx, vy: fall.hit ? 0 : vy, onGround };
}

/**
 * Climbing: moves in any direction at `speed` px/s with no gravity (holding
 * on), never into solid ground. It stands once it climbs down onto some.
 */
export function climbBody(t: Terrain, b: Body, ix: number, iy: number, speed: number, dt: number, tile: number): Body {
  const across = sweep(t, b, 'x', ix * speed * dt, tile).box;
  const down = sweep(t, across, 'y', iy * speed * dt, tile);
  return { ...b, ...down.box, vx: ix * speed, vy: 0, onGround: down.hit && iy > 0 };
}

/** Columns a body stands on a ledge with: its middle half, so it never hangs off a root by a sliver. */
function ledgeColumns(b: Box, tile: number): { x0: number; x1: number } {
  return { x0: Math.floor((b.x + b.w / 4) / tile), x1: Math.floor((b.x + (b.w * 3) / 4 - EPS) / tile) };
}

/** The highest ledge top (world y) the body's feet pass on the way from `from` down to `to`, or null. */
function ledgeCrossed(from: Box, to: Box, ledge: Ledge, tile: number): number | null {
  const before = from.y + from.h;
  const after = to.y + to.h;
  const { x0, x1 } = ledgeColumns(to, tile);
  for (let y = Math.ceil((before - EPS) / tile); y * tile <= after; y++) {
    for (let x = x0; x <= x1; x++) if (ledge(x, y)) return y * tile;
  }
  return null;
}

/** Walking onto a ledge a little above the feet (up to half the body's height): up onto it, as onto a low step. */
function stepOntoLedge(t: Terrain, b: Box, ledge: Ledge, tile: number): Box {
  const feet = b.y + b.h;
  const { x0, x1 } = ledgeColumns(b, tile);
  for (let y = Math.ceil((feet - Math.min(tile, b.h * 0.5)) / tile); y * tile < feet - EPS; y++) {
    for (let x = x0; x <= x1; x++) {
      const up = { ...b, y: y * tile - b.h };
      if (ledge(x, y) && !boxHitsSolid(t, up, tile)) return up;
    }
  }
  return b;
}

/**
 * A body resting on a corner by a sliver, with its middle over a drop,
 * slides off the edge rather than hanging in the air (the inked sand
 * rounds such corners off). Walking back onto the ledge holds it there, so
 * stepping up still works; bridging a hole narrower than itself is fine.
 */
function slipOff(t: Terrain, b: Box, intent: number, dt: number, tile: number): Box {
  const row = Math.floor((b.y + b.h + EPS) / tile);
  if (isSolid(t, Math.floor((b.x + b.w / 2) / tile), row)) return b;
  const left = isSolid(t, Math.floor(b.x / tile), row);
  const right = isSolid(t, Math.floor((b.x + b.w - EPS) / tile), row);
  if (left === right) return b;
  const away = left ? 1 : -1;
  if (intent * away < 0) return b;
  return sweep(t, b, 'x', away * PHYS.slip * dt, tile).box;
}
