import { boxHitsSolid, jump, moveBody, PHYS, type Body, type Box } from './body';
import { centre } from './items';
import type { Rng } from './rng';
import { shellPx } from './shells';
import { movementOf, SPECIES, type SpeciesId } from './species';
import { isSolid, surfaceRow, tileAt, TILE, type Terrain } from './terrain';

/**
 * Creatures that roam the beach and its tunnels (see species.ts). Size uses
 * the hermit crab's scale; a bigger one catches you, a smaller one is food.
 * None can dig, and only ravens hop, so a pit or a sand wall stops the
 * walkers; a sandfish swims through sand and is stopped only by rock.
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
  /** Down in the sand, under a roof: where sandfish hunt. */
  readonly buried?: boolean;
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
  /** Wall height (tiles) a hopper clears. */
  hop: 2.6,
  /** How far (tiles) above or below a sandfish notices a crab in the sand. */
  burrowRows: 4,
  /** Sandfish weave up and down as they swim: share of their speed. */
  weave: 0.35,
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
  if (movementOf(c.species) === 'burrow') return stepBurrower(t, c, q, dt, tile, rng);
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
  // A hopper clears the wall instead.
  if (stuck && spec.hops) return { ...c, ...jump(moved, Math.sqrt(2 * PHYS.gravity * CRITTER.hop * tile)), dir, turnIn, clock, bored: Math.max(0, c.bored - dt) };
  if (stuck && !hunting) dir = dir === 1 ? -1 : 1;
  return { ...c, ...moved, dir, turnIn, clock, bored: Math.max(0, c.bored - dt) };
}

/**
 * Whether a sandfish can be here: wholly below the surface line (in sand,
 * or in a tunnel under a roof), never in rock, never out of the world.
 */
export function swimmable(t: Terrain, b: Box, tile: number): boolean {
  const y0 = Math.floor(b.y / tile);
  const y1 = Math.floor((b.y + b.h - 1e-6) / tile);
  const x0 = Math.floor(b.x / tile);
  const x1 = Math.floor((b.x + b.w - 1e-6) / tile);
  if (x0 < 0 || x1 >= t.width || y1 >= t.height) return false;
  for (let x = x0; x <= x1; x++) {
    if (y0 < surfaceRow(t, x)) return false;
    for (let y = y0; y <= y1; y++) if (tileAt(t, x, y) === TILE.rock) return false;
  }
  return true;
}

function touchesRock(t: Terrain, b: Box, tile: number): boolean {
  for (let y = Math.floor(b.y / tile); y <= Math.floor((b.y + b.h - 1e-6) / tile); y++) {
    for (let x = Math.floor(b.x / tile); x <= Math.floor((b.x + b.w - 1e-6) / tile); x++) if (tileAt(t, x, y) === TILE.rock) return true;
  }
  return false;
}

/** Whether a sandfish is out in a tunnel (its middle in open space) rather than in the sand. */
export function breached(t: Terrain, c: Box, tile: number): boolean {
  const m = centre(c);
  return !isSolid(t, Math.floor(m.x / tile), Math.floor(m.y / tile));
}

/**
 * A sandfish: swims through the sand without gravity, weaving up and down.
 * A bigger one homes in on a crab down in the sand; a smaller one never
 * notices it (it can't flee faster than you dig), so it can be dug out and eaten.
 */
function stepBurrower(t: Terrain, c: Critter, q: Quarry | null, dt: number, tile: number, rng: Rng): Critter {
  const spec = SPECIES[c.species];
  const speed = critterSpeed(c.size, c.species);
  const a = centre(c);
  const prey = q && q.buried && !q.hidden && c.bored <= 0 && c.size > q.size ? centre(q.box) : null;
  const hunting = prey !== null && Math.abs(prey.x - a.x) <= spec.sight * tile && Math.abs(prey.y - a.y) <= CRITTER.burrowRows * tile;
  const clock = c.clock + dt;
  let dir = c.dir;
  let turnIn = c.turnIn - dt;
  let vx: number;
  let vy: number;
  if (hunting) {
    const dx = prey.x - a.x;
    const dy = prey.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    vx = (dx / d) * speed;
    vy = (dy / d) * speed;
    if (Math.abs(dx) > 1) dir = dx > 0 ? 1 : -1;
  } else {
    if (turnIn <= 0) {
      dir = dir === 1 ? -1 : 1;
      turnIn = CRITTER.turnMin + rng() * (CRITTER.turnMax - CRITTER.turnMin);
    }
    vx = dir * speed * CRITTER.amble;
    vy = Math.sin(clock * 1.3 + c.id) * speed * CRITTER.weave;
  }
  // Left in the open (a shaft dug down past it): it dives back into the sand.
  const stranded = !swimmable(t, c, tile);
  if (stranded) vy = speed;
  let box: Box = c;
  const across = { ...box, x: box.x + vx * dt };
  if (stranded || swimmable(t, across, tile)) box = across;
  else if (!hunting) dir = dir === 1 ? -1 : 1;
  const down = { ...box, y: box.y + vy * dt };
  if (stranded ? !touchesRock(t, down, tile) : swimmable(t, down, tile)) box = down;
  return { ...c, x: box.x, y: box.y, vx, vy, onGround: false, dir, turnIn, clock, bored: Math.max(0, c.bored - dt) };
}
