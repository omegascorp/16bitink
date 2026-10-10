import { boxHitsSolid, climbBody, jump, moveBody, PHYS, WATER, type Body, type Box } from './body';
import { sightInFog } from './fog';
import { centre } from './items';
import type { Rng } from './rng';
import { shellPx, type ShellKind } from './shells';
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
  /** An octopus's arm: how far out it reaches (0 in the den .. 1 at full stretch), and which way. */
  readonly arm: number;
  readonly aimX: number;
  readonly aimY: number;
  /** Seconds a fish has been out of the water: it dies at CRITTER.strandedFor. */
  readonly dry: number;
  /** A gull in the air: flying off as the tide comes in, or in to land as it goes out. Harmless up there. */
  readonly flight?: 'off' | 'in';
  /** A heron's strike: seconds since it froze to take aim; unset when it isn't striking. */
  readonly strike?: number;
  /** How far out the strike goes (share of its bill's full reach), set as it takes aim. */
  readonly reach?: number;
  /** Seconds a climber won't take hold of the roots (it let go to drop on something). */
  readonly letGo?: number;
  /** A rival hermit crab's shell; null while it's out of one (see rivals.ts). */
  readonly shell?: ShellKind | null;
  /** A rival pulled into its shell, keeping still. */
  readonly tucked?: boolean;
}

/** What a creature knows of the beach besides its sand: where the water and the mangrove roots are. */
export interface Surroundings {
  /** Whether a tile is under water (none on a dry beach). */
  readonly wet: (x: number, y: number) => boolean;
  /** Whether a tile is mangrove root (none off the mangrove beach). */
  readonly root?: (x: number, y: number) => boolean;
}

export const DRY: Surroundings = { wet: () => false };

/** What a critter knows about the player. */
export interface Quarry {
  readonly box: Box;
  readonly size: number;
  /** Hidden in its shell: nothing to chase. */
  readonly hidden: boolean;
  /** Down in the sand, under a roof: where sandfish hunt. */
  readonly buried?: boolean;
  /** Under water: where fish hunt, and where gulls can't reach. */
  readonly inWater?: boolean;
  /** In among the mangrove roots: a heron's bill can't get at it there. */
  readonly inRoots?: boolean;
  /** How thick the fog is round it, 0..1: what hunts by sight sees it only close up (see fog.ts). */
  readonly veil?: number;
  /** Down among washed-up kelp: nothing sees or smells it (see kelp.ts). */
  readonly covered?: boolean;
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
  /** Wall height (tiles) a hopper clears, and so how deep a drop it will go down (it can hop back out). */
  hop: 3.5,
  /** How far (tiles) past a drop a hopper looks for ground to leap to. */
  leap: 4,
  /** A hopper's pace in the air, as a share of its top speed: it flaps across. */
  glide: 1.6,
  /** How far (tiles) above or below a sandfish notices a crab in the sand. */
  burrowRows: 4,
  /** Sandfish weave up and down as they swim: share of their speed. */
  weave: 0.35,
  /** How far (tiles) an octopus's arm reaches out of its den. */
  armTiles: 3.2,
  /** Arm stretch per second, out and back. */
  armOut: 1.4,
  armIn: 0.9,
  /** Seconds a fish lasts out of the water. */
  strandedFor: 4,
  /** A gull's flight, px/s: across, and up (leaving) or down (coming in to land). */
  flyAcross: 75,
  flyUp: 85,
  flyDown: 70,
  /** How far (tiles) a heron's bill reaches from the base of its neck. */
  billTiles: 3.5,
  /** A heron's strike, seconds: frozen taking aim (the warning), the stab, holding out, drawing back. */
  aimFor: 1,
  stabFor: 0.1,
  holdFor: 0.2,
  backFor: 0.35,
  /** Seconds a heron stalks on before it can strike again. */
  recoverFor: 2.5,
  /** How far (tiles) above or below its feet a heron notices a crab. */
  tallRows: 4,
  /** A climber's pace in the roots, as a share of its top speed, and how far it reaches along a root to keep hold. */
  climb: 0.6,
  /** Seconds a climber falls free after letting go. */
  letGoFor: 0.8,
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
  return { id, species, size, x: x - w / 2, y: bottom - h, w, h, vx: 0, vy: 0, onGround: false, dir, turnIn, bored: 0, clock: 0, arm: 0, aimX: dir, aimY: 0, dry: 0 };
}

/** -1/1 towards the quarry when it's in sight (nearer in fog, never under kelp); 0 when it isn't. */
function spot(c: Critter, q: Quarry | null, tile: number): -1 | 0 | 1 {
  if (!q || q.hidden || q.covered || c.bored > 0) return 0;
  const a = centre(c);
  const b = centre(q.box);
  const spec = SPECIES[c.species];
  if (Math.abs(b.x - a.x) > sightInFog(spec.sight, q.veil ?? 0, spec.nose) * tile || Math.abs(b.y - a.y) > CRITTER.sightRows * tile) return 0;
  return b.x >= a.x ? 1 : -1;
}

/** Whether the ground ahead drops away further than a wandering critter will walk off (or, for one that keeps out of it, is under water). */
function cliffAhead(t: Terrain, c: Critter, tile: number, env: Surroundings): boolean {
  const x = Math.floor((c.dir > 0 ? c.x + c.w + 1 : c.x - 1) / tile);
  const foot = Math.floor((c.y + c.h + 1) / tile);
  if (SPECIES[c.species].lowTide && (env.wet(x, foot - 1) || env.wet(x, foot))) return true;
  for (let y = foot; y < foot + CRITTER.ledge; y++) if (isSolid(t, x, y)) return false;
  return true;
}

/** Whether column `x` has ground (solid with air above) between rows `from` and `to`. */
function groundIn(t: Terrain, x: number, from: number, to: number): boolean {
  for (let y = Math.max(1, from); y <= to; y++) if (isSolid(t, x, y) && !isSolid(t, x, y - 1)) return true;
  return false;
}

/**
 * What a hopper does at a drop: walk on down if the ground just ahead is
 * low enough to hop back out of, leap if there's ground to land on a
 * little further, or (null) turn back.
 */
function overDrop(t: Terrain, c: Critter, tile: number): 'walk' | 'leap' | null {
  const x = Math.floor((c.dir > 0 ? c.x + c.w + 1 : c.x - 1) / tile);
  const foot = Math.floor((c.y + c.h + 1) / tile);
  const hop = Math.floor(CRITTER.hop);
  if (groundIn(t, x, foot, foot + hop)) return 'walk';
  for (let k = 1; k <= CRITTER.leap; k++) if (groundIn(t, x + c.dir * k, foot - hop, foot + hop)) return 'leap';
  return null;
}

/**
 * One step: a bigger critter chases the crab when it sees it (if its kind
 * hunts), a smaller one runs, an equal one ignores it. Otherwise it ambles,
 * turning at walls and drop-offs and now and then for no reason. Some kinds
 * move in bursts, standing still between dashes.
 */
export function stepCritter(t: Terrain, c: Critter, q: Quarry | null, dt: number, tile: number, rng: Rng, env: Surroundings = DRY): Critter {
  const move = movementOf(c.species);
  if (move === 'burrow') return stepBurrower(t, c, q, dt, tile, rng);
  if (move === 'swim') return stepSwimmer(t, c, q, dt, tile, rng, env);
  if (move === 'den') return stepDen(c, q, dt, tile);
  if (move === 'wade') return stepWader(t, c, q, dt, tile, rng, env);
  if (move === 'climb') return stepClimber(t, c, q, dt, tile, rng, env);
  if (c.flight) return stepFlight(t, c, dt, tile);
  return stepWalker(t, c, q, dt, tile, rng, env);
}

/** Walkers (and lurkers): along the surface and through open tunnels, as stepCritter describes. */
function stepWalker(t: Terrain, c: Critter, q: Quarry | null, dt: number, tile: number, rng: Rng, env: Surroundings): Critter {
  const spec = SPECIES[c.species];
  // A gull can't get at a crab under water.
  const seen = spec.lowTide && q?.inWater ? 0 : spot(c, q, tile);
  // A lurker never wanders or turns on its own: it only faces a crab it sees.
  if (spec.move === 'lurk') {
    const moved = moveBody(t, c, 0, 0, dt, tile);
    return { ...c, ...moved, dir: seen === 0 ? c.dir : seen, clock: c.clock + dt, bored: Math.max(0, c.bored - dt) };
  }
  const hunting = seen !== 0 && q !== null && (c.size < q.size || (c.size > q.size && spec.hunts));
  let dir = c.dir;
  if (hunting) dir = (c.size > q.size ? seen : -seen) as 1 | -1;
  let turnIn = c.turnIn - dt;
  // A hopper goes down a drop it can hop back out of, or leaps a gap, rather than turning at it.
  const drop = !hunting && c.onGround && turnIn > 0 && cliffAhead(t, c, tile, env) ? (spec.hops ? overDrop(t, c, tile) ?? 'turn' : 'turn') : null;
  if (!hunting && c.onGround && (turnIn <= 0 || drop === 'turn')) {
    dir = dir === 1 ? -1 : 1;
    turnIn = CRITTER.turnMin + rng() * (CRITTER.turnMax - CRITTER.turnMin);
  }
  const clock = c.clock + dt;
  const resting = spec.burst !== undefined && clock % (spec.burst.run + spec.burst.rest) > spec.burst.run;
  const top = critterSpeed(c.size, c.species);
  const pace = resting ? 0 : spec.hops && !c.onGround ? top * CRITTER.glide : top * (hunting ? 1 : CRITTER.amble);
  const moved = moveBody(t, c, dir, pace, dt, tile);
  const hopSpeed = Math.sqrt(2 * PHYS.gravity * CRITTER.hop * tile);
  if (drop === 'leap') return { ...c, ...jump(moved, hopSpeed), dir, turnIn, clock, bored: Math.max(0, c.bored - dt) };
  // Blocked by a wall it can't step up: turn round (a hunter waits it out).
  const stuck = !resting && c.onGround && Math.abs(moved.x - c.x) < 1e-3 && boxHitsSolid(t, { ...moved, x: moved.x + dir }, tile);
  // A hopper clears the wall instead, if there's room over it (not a cliff face, or the edge of the beach).
  const clears = stuck && spec.hops && !boxHitsSolid(t, { ...moved, x: moved.x + dir * tile / 2, y: moved.y - CRITTER.hop * tile }, tile);
  if (clears) return { ...c, ...jump(moved, hopSpeed), dir, turnIn, clock, bored: Math.max(0, c.bored - dt) };
  // Walled in on both sides (down a hole), it stands facing one way rather than flipping every frame.
  const boxedIn = stuck && boxHitsSolid(t, { ...moved, x: moved.x - dir }, tile);
  if (stuck && !hunting && !boxedIn) dir = dir === 1 ? -1 : 1;
  return { ...c, ...moved, dir, turnIn, clock, bored: Math.max(0, c.bored - dt) };
}

/**
 * A gull in the air: leaving, it climbs away across the sky; coming in,
 * it glides down and lands on the first ground under it.
 */
function stepFlight(t: Terrain, c: Critter, dt: number, tile: number): Critter {
  const clock = c.clock + dt;
  if (c.flight === 'off') return { ...c, x: c.x + c.dir * CRITTER.flyAcross * dt, y: c.y - CRITTER.flyUp * dt, vx: c.dir * CRITTER.flyAcross, vy: 0, onGround: false, clock };
  const next = { ...c, x: c.x + c.dir * CRITTER.flyAcross * 0.4 * dt, y: c.y + CRITTER.flyDown * dt };
  // Touching down: it stands where it is, and walks from here.
  if (next.y + next.h > 0 && boxHitsSolid(t, next, tile)) return { ...c, flight: undefined, vx: 0, vy: 0, clock };
  return { ...next, vx: next.x - c.x, vy: CRITTER.flyDown, onGround: false, clock };
}

/** Whether every tile a box covers is under water (and open). */
export function inWater(t: Terrain, b: Box, tile: number, env: Surroundings): boolean {
  for (let y = Math.floor(b.y / tile); y <= Math.floor((b.y + b.h - 1e-6) / tile); y++) {
    for (let x = Math.floor(b.x / tile); x <= Math.floor((b.x + b.w - 1e-6) / tile); x++) if (isSolid(t, x, y) || !env.wet(x, y)) return false;
  }
  return true;
}

/**
 * A fish: swims about in water only, weaving a little. A bigger one goes
 * for a crab in the water within sight; a smaller one never notices it. Left
 * high and dry by the tide, it drops and flops where it lands until the
 * water comes back.
 */
function stepSwimmer(t: Terrain, c: Critter, q: Quarry | null, dt: number, tile: number, rng: Rng, env: Surroundings): Critter {
  const clock = c.clock + dt;
  const bored = Math.max(0, c.bored - dt);
  if (!inWater(t, c, tile, env)) {
    // Wedged in sand it can't flop; on open ground it turns this way and that, slower as it tires.
    const buried = isSolid(t, Math.floor(centre(c).x / tile), Math.floor(centre(c).y / tile));
    const fell = buried ? c : moveBody(t, c, 0, 0, dt, tile, WATER);
    const dir: 1 | -1 = buried ? c.dir : Math.floor(clock * (3 - 2 * Math.min(1, c.dry / CRITTER.strandedFor))) % 2 === 0 ? 1 : -1;
    return { ...c, ...fell, dir, clock, bored, dry: c.dry + dt };
  }
  const spec = SPECIES[c.species];
  const speed = critterSpeed(c.size, c.species);
  const a = centre(c);
  const prey = q && q.inWater && !q.hidden && bored <= 0 && c.size > q.size ? centre(q.box) : null;
  const hunting = prey !== null && Math.abs(prey.x - a.x) <= spec.sight * tile && Math.abs(prey.y - a.y) <= spec.sight * tile;
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
    vy = Math.sin(clock * 1.7 + c.id) * speed * CRITTER.weave;
  }
  let box: Box = c;
  const across = { ...box, x: box.x + vx * dt };
  if (inWater(t, across, tile, env)) box = across;
  else if (!hunting) dir = dir === 1 ? -1 : 1;
  const down = { ...box, y: box.y + vy * dt };
  if (inWater(t, down, tile, env)) box = down;
  return { ...c, x: box.x, y: box.y, vx, vy, onGround: false, dir, turnIn, clock, bored, dry: 0 };
}

/** Whether a fish has been out of the water too long, or is buried in sand: it dies, and is food. */
export function stranded(t: Terrain, c: Critter, tile: number): boolean {
  if (movementOf(c.species) !== 'swim') return false;
  const m = centre(c);
  return c.dry >= CRITTER.strandedFor || (c.dry > 0 && isSolid(t, Math.floor(m.x / tile), Math.floor(m.y / tile)));
}

/**
 * An octopus: never leaves its crevice. A crab smaller than it that comes
 * within reach gets an arm stretched out after it; otherwise the arm curls
 * back in. A crab hiding in its shell is left alone.
 */
function stepDen(c: Critter, q: Quarry | null, dt: number, tile: number): Critter {
  const bored = Math.max(0, c.bored - dt);
  const a = centre(c);
  const target = q && !q.hidden && bored <= 0 && c.size > q.size ? centre(q.box) : null;
  const reach = CRITTER.armTiles * tile;
  const dist = target ? Math.hypot(target.x - a.x, target.y - a.y) : Infinity;
  const after = target !== null && dist <= reach + tile;
  let aimX = c.aimX;
  let aimY = c.aimY;
  if (after) {
    const d = dist || 1;
    // The arm swings round towards it rather than snapping.
    const k = Math.min(1, dt * 6);
    aimX += ((target.x - a.x) / d - aimX) * k;
    aimY += ((target.y - a.y) / d - aimY) * k;
    const n = Math.hypot(aimX, aimY) || 1;
    aimX /= n;
    aimY /= n;
  }
  const want = after ? Math.min(1, dist / reach) : 0;
  const arm = after ? Math.min(want, c.arm + CRITTER.armOut * dt) : Math.max(0, c.arm - CRITTER.armIn * dt);
  const dir: 1 | -1 = aimX >= 0 ? 1 : -1;
  return { ...c, arm, aimX, aimY, dir, clock: c.clock + dt, bored };
}

/** Where an octopus's arm, or a heron's neck, comes from: the octopus's middle, the base of the heron's neck. */
export function armBase(c: Critter): { x: number; y: number } {
  if (movementOf(c.species) !== 'wade') return centre(c);
  return { x: c.x + c.w / 2 + c.dir * c.w * 0.28, y: c.y + c.h * 0.29 };
}

/** Where an octopus's arm tip (or a heron's bill tip) is now. */
export function armTip(c: Critter, tile: number): { x: number; y: number } {
  const a = armBase(c);
  const len = c.arm * (movementOf(c.species) === 'wade' ? CRITTER.billTiles : CRITTER.armTiles) * tile;
  return { x: a.x + c.aimX * len, y: a.y + c.aimY * len };
}

/** The point a heron would stab at: a smaller crab out in the open within its sight, or null. */
function herons(c: Critter, q: Quarry | null, tile: number): { x: number; y: number } | null {
  if (!q || q.hidden || q.inRoots || c.bored > 0 || c.size <= q.size) return null;
  const a = centre(c);
  const p = centre(q.box);
  if (Math.abs(p.x - a.x) > SPECIES[c.species].sight * tile || Math.abs(p.y - (c.y + c.h)) > CRITTER.tallRows * tile) return null;
  return p;
}

/**
 * A heron: stalks the open mud at a slow walk, towards a smaller crab it
 * can see out in the open. Within reach of its bill it freezes to take aim
 * (the warning: it follows the crab with its eye), then stabs at where the
 * crab was and draws back. In among the roots the crab is out of its reach.
 */
function stepWader(t: Terrain, c: Critter, q: Quarry | null, dt: number, tile: number, rng: Rng, env: Surroundings): Critter {
  const prey = herons(c, q, tile);
  const base = armBase(c);
  const bill = CRITTER.billTiles * tile;
  if (c.strike === undefined) {
    const dist = prey ? Math.hypot(prey.x - base.x, prey.y - base.y) : Infinity;
    // Out of reach, or nothing to stab: stalk (or amble) on, never after a crab in the roots.
    if (dist > bill * 0.95) return stepWalker(t, c, prey ? q : null, dt, tile, rng, env);
  }
  const s = (c.strike ?? -dt) + dt;
  const stab = CRITTER.aimFor + CRITTER.stabFor;
  const hold = stab + CRITTER.holdFor;
  const done = hold + CRITTER.backFor;
  const moved = moveBody(t, c, 0, 0, dt, tile);
  const clock = c.clock + dt;
  const bored = Math.max(0, c.bored - dt);
  if (s >= done) return { ...c, ...moved, strike: undefined, arm: 0, clock, bored: CRITTER.recoverFor };
  let { aimX, aimY } = c;
  let reach = c.reach ?? 1;
  // Taking aim, it follows the crab while it can see it; the stab goes where it last saw it.
  if (s < CRITTER.aimFor && prey) {
    const dx = prey.x - base.x;
    const dy = prey.y - base.y;
    const d = Math.hypot(dx, dy) || 1;
    aimX = dx / d;
    aimY = dy / d;
    reach = Math.min(1, d / bill);
  }
  const arm = s < CRITTER.aimFor ? 0 : s < stab ? reach * ((s - CRITTER.aimFor) / CRITTER.stabFor) : s < hold ? reach : reach * (1 - (s - hold) / CRITTER.backFor);
  const dir: 1 | -1 = aimX >= 0 ? 1 : -1;
  return { ...c, ...moved, vx: 0, strike: s, arm, aimX, aimY, reach, dir, clock, bored };
}

/** Whether a box touches a root tile. */
function gripping(b: Box, root: (x: number, y: number) => boolean, tile: number): boolean {
  for (let y = Math.floor(b.y / tile); y <= Math.floor((b.y + b.h - 1e-6) / tile); y++) {
    for (let x = Math.floor(b.x / tile); x <= Math.floor((b.x + b.w - 1e-6) / tile); x++) if (root(x, y)) return true;
  }
  return false;
}

/**
 * A mangrove tree crab: on the mud, a walker. Touching a root it takes
 * hold and climbs about the tangle in any direction, wandering up and down
 * it, or going after a smaller crab (and away from a bigger one) it sees.
 * It never lets go of the roots on its own, except to drop on a crab below.
 */
function stepClimber(t: Terrain, c: Critter, q: Quarry | null, dt: number, tile: number, rng: Rng, env: Surroundings): Critter {
  const letGo = Math.max(0, (c.letGo ?? 0) - dt);
  const root = env.root;
  if (!root || letGo > 0 || !gripping(c, root, tile)) return { ...stepWalker(t, c, q, dt, tile, rng, env), letGo };
  const spec = SPECIES[c.species];
  const speed = critterSpeed(c.size, c.species) * CRITTER.climb;
  const a = centre(c);
  const p = q && !q.hidden && c.bored <= 0 ? centre(q.box) : null;
  // Up in the tangle it looks up and down as far as along.
  const seen = p !== null && Math.abs(p.x - a.x) <= spec.sight * tile && Math.abs(p.y - a.y) <= spec.sight * tile;
  const hunting = seen && c.size > q!.size && spec.hunts;
  const fleeing = seen && c.size < q!.size;
  const clock = c.clock + dt;
  const bored = Math.max(0, c.bored - dt);
  let dir = c.dir;
  let turnIn = c.turnIn - dt;
  let ix: number;
  let iy: number;
  if (hunting || fleeing) {
    const dx = (p!.x - a.x) * (hunting ? 1 : -1);
    const dy = (p!.y - a.y) * (hunting ? 1 : -1);
    const d = Math.hypot(dx, dy) || 1;
    ix = dx / d;
    iy = dy / d;
    if (Math.abs(dx) > 1) dir = dx > 0 ? 1 : -1;
  } else {
    if (turnIn <= 0) {
      dir = dir === 1 ? -1 : 1;
      turnIn = CRITTER.turnMin + rng() * (CRITTER.turnMax - CRITTER.turnMin);
    }
    ix = dir * CRITTER.amble;
    iy = Math.sin(clock * 0.9 + c.id) * 0.8;
  }
  const across = climbBody(t, c, ix, 0, speed, dt, tile);
  let box: Body = gripping(across, root, tile) ? across : c;
  if (box === c && !hunting && !fleeing) {
    dir = dir === 1 ? -1 : 1;
    turnIn = CRITTER.turnMin + rng() * (CRITTER.turnMax - CRITTER.turnMin);
  }
  const down = climbBody(t, box, 0, iy, speed, dt, tile);
  const holds = gripping(down, root, tile);
  if (holds) box = down;
  // A crab below it, out of the tangle: it lets go and drops on it.
  const drops = hunting && !holds && iy > 0.5 && Math.abs(p!.x - a.x) < tile * 2;
  return { ...c, x: box.x, y: box.y, vx: ix * speed, vy: drops ? 0 : iy * speed, onGround: false, dir, turnIn, clock, bored, letGo: drops ? CRITTER.letGoFor : 0 };
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
  const back = { ...box, x: box.x - vx * dt };
  if (stranded || swimmable(t, across, tile)) box = across;
  // Blocked (rock, the surface): turn back, unless that way is blocked too.
  else if (!hunting && swimmable(t, back, tile)) {
    dir = dir === 1 ? -1 : 1;
    box = back;
  }
  const down = { ...box, y: box.y + vy * dt };
  if (stranded ? !touchesRock(t, down, tile) : swimmable(t, down, tile)) box = down;
  return { ...c, x: box.x, y: box.y, vx, vy, onGround: false, dir, turnIn, clock, bored: Math.max(0, c.bored - dt) };
}
