import { boxHitsSolid, moveBody, type Box } from './body';
import type { Critter, Surroundings } from './critters';
import { movementOf, SPECIES, type Movement } from './species';
import { centre, overlaps, type Item } from './items';
import type { ChainStatus } from './mission';
import type { Rng } from './rng';
import { inShell, stepRival, type Rapper, type RivalStep } from './rivals';
import type { Shell } from './shells';
import { isSolid, type Terrain } from './terrain';
import { startSwap } from './swap';
import type { Trail } from './trail';
import { CHAIN, FOLLOW, roomier, type ChainStep, type Leader } from './vacancy';

/**
 * The shell chain mission: small hermit crabs in tiny shells (recruits)
 * join the crab's line when it comes close, and follow it from then on,
 * biggest shell first. Every move up to a bigger shell needs one more of
 * them, each grown to fill its shell: the first takes the shell the crab
 * leaves, the next takes that one's, all down the line, and the last of
 * them leaves its tiny shell behind.
 *
 * Followers eat as they go (food nearby, and nibbles on the way) and grow,
 * but never past their shell. They pull into their shells while a bigger
 * hunter is close and wait for it to pass. Nothing catches them, but one
 * that stays (a hunter standing guard, a wall too high to hop) holds them
 * up until the crab helps: digs them a way round, or builds them steps.
 */
export const LINE = {
  /** Tiles off a recruit joins the crab (no smaller than it), and rows above or below. */
  join: 5,
  rows: 3,
  /** Food points a follower needs to grow a size. */
  meal: 4,
  /** Points a second a follower picks up nibbling on the way, while it has room to grow. */
  graze: 0.25,
  /** Px either side of its path a follower reaches for food as it goes by. */
  reach: 10,
  /** Tiles between them (edge to edge, across) at which a bigger hunter coming by makes a follower pull in and wait, and rows apart it still counts. */
  fear: 1.5,
  fearRows: 1,
  /** Px a second a follower goes along the crab's footsteps; more a second for each px it's behind; at most. */
  pace: 60,
  catchUp: 1.2,
  maxPace: 110,
  /** Px of sand that has poured or slid onto the crab's footsteps a follower steps up over. */
  stepUp: 16,
  /** Px from the crab's footsteps a follower steps onto them from. */
  board: 6,
  /** Tiles off (across, and rows above or below) a follower counts as with the crab, for a move up. */
  near: 10,
  nearRows: 3,
} as const;

export const isRecruit = (k: Critter): boolean => !!k.recruit;

/** The crab's line: recruits that have joined, biggest shell first (then biggest crab). */
export function lineOf(critters: Iterable<Critter>): Critter[] {
  const line = [...critters].filter((k) => k.recruit && k.joined);
  const rank = (k: Critter): number => (k.shell?.size ?? 0) * 100 + k.size;
  return line.sort((a, b) => rank(b) - rank(a) || a.id - b.id);
}

/** Whether a crab fills its shell: no room to grow until it moves up. */
export const full = (k: Critter): boolean => !k.shell || k.size >= k.shell.size;

/** Whether a recruit joins the crab now: it's close and in sight of it, and the crab is no smaller than it. */
export function joins(k: Critter, crab: Rapper, t: Terrain, tile: number): boolean {
  if (!k.recruit || k.joined || crab.size < k.size) return false;
  const a = centre(k);
  const b = centre(crab.box);
  return Math.abs(a.x - b.x) <= LINE.join * tile && Math.abs(a.y - b.y) <= LINE.rows * tile && inSight(t, a, b, tile);
}

/**
 * Where each follower goes: to a shell handed down the line (`handDowns`,
 * left by the crab or the follower ahead) that it can move up into, or to
 * its place in line behind the one ahead.
 */
export function planLine(line: readonly Critter[], leader: Leader, items: Iterable<Item>, handDowns: ReadonlySet<number>): Map<number, ChainStep> {
  const plan = new Map<number, ChainStep>();
  const loose = [...items].filter((i) => handDowns.has(i.id) && !i.buried && i.kind.type === 'shell');
  // A follower already moving house keeps the shell it's moving into.
  const claimed = new Set<number>(line.flatMap((k) => (k.swap ? [k.swap.itemId] : [])));
  const face: 1 | -1 = leader.side === 1 ? -1 : 1;
  let x = leader.x;
  let w = leader.w;
  let gap: number = FOLLOW.gap;
  for (const k of line) {
    x += leader.side * (w / 2 + k.w / 2 + gap);
    w = k.w;
    gap = CHAIN.gap;
    const at = centre(k).x;
    const take = loose
      .filter((i) => !claimed.has(i.id) && i.kind.type === 'shell' && roomier(k, i.kind.shell))
      .sort((a, b) => Math.abs(centre(a).x - at) - Math.abs(centre(b).x - at))[0];
    if (take) {
      claimed.add(take.id);
      plan.set(k.id, { take, x: centre(take).x, face, follow: true });
    } else plan.set(k.id, { take: null, x, face, follow: true });
  }
  return plan;
}

/**
 * How the line stands for the crab's next move up, out of `shell`: it
 * needs a follower for that shell and each smaller one down to size 2,
 * each filling its own shell and close by.
 */
export function chainStatus(line: readonly Critter[], shell: Shell | null, crab: Box, tile: number): ChainStatus {
  const needed = shell ? Math.max(0, shell.size - 1) : 0;
  const status = (wait: ChainStatus['wait']): ChainStatus => ({ line: line.length, needed, wait });
  if (line.length < needed) return status('recruit');
  let ahead = shell;
  for (const k of line.slice(0, needed)) {
    if (!ahead || !roomier(k, ahead)) return status('growing');
    ahead = k.shell ?? null;
  }
  const at = centre(crab);
  const near = (k: Critter): boolean => Math.abs(centre(k).x - at.x) <= LINE.near * tile && Math.abs(centre(k).y - at.y) <= LINE.nearRows * tile;
  return status(line.slice(0, needed).every(near) ? null : 'behind');
}

/**
 * Whether a shell chain is done: the crab is in a shell of the goal size,
 * and every shell it left has gone down the line, the last of them to the
 * newest crab in it, all of them in.
 */
export function chainDone(line: readonly Critter[], shell: Shell | null, goal: number): boolean {
  if (!shell || shell.size < goal) return false;
  const needed = goal - 2;
  return line.length >= needed && line.slice(0, needed).every((k, i) => !k.swap && k.shell?.size === goal - 1 - i);
}

/** A follower fed `points`: it grows a size for each LINE.meal, up to its shell's size. */
export function fed(k: Critter, points: number): Critter {
  if (full(k) || !k.shell) return k;
  const meter = (k.meter ?? 0) + points;
  if (meter < LINE.meal) return { ...k, meter };
  return inShell({ ...k, size: k.size + 1, meter: full({ ...k, size: k.size + 1 }) ? 0 : meter - LINE.meal }, k.shell);
}

/** What a follower's step needs to know about the beach. */
export interface LineWorld {
  readonly terrain: Terrain;
  readonly crab: Rapper;
  readonly items: readonly Item[];
  /** Everything that might hunt it (it never is caught, but it hides all the same). */
  readonly hunters: readonly Critter[];
  readonly tile: number;
  readonly rng: Rng;
  readonly env: Surroundings;
  /** The crab's footsteps, which the line follows. */
  readonly trail: Trail;
}

export interface FollowerStep extends RivalStep {
  /** Food it ate this step, gone from the sand. */
  readonly ate: Item | null;
}

/** Whether nothing solid lies on the straight line between two points: a crab sees, and is seen, only through open air or water. */
export function inSight(t: Terrain, a: { x: number; y: number }, b: { x: number; y: number }, tile: number): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (tile / 3));
  for (let i = 1; i < steps; i++) {
    const u = i / steps;
    if (isSolid(t, Math.floor((a.x + (b.x - a.x) * u) / tile), Math.floor((a.y + (b.y - a.y) * u) / tile))) return false;
  }
  return true;
}

/** What sits still where it lives (an antlion in its pit, a sandfish in the sand, an octopus in its den): a follower just goes by. */
const STAYS: ReadonlySet<Movement> = new Set<Movement>(['lurk', 'burrow', 'den']);

/**
 * Whether a bigger hunter is right by a follower: one that hunts and roams,
 * on its level, within LINE.fear tiles edge to edge, and in sight of it (not
 * through rock or sand). Timid creatures and ones that stay put it ignores.
 */
function afraid(k: Critter, hunters: readonly Critter[], t: Terrain, tile: number): boolean {
  const a = centre(k);
  return hunters.some((h) => {
    if (h.flight || h.size <= k.size || !SPECIES[h.species].hunts || STAYS.has(movementOf(h.species))) return false;
    const b = centre(h);
    const gap = Math.abs(a.x - b.x) - (k.w + h.w) / 2;
    if (gap > LINE.fear * tile || Math.abs(k.y + k.h - (h.y + h.h)) > LINE.fearRows * tile) return false;
    return inSight(t, a, b, tile);
  });
}

/** Food a follower is by as it goes (within LINE.reach), if it has room to grow. */
function underfoot(k: Critter, items: readonly Item[]): Item | null {
  if (full(k)) return null;
  return items.find((i) => !i.buried && i.kind.type === 'food' && overlaps(k, i, LINE.reach)) ?? null;
}

/** A follower that has just eaten `food` (null: nothing). */
function eaten(r: FollowerStep, food: Item | null): FollowerStep {
  if (!food || food.kind.type !== 'food') return r;
  return { ...r, rival: fed(r.rival, food.kind.points), ate: food };
}

const still = (k: Critter): FollowerStep => ({ rival: k, took: null, left: null, ate: null });

/**
 * One step for a follower. It goes along the crab's footsteps to its
 * `target` (px along them: its place in line), or to a shell handed down
 * to it, which it moves into; so it gets wherever the crab got. It stops
 * only for a bigger hunter right by it (pulled into its shell) or for a wall
 * of sand put across the way since the crab went by; a little sand that has
 * poured onto the path it steps over. A recruit that has just joined
 * scrambles to the trail to get on it. It nibbles as it goes, and eats what
 * it passes by.
 */
export function stepFollower(k: Critter, plan: ChainStep, w: LineWorld, target: number, dt: number): FollowerStep {
  const T = w.tile;
  const grazed = fed(k, LINE.graze * dt);
  // Half way out of one shell and into the next, it carries on: hiding means being in one.
  if (k.swap) {
    const r = stepRival(w.terrain, grazed, w.crab, w.items, dt, T, w.rng, w.env, new Set(), plan);
    return { ...r, rival: r.took ? board(r.rival, w.trail) : r.rival, ate: null };
  }
  if (afraid(grazed, w.hunters, w.terrain, T)) {
    const held = grazed.trail === undefined ? { ...grazed, ...moveBody(w.terrain, grazed, 0, 0, dt, T) } : { ...grazed, vx: 0 };
    return still({ ...held, tucked: true });
  }
  const goal = plan.take ? w.trail.nearest(centre(plan.take).x, plan.take.y + plan.take.h).d : target;
  if (grazed.trail === undefined) return offTrail(grazed, w, dt);
  return alongTrail(grazed, plan, w, goal, dt);
}

/** On the crab's footsteps: along them towards `goal`, faster the further it has to go. */
function alongTrail(k: Critter, plan: ChainStep, w: LineWorld, goal: number, dt: number): FollowerStep {
  const at = k.trail!;
  const lag = goal - at;
  const pace = Math.min(LINE.maxPace, LINE.pace + Math.abs(lag) * LINE.catchUp);
  const d = Math.abs(lag) <= pace * dt ? goal : at + Math.sign(lag) * pace * dt;
  const p = w.trail.at(d);
  const next = clearOf(w, { ...k, x: p.x - k.w / 2, y: p.y - k.h });
  // A wall of sand across the way: it waits for the crab to clear it.
  if (!next) return still({ ...k, vx: 0, vy: 0, tucked: false });
  const dx = next.x - k.x;
  const dir: 1 | -1 = Math.abs(dx) > 0.01 ? (dx > 0 ? 1 : -1) : plan.face;
  const moved: Critter = { ...next, trail: d, vx: dx / dt, vy: 0, onGround: true, dir, tucked: false };
  const take = plan.take;
  if (take?.kind.type === 'shell' && overlaps(moved, take)) return still({ ...moved, vx: 0, swap: startSwap(take.id) });
  return eaten(still(moved), underfoot(moved, w.items));
}

/**
 * Off the trail: scrambling straight back onto it, to the spot it's making
 * for (`spur`: for a recruit just joined, where the crab was), always in
 * sight of it; or to the nearest spot, after moving house.
 */
function offTrail(k: Critter, w: LineWorld, dt: number): FollowerStep {
  const feet = { x: k.x + k.w / 2, y: k.y + k.h };
  const spur = k.spur ?? w.trail.nearest(feet.x, feet.y).d;
  const p = w.trail.at(spur);
  const off = Math.hypot(p.x - feet.x, p.y - feet.y);
  if (off <= LINE.board) return still({ ...k, trail: spur, spur: undefined, tucked: false });
  const step = Math.min(off, LINE.pace * dt);
  const ux = (p.x - feet.x) / off;
  const uy = (p.y - feet.y) / off;
  const next = clearOf(w, { ...k, x: k.x + ux * step, y: k.y + uy * step });
  if (!next) return still({ ...k, vx: 0, vy: 0, spur, tucked: false });
  const dir: 1 | -1 = ux >= 0 ? 1 : -1;
  const moved: Critter = { ...next, vx: (ux * step) / dt, vy: 0, onGround: true, dir, spur, trail: undefined, tucked: false };
  return eaten(still(moved), underfoot(moved, w.items));
}

/** A follower's box where it's going, stepped up over a little sand that has poured or slid there; null if there's more than that in the way. */
function clearOf(w: LineWorld, box: Critter): Critter | null {
  for (let up = 0; up <= LINE.stepUp; up += 2) {
    const lifted = { ...box, y: box.y - up };
    if (!boxHitsSolid(w.terrain, lifted, w.tile)) return lifted;
  }
  return null;
}

/** A follower just moved into a shell, back on the trail where it stands (or off it, to walk back, if it isn't by it). */
function board(k: Critter, trail: Trail): Critter {
  const near = trail.nearest(k.x + k.w / 2, k.y + k.h);
  return { ...k, trail: near.off <= LINE.board ? near.d : undefined };
}

/**
 * Each follower's place along the crab's footsteps: the first just behind
 * the crab, out of reach of a rap, the rest in a line behind it.
 */
export function trailPlaces(line: readonly Critter[], crabW: number, trail: Trail): Map<number, number> {
  const places = new Map<number, number>();
  let back = 0;
  let ahead = crabW;
  let gap: number = FOLLOW.gap;
  for (const k of line) {
    back += ahead / 2 + k.w / 2 + gap;
    places.set(k.id, Math.max(trail.start, trail.end - back));
    ahead = k.w;
    gap = CHAIN.gap;
  }
  return places;
}
