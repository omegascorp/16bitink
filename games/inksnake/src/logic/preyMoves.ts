import { clamp, dist, pt, pushOut, type Pt, TAU, wrapAngle } from './vec';
import { APPEAR_TIME, type Prey, type PreySpec, type PreyWorld } from './preyTypes';

/** How prey moves: the gaits every chapter shares, and the helpers a chapter's own behaviours use. */

/** A hop lasts this long, then the frog sits. */
const HOP_TIME = 0.28;
/** How far from the board's edge prey keeps. */
const EDGE = 24;

/** Bitten prey runs this long, slowing, before it falls asleep, s. */
export const STAGGER_TIME = 2.6;

/**
 * One step of a prey animal's life: wander, sit, and run (or hop) from a
 * snake it can see; or stagger off and fall asleep after a venomous bite.
 */
export function stepPrey(p: Prey, spec: PreySpec, world: PreyWorld, dt: number): void {
  if (p.mode === 'caught' || p.mode === 'sleep') return;
  if (p.mode === 'stagger') {
    p.timer -= dt;
    const k = Math.max(0, p.timer / STAGGER_TIME);
    p.x += Math.cos(p.heading) * spec.speed * 0.6 * k * dt;
    p.y += Math.sin(p.heading) * spec.speed * 0.6 * k * dt;
    p.heading = wrapAngle(p.heading + (world.rng() - 0.5) * 3 * dt);
    keepIn(p, spec.size / 2, world, spec);
    if (p.timer <= 0) p.mode = 'sleep';
    return;
  }
  if (p.mode === 'appear') {
    p.timer -= dt;
    p.shown = clamp(1 - p.timer / APPEAR_TIME, 0, 1);
    if (p.timer <= 0) {
      p.shown = 1;
      p.mode = 'idle';
      p.timer = 0.4 + world.rng() * 1.2;
    }
    return;
  }
  if (p.frozen) return;
  const near = world.headSeen && spec.fear > 0 && dist(p, world.head) < spec.fear;
  if (spec.step) spec.step(p, world, dt, near);
  else if (spec.gait === 'still') return;
  else if (spec.gait === 'hop') stepHopper(p, spec, world, near, dt);
  else stepScurrier(p, spec, world, near, dt);
  if (p.mode !== 'hidden' && p.alt < 0.05) keepIn(p, spec.size / 2, world, spec);
}

/** Mice and rats: potter about in short runs, bolt away from a snake they see. */
export function stepScurrier(p: Prey, spec: PreySpec, world: PreyWorld, near: boolean, dt: number): void {
  if (near) {
    p.mode = 'flee';
    p.heading = turnFrom(p.heading, Math.atan2(p.y - world.head.y, p.x - world.head.x), 7 * dt);
    p.speed = spec.speed;
  } else {
    p.timer -= dt;
    if (p.mode === 'flee') {
      p.mode = 'walk';
      p.timer = 0.5;
    }
    if (p.timer <= 0) {
      if (p.mode === 'walk') {
        p.mode = 'idle';
        p.timer = 0.5 + world.rng() * 1.6;
      } else {
        p.mode = 'walk';
        p.timer = 0.6 + world.rng() * 1.4;
        p.heading = wrapAngle(p.heading + (world.rng() - 0.5) * 2.4);
      }
    }
    p.speed = p.mode === 'walk' ? spec.speed * 0.42 : 0;
  }
  p.x += Math.cos(p.heading) * p.speed * dt;
  p.y += Math.sin(p.heading) * p.speed * dt;
}

/** Frogs: sit still, and hop away when a snake they see comes close (or now and then on their own). */
export function stepHopper(p: Prey, spec: PreySpec, world: PreyWorld, near: boolean, dt: number): void {
  p.timer -= dt;
  if (p.mode === 'hop') {
    p.x += Math.cos(p.heading) * spec.speed * dt;
    p.y += Math.sin(p.heading) * spec.speed * dt;
    if (p.timer <= 0) {
      p.mode = 'idle';
      // A frog that just hopped needs a moment before it can hop again.
      p.timer = 0.7 + world.rng() * 1.4;
    }
    return;
  }
  const bored = p.timer <= 0 && world.rng() < 0.25;
  if ((near && p.timer <= 0.4) || bored) {
    p.mode = 'hop';
    p.timer = HOP_TIME;
    const away = near ? Math.atan2(p.y - world.head.y, p.x - world.head.x) : world.rng() * TAU;
    p.heading = wrapAngle(away + (world.rng() - 0.5) * 1.2);
  } else if (p.timer <= 0) p.timer = 0.8 + world.rng() * 1.5;
}

/** Keeps prey on the board, in its zone and out of solid things; a runner meeting a wall turns along it. */
export function keepIn(p: Prey, r: number, world: PreyWorld, spec?: PreySpec): void {
  if (spec?.zone && !world.inZone(p, spec.zone)) {
    // Out of its zone: step back the way it came and turn round.
    p.x -= Math.cos(p.heading) * 3;
    p.y -= Math.sin(p.heading) * 3;
    p.heading = wrapAngle(p.heading + Math.PI * (0.7 + world.rng() * 0.6));
  }
  const x = clamp(p.x, EDGE, world.w - EDGE);
  const y = clamp(p.y, EDGE, world.h - EDGE);
  if (x !== p.x || y !== p.y) {
    p.heading = wrapAngle(p.heading + Math.PI * (0.5 + world.rng() * 0.5));
    p.x = x;
    p.y = y;
  }
  for (const s of world.solids) {
    const out = pushOut(p, r, s);
    if (!out) continue;
    p.x = out.p.x;
    p.y = out.p.y;
    // Slide along the surface, keeping the side it was already heading.
    const along = Math.atan2(out.n.x, -out.n.y);
    p.heading = Math.cos(wrapAngle(p.heading - along)) >= 0 ? along : wrapAngle(along + Math.PI);
  }
}

function turnFrom(from: number, to: number, step: number): number {
  const d = wrapAngle(to - from);
  return wrapAngle(from + clamp(d, -step, step));
}

/** Somewhere free for new prey: on the board, off solid things, and well away from the snake's head. */
export function freeSpot(world: Omit<PreyWorld, 'headSeen'>, r: number, awayFrom: number, zone?: PreySpec['zone'], tries = 60): Pt | null {
  for (let i = 0; i < tries; i++) {
    const p = pt(EDGE * 2 + world.rng() * (world.w - EDGE * 4), EDGE * 2 + world.rng() * (world.h - EDGE * 4));
    if (dist(p, world.head) < awayFrom) continue;
    if (zone && !world.inZone(p, zone)) continue;
    if (world.solids.some((s) => pushOut(p, r + 6, s))) continue;
    return p;
  }
  return null;
}
