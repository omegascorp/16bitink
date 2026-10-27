import { capsuleContact, type Contact, type Seg } from './geom';
import { COIN, GRAIN_R, GRAVITY, STONE, WATER, type Grains } from './particles';

/**
 * Boulders: round stones that roll down slopes, sink through water and
 * coins, plug a drain they settle in, and squash whatever they land on.
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

export interface Boulder {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly r: number;
  /** Turned this far by rolling (radians), for the art. */
  angle: number;
}

export function boulder(x: number, y: number): Boulder {
  return { x, y, vx: 0, vy: 0, r: BOULDER_R, angle: 0 };
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
  g.near(b.x, b.y, b.r + GRAIN_R, (i) => {
    if (g.kind[i] === STONE) return;
    const dx = g.x[i]! - b.x;
    const dy = g.y[i]! - b.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const push = b.r + GRAIN_R - d;
    if (push <= 0) return;
    if (g.kind[i] === COIN) g.wake(i);
    g.x[i] = g.x[i]! + (dx / d) * push;
    g.y[i] = g.y[i]! + (dy / d) * push;
  });
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
