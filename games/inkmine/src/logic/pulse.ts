import { foldX, isSolid, type Terrain } from './terrain';

/**
 * The pulse (spec, "Weapons"): the Aster's wrist resonator, rebuilt your
 * way, your first weapon. It throws a ring of force in a straight line, the
 * way you face, or up or down while you hold them. Rock stops it: it never
 * breaks the ground, so it's no drill. Each shot draws on the drill's cell.
 */
export const PULSE = {
  /** Seconds between shots. */
  cooldown: 0.45,
  /** Px a second the ring flies. */
  speed: 560,
  /** Tiles it carries before it fades. */
  range: 7,
  /** Cell energy a shot costs. */
  energy: 2,
  /** The ring's hit box, px across. */
  size: 14,
} as const;

/** A ring of force in flight: its middle, its direction (a unit step) and how far it's gone, px. */
export interface Shot {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  readonly travelled: number;
}

let nextShot = 1;

export function newShot(x: number, y: number, dx: number, dy: number): Shot {
  const len = Math.hypot(dx, dy) || 1;
  return { id: nextShot++, x, y, dx: dx / len, dy: dy / len, travelled: 0 };
}

/** The shot `dt` s on, or null once it hits rock or runs out of range. Moved in short hops, so it can't skip through a thin wall. */
export function stepShot(t: Terrain, s: Shot, dt: number, tile: number): Shot | null {
  let { x, y, travelled } = s;
  let left = PULSE.speed * dt;
  while (left > 0) {
    const hop = Math.min(left, tile / 4);
    x += s.dx * hop;
    y += s.dy * hop;
    travelled += hop;
    left -= hop;
    if (isSolid(t, Math.floor(x / tile), Math.floor(y / tile)) || travelled > PULSE.range * tile) return null;
  }
  return { ...s, x: foldX(t, x, tile), y, travelled };
}
