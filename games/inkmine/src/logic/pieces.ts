import { moveBody, type Body, type Box } from './body';
import type { Terrain } from './terrain';

/**
 * Loose pieces of ore, broken out of the rock by the drill or a blast. They
 * fall and come to rest; near the prospector they fly to the bag, if
 * there's room.
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

const centre = (b: Box): { x: number; y: number } => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** One step for a piece: flying to `catcher` when it's near and has room, otherwise falling. */
export function stepPiece(t: Terrain, p: Piece, catcher: Box | null, dt: number, tile: number): Piece {
  if (catcher) {
    const a = centre(p);
    const b = centre(catcher);
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d < PIECE.magnet) {
      const k = Math.min(1, (PIECE.flySpeed * dt) / Math.max(d, 1e-6));
      return { ...p, x: p.x + (b.x - a.x) * k, y: p.y + (b.y - a.y) * k, vx: 0, vy: 0, onGround: false };
    }
  }
  return { ...moveBody(t, p, 0, 0, dt, tile), id: p.id, ore: p.ore };
}

/** Whether `catcher` has caught the piece. */
export function caught(p: Piece, catcher: Box): boolean {
  const a = centre(p);
  const b = centre(catcher);
  return Math.hypot(b.x - a.x, b.y - a.y) < PIECE.catch;
}
