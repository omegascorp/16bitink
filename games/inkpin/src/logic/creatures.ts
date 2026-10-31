import { bodyContact, CRUSH_SPEED, type Boulder } from './boulders';
import { capsuleContact, segSegDistance, type Contact, type Seg } from './geom';
import { fireproof, hauls, type Blot, type BlotEnd } from './guards';
import { COIN, GRAIN_R, GRAVITY, LAVA, STONE, WATER, type Grains } from './particles';
import { inPlay, RUBY_R, shove, type Ruby } from './rubies';
import type { Vine } from './vines';
import type { LossCause } from './world';

/**
 * How a creature (Nib or a guard) walks, falls, floats and climbs, and
 * Nib's paws: kicking rubble aside, picking up and digging out gold and
 * rubies. The world owns the creatures; this is their physics.
 */

export interface Creature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly r: number;
  grounded: boolean;
  /** Steps since it last stood on something. */
  air: number;
  /** Water grains touching it this step. */
  wet: number;
  /** -1 left, 1 right: the way it faces. */
  facing: number;
}

/**
 * Steps a creature still counts as standing after losing touch with the
 * ground: loose stone and coins make it jitter, and it must keep walking,
 * climbing and jumping through that.
 */
export const FOOTING_STEPS = 8;
/** Climbing speed on a vine (px per step). */
const CLIMB_SPEED = 0.8;
/** The highest step a creature climbs without stopping (px): a raccoon hauls itself up a ledge. */
const STEP_UP = 44;
/** How far past its body Nib picks coins up (px). */
const PICKUP_REACH = 8;
/**
 * How far below its middle Nib digs coins out (px): gold that slipped
 * between stones or sank to the bottom of a pool is never out of reach.
 */
const DIG_DEPTH = 130;
/** Swimming, Nib dives for the gold at the bottom of the pool, however deep. */
const DIG_DEPTH_SWIM = 380;
/** Stones below this fraction of Nib's radius under its middle are floor; higher ones it kicks aside. */
const KICK_BELOW = 0.5;

/** What moving a creature needs of the world. */
export interface Mover {
  readonly grains: Grains;
  /** The walls, the pins still in, and the ledges. */
  readonly segs: readonly Seg[];
  readonly boulders: readonly Boulder[];
  readonly rubies: readonly Ruby[];
  readonly contact: Contact;
  lose(cause: LossCause): void;
  blotGone(b: Blot, how: BlotEnd): void;
  /** Nib picks up coin grain i. */
  collect(i: number): void;
  takeRuby(r: Ruby): void;
}

export function creature(x: number, y: number, r: number, facing: number): Creature {
  return { x, y, vx: 0, vy: 0, r, grounded: false, air: 0, wet: 0, facing };
}

/**
 * Walks, falls and floats a creature: walls and stone stop it, while it
 * pushes water, lava and coins aside. Nib picks up the coins and rubies it
 * touches. On a vine (`vine`, with `climb` its way), it climbs.
 */
export function moveCreature(m: Mover, c: Creature, walk: number, isNib: boolean, vine: Vine | null, climb: -1 | 0 | 1 | null): void {
  const g = m.grains;
  // Floating: the more water around it, the stronger the lift, with drag.
  c.wet = 0;
  let lava = false;
  g.near(c.x, c.y, c.r + GRAIN_R, (i) => {
    if (g.kind[i] === WATER) c.wet++;
    else if (g.kind[i] === LAVA) lava = true;
  });
  // A salamander wades through lava; it burns anything else.
  if (lava && (isNib || !fireproof(c as Blot))) {
    if (isNib) m.lose('burnt');
    else m.blotGone(c as Blot, 'scorched');
    return;
  }
  const footed = c.air <= FOOTING_STEPS;
  const canWalk = footed || c.wet > 3;
  if (vine) {
    // On a vine: hands on it, no falling; it moves only as it climbs.
    c.vx = (vine.x - c.x) * 0.25;
    c.vy = (climb ?? 0) * CLIMB_SPEED;
  } else {
    c.vy += GRAVITY;
    if (c.wet > 3) {
      c.vy -= GRAVITY * Math.min(2.2, c.wet / 7);
      c.vy *= 0.9;
    }
    c.vx = canWalk ? c.vx + (walk - c.vx) * 0.25 : c.vx * 0.99;
  }
  const fromX = c.x;
  c.x += c.vx;
  c.y += c.vy;
  c.grounded = false;
  const k = m.contact;
  for (let pass = 0; pass < 2; pass++) {
    for (const s of m.segs) if (capsuleContact(s, c.x, c.y, c.r, k)) resolve(c, k);
    // Stone is solid ground, but Nib kicks loose any rubble in front of its body.
    g.near(c.x, c.y, c.r + GRAIN_R, (i) => {
      if (g.kind[i] !== STONE) return;
      const dx = c.x - g.x[i]!;
      const dy = c.y - g.y[i]!;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      k.nx = dx / d;
      k.ny = dy / d;
      k.depth = c.r + GRAIN_R - d;
      if (k.depth <= 0) return;
      if (isNib && walk !== 0 && inTheWay(g, c, walk, i)) kick(g, c, walk, i, k);
      else if (!isNib && fireproof(c as Blot) && g.y[i]! < c.y) shoulder(g, i, k);
      else resolve(c, k);
    });
    // Boulders are solid too, and one coming down fast squashes what it lands on.
    for (const b of m.boulders) {
      if (!bodyContact(b, c.x, c.y, c.r, k)) continue;
      if (b.vy > CRUSH_SPEED && b.y < c.y - c.r * 0.5) {
        if (isNib) m.lose('crushed');
        else m.blotGone(c as Blot, 'stomped');
        return;
      }
      // A raft floating down onto a creature in the liquid rides up on its back instead of pressing it into the floor.
      if (b.raft && k.ny > 0.5) {
        b.x -= k.nx * k.depth;
        b.y -= k.ny * k.depth;
        if (b.vy > 0) b.vy = 0;
        continue;
      }
      resolve(c, k);
    }
  }
  if (vine) {
    c.y = Math.min(vine.bottom - c.r, Math.max(vine.top - c.r, c.y));
    c.grounded = true;
  }
  c.air = c.grounded ? 0 : c.air + 1;
  // Blocked while walking or swimming: climb a low step (a lip, a bump of stone, out of the water), never a wall.
  if (canWalk && walk !== 0 && Math.abs(c.x - fromX) < Math.abs(walk) * 0.3) {
    const ahead = c.x + Math.sign(walk) * 4;
    if (!overlaps(m, ahead, c.y - STEP_UP, c.r) && overlaps(m, ahead, c.y, c.r)) {
      c.y -= 2.5;
      c.x += Math.sign(walk) * 0.8;
      // Nib hauls itself up: no falling back between pulls, and it keeps its footing (so do the volcano's guards).
      if (isNib || hauls(c as Blot)) {
        c.vy = Math.min(c.vy, 0);
        c.air = 0;
      }
    }
  }
  // Everything loose makes way; Nib pockets the coins within reach.
  g.near(c.x, c.y, c.r + GRAIN_R + (isNib ? PICKUP_REACH : 0), (i) => {
    const kind = g.kind[i];
    if (kind === STONE) return;
    if (kind === COIN && isNib && Math.hypot(g.x[i]! - c.x, g.y[i]! - c.y) < c.r + GRAIN_R + PICKUP_REACH) {
      m.collect(i);
      return;
    }
    const dx = g.x[i]! - c.x;
    const dy = g.y[i]! - c.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const push = c.r + GRAIN_R - d;
    if (push <= 0) return;
    g.wake(i);
    g.x[i] = g.x[i]! + (dx / d) * push;
    g.y[i] = g.y[i]! + (dy / d) * push;
  });
  // Rubies too: Nib takes one he touches, a guard shoves it along.
  for (const r of m.rubies) {
    if (!inPlay(r)) continue;
    if (isNib && Math.hypot(r.x - c.x, r.y - c.y) < c.r + RUBY_R + PICKUP_REACH) m.takeRuby(r);
    else if (!isNib) shove(r, c.x, c.y, c.r);
  }
  if (isNib && (canWalk || vine)) dig(m, c);
}

/** True when a circle at (x, y) would overlap a wall, a pin still in, a ledge, stone or a body. */
export function overlaps(m: Mover, x: number, y: number, r: number): boolean {
  const k = m.contact;
  for (const s of m.segs) if (capsuleContact(s, x, y, r, k)) return true;
  let hit = false;
  const g = m.grains;
  g.near(x, y, r + GRAIN_R, (i) => {
    if (g.kind[i] === STONE) hit = true;
  });
  return hit || m.boulders.some((b) => bodyContact(b, x, y, r, k));
}

/** A stone ahead of Nib and above its feet: rubble in the way, not the floor. */
function inTheWay(g: Grains, c: Creature, walk: number, i: number): boolean {
  return Math.sign(g.x[i]! - c.x) === Math.sign(walk) && g.y[i]! < c.y + c.r * KICK_BELOW;
}

/**
 * Nib shoves a stone in its way, and the rubble around it comes loose, so
 * lava that set into a wall or a lump never shuts Nib in.
 */
function kick(g: Grains, c: Creature, walk: number, i: number, k: Contact): void {
  g.loosen(i);
  g.x[i] = g.x[i]! - k.nx * k.depth;
  g.y[i] = g.y[i]! - k.ny * k.depth;
  g.near(g.x[i]!, g.y[i]!, GRAIN_R * 4, (j) => {
    if (inTheWay(g, c, walk, j)) g.loosen(j);
  });
}

/**
 * A salamander wading under lava that cools to stone over it shoulders the
 * crust aside: stone above its middle comes loose and makes way, instead of
 * pressing it down into the floor.
 */
function shoulder(g: Grains, i: number, k: Contact): void {
  g.loosen(i);
  g.x[i] = g.x[i]! - k.nx * k.depth;
  g.y[i] = g.y[i]! - k.ny * k.depth;
}

/** Nib digs out the coins and rubies straight below it, in gaps between stones or at the bottom of a pool. */
function dig(m: Mover, c: Creature): void {
  const g = m.grains;
  const depth = c.wet > 3 ? DIG_DEPTH_SWIM : DIG_DEPTH;
  // Never through a floor, a pin or a ledge: only loose stone, water and coins.
  const clear = (x: number, y: number): boolean => {
    const reach: Seg = { ax: c.x, ay: c.y, bx: x, by: y, t: 0 };
    return !m.segs.some((s) => segSegDistance(reach, s) < s.t);
  };
  g.near(c.x, c.y + depth / 2, depth / 2 + GRAIN_R, (i) => {
    if (g.kind[i] !== COIN) return;
    const dy = g.y[i]! - c.y;
    if (Math.abs(g.x[i]! - c.x) >= c.r || dy <= 0 || dy >= depth) return;
    if (clear(g.x[i]!, g.y[i]!)) m.collect(i);
  });
  for (const r of m.rubies) {
    const dy = r.y - c.y;
    if (!inPlay(r) || Math.abs(r.x - c.x) >= c.r || dy <= 0 || dy >= depth) continue;
    if (clear(r.x, r.y)) m.takeRuby(r);
  }
}

function resolve(c: Creature, k: Contact): void {
  c.x += k.nx * k.depth;
  c.y += k.ny * k.depth;
  const vn = c.vx * k.nx + c.vy * k.ny;
  if (vn < 0) {
    c.vx -= vn * k.nx;
    c.vy -= vn * k.ny;
  }
  if (k.ny < -0.55) c.grounded = true;
}
