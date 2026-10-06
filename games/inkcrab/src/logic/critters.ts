import { boxHitsSolid, moveBody, type Body, type Box } from './body';
import { centre } from './items';
import type { Rng } from './rng';
import { shellPx } from './shells';
import { SPECIES, type SpeciesId } from './species';
import { isSolid, type Terrain } from './terrain';

/**
 * Creatures that roam the beach and its tunnels (see species.ts). Size uses
 * the hermit crab's scale; a bigger one catches you, a smaller one is food.
 * None can dig or jump, so a pit or a sand wall stops them.
 */
export interface Critter extends Body {
  readonly id: number;
  readonly species: SpeciesId;
  readonly size: number;
  readonly dir: 1 | -1;
  /** Seconds until a wandering critter may turn round on its own. */
  readonly turnIn: number;
  /** Seconds it ignores the crab (after bumping into it hiding in its shell). */
  readonly bored: number;
  /** Seconds into its run-and-rest cycle, for species that move in bursts. */
  readonly clock: number;
}

/** What a critter knows about the player. */
export interface Quarry {
  readonly box: Box;
  readonly size: number;
  /** Hidden in its shell: nothing to chase. */
  readonly hidden: boolean;
}

export const CRITTER = {
  /** How far (tiles) above or below it notices the crab; how far ahead depends on the species. */
  sightRows: 2,
  /** Seconds a critter leaves a hiding crab alone. */
  boredFor: 3,
  turnMin: 2,
  turnMax: 5,
  /** Wandering pace as a share of its chasing (or fleeing) speed. */
  amble: 0.55,
  /** Drop (tiles) a wandering critter won't walk off. */
  ledge: 2,
} as const;

export function critterBox(size: number, species: SpeciesId = 'ghostcrab'): { w: number; h: number } {
  const px = shellPx(size);
  const box = SPECIES[species].box;
  return { w: px * box.w, h: px * box.h };
}

/** Top speed, px/s. A ghost crab is a little slower than a hermit crab in a light shell, so you can outrun one your size. */
export function critterSpeed(size: number, species: SpeciesId = 'ghostcrab'): number {
  return (42 + 4 * size) * SPECIES[species].speed;
}

/** Food points for eating one. */
export function critterPoints(size: number): number {
  return size + 1;
}

export function makeCritter(id: number, size: number, x: number, bottom: number, dir: 1 | -1, turnIn: number, species: SpeciesId = 'ghostcrab'): Critter {
  const { w, h } = critterBox(size, species);
  return { id, species, size, x: x - w / 2, y: bottom - h, w, h, vx: 0, vy: 0, onGround: false, dir, turnIn, bored: 0, clock: 0 };
}

/** -1/1 towards the quarry when it's in sight; 0 when it isn't. */
function spot(c: Critter, q: Quarry | null, tile: number): -1 | 0 | 1 {
  if (!q || q.hidden || c.bored > 0) return 0;
  const a = centre(c);
  const b = centre(q.box);
  if (Math.abs(b.x - a.x) > SPECIES[c.species].sight * tile || Math.abs(b.y - a.y) > CRITTER.sightRows * tile) return 0;
  return b.x >= a.x ? 1 : -1;
}

/** Whether the ground ahead drops away further than a wandering critter will walk off. */
function cliffAhead(t: Terrain, c: Critter, tile: number): boolean {
  const x = Math.floor((c.dir > 0 ? c.x + c.w + 1 : c.x - 1) / tile);
  const foot = Math.floor((c.y + c.h + 1) / tile);
  for (let y = foot; y < foot + CRITTER.ledge; y++) if (isSolid(t, x, y)) return false;
  return true;
}

/**
 * One step: a bigger critter chases the crab when it sees it (if its kind
 * hunts), a smaller one runs, an equal one ignores it. Otherwise it ambles,
 * turning at walls and drop-offs and now and then for no reason. Some kinds
 * move in bursts, standing still between dashes.
 */
export function stepCritter(t: Terrain, c: Critter, q: Quarry | null, dt: number, tile: number, rng: Rng): Critter {
  const spec = SPECIES[c.species];
  const seen = spot(c, q, tile);
  const hunting = seen !== 0 && q !== null && (c.size < q.size || (c.size > q.size && spec.hunts));
  let dir = c.dir;
  if (hunting) dir = (c.size > q.size ? seen : -seen) as 1 | -1;
  let turnIn = c.turnIn - dt;
  if (!hunting && c.onGround && (turnIn <= 0 || cliffAhead(t, c, tile))) {
    dir = dir === 1 ? -1 : 1;
    turnIn = CRITTER.turnMin + rng() * (CRITTER.turnMax - CRITTER.turnMin);
  }
  const clock = c.clock + dt;
  const resting = spec.burst !== undefined && clock % (spec.burst.run + spec.burst.rest) > spec.burst.run;
  const pace = resting ? 0 : critterSpeed(c.size, c.species) * (hunting ? 1 : CRITTER.amble);
  const moved = moveBody(t, c, dir, pace, dt, tile);
  // Blocked by a wall it can't step up: turn round (a hunter waits it out).
  const stuck = !resting && c.onGround && Math.abs(moved.x - c.x) < 1e-3 && boxHitsSolid(t, { ...moved, x: moved.x + dir }, tile);
  if (stuck && !hunting) dir = dir === 1 ? -1 : 1;
  return { ...c, ...moved, dir, turnIn, clock, bored: Math.max(0, c.bored - dt) };
}
