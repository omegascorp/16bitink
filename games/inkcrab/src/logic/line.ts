import { moveBody, type Box } from './body';
import type { Critter, Surroundings } from './critters';
import { centre, overlaps, type Item } from './items';
import type { ChainStatus } from './mission';
import type { Rng } from './rng';
import { inShell, stepRival, type Rapper, type RivalStep } from './rivals';
import type { Shell } from './shells';
import type { Terrain } from './terrain';
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
  /** Points a second a follower picks up nibbling, while it has room to grow. */
  graze: 0.1,
  /** Tiles off a hungry follower goes for loose food, and how far it strays from the crab for it. */
  forage: 5,
  stray: 8,
  /** Tiles off (across, and rows above or below) a bigger hunter makes a follower pull in and wait. */
  fear: 4,
  fearRows: 2,
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

/** Whether a recruit joins the crab now: it's close, and the crab is no smaller than it. */
export function joins(k: Critter, crab: Rapper, tile: number): boolean {
  if (!k.recruit || k.joined || crab.size < k.size) return false;
  const a = centre(k);
  const b = centre(crab.box);
  return Math.abs(a.x - b.x) <= LINE.join * tile && Math.abs(a.y - b.y) <= LINE.rows * tile;
}

/**
 * Where each follower goes: to a shell handed down the line (`handDowns`,
 * left by the crab or the follower ahead) that it can move up into, or to
 * its place in line behind the one ahead.
 */
export function planLine(line: readonly Critter[], leader: Leader, items: Iterable<Item>, handDowns: ReadonlySet<number>): Map<number, ChainStep> {
  const plan = new Map<number, ChainStep>();
  const loose = [...items].filter((i) => handDowns.has(i.id) && !i.buried && i.kind.type === 'shell');
  const claimed = new Set<number>();
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
}

export interface FollowerStep extends RivalStep {
  /** Food it ate this step, gone from the sand. */
  readonly ate: Item | null;
}

/** Whether a bigger hunter is close to a follower, on its level. */
function afraid(k: Critter, hunters: readonly Critter[], tile: number): boolean {
  const a = centre(k);
  return hunters.some((h) => {
    if (h.flight || h.size <= k.size) return false;
    const b = centre(h);
    return Math.abs(a.x - b.x) <= LINE.fear * tile && Math.abs(a.y - b.y) <= LINE.fearRows * tile;
  });
}

/** The nearest loose food a hungry follower would go for, not too far from the crab. */
function snack(k: Critter, w: LineWorld): Item | null {
  if (full(k)) return null;
  const at = centre(k);
  const crabX = centre(w.crab.box).x;
  let best: Item | null = null;
  for (const i of w.items) {
    if (i.buried || i.kind.type !== 'food') continue;
    const p = centre(i);
    const d = Math.abs(p.x - at.x);
    if (d > LINE.forage * w.tile || Math.abs(p.y - at.y) > 2 * w.tile || Math.abs(p.x - crabX) > LINE.stray * w.tile) continue;
    if (!best || d < Math.abs(centre(best).x - at.x)) best = i;
  }
  return best;
}

/**
 * One step for a follower: pulled into its shell while a bigger hunter is
 * close; off to move up into a shell handed down to it; off for a bite to
 * eat while it has room to grow; or keeping its place in line. It nibbles
 * as it goes.
 */
export function stepFollower(k: Critter, plan: ChainStep, w: LineWorld, dt: number): FollowerStep {
  const T = w.tile;
  const grazed = fed(k, LINE.graze * dt);
  if (afraid(grazed, w.hunters, T)) {
    return { rival: { ...grazed, ...moveBody(w.terrain, grazed, 0, 0, dt, T), tucked: true }, took: null, left: null, ate: null };
  }
  const food = plan.take ? null : snack(grazed, w);
  const step: ChainStep = food ? { ...plan, x: centre(food).x } : plan;
  const r = stepRival(w.terrain, grazed, w.crab, w.items, dt, T, w.rng, w.env, new Set(), step);
  if (!food || !overlaps(r.rival, food)) return { ...r, ate: null };
  if (food.kind.type !== 'food') return { ...r, ate: null };
  return { ...r, rival: fed(r.rival, food.kind.points), ate: food };
}
