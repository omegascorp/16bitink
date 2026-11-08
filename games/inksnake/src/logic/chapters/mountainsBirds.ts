import type { Prey, PreySpec, PreyWorld } from '../preyTypes';
import { dist, pt, pushOut, type Pt, wrapAngle } from '../vec';

/**
 * The Zagros birds the spider-tailed viper hunts (larks, warblers, a finch,
 * the Isabelline shrike): they hop about the rock pecking, take fright and
 * fly off from a snake they see, and come down to a lure (the viper's
 * "spider" tail) to hop up and peck at it. Up in the air they're out of
 * reach: mode 'hidden' (the chapter view draws them, see
 * art/chapters/mountainsView.ts); just above the ground, taking off or
 * landing, a strike still catches them.
 *
 * A bird's own state, in `data`: `fly` 1 in the air, flying to (`tx`, `ty`);
 * `away` 1 if that's off the board (`gone` once there); `summoned` 1 if a
 * lure brought it; `lure` 1 while a lure pulls it this frame, the "spider"
 * at (`sx`, `sy`) (both set by the lure, see abilities/spidertail.ts);
 * `fright` seconds until it takes off; `peck` 1 while it pecks, `peckT`
 * seconds pecking at the spider; `landed` 1 once a summoned bird is down.
 */

/** The bird kinds, and how often each comes down to a lure. */
export const BIRD_WEIGHTS: Readonly<Record<string, number>> = { lark: 3, warbler: 3, 'desert-finch': 2, shrike: 1.2 };

/** Whether a prey kind is one of the chapter's birds. */
export const isBird = (kind: string): boolean => Object.prototype.hasOwnProperty.call(BIRD_WEIGHTS, kind);

/** A startled bird takes off this long after the fright, s: a strike in time still catches it. */
export const STARTLE = 0.35;
/** Flying speed, px/s; it starts down this far from where it lands, px; it climbs this fast, alt/s. */
const FLY_SPEED = 240;
const LAND_FROM = 110;
const RISE_RATE = 2.4;
/** Below this height it's still in reach (taking off, landing). */
const LOW = 0.2;
const HOP_TIME = 0.22;
/** It pecks at the spider this long before it sees the snake behind it and flies off, s. */
const PECK_TIME = 0.7;
/** It's at the spider this close, px, or this close to the head (it won't hop into the snake's mouth). */
const SPIDER_AT = 30;
const HEAD_AVOID = 34;
/** A bird scared off on the board lands again this far away, px. */
const RESETTLE = [180, 300] as const;
/** Keep this far in from the board's edges when landing, px. */
const EDGE = 40;

/** One step of a bird's life (its PreySpec `step`). */
export function stepBird(p: Prey, spec: PreySpec, world: PreyWorld, dt: number, near: boolean): void {
  const d = p.data ?? (p.data = {});
  if (d.fly) {
    fly(p, d, world, dt);
    return;
  }
  if ((d.fright ?? 0) > 0) {
    d.fright = (d.fright ?? 0) - dt;
    p.mode = 'idle';
    d.peck = 0;
    if ((d.fright ?? 0) <= 0) takeOff(p, d, world);
    return;
  }
  if (d.lure) {
    towardSpider(p, spec, d, world, dt);
    return;
  }
  d.peckT = 0;
  if (near) {
    d.fright = STARTLE;
    return;
  }
  wander(p, spec, d, world, dt);
}

/** Pottering about the rock: a hop now and then, pecking between. */
function wander(p: Prey, spec: PreySpec, d: Record<string, number>, world: PreyWorld, dt: number): void {
  p.timer -= dt;
  if (p.mode === 'hop') {
    p.x += Math.cos(p.heading) * spec.speed * dt;
    p.y += Math.sin(p.heading) * spec.speed * dt;
    if (p.timer <= 0) {
      p.mode = 'idle';
      p.timer = 0.6 + world.rng() * 1.4;
      d.peck = world.rng() < 0.5 ? 1 : 0;
    }
    return;
  }
  if (p.timer <= 0) {
    p.mode = 'hop';
    p.timer = HOP_TIME;
    d.peck = 0;
    p.heading = wrapAngle(p.heading + (world.rng() - 0.5) * 2.4);
  }
}

/** Lured: hop up to the "spider", round the snake's head rather than into its mouth, and peck at it. */
function towardSpider(p: Prey, spec: PreySpec, d: Record<string, number>, world: PreyWorld, dt: number): void {
  const spider = pt(d.sx ?? p.x, d.sy ?? p.y);
  const head = world.head;
  p.timer -= dt;
  if (p.mode === 'hop') {
    p.x += Math.cos(p.heading) * spec.speed * dt;
    p.y += Math.sin(p.heading) * spec.speed * dt;
    if (p.timer <= 0) {
      p.mode = 'idle';
      p.timer = 0.3 + world.rng() * 0.35;
    }
    return;
  }
  if (dist(p, spider) < SPIDER_AT || dist(p, head) < HEAD_AVOID + 4) {
    p.heading = Math.atan2(spider.y - p.y, spider.x - p.x);
    d.peck = 1;
    d.peckT = (d.peckT ?? 0) + dt;
    // A snake behind the spider! Off it goes.
    if ((d.peckT ?? 0) > PECK_TIME) d.fright = 0.01;
    return;
  }
  d.peck = 0;
  if (p.timer > 0) return;
  p.mode = 'hop';
  p.timer = HOP_TIME;
  p.heading = hopHeading(p, spider, head, spec.speed * HOP_TIME);
}

/** Towards `to`, turned aside if the hop would end too near the snake's head. */
function hopHeading(p: Prey, to: Pt, head: Pt, len: number): number {
  const base = Math.atan2(to.y - p.y, to.x - p.x);
  for (const off of [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35]) {
    const a = base + off;
    if (dist(pt(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len), head) >= HEAD_AVOID) return a;
  }
  return base;
}

/** Up and away: a migrant summoned by a lure flies on off the board; a bird of the place lands again elsewhere. */
function takeOff(p: Prey, d: Record<string, number>, world: PreyWorld): void {
  d.fly = 1;
  d.fright = 0;
  d.lure = 0;
  d.peck = 0;
  d.peckT = 0;
  const from = Math.atan2(p.y - world.head.y, p.x - world.head.x);
  let to: Pt | null = null;
  if (!d.summoned) {
    for (let i = 0; i < 24 && !to; i++) {
      const a = from + (world.rng() - 0.5) * 2.2;
      const r = RESETTLE[0] + world.rng() * (RESETTLE[1] - RESETTLE[0]);
      const q = pt(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      const onBoard = q.x > EDGE && q.y > EDGE && q.x < world.w - EDGE && q.y < world.h - EDGE;
      if (onBoard && dist(q, world.head) > 150 && !world.solids.some((s) => pushOut(q, 14, s))) to = q;
    }
  }
  d.away = to ? 0 : 1;
  if (!to) to = pt(p.x + Math.cos(from) * 900, p.y + Math.sin(from) * 900);
  d.tx = to.x;
  d.ty = to.y;
  p.heading = Math.atan2(to.y - p.y, to.x - p.x);
}

/** In the air: flying to its spot, coming down over the last stretch (or on off the board). */
function fly(p: Prey, d: Record<string, number>, world: PreyWorld, dt: number): void {
  const to = pt(d.tx ?? p.x, d.ty ?? p.y);
  const r = dist(p, to);
  const step = Math.min(r, FLY_SPEED * dt);
  if (r > 0.01) p.heading = Math.atan2(to.y - p.y, to.x - p.x);
  p.x += Math.cos(p.heading) * step;
  p.y += Math.sin(p.heading) * step;
  const up = Math.min(1, p.alt + RISE_RATE * dt);
  p.alt = d.away ? up : Math.min(up, (r - step) / LAND_FROM);
  if (d.away) {
    const out = p.x < -40 || p.y < -40 || p.x > world.w + 40 || p.y > world.h + 40;
    if (out || r - step < 1) d.gone = 1;
    p.mode = 'hidden';
    return;
  }
  if (r - step < 0.5) {
    d.fly = 0;
    p.alt = 0;
    p.mode = 'idle';
    p.timer = 0.35;
    return;
  }
  p.mode = p.alt > LOW ? 'hidden' : 'flee';
}
