import { bodyContact, circleContact, type Boulder } from './boulders';
import { capsuleContact, type Contact, type Seg } from './geom';
import { COIN, GRAIN_R, GRAVITY, LAVA, STONE, WATER, type Grains } from './particles';

/**
 * Fire rubies: gems lava can't hurt. Each is a small heavy body: it drops
 * faster than a coin, rolls a little and stops, and sinks through water,
 * lava and gold to the floor, pushing them aside. It isn't a grain, so lava
 * never melts it, and walls, pins, ledges, set stone and bodies hold it.
 */

/** What a ruby is worth, in coins, toward the coin target and the bank. */
export const RUBY_COINS = 10;
export const RUBY_R = 9;
/** Speed kept per step in the air: a gem cuts through it (a coin keeps 0.985). */
const AIR_KEEP = 0.998;
/** Share of gravity liquid takes off a sinking ruby, and the drag: it sinks at about 90 px/s in water, 55 px/s in lava. */
const SINK = 0.5;
const WATER_DRAG = 0.95;
const LAVA_DRAG = 0.92;
/** Liquid grains around it that slow it, and how far it feels them (it pushes them a grain's radius off, so further than that). */
const WET = 3;
const FEEL = RUBY_R + GRAIN_R * 2 + 4;
/** Speed kept per step while it touches the ground: it rolls a little and stops. */
const ROLL_KEEP = 0.9;
/** Fastest it falls (px per step), as boulders. */
const MAX_SPEED = 6;

export interface Ruby {
  readonly id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** In Nib's sack. */
  taken: boolean;
  /** Down a drain or off the board. */
  lost: boolean;
}

export type RubyEvent =
  | { readonly type: 'ruby'; readonly id: number; readonly x: number; readonly y: number }
  | { readonly type: 'rubyLost'; readonly id: number; readonly x: number; readonly y: number };

export function ruby(id: number, x: number, y: number): Ruby {
  return { id, x, y, vx: 0, vy: 0, taken: false, lost: false };
}

export function inPlay(r: Ruby): boolean {
  return !r.taken && !r.lost;
}

/** One step: falls or sinks, rests on what's solid, and pushes loose grains out of its way. */
export function stepRuby(r: Ruby, segs: readonly Seg[], g: Grains, bodies: readonly Boulder[], k: Contact): void {
  if (!inPlay(r)) return;
  let wet = 0;
  let lava = 0;
  g.near(r.x, r.y, FEEL, (i) => {
    const kind = g.kind[i];
    if (kind === WATER || kind === COIN) wet++;
    else if (kind === LAVA) {
      wet++;
      lava++;
    }
  });
  r.vy += GRAVITY;
  if (wet > WET) {
    r.vy -= GRAVITY * SINK;
    const drag = lava * 2 > wet ? LAVA_DRAG : WATER_DRAG;
    r.vx *= drag;
    r.vy *= drag;
  } else {
    r.vx *= AIR_KEEP;
    r.vy *= AIR_KEEP;
  }
  const speed = Math.hypot(r.vx, r.vy);
  if (speed > MAX_SPEED) {
    r.vx *= MAX_SPEED / speed;
    r.vy *= MAX_SPEED / speed;
  }
  r.x += r.vx;
  r.y += r.vy;
  let ground = false;
  // Walls last: wedged between set stone and a floor, it gives way to the stone, never through the floor.
  for (let pass = 0; pass < 2; pass++) {
    g.near(r.x, r.y, RUBY_R + GRAIN_R, (i) => {
      if (g.kind[i] === STONE && g.set[i] && circleContact(g.x[i]!, g.y[i]!, GRAIN_R, r.x, r.y, RUBY_R, k)) ground = resolve(r, k) || ground;
    });
    for (const b of bodies) if (bodyContact(b, r.x, r.y, RUBY_R, k)) ground = resolve(r, k) || ground;
    for (const s of segs) if (capsuleContact(s, r.x, r.y, RUBY_R, k)) ground = resolve(r, k) || ground;
  }
  if (ground) {
    r.vx *= ROLL_KEEP;
    r.vy *= ROLL_KEEP;
  }
  pushGrains(r, g);
}

/** Two rubies never overlap. */
export function separateRubies(rs: readonly Ruby[]): void {
  for (let i = 0; i < rs.length; i++) {
    for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i]!;
      const b = rs[j]!;
      if (!inPlay(a) || !inPlay(b)) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const push = RUBY_R * 2 - d;
      if (push <= 0) continue;
      a.x -= (dx / d) * push * 0.5;
      a.y -= (dy / d) * push * 0.5;
      b.x += (dx / d) * push * 0.5;
      b.y += (dy / d) * push * 0.5;
    }
  }
}

/** Pushes a ruby out of a creature's circle (a guard shoves it along). */
export function shove(r: Ruby, x: number, y: number, radius: number): void {
  const dx = r.x - x;
  const dy = r.y - y;
  const d = Math.hypot(dx, dy) || 1;
  const push = radius + RUBY_R - d;
  if (push <= 0) return;
  r.x += (dx / d) * push;
  r.y += (dy / d) * push;
}

/** Moves the ruby out of what it hit and stops it going in; true when that's ground under it. */
function resolve(r: Ruby, k: Contact): boolean {
  r.x += k.nx * k.depth;
  r.y += k.ny * k.depth;
  const vn = r.vx * k.nx + r.vy * k.ny;
  if (vn < 0) {
    r.vx -= vn * k.nx;
    r.vy -= vn * k.ny;
  }
  return k.ny < -0.5;
}

/** Loose grains make way for it, gravel too; only stone that has set holds it. */
function pushGrains(r: Ruby, g: Grains): void {
  g.near(r.x, r.y, RUBY_R + GRAIN_R, (i) => {
    if (g.kind[i] === STONE && g.set[i]) return;
    const dx = g.x[i]! - r.x;
    const dy = g.y[i]! - r.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const push = RUBY_R + GRAIN_R - d;
    if (push <= 0) return;
    if (g.kind[i] === COIN) g.wake(i);
    g.x[i] = g.x[i]! + (dx / d) * push;
    g.y[i] = g.y[i]! + (dy / d) * push;
  });
}

export type RubySave = Omit<Ruby, never>;

export function saveRuby(r: Ruby): RubySave {
  return { ...r };
}
