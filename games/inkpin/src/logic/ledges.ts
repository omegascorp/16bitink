import { isBox, type Boulder } from './boulders';
import { capsuleContact, type Contact, type Seg } from './geom';
import type { LedgeDef } from './level';
import { COIN, GRAIN_R, GRAVITY, LAVA, STONE, WATER, type Grains } from './particles';

/**
 * Crumbling basalt ledges. A ledge is solid like a wall until Nib has stood
 * on it and stepped off; then it cracks, wobbles a moment (the art draws the
 * crack), and falls as a slab: straight down, staying level, sinking slowly
 * through liquid and gold, until it lands on something solid. There it stays
 * as ground for good. To everything else (grains, creatures, bodies, rubies)
 * it's a capsule in the world's segments, LEDGE_T thick on each side of a
 * centre line LEDGE_T under its top.
 */

/** Half the thickness of a ledge: its slab is x0..x1 by y..y + 2 * LEDGE_T, like a wall. */
export const LEDGE_T = 8;
/** Steps Nib must be off a ledge before it cracks: loose stone underfoot doesn't count as leaving. */
export const LEAVE_STEPS = 10;
/** Steps a cracked ledge wobbles before it falls (0.4 s). */
export const CRACK_STEPS = 48;
/** Fastest a slab falls (px per step, 720 px/s), as boulders. */
const SLAB_MAX = 6;
/** Liquid or gold grains touching a slab that slow it: it's sinking now, not falling. */
const SLAB_WET = 4;
/** Share of gravity a slab keeps in liquid, and the drag (thick lava drags harder): it sinks at about 100 px/s in water, 50 px/s in lava. */
const SLAB_SINK = 0.6;
const WATER_DRAG = 0.955;
const LAVA_DRAG = 0.92;
/** Most it climbs back out of what it hit in a step (px): a slab never jumps up. */
const MAX_LIFT = SLAB_MAX + 4;
/** Spacing of the circles that stand for its underside against walls (px). */
const PROBE = 4;

export type LedgeState = 'up' | 'cracking' | 'falling' | 'down';

export interface Ledge {
  readonly def: LedgeDef;
  state: LedgeState;
  /** Where it is now, along its top surface. */
  x0: number;
  x1: number;
  y: number;
  vy: number;
  /** The step it cracked at. */
  crackAt: number;
  /** True once Nib has stood on it. */
  stood: boolean;
  /** Steps since Nib was last on it. */
  away: number;
}

export type LedgeSave = Omit<Ledge, 'def'>;

export type LedgeEvent =
  | { readonly type: 'crack'; readonly index: number; readonly x: number; readonly y: number }
  | { readonly type: 'slabDown'; readonly index: number; readonly x: number; readonly y: number };

type Sink = { push(...e: LedgeEvent[]): number };

export function ledge(def: LedgeDef): Ledge {
  return { def, state: 'up', x0: def.x0, x1: def.x1, y: def.y, vy: 0, crackAt: 0, stood: false, away: 0 };
}

/** The ledge as a wall: a capsule whose round ends stay inside x0..x1. */
export function ledgeSeg(l: Ledge): Seg {
  const half = Math.min(LEDGE_T, (l.x1 - l.x0) / 2);
  return { ax: l.x0 + half, ay: l.y + LEDGE_T, bx: l.x1 - half, by: l.y + LEDGE_T, t: LEDGE_T };
}

/** True while a slab is on its way down (or about to be), so the world isn't settled. */
export function ledgeMoving(l: Ledge): boolean {
  return l.state === 'cracking' || (l.state === 'falling' && l.vy > 0.05);
}

/**
 * Nib on a ledge or not this step: once he has stood on it and been off it
 * for LEAVE_STEPS, it cracks. A ledge that came down as a slab never cracks
 * again.
 */
export function noteNib(l: Ledge, index: number, on: boolean, steps: number, events: Sink): void {
  if (l.state !== 'up') return;
  if (on) {
    l.stood = true;
    l.away = 0;
    return;
  }
  if (!l.stood || ++l.away < LEAVE_STEPS) return;
  l.state = 'cracking';
  l.crackAt = steps;
  events.push({ type: 'crack', index, x: (l.x0 + l.x1) / 2, y: l.y });
}

/** What a falling slab can land on. `statics` are the walls and the pins still in. */
export interface SlabWorld {
  readonly statics: readonly Seg[];
  readonly ledges: readonly Ledge[];
  readonly bodies: readonly Boulder[];
  readonly grains: Grains;
}

/** One step of a cracked or falling slab. */
export function stepSlab(l: Ledge, index: number, w: SlabWorld, steps: number, k: Contact, events: Sink): void {
  if (l.state === 'cracking' && steps - l.crackAt >= CRACK_STEPS) {
    l.state = 'falling';
    l.vy = 0;
  }
  if (l.state !== 'falling') return;
  const { wet, lava } = liquidAround(l, w.grains, k);
  l.vy += GRAVITY * (wet >= SLAB_WET ? SLAB_SINK : 1);
  if (wet >= SLAB_WET) l.vy *= lava * 2 > wet ? LAVA_DRAG : WATER_DRAG;
  l.vy = Math.min(l.vy, SLAB_MAX);
  l.y += l.vy;
  const hit = support(l, index, w, k);
  if (hit.lift <= 0) return;
  l.y -= Math.min(hit.lift, MAX_LIFT);
  l.vy = 0;
  if (!hit.ground) return;
  l.state = 'down';
  popTrapped(l, w.grains);
  events.push({ type: 'slabDown', index, x: (l.x0 + l.x1) / 2, y: l.y });
}

/**
 * Liquid and gold caught between a landed slab and the floor squeeze up
 * round it: they're put on its top, where they run off. (Out past its ends
 * could be into a wall, if it came down in a channel.)
 */
function popTrapped(l: Ledge, g: Grains): void {
  const s = ledgeSeg(l);
  const bottom = l.y + 2 * LEDGE_T;
  g.near((s.ax + s.bx) / 2, s.ay, (s.bx - s.ax) / 2 + LEDGE_T + GRAIN_R * 2, (i) => {
    const x = g.x[i]!;
    const y = g.y[i]!;
    if (g.kind[i] === STONE || x <= l.x0 || x >= l.x1 || y <= l.y || y >= bottom + GRAIN_R * 2) return;
    g.wake(i);
    g.y[i] = l.y - GRAIN_R - 1;
    g.vx[i] = 0;
    g.vy[i] = 0;
  });
}

/** Counts the liquid and gold touching a slab, and wakes the gold so it makes way. */
function liquidAround(l: Ledge, g: Grains, k: Contact): { wet: number; lava: number } {
  const s = ledgeSeg(l);
  let wet = 0;
  let lava = 0;
  g.near((s.ax + s.bx) / 2, s.ay, (s.bx - s.ax) / 2 + LEDGE_T + GRAIN_R + 2, (i) => {
    const kind = g.kind[i];
    if (kind !== WATER && kind !== LAVA && kind !== COIN) return;
    if (!capsuleContact(s, g.x[i]!, g.y[i]!, GRAIN_R + 2, k)) return;
    wet++;
    if (kind === LAVA) lava++;
    if (kind === COIN) g.wake(i);
  });
  return { wet, lava };
}

/**
 * How far the slab must rise to clear what it came down on this step, and
 * whether that's solid ground (a wall, a pin, set stone, a ledge or slab at
 * rest) or something that may move away (a body, another slab still
 * falling), which only holds it up for now. Only things under it count: a
 * wall beside it slides past.
 */
function support(l: Ledge, index: number, w: SlabWorld, k: Contact): { lift: number; ground: boolean } {
  const s = ledgeSeg(l);
  const bottom = l.y + 2 * LEDGE_T;
  let lift = 0;
  let ground = false;
  const n = Math.max(1, Math.ceil((s.bx - s.ax) / PROBE));
  for (const o of w.statics) {
    for (let p = 0; p <= n; p++) {
      if (!capsuleContact(o, s.ax + ((s.bx - s.ax) * p) / n, s.ay, LEDGE_T, k) || k.ny > -0.3) continue;
      lift = Math.max(lift, k.depth / -k.ny);
      ground = true;
    }
  }
  w.ledges.forEach((o, j) => {
    if (j === index || o.x0 >= l.x1 || o.x1 <= l.x0 || o.y <= l.y || o.y >= bottom) return;
    lift = Math.max(lift, bottom - o.y);
    if (o.state !== 'falling') ground = true;
  });
  const g = w.grains;
  g.near((s.ax + s.bx) / 2, s.ay, (s.bx - s.ax) / 2 + LEDGE_T + GRAIN_R, (i) => {
    if (g.kind[i] !== STONE || !g.set[i]) return;
    if (!capsuleContact(s, g.x[i]!, g.y[i]!, GRAIN_R, k) || k.ny < 0.3) return;
    lift = Math.max(lift, k.depth / k.ny);
    ground = true;
  });
  for (const b of w.bodies) {
    if (b.gone) continue;
    if (isBox(b)) {
      const top = b.y - b.hh;
      if (b.x - b.hw >= l.x1 || b.x + b.hw <= l.x0 || top >= bottom || b.y <= s.ay) continue;
      lift = Math.max(lift, bottom - top);
    } else if (capsuleContact(s, b.x, b.y, b.r, k) && k.ny > 0.3) lift = Math.max(lift, k.depth / k.ny);
  }
  return { lift, ground };
}

export function saveLedge(l: Ledge): LedgeSave {
  const { def: _def, ...rest } = l;
  return rest;
}

export function loadLedge(l: Ledge, s: LedgeSave): void {
  Object.assign(l, s);
}
