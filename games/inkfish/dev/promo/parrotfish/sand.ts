import { createRng } from '../../../src/logic/rng';
import { groundAt, PILE_X } from './stage';
import { fishAt, pileAt, POOPING, ventOf, wrap } from './story';

/**
 * The poop: puffs of white sand from the parrotfish's vent. Each puff is a
 * soft cloud that billows and fades, and a spray of grains that sink and
 * settle on the sand (or the pile), then melt into it. All worked out once
 * from the fish's path, so a frame only looks up where everything is; a
 * puff's age is taken round the loop, so the plume runs on across the seam.
 */

/** The sand's height at x at time t: the ground, plus the pile. */
export function sandTopAt(x: number, t: number): number {
  const p = pileAt(wrap(t));
  return groundAt(x) - p.h * Math.exp(-(((x - PILE_X) / p.w) ** 2));
}

const DRAG = 2.4;
const CURRENT = 24;
const GRAIN_LIFE = 3.4;
const MELT_S = 0.7;
const CLOUD_LIFE = 2.4;

interface Mover {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly sink: number;
}

const placeOf = (m: Mover, a: number): { readonly x: number; readonly y: number } => {
  const go = (1 - Math.exp(-DRAG * a)) / DRAG;
  return { x: m.x + m.vx * go + CURRENT * a, y: m.y + m.vy * go + m.sink * a };
};

export interface Grain extends Mover {
  readonly r: number;
  /** Age at which it lands (beyond GRAIN_LIFE: never). */
  readonly lands: number;
}

export interface Cloud extends Mover {
  readonly r: number;
}

export interface Puff {
  /** When it left the vent, in the loop. */
  readonly at: number;
  readonly grains: readonly Grain[];
  readonly clouds: readonly Cloud[];
}

function landing(g: Mover, at: number): number {
  for (let a = 0; a < GRAIN_LIFE; a += 1 / 60) {
    const p = placeOf(g, a);
    if (p.y >= sandTopAt(p.x, at + a) - 2) return a;
  }
  return Infinity;
}

export const PUFFS: readonly Puff[] = (() => {
  const rng = createRng(4242);
  const out: Puff[] = [];
  for (const w of POOPING) {
    for (let t = w.from; t < w.to; t += w.every) {
      const at = wrap(t);
      const f = fishAt(at);
      const v = ventOf(f);
      const back = -Math.sign(f.face || -1);
      const grains = Array.from({ length: 7 }, () => {
        const g = { x: v.x, y: v.y, vx: back * (30 + rng() * 190) * w.size, vy: (-10 + rng() * 130) * w.size, sink: 50 + rng() * 80 };
        return { ...g, r: 1.8 + rng() * 2.4, lands: landing(g, at) };
      });
      // Each puff of cloud is a little cluster of round bumps, so the merged plume has a billowing edge.
      const clouds = Array.from({ length: 3 }, (_, k) => {
        const c = { x: v.x, y: v.y, vx: back * (60 + rng() * 170) * (1 - 0.2 * k), vy: -10 + rng() * 90, sink: 40 + rng() * 35, r: (9 + rng() * 6) * w.size };
        const turn = rng() * Math.PI * 2;
        return [0, 1, 2].map((b) => ({ ...c, x: c.x + Math.cos(turn + b * 2.1) * c.r * 0.9, y: c.y + Math.sin(turn + b * 2.1) * c.r * 0.9 }));
      }).flat();
      out.push({ at, grains, clouds });
    }
  }
  return out;
})();

export interface Dot {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
}

/** Everything of the plume on screen at time t: clouds, then grains. */
export function plumeAt(t: number): { readonly clouds: readonly Dot[]; readonly grains: readonly Dot[] } {
  const clouds: Dot[] = [];
  const grains: Dot[] = [];
  for (const puff of PUFFS) {
    const a = wrap(t - puff.at);
    if (a > GRAIN_LIFE + MELT_S) continue;
    if (a < CLOUD_LIFE) {
      for (const c of puff.clouds) {
        const p = placeOf(c, a);
        const u = a / CLOUD_LIFE;
        clouds.push({ ...p, r: c.r * (1 + 1.4 * Math.sqrt(u)), alpha: (1 - u) ** 1.1 * Math.min(1, a * 12) });
      }
    }
    for (const g of puff.grains) {
      const landed = Math.min(a, g.lands);
      const p = placeOf(g, landed);
      const melt = a > g.lands ? 1 - (a - g.lands) / MELT_S : a > GRAIN_LIFE ? 0 : 1;
      if (melt <= 0) continue;
      grains.push({ ...p, r: g.r, alpha: melt * Math.min(1, a * 20) });
    }
  }
  return { clouds, grains };
}
