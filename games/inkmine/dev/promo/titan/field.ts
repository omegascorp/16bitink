import { createRng } from '../../../src/logic/rng';
import {
  bubblesAt, flatAt, flyerAt, hazeAt, HAZE_PERIOD, horizonAt, kickAt, LOOP_S, nadirAt, SHORE_BELOW, STROKES, thickAt, washAt, wrap, type Stroke,
} from './story';

/**
 * Everything that moves in crowds, as pure functions of time: motes in the
 * haze, the downwash's rings and spray on the lake, the gas bubbling up
 * through it, and the pebbles kicked up at lift-off. Seeded, so every
 * frame (and every recording) is the same.
 */
const W = 1080;

export interface Mote {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
  /** Lit specks of haze or dark flakes of it. */
  readonly lit: boolean;
  /** Nearer than the prospector (drawn over it). */
  readonly front: boolean;
}

const MOTE_SEEDS = (() => {
  const rng = createRng(4242);
  return Array.from({ length: 120 }, () => ({
    x: rng() * W, y: rng() * HAZE_PERIOD, z: 0.45 + rng() * 0.9, lit: rng() < 0.7, size: 0.6 + rng() * 0.8,
  }));
})();

/** The motes on screen at t: drifting back past it (whole laps a loop) and scrolling with the haze, the near ones faster. */
export function motesAt(t: number): Mote[] {
  const w = wrap(t);
  const scroll = hazeAt(w);
  const thick = thickAt(w);
  return MOTE_SEEDS.map((m) => {
    // Whole laps a loop, more for the nearer ones, so they're back where they began.
    const laps = Math.max(1, Math.round(m.z * 1.6));
    const x = (((m.x - (W + 40) * laps * (w / LOOP_S)) % (W + 40)) + W + 40) % (W + 40) - 20;
    const y = ((((m.y + scroll * m.z) % HAZE_PERIOD) + HAZE_PERIOD) % HAZE_PERIOD) * (1940 / HAZE_PERIOD) - 10;
    return { x, y, r: (2.2 + 3.4 * m.z) * m.size, alpha: Math.min(1, thick * (0.35 + 0.5 * m.z)), lit: m.lit, front: m.z > 1.15 };
  });
}

/** A downwash ring on the water: where, how big, how strong. */
export interface Ring {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly alpha: number;
}
const RING_LIFE = 1.9;

/** Strokes whose rings or spray are alive at t, with their ages (the loop's last strokes carry on past its start). */
function alive(t: number, life: number): { readonly s: Stroke; readonly i: number; readonly age: number }[] {
  const w = wrap(t);
  return STROKES.flatMap((s, i) => [w - s.t, w - s.t + LOOP_S].filter((age) => age >= 0 && age < life).map((age) => ({ s, i, age })));
}

const waterAt = (strokeT: number, t: number): { x: number; y: number } =>
  ({ x: flyerAt(strokeT).x + 30, y: horizonAt(t) + nadirAt(strokeT) });

export function ringsAt(t: number): Ring[] {
  return alive(t, RING_LIFE).flatMap(({ s, age }) => {
    const wash = washAt(s.t) * Math.min(1.2, s.effort);
    if (wash < 0.02) return [];
    const u = age / RING_LIFE;
    const r = 60 + 470 * u ** 0.7;
    const c = waterAt(s.t, t);
    return [{ x: c.x, y: c.y, rx: r, ry: r * flatAt(t), alpha: wash * (1 - u) ** 1.4 }];
  });
}

/** Spray thrown up by the downwash: drops arcing slowly in Titan's low gravity. */
export interface Drop {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
}
const DROP_G = 620;
const DROPS_PER = 12;
const DROP_SEEDS = STROKES.map((_, i) => {
  const rng = createRng(900 + i * 17);
  return Array.from({ length: DROPS_PER }, () => ({ vx: (rng() - 0.5) * 380, vy: 260 + rng() * 260, r: 5 + rng() * 6, dx: (rng() - 0.5) * 220 }));
});

export function dropsAt(t: number): Drop[] {
  return alive(t, 1.7).flatMap(({ s, i, age }) => {
    const wash = washAt(s.t) * Math.min(1.2, s.effort);
    if (wash < 0.4) return [];
    const c = waterAt(s.t, t);
    return DROP_SEEDS[i]!.flatMap((d) => {
      const rise = d.vy * age - (DROP_G * age * age) / 2;
      if (rise < 0) return [];
      return [{ x: c.x + d.dx + d.vx * age, y: c.y - rise, r: d.r, alpha: wash * Math.min(1, (1.7 - age) * 2) }];
    });
  });
}

/** Gas bubbling up through the lake while it's looked down on: each a dome that swells, then pops in a ring. */
export interface Bubble {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** 0..1 swelling, then 1..2 the pop's ring spreading. */
  readonly u: number;
  readonly alpha: number;
}
const BUBBLE_SEEDS = (() => {
  const rng = createRng(777);
  return Array.from({ length: 22 }, () => ({ x: 60 + rng() * 960, depth: 0.12 + rng() ** 0.8 * 0.85, period: 0.55 + rng() * 0.6, phase: rng(), size: 0.6 + rng() * 0.8 }));
})();

export function bubblesOn(t: number): Bubble[] {
  const show = bubblesAt(wrap(t));
  if (show <= 0) return [];
  const top = horizonAt(t);
  return BUBBLE_SEEDS.map((b) => {
    const u = ((wrap(t) / b.period + b.phase) % 1) * 2;
    const near = b.depth;
    return { x: b.x, y: top + 30 + near * (1920 - top), r: (5 + 16 * near) * b.size, u, alpha: show };
  });
}

/** Pebbles kicked off the shore as it lifts off. */
export function kickedAt(t: number): Drop[] {
  const k = kickAt(t);
  if (k <= 0 || k >= 1) return [];
  const age = k * 1.1;
  const rng = createRng(31);
  const base = flyerAt(wrap(t) - age);
  const ground = horizonAt(t) + SHORE_BELOW;
  return Array.from({ length: 14 }, () => {
    const vx = (rng() - 0.5) * 420;
    const vy = 180 + rng() * 300;
    const rise = vy * age - (DROP_G * age * age) / 2;
    return { x: base.x + vx * age, y: ground - Math.max(0, rise), r: 3 + rng() * 5, alpha: 1 - k };
  });
}
