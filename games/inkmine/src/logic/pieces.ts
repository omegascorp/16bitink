import { moveBody, type Body, type Box } from './body';
import { foldX, ringDelta, type Terrain } from './terrain';

/**
 * Loose pieces of ore, broken out of the rock by the drill or a blast. They
 * fall and come to rest; near the prospector they fly to the bag, if
 * there's room. Left lying (a full bag), they stay, and are saved with the
 * world (worldSave.ts), so they're there when you come back.
 */
export interface Piece extends Body {
  readonly id: number;
  readonly ore: number;
}

export const PIECE = {
  size: 12,
  /** Px from the prospector's middle within which a piece flies to them. */
  magnet: 52,
  /** Px/s it flies at. */
  flySpeed: 340,
  /** Px within which it's caught. */
  catch: 14,
} as const;

let nextId = 1;

export function newPiece(ore: number, cx: number, cy: number): Piece {
  const s = PIECE.size;
  return { id: nextId++, ore, x: cx - s / 2, y: cy - s / 2, w: s, h: s, vx: 0, vy: -60, onGround: false };
}

/** A piece put back where it was left (worldSave.ts): resting on the floor of tile (col, row), still. */
export function restingPiece(ore: number, col: number, row: number, tile: number, worldCols: number): Piece {
  const s = PIECE.size;
  const c = ((col % worldCols) + worldCols) % worldCols;
  return { id: nextId++, ore, x: (c + 0.5) * tile - s / 2, y: (row + 1) * tile - s, w: s, h: s, vx: 0, vy: 0, onGround: true };
}

const centre = (b: Box): { x: number; y: number } => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** From `a`'s middle to `b`'s, the short way round a wrapping world. */
export function between(t: Terrain, a: Box, b: Box, tile: number): { dx: number; dy: number; d: number } {
  const ca = centre(a);
  const cb = centre(b);
  const dx = ringDelta(t, ca.x, cb.x, tile);
  const dy = cb.y - ca.y;
  return { dx, dy, d: Math.hypot(dx, dy) };
}

/** One step for a piece: flying to `catcher` when it's near and has room, otherwise falling. Kept folded into a wrapping world. */
export function stepPiece(t: Terrain, p: Piece, catcher: Box | null, dt: number, tile: number): Piece {
  const next = flyOrFall(t, p, catcher, dt, tile);
  return { ...next, x: foldX(t, next.x, tile) };
}

function flyOrFall(t: Terrain, p: Piece, catcher: Box | null, dt: number, tile: number): Piece {
  if (catcher) {
    const { dx, dy, d } = between(t, p, catcher, tile);
    if (d < PIECE.magnet) {
      const k = Math.min(1, (PIECE.flySpeed * dt) / Math.max(d, 1e-6));
      return { ...p, x: p.x + dx * k, y: p.y + dy * k, vx: 0, vy: 0, onGround: false };
    }
  }
  return { ...moveBody(t, p, 0, 0, dt, tile), id: p.id, ore: p.ore };
}

/** Whether `catcher` has caught the piece. */
export function caught(t: Terrain, p: Piece, catcher: Box, tile: number): boolean {
  return between(t, p, catcher, tile).d < PIECE.catch;
}
