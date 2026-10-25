import type { Prey, PreySpec, PreyWorld } from '../preyTypes';
import { clamp, dist, pt, type Pt, TAU, wrapAngle } from '../vec';
import { boardWater, waterEdge, type EdgeSpot } from './floodedBanks';

/**
 * The flooded forest's prey and how each gets about. Fish shoal in the
 * dark water, egrets wade at the water's edge and fly off from a snake they
 * see, and capybaras come down to the banks to drink, watching the water
 * as they do: an anaconda under the surface, only its eyes showing, is what
 * they don't see. A young caiman and river turtles paddle about. Every
 * meal goes down whole and alive, cartoon style.
 */

/** Piranhas dart this long when spooked, then need this long before they can dart again, s. */
const DART = 0.5;
const TIRED = 1.4;
/** A shoal cruises at this share of its top speed, turning with the current this fast, rad/s. */
const CRUISE = 0.32;
const CURRENT_TURN = 1.3;

/** Egrets walk to the edge this fast, take off over this long, and come down over this long, s. */
const WADE_SPEED = 36;
const TAKE_OFF = 0.7;
const LAND = 0.6;
const FLY_SPEED = 210;
/** An egret picks a new spot to land at least this far from the snake, px. */
const LAND_AWAY = 260;

/** Capybaras: grazing, walking down to the bank, drinking and bolting. Speeds px/s, times s. */
const GRAZE_SPEED = 26;
const TO_BANK_SPEED = 40;
const DRINK_TIME = [7, 10] as const;
const GRAZE_TIME = [2.5, 5] as const;
const BOLT_TIME = 1.4;
/** A grazing capybara bolts from a snake it sees this close, px. */
const GRAZE_FEAR = 140;
/** A drinking one watches the water in front of it (this wide either side, rad): it sees a snake swimming at the surface there this close, px, and anything right by it. */
const DRINK_WATCH = 170;
const DRINK_CONE = 1.2;
const DRINK_NEAR = 36;
/** How far a capybara or egret looks for the water's edge, px. */
const EDGE_REACH = 280;

/** Phases kept in a prey's `data.phase`. */
export const EGRET = { walk: 0, wade: 1, fly: 2, land: 3 } as const;
export const CAPY = { graze: 0, toBank: 1, drink: 2, bolt: 3 } as const;

/** The board's water, for the edge finders (not the water past the board's sides). */
const water = (world: PreyWorld) => (q: Pt): boolean => boardWater(q, world.w, world.h, (p) => world.inZone(p, 'water'));

const between = (world: PreyWorld, range: readonly [number, number]): number => range[0] + world.rng() * (range[1] - range[0]);

/** Moves prey along its heading at its speed. */
function swim(p: Prey, dt: number): void {
  p.x += Math.cos(p.heading) * p.speed * dt;
  p.y += Math.sin(p.heading) * p.speed * dt;
}

/** Turns prey towards `to`, at most `rate` rad/s. */
function turnTo(p: Prey, to: number, rate: number, dt: number): void {
  const d = wrapAngle(to - p.heading);
  p.heading = wrapAngle(p.heading + clamp(d, -rate * dt, rate * dt));
}

/** The slow currents through the flooded trees: the way the water drifts at a point (a shoal follows it together). */
function current(p: Pt): number {
  return Math.sin(p.x * 0.009 + 1.3) * 1.6 + Math.cos(p.y * 0.012 - 0.4) * 1.9 + p.x * 0.002;
}

/** Piranhas: a loose shoal drifting with the currents; one that sees a snake close darts off, then tires. */
function piranhaStep(p: Prey, world: PreyWorld, dt: number, near: boolean): void {
  const d = p.data ?? (p.data = { dart: 0, tired: 0 });
  d.dart = (d.dart ?? 0) - dt;
  d.tired = (d.tired ?? 0) - dt;
  const spec = FLOODED_PREY.piranha!;
  if (near && d.tired <= 0) {
    d.dart = DART;
    d.tired = DART + TIRED;
    p.heading = wrapAngle(Math.atan2(p.y - world.head.y, p.x - world.head.x) + (world.rng() - 0.5) * 0.8);
  }
  if (d.dart > 0) {
    p.mode = 'flee';
    p.speed = spec.speed;
  } else {
    p.mode = 'walk';
    p.speed = spec.speed * CRUISE;
    turnTo(p, current(p) + (world.rng() - 0.5) * 0.6, CURRENT_TURN, dt);
  }
  swim(p, dt);
}

/** A spot to land on far from the snake: somewhere on land, then its water's edge. */
function landingSpot(world: PreyWorld): EdgeSpot | null {
  for (let i = 0; i < 40; i++) {
    const q = pt(40 + world.rng() * (world.w - 80), 40 + world.rng() * (world.h - 80));
    if (!world.inZone(q, 'land') || dist(q, world.head) < LAND_AWAY) continue;
    const e = waterEdge(q, EDGE_REACH, water(world));
    if (e && dist(e.at, world.head) > LAND_AWAY * 0.8) return e;
  }
  return null;
}

/**
 * Egrets: each walks to the water's edge and stands there fishing, now and
 * then moving along the shore. One that sees a snake close flies off and
 * lands at another edge far away; a snake under the water it doesn't see.
 */
function egretStep(p: Prey, world: PreyWorld, dt: number, near: boolean): void {
  const d = p.data ?? (p.data = { phase: EGRET.walk, clock: 0, tx: p.x, ty: p.y, face: p.heading, fish: 0, aimed: 0 });
  d.clock = (d.clock ?? 0) - dt;
  d.fish = Math.max(0, (d.fish ?? 0) - dt);
  const target = pt(d.tx ?? p.x, d.ty ?? p.y);
  if (near && (d.phase === EGRET.walk || d.phase === EGRET.wade)) {
    // Spooked: up and away from the snake, then over to a far bank.
    const spot = landingSpot(world);
    d.phase = EGRET.fly;
    d.clock = TAKE_OFF;
    d.tx = spot?.at.x ?? p.x;
    d.ty = spot?.at.y ?? p.y;
    d.face = spot?.facing ?? p.heading;
    p.heading = Math.atan2(p.y - world.head.y, p.x - world.head.x);
    p.mode = 'flee';
    return;
  }
  switch (d.phase) {
    case EGRET.walk: {
      if (!d.aimed) {
        const e = waterEdge(p, EDGE_REACH, water(world));
        d.aimed = 1;
        d.tx = e?.at.x ?? p.x;
        d.ty = e?.at.y ?? p.y;
        d.face = e?.facing ?? p.heading;
        return;
      }
      p.mode = 'walk';
      p.speed = WADE_SPEED;
      p.heading = Math.atan2(target.y - p.y, target.x - p.x);
      if (dist(p, target) < 4 || d.clock < -6) {
        d.phase = EGRET.wade;
        d.clock = 6 + world.rng() * 7;
        p.heading = d.face ?? p.heading;
        return;
      }
      swim(p, dt);
      return;
    }
    case EGRET.wade:
      p.mode = 'idle';
      p.speed = 0;
      // A stab at a fish now and then.
      if (d.fish <= 0 && world.rng() < dt * 0.4) d.fish = 0.35;
      if (d.clock <= 0) {
        // On along the shore a little.
        const a = world.rng() * TAU;
        const q = pt(p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70);
        const e = world.inZone(q, 'land') ? waterEdge(q, EDGE_REACH, water(world)) : null;
        d.phase = EGRET.walk;
        d.aimed = 1;
        d.clock = 0;
        d.tx = e?.at.x ?? p.x;
        d.ty = e?.at.y ?? p.y;
        d.face = e?.facing ?? p.heading;
      }
      return;
    case EGRET.fly: {
      p.alt = Math.min(1, p.alt + dt / TAKE_OFF);
      p.mode = 'flee';
      p.speed = 60 + (FLY_SPEED - 60) * p.alt;
      if (p.alt > 0.6) turnTo(p, Math.atan2(target.y - p.y, target.x - p.x), 4, dt);
      swim(p, dt);
      if (p.alt >= 1 && dist(p, target) < 30) {
        d.phase = EGRET.land;
        d.clock = LAND;
      }
      return;
    }
    case EGRET.land:
      p.alt = Math.max(0, p.alt - dt / LAND);
      p.speed = Math.min(p.speed, 70);
      p.heading = Math.atan2(target.y - p.y, target.x - p.x);
      if (dist(p, target) > 3) swim(p, dt);
      if (p.alt <= 0) {
        d.phase = EGRET.wade;
        d.clock = 5 + world.rng() * 6;
        p.mode = 'idle';
        p.heading = d.face ?? p.heading;
      }
      return;
    default:
      d.phase = EGRET.walk;
  }
}

/**
 * Capybaras: they graze inland, then walk down to the water's edge and
 * drink a while, nose to the water. Grazing, one bolts from a snake it
 * sees near; drinking, it watches the water in front of it, and sees a
 * snake swimming at the surface there from far off, but not one that's
 * submerged (nor one slipping round behind it, unless it comes very close).
 */
function capybaraStep(p: Prey, world: PreyWorld, dt: number): void {
  const d = p.data ?? (p.data = { phase: CAPY.graze, clock: between(world, GRAZE_TIME), tx: p.x, ty: p.y, face: p.heading, walk: 0 });
  d.clock = (d.clock ?? 0) - dt;
  const spec = FLOODED_PREY.capybara!;
  const seen = world.headSeen;
  const far = dist(p, world.head);
  const ahead = Math.abs(wrapAngle(Math.atan2(world.head.y - p.y, world.head.x - p.x) - (d.face ?? p.heading))) < DRINK_CONE;
  const scared = d.phase === CAPY.drink
    ? seen && (far < DRINK_NEAR || (far < DRINK_WATCH && ahead && world.inZone(world.head, 'water')))
    : d.phase !== CAPY.bolt && seen && far < GRAZE_FEAR;
  if (scared) {
    d.phase = CAPY.bolt;
    d.clock = BOLT_TIME;
    p.heading = Math.atan2(p.y - world.head.y, p.x - world.head.x);
  }
  switch (d.phase) {
    case CAPY.bolt:
      p.mode = 'flee';
      p.speed = spec.speed;
      turnTo(p, Math.atan2(p.y - world.head.y, p.x - world.head.x), 5, dt);
      swim(p, dt);
      if (d.clock <= 0) {
        d.phase = CAPY.graze;
        d.clock = between(world, GRAZE_TIME);
      }
      return;
    case CAPY.graze: {
      // Short ambles between mouthfuls.
      d.walk = (d.walk ?? 0) - dt;
      if (d.walk <= 0) {
        d.walk = 0.8 + world.rng() * 1.4;
        p.heading = wrapAngle(p.heading + (world.rng() - 0.5) * 2.2);
        p.speed = world.rng() < 0.5 ? GRAZE_SPEED : 0;
      }
      p.mode = p.speed > 0 ? 'walk' : 'idle';
      swim(p, dt);
      if (d.clock <= 0) {
        const e = waterEdge(p, EDGE_REACH, water(world));
        if (e) {
          d.phase = CAPY.toBank;
          d.tx = e.at.x;
          d.ty = e.at.y;
          d.face = e.facing;
          d.clock = 9;
        } else d.clock = between(world, GRAZE_TIME);
      }
      return;
    }
    case CAPY.toBank: {
      const target = pt(d.tx ?? p.x, d.ty ?? p.y);
      p.mode = 'walk';
      p.speed = TO_BANK_SPEED;
      p.heading = Math.atan2(target.y - p.y, target.x - p.x);
      if (dist(p, target) < 5 || d.clock <= 0) {
        d.phase = CAPY.drink;
        d.clock = between(world, DRINK_TIME);
        p.heading = d.face ?? p.heading;
        p.speed = 0;
        return;
      }
      swim(p, dt);
      return;
    }
    case CAPY.drink:
      p.mode = 'idle';
      p.speed = 0;
      if (d.clock <= 0) {
        // Had enough: turn round and amble back up the bank.
        d.phase = CAPY.graze;
        d.clock = between(world, GRAZE_TIME);
        d.walk = 1.2;
        p.heading = wrapAngle((d.face ?? p.heading) + Math.PI);
        p.speed = GRAZE_SPEED;
      }
      return;
    default:
      d.phase = CAPY.graze;
  }
}

export const FLOODED_PREY: Readonly<Record<string, PreySpec>> = {
  piranha: { name: 'red-bellied piranha', size: 14, growth: 32, gait: 'scurry', speed: 150, fear: 80, points: 10, zone: 'water', step: piranhaStep },
  egret: { name: 'great egret', size: 24, growth: 64, gait: 'scurry', speed: 0, fear: 125, points: 25, zone: 'land', step: egretStep },
  capybara: { name: 'capybara', size: 46, growth: 150, gait: 'scurry', speed: 112, fear: GRAZE_FEAR, points: 70, zone: 'land', step: (p, w, dt) => capybaraStep(p, w, dt) },
  'young-caiman': { name: 'young caiman', size: 50, growth: 150, gait: 'scurry', speed: 72, fear: 95, points: 80, zone: 'water' },
  'river-turtle': { name: 'river turtle', size: 22, growth: 52, gait: 'scurry', speed: 42, fear: 60, points: 18, zone: 'water' },
};
