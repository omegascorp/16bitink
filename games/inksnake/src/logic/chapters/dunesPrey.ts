import type { Prey, PreySpec, PreyWorld } from '../preyTypes';
import { TAU, dist, wrapAngle } from '../vec';

/**
 * The dunes' prey. Lizards are over half of a sidewinder's diet and small
 * mammals over 40%: side-blotched lizards, pocket mice, and kangaroo rats,
 * too big to swallow without the venom first.
 */

/** A kangaroo rat's long bound: this fast, this long, with this short pause between, s. */
const BOUND_SPEED = 270;
const BOUND_TIME = 0.3;
const BOUND_GAP = 0.16;
/** It bounds this many times when it bolts, then sits to look round. */
const BOUNDS = 3;
/**
 * Face to face with a snake it can see, it turns its back and kicks sand at
 * it (real kangaroo rats do) before it bolts: it stands still this long, s,
 * and won't kick again for this long. The kick is the moment to strike.
 */
const KICK_TIME = 0.75;
const KICK_REST = 3.2;
/** It kicks at a snake no closer than this (any closer and it just bolts), px. */
const KICK_MIN = 46;
/** Foraging: a slow shuffle about the sand, a share of its speed. */
const FORAGE = 0.22;

/** Its own state, kept in `p.data`: bounds left, a kick's time left, the rest until the next kick. */
interface RatData {
  bounds: number;
  kick: number;
  cool: number;
}

function ratData(p: Prey): RatData {
  const d = p.data ?? (p.data = { bounds: 0, kick: 0, cool: 0 });
  return d as unknown as RatData;
}

/**
 * Kangaroo rats: they shuffle about foraging, and when a snake they can see
 * comes close they turn their back and kick sand at it, then bolt in a few
 * long two-legged bounds and sit up to look round.
 */
function ratStep(p: Prey, world: PreyWorld, dt: number, near: boolean): void {
  const d = ratData(p);
  d.cool = Math.max(0, d.cool - dt);
  const away = Math.atan2(p.y - world.head.y, p.x - world.head.x);
  if (d.kick > 0) {
    // Kicking: back to the snake, feet flying, standing its ground.
    d.kick -= dt;
    p.mode = 'idle';
    p.heading = away;
    p.speed = 0;
    if (d.kick <= 0) bolt(p, d, away, world);
    return;
  }
  if (p.mode === 'hop') {
    p.timer -= dt;
    p.x += Math.cos(p.heading) * BOUND_SPEED * dt;
    p.y += Math.sin(p.heading) * BOUND_SPEED * dt;
    if (p.timer > 0) return;
    d.bounds -= 1;
    p.mode = 'idle';
    p.timer = d.bounds > 0 ? BOUND_GAP : 0.8 + world.rng() * 1.2;
    return;
  }
  if (near) {
    if (p.mode === 'idle' && p.timer > 0 && d.bounds > 0) {
      // Between bounds: off again as soon as its feet are down.
      p.timer -= dt;
      if (p.timer <= 0) bound(p, away, world);
      return;
    }
    if (d.cool <= 0 && dist(p, world.head) > KICK_MIN) {
      d.kick = KICK_TIME;
      d.cool = KICK_REST;
      p.mode = 'idle';
      p.heading = away;
      return;
    }
    bolt(p, d, away, world);
    return;
  }
  forage(p, d, world, dt);
}

/** Off in a run of long bounds, away from the snake. */
function bolt(p: Prey, d: RatData, away: number, world: PreyWorld): void {
  d.bounds = BOUNDS;
  bound(p, away, world);
}

function bound(p: Prey, away: number, world: PreyWorld): void {
  p.mode = 'hop';
  p.timer = BOUND_TIME;
  p.speed = BOUND_SPEED;
  p.heading = wrapAngle(away + (world.rng() - 0.5) * 0.9);
}

/** Pottering about for seeds: short shuffles, sitting up between, and a little bound now and then. */
function forage(p: Prey, d: RatData, world: PreyWorld, dt: number): void {
  p.timer -= dt;
  if (p.mode === 'idle' && d.bounds > 0 && p.timer <= 0) {
    // A bolt's bounds left over once the snake is out of sight: it finishes them.
    bound(p, p.heading, world);
    return;
  }
  if (p.timer <= 0) {
    d.bounds = 0;
    if (p.mode === 'walk') {
      p.mode = 'idle';
      p.timer = 0.6 + world.rng() * 1.6;
    } else if (world.rng() < 0.18) {
      d.bounds = 1;
      bound(p, world.rng() * TAU, world);
      return;
    } else {
      p.mode = 'walk';
      p.timer = 0.8 + world.rng() * 1.4;
      p.heading = wrapAngle(p.heading + (world.rng() - 0.5) * 2.4);
    }
  }
  p.speed = p.mode === 'walk' ? KANGAROO_RAT.speed * FORAGE : 0;
  p.x += Math.cos(p.heading) * p.speed * dt;
  p.y += Math.sin(p.heading) * p.speed * dt;
}

/** The kangaroo rat: about 26 px across, too big to swallow until the venom puts it to sleep. */
const KANGAROO_RAT: PreySpec = {
  name: 'kangaroo rat', size: 26, growth: 72, gait: 'scurry', speed: 190, fear: 115, points: 40, step: ratStep,
};

export const DUNES_PREY: Readonly<Record<string, PreySpec>> = {
  'kangaroo-rat': KANGAROO_RAT,
  'pocket-mouse': { name: 'pocket mouse', plural: 'pocket mice', size: 10, growth: 24, gait: 'scurry', speed: 120, fear: 110, points: 10 },
  'side-lizard': { name: 'side-blotched lizard', size: 10, growth: 26, gait: 'scurry', speed: 165, fear: 95, points: 14 },
};
