import { boxHitsSolid, type Box } from './body';
import { centre } from './items';
import { shellPx } from './shells';
import { surfaceRow, type Terrain } from './terrain';

/**
 * Hunters from the sky. A kestrel patrols high over the beach; spotting a
 * crab out in the open, it hovers over it (its red shadow on the sand
 * says where), then stoops. A crab under a roof of sand is out of reach,
 * and the kestrel soon gives up on it. One hidden in its shell takes the
 * stoop on its shell unharmed, and the kestrel flies off. Like every hunter it only goes after smaller crabs,
 * so growing past it ends the threat. Birds are never food.
 */
export type BirdSpecies = 'kestrel';
export type BirdPhase = 'patrol' | 'hover' | 'dive' | 'climb';

export interface Bird extends Box {
  readonly id: number;
  readonly species: BirdSpecies;
  readonly size: number;
  readonly phase: BirdPhase;
  readonly dir: 1 | -1;
  /** Seconds spent hovering squarely over the crab: it stoops when this reaches BIRD.hoverFor. */
  readonly lock: number;
  /** Seconds hovering with the crab out of sight (under cover): it gives up at BIRD.waitFor. */
  readonly wait: number;
  /** Seconds it won't hunt (after a stoop, or giving up). */
  readonly bored: number;
  /** World x it hovers over and stoops at. */
  readonly aimX: number;
}

/** What a bird knows about the player. */
export interface SkyQuarry {
  readonly box: Box;
  readonly size: number;
  readonly hidden: boolean;
  /** Nothing between it and the sky. */
  readonly open: boolean;
}

export const BIRD = {
  /** Patrol height, tiles above the highest ground. */
  patrolTiles: 7,
  /** Hover height, tiles above the crab's back: low enough to stay on screen. */
  hoverTiles: 3.5,
  /** How far to either side (tiles) a patrolling bird spots a crab. */
  sight: 10,
  patrolSpeed: 85,
  hoverSpeed: 105,
  diveSpeed: 330,
  climbSpeed: 130,
  /** Seconds squarely overhead before it stoops: the warning, long enough to hide or dig in. */
  hoverFor: 1.8,
  /** Seconds it waits over a crab gone under cover before giving up. */
  waitFor: 1.5,
  /** Seconds it leaves crabs alone after a stoop or giving up. */
  boredFor: 4,
} as const;

export function birdBox(size: number): { w: number; h: number } {
  const px = shellPx(size);
  return { w: px * 1.3, h: px * 0.6 };
}

export function makeBird(id: number, size: number, x: number, y: number, dir: 1 | -1, species: BirdSpecies = 'kestrel'): Bird {
  const { w, h } = birdBox(size);
  return { id, species, size, x: x - w / 2, y, w, h, phase: 'patrol', dir, lock: 0, wait: 0, bored: 0, aimX: x };
}

/** World y (top of the box) birds patrol at: well over the highest ground, but on screen. */
export function patrolY(t: Terrain, tile: number, h: number): number {
  let top = t.height;
  for (let x = 0; x < t.width; x++) top = Math.min(top, surfaceRow(t, x));
  return Math.max(tile, (top - BIRD.patrolTiles) * tile - h);
}

/** Whether it's a crab this bird hunts and can reach: smaller, and under open sky (hidden or not). */
function visible(b: Bird, q: SkyQuarry | null): q is SkyQuarry {
  return q !== null && q.size < b.size && q.open;
}

const toward = (from: number, to: number, max: number): number => from + Math.max(-max, Math.min(max, to - from));

/** One step of flight. The sim checks a stoop against the crab and calls pullUp when it strikes. */
export function stepBird(t: Terrain, b: Bird, q: SkyQuarry | null, dt: number, tile: number): Bird {
  const bored = Math.max(0, b.bored - dt);
  const cruise = patrolY(t, tile, b.h);
  const at = centre(b);
  switch (b.phase) {
    case 'patrol': {
      let dir = b.dir;
      const x = b.x + dir * BIRD.patrolSpeed * dt;
      if ((x < 0 && dir < 0) || (x + b.w > t.width * tile && dir > 0)) dir = dir === 1 ? -1 : 1;
      const next = { ...b, x, y: toward(b.y, cruise, BIRD.climbSpeed * dt), dir, bored };
      if (bored === 0 && visible(b, q) && !q.hidden && Math.abs(centre(q.box).x - at.x) < BIRD.sight * tile) {
        return { ...next, phase: 'hover', lock: 0, wait: 0, aimX: centre(q.box).x };
      }
      return next;
    }
    case 'hover': {
      if (q && q.size >= b.size) return { ...b, phase: 'climb', bored: BIRD.boredFor };
      const seen = visible(b, q);
      const aimX = seen ? centre(q.box).x : b.aimX;
      const goalY = Math.max(tile, (seen ? q.box.y : b.y + b.h) - BIRD.hoverTiles * tile - b.h);
      const step = BIRD.hoverSpeed * dt;
      const x = toward(at.x, aimX, step) - b.w / 2;
      const y = toward(b.y, goalY, step);
      const dir: 1 | -1 = aimX > at.x + 1 ? 1 : aimX < at.x - 1 ? -1 : b.dir;
      if (!seen) {
        const wait = b.wait + dt;
        // Losing sight of it spoils the aim: it has to settle again once the crab shows.
        const lock = Math.min(b.lock, BIRD.hoverFor / 2);
        return wait >= BIRD.waitFor ? { ...b, x, y, phase: 'climb', bored: BIRD.boredFor } : { ...b, x, y, dir, wait, lock, aimX, bored };
      }
      const over = Math.abs(aimX - (x + b.w / 2)) < tile * 0.75;
      const lock = over ? b.lock + dt : b.lock;
      if (lock >= BIRD.hoverFor) return { ...b, x, y, dir, phase: 'dive', lock: 0, wait: 0, aimX, bored };
      return { ...b, x, y, dir, lock, wait: 0, aimX, bored };
    }
    case 'dive': {
      // Committed: it falls on the spot it marked, not on where the crab goes.
      const next = { ...b, y: b.y + BIRD.diveSpeed * dt, x: toward(at.x, b.aimX, BIRD.hoverSpeed * dt) - b.w / 2, bored };
      return boxHitsSolid(t, next, tile) ? pullUp(b) : next;
    }
    case 'climb': {
      const y = b.y - BIRD.climbSpeed * dt;
      return y <= cruise ? { ...b, y: cruise, phase: 'patrol', bored } : { ...b, y, bored };
    }
  }
}

/** Back up to patrol after a stoop, leaving crabs alone for a while. */
export function pullUp(b: Bird): Bird {
  return { ...b, phase: 'climb', lock: 0, wait: 0, bored: BIRD.boredFor };
}

/** Whether a crab's box has nothing over it but sky: no sand above any column it stands in. */
export function underSky(t: Terrain, box: Box, tile: number): boolean {
  const x0 = Math.floor(box.x / tile);
  const x1 = Math.floor((box.x + box.w - 1e-6) / tile);
  const top = Math.floor(box.y / tile);
  for (let x = x0; x <= x1; x++) if (surfaceRow(t, x) < top) return false;
  return true;
}

/** Ground y under a bird, for its shadow. */
export function shadowY(t: Terrain, b: Bird, tile: number): number {
  return surfaceRow(t, Math.floor(centre(b).x / tile)) * tile;
}
