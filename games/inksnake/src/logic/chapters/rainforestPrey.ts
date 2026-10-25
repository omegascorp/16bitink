import { stepHopper, stepScurrier } from '../preyMoves';
import type { Prey, PreySpec, PreyWorld } from '../preyTypes';
import { clamp, dist, pt, type Pt, turnTowards } from '../vec';

/**
 * The rainforest's prey: geckos and tree frogs in the crowns (where the
 * flying snake hunts), a big tokay gecko for its venom, and small bats
 * flitting between the trees at dusk. A snake gliding overhead can't eat
 * anything but a bat: tree dwellers it passes over lie flat out of reach.
 */

/** A gliding snake passing this close: tree dwellers press flat to the bark, out of its reach, px. */
const DUCK_NEAR = 70;

/**
 * Whether a gliding snake is passing over `p` (in this chapter the head
 * goes unseen only in the air: it has no cover). While it is, `p` lies
 * flat ('hidden': it can't be eaten; the chapter's view still draws it).
 */
function ducked(p: Prey, world: PreyWorld): boolean {
  if (!world.headSeen && dist(p, world.head) < DUCK_NEAR) {
    p.mode = 'hidden';
    return true;
  }
  if (p.mode === 'hidden') {
    p.mode = 'idle';
    p.timer = 0.3 + world.rng() * 0.5;
  }
  return false;
}

/** How bats fly: a cruising height, a low swoop now and then, how they turn, and how close a gliding head catches one. */
const BAT = { cruise: 0.55, low: 0.08, catchable: 0.2, dipEvery: [4, 7], dipFor: 1.5, turn: 2.6, catchR: 30, margin: 40 } as const;

/** Somewhere new for a bat to flit to: over the forest floor between the crowns, if it can find a spot. */
function batSpot(world: PreyWorld): Pt {
  let best = pt(world.w / 2, world.h / 2);
  for (let i = 0; i < 12; i++) {
    const p = pt(BAT.margin + world.rng() * (world.w - BAT.margin * 2), BAT.margin + world.rng() * (world.h - BAT.margin * 2));
    best = p;
    if (!world.inZone(p, 'tree')) return p;
  }
  return best;
}

/**
 * Bats flit low between the trees: up in the air only a gliding snake can
 * reach one (its head meeting the bat catches it); now and then one swoops
 * low after insects, and then anything can.
 */
function batStep(p: Prey, world: PreyWorld, dt: number): void {
  const d = p.data ?? (p.data = { dip: 2 + world.rng() * 4, tx: p.x, ty: p.y, t: 0 });
  d.t = (d.t ?? 0) - dt;
  d.dip = (d.dip ?? 0) - dt;
  if ((d.t ?? 0) <= 0 || dist(p, pt(d.tx ?? p.x, d.ty ?? p.y)) < 30) {
    const to = batSpot(world);
    d.tx = to.x;
    d.ty = to.y;
    d.t = 3 + world.rng() * 3;
  }
  const spec = RAINFOREST_PREY.bat!;
  p.heading = turnTowards(p.heading, Math.atan2((d.ty ?? p.y) - p.y, (d.tx ?? p.x) - p.x), BAT.turn * dt);
  p.speed = spec.speed;
  p.x = clamp(p.x + Math.cos(p.heading) * p.speed * dt, BAT.margin * 0.6, world.w - BAT.margin * 0.6);
  p.y = clamp(p.y + Math.sin(p.heading) * p.speed * dt, BAT.margin * 0.6, world.h - BAT.margin * 0.6);
  let want = BAT.cruise + 0.08 * Math.sin(p.id * 1.3 + (d.dip ?? 0) * 2.2);
  if ((d.dip ?? 0) < 0) {
    want = BAT.low;
    if ((d.dip ?? 0) < -BAT.dipFor) d.dip = BAT.dipEvery[0] + world.rng() * (BAT.dipEvery[1] - BAT.dipEvery[0]);
  }
  p.alt += (want - p.alt) * Math.min(1, dt * 4);
  const gliding = !world.headSeen;
  // A gliding snake's head meeting a bat in the air: caught.
  if (gliding && dist(p, world.head) < BAT.catchR) {
    p.x = world.head.x;
    p.y = world.head.y;
  }
  p.mode = gliding || p.alt < BAT.catchable ? 'walk' : 'hidden';
}

export const RAINFOREST_PREY: Readonly<Record<string, PreySpec>> = {
  gecko: {
    name: 'gecko', size: 10, growth: 26, gait: 'scurry', speed: 125, fear: 95, points: 10, zone: 'tree',
    step: (p, world, dt, near) => {
      if (!ducked(p, world)) stepScurrier(p, RAINFOREST_PREY.gecko!, world, near, dt);
    },
  },
  treefrog: {
    name: 'tree frog', size: 13, growth: 30, gait: 'hop', speed: 210, fear: 85, points: 12, zone: 'tree',
    step: (p, world, dt, near) => {
      if (!ducked(p, world)) stepHopper(p, RAINFOREST_PREY.treefrog!, world, near, dt);
    },
  },
  tokay: {
    name: 'tokay gecko', size: 26, growth: 70, gait: 'scurry', speed: 95, fear: 80, points: 30, zone: 'tree',
    step: (p, world, dt, near) => {
      if (!ducked(p, world)) stepScurrier(p, RAINFOREST_PREY.tokay!, world, near, dt);
    },
  },
  bat: { name: 'bat', size: 11, growth: 28, gait: 'scurry', speed: 78, fear: 0, points: 16, step: (p, world, dt) => batStep(p, world, dt) },
};
