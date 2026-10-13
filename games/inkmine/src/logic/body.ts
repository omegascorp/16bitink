import { isSolid, type Terrain } from './terrain';

/** Physics for the prospector and loose pieces: an axis-aligned box on the tile grid (after InkCrab's). */
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
  maxFall: 520,
  /** px/s a body standing with its middle over a drop slides off the edge. */
  slip: 90,
} as const;

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
    const size = axis === 'x' ? box.w : box.h;
    const edge = d > 0 ? Math.floor((box[axis] + size + d) / tile) * tile - size : Math.ceil((box[axis] + d) / tile) * tile;
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
 * One physics step: walk with `intent` (-1..1) at `speed` px/s, fall, and
 * step up a one-tile ledge when walking into it on the ground.
 */
export function moveBody(t: Terrain, b: Body, intent: number, speed: number, dt: number, tile: number): Body {
  const vx = intent * speed;
  let box: Box = b;
  const dx = vx * dt;
  if (dx !== 0) {
    const flat = sweep(t, box, 'x', dx, tile);
    box = flat.box;
    if (flat.hit && b.onGround) {
      for (let lift = 1; lift <= tile; lift += 1) {
        const up = { ...b, y: b.y - lift, x: b.x + dx };
        if (!boxHitsSolid(t, up, tile) && !boxHitsSolid(t, { ...b, y: b.y - lift }, tile)) {
          box = up;
          break;
        }
      }
    }
  }
  const vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt);
  const fall = sweep(t, box, 'y', vy * dt, tile);
  const onGround = fall.hit && vy > 0;
  const landed = onGround ? slipOff(t, fall.box, intent, dt, tile) : fall.box;
  return { ...landed, vx, vy: fall.hit ? 0 : vy, onGround };
}

/** Climbing a ladder: moves in any direction at `speed` px/s with no gravity, never into solid ground. */
export function climbBody(t: Terrain, b: Body, ix: number, iy: number, speed: number, dt: number, tile: number): Body {
  const across = sweep(t, b, 'x', ix * speed * dt, tile).box;
  const down = sweep(t, across, 'y', iy * speed * dt, tile);
  return { ...b, ...down.box, vx: ix * speed, vy: 0, onGround: down.hit && iy > 0 };
}

/**
 * A body resting on a corner by a sliver, with its middle over a drop,
 * slides off the edge rather than hanging in the air. Walking back onto the
 * ledge holds it there, so stepping up still works.
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
