import { capsuleContact, type Contact, type Seg } from './geom';
import { COIN, GRAIN_R, GRAVITY, LAVA, STONE, WATER, type Grains } from './particles';

/**
 * Boulders: round stones that roll down slopes, sink through water and
 * coins, plug a drain they settle in, and squash whatever they land on.
 * Crates are the wooden kind: square to stand on, they float on water, ride
 * its current, and burn away in lava.
 */

export const BOULDER_R = 26;
/** A boulder coming down at least this fast (px per step) squashes what it lands on. */
export const CRUSH_SPEED = 1.6;
/** Speed kept per step while rolling. */
const ROLL_KEEP = 0.995;
/** Share of gravity that water takes off a sinking boulder, and the drag it adds. */
const SINK = 0.35;
const WATER_DRAG = 0.97;
/** Fastest a boulder falls or rolls (px per step), so it lands where it drops instead of skipping off. */
const MAX_SPEED = 6;
/**
 * How far past its sides a crate feels the water (px): it pushes grains out
 * to its sides plus a grain's radius, so it must look further than that.
 */
const CRATE_FEEL = GRAIN_R * 2 + 4;
/** Water grains in that band when the crate is half under: it floats there. */
const CRATE_AFLOAT = 14;
/** Drag on a crate in water, and how strongly the water's current carries it. */
const CRATE_DRAG = 0.94;
const CRATE_CURRENT = 0.08;
/** Speed a crate keeps sliding along the floor (it doesn't roll). */
const CRATE_SLIDE = 0.8;
/** Lava grains touching a crate that set it alight. */
const CRATE_BURN = 2;

export interface Boulder {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly r: number;
  /** Turned this far by rolling (radians), for the art. */
  angle: number;
  /** A wooden crate rather than a stone. */
  readonly crate: boolean;
  /** Burnt away (a crate in lava): out of play. */
  gone: boolean;
}

export function boulder(x: number, y: number, crate = false): Boulder {
  return { x, y, vx: 0, vy: 0, r: BOULDER_R, angle: 0, crate, gone: false };
}

/** Steps a boulder or a crate; a crate that touches lava burns away (reported with true). */
export function stepBody(b: Boulder, segs: readonly Seg[], g: Grains, k: Contact): boolean {
  if (b.gone) return false;
  if (!b.crate) {
    stepBoulder(b, segs, g, k);
    return false;
  }
  return stepCrate(b, segs, g, k);
}

function stepCrate(b: Boulder, segs: readonly Seg[], g: Grains, k: Contact): boolean {
  let wet = 0;
  let lava = 0;
  let flow = 0;
  const reach = b.r + CRATE_FEEL;
  g.near(b.x, b.y, reach * Math.SQRT2, (i) => {
    if (Math.abs(g.x[i]! - b.x) > reach || Math.abs(g.y[i]! - b.y) > reach) return;
    if (g.kind[i] === WATER) {
      wet++;
      flow += g.vx[i]!;
    } else if (g.kind[i] === LAVA && Math.abs(g.x[i]! - b.x) < b.r + GRAIN_R + 2 && Math.abs(g.y[i]! - b.y) < b.r + GRAIN_R + 2) lava++;
  });
  if (lava >= CRATE_BURN) {
    b.gone = true;
    return true;
  }
  b.vy += GRAVITY * (1 - Math.min(2, wet / CRATE_AFLOAT));
  if (wet > 2) {
    b.vx += (flow / wet - b.vx) * CRATE_CURRENT;
    b.vx *= CRATE_DRAG;
    b.vy *= CRATE_DRAG;
  }
  const speed = Math.hypot(b.vx, b.vy);
  if (speed > MAX_SPEED) {
    b.vx *= MAX_SPEED / speed;
    b.vy *= MAX_SPEED / speed;
  }
  b.x += b.vx;
  b.y += b.vy;
  let floored = false;
  for (let pass = 0; pass < 2; pass++) {
    for (const s of segs) {
      if (!capsuleContact(s, b.x, b.y, b.r, k)) continue;
      if (k.ny < -0.5) floored = true;
      settle(b, k);
    }
    g.near(b.x, b.y, b.r + GRAIN_R, (i) => {
      if (g.kind[i] !== STONE) return;
      if (!circleContact(g.x[i]!, g.y[i]!, GRAIN_R, b.x, b.y, b.r, k)) return;
      if (k.ny < -0.5) floored = true;
      settle(b, k);
    });
  }
  if (floored) b.vx *= CRATE_SLIDE;
  pushGrains(b, g);
  return false;
}

/** One step: falls, rolls, and pushes the loose grains out of its way. Walls, pins and stone hold it. */
export function stepBoulder(b: Boulder, segs: readonly Seg[], g: Grains, k: Contact): void {
  let wet = 0;
  g.near(b.x, b.y, b.r + GRAIN_R, (i) => {
    if (g.kind[i] === WATER) wet++;
  });
  b.vy += GRAVITY;
  if (wet > 3) {
    b.vy -= GRAVITY * SINK;
    b.vx *= WATER_DRAG;
    b.vy *= WATER_DRAG;
  }
  b.vx *= ROLL_KEEP;
  const speed = Math.hypot(b.vx, b.vy);
  if (speed > MAX_SPEED) {
    b.vx *= MAX_SPEED / speed;
    b.vy *= MAX_SPEED / speed;
  }
  const fromX = b.x;
  b.x += b.vx;
  b.y += b.vy;
  for (let pass = 0; pass < 2; pass++) {
    for (const s of segs) if (capsuleContact(s, b.x, b.y, b.r, k)) settle(b, k);
    g.near(b.x, b.y, b.r + GRAIN_R, (i) => {
      if (g.kind[i] !== STONE) return;
      if (circleContact(g.x[i]!, g.y[i]!, GRAIN_R, b.x, b.y, b.r, k)) settle(b, k);
    });
  }
  b.angle += (b.x - fromX) / b.r;
  pushGrains(b, g);
}

/** Pushes the loose grains out of a boulder's way (out of a crate's square). */
function pushGrains(b: Boulder, g: Grains): void {
  const reach = b.r + GRAIN_R;
  g.near(b.x, b.y, reach * (b.crate ? Math.SQRT2 : 1), (i) => {
    if (g.kind[i] === STONE) return;
    const out = b.crate ? boxPush(b.x, b.y, b.r, g.x[i]!, g.y[i]!, GRAIN_R) : roundPush(b.x, b.y, b.r, g.x[i]!, g.y[i]!, GRAIN_R);
    if (!out) return;
    if (g.kind[i] === COIN) g.wake(i);
    g.x[i] = g.x[i]! + out.x;
    g.y[i] = g.y[i]! + out.y;
  });
}

function roundPush(cx: number, cy: number, cr: number, x: number, y: number, r: number): { x: number; y: number } | null {
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const push = cr + r - d;
  return push > 0 ? { x: (dx / d) * push, y: (dy / d) * push } : null;
}

/** How far to move the circle (x, y, r) out of the square of half-size `h` at (cx, cy). */
function boxPush(cx: number, cy: number, h: number, x: number, y: number, r: number): { x: number; y: number } | null {
  const dx = x - cx;
  const dy = y - cy;
  const ox = h + r - Math.abs(dx);
  const oy = h + r - Math.abs(dy);
  if (ox <= 0 || oy <= 0) return null;
  // Past a corner: push out along the line from the corner.
  if (Math.abs(dx) > h && Math.abs(dy) > h) {
    const kx = dx - Math.sign(dx) * h;
    const ky = dy - Math.sign(dy) * h;
    const d = Math.hypot(kx, ky) || 1;
    return d < r ? { x: (kx / d) * (r - d), y: (ky / d) * (r - d) } : null;
  }
  return ox < oy ? { x: Math.sign(dx || 1) * ox, y: 0 } : { x: 0, y: Math.sign(dy || 1) * oy };
}

/** Pushes the circle (x, y, r) out of a boulder (round) or a crate (square): writes the push into `out`. */
export function bodyContact(b: Boulder, x: number, y: number, r: number, out: Contact): boolean {
  if (b.gone) return false;
  if (!b.crate) return circleContact(b.x, b.y, b.r, x, y, r, out);
  const p = boxPush(b.x, b.y, b.r, x, y, r);
  if (!p) return false;
  const d = Math.hypot(p.x, p.y) || 1;
  out.nx = p.x / d;
  out.ny = p.y / d;
  out.depth = d;
  return true;
}

/** Two boulders never overlap: each moves half the way apart. */
export function separate(a: Boulder, b: Boulder): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const push = a.r + b.r - d;
  if (push <= 0) return;
  const ux = dx / d;
  const uy = dy / d;
  a.x -= ux * push * 0.5;
  a.y -= uy * push * 0.5;
  b.x += ux * push * 0.5;
  b.y += uy * push * 0.5;
}

/** Pushes the circle (x, y, r) out of the circle (ox, oy, or): writes the push into `out`. */
export function circleContact(ox: number, oy: number, or: number, x: number, y: number, r: number, out: Contact): boolean {
  const dx = x - ox;
  const dy = y - oy;
  const d2 = dx * dx + dy * dy;
  const reach = or + r;
  if (d2 >= reach * reach) return false;
  const d = Math.sqrt(d2) || 1;
  out.nx = d > 1e-6 ? dx / d : 0;
  out.ny = d > 1e-6 ? dy / d : -1;
  out.depth = reach - d;
  return true;
}

function settle(b: Boulder, k: Contact): void {
  b.x += k.nx * k.depth;
  b.y += k.ny * k.depth;
  const vn = b.vx * k.nx + b.vy * k.ny;
  if (vn < 0) {
    b.vx -= vn * k.nx;
    b.vy -= vn * k.ny;
  }
}
