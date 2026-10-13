import { createRng } from '../../../src/logic/rng';
import { wrap } from './beats';
import { BREACHES, CAMERA, DIVES, fishAt, SURFACE_Y } from './flight';
import { gannetAt, PLUNGE_AT } from './hunters';

/**
 * Bubbles left in the water by the fish as it swims and by the gannet's
 * plunge. Each is let go at a world point and rises, the camera sliding past.
 */

export interface Bubble {
  readonly at: number;
  readonly wx: number;
  readonly y: number;
  readonly r: number;
  readonly rise: number;
  readonly life: number;
  readonly phase: number;
}

const rng = createRng(4401);

function trail(from: number, to: number, every: number, where: (t: number) => { x: number; y: number }, size: number): Bubble[] {
  const out: Bubble[] = [];
  for (let at = from; at < to; at += every) {
    const p = where(at);
    out.push({ at, wx: p.x + CAMERA.at(at) + (rng() - 0.5) * 30, y: p.y + (rng() - 0.5) * 30, r: size * (3 + rng() * 5), rise: 90 + rng() * 90, life: 1.1 + rng() * 0.6, phase: rng() * 6 });
  }
  return out;
}

const gills = (t: number): { x: number; y: number } => {
  const f = fishAt(t);
  return { x: f.x + Math.cos(f.tilt) * f.length * 0.2, y: f.y - Math.sin(f.tilt) * f.length * 0.2 };
};

const gannet = (t: number): { x: number; y: number } => {
  const g = gannetAt(t);
  return g ? { x: g.x, y: g.y } : { x: -999, y: SURFACE_Y };
};

export const BUBBLES: readonly Bubble[] = [
  ...trail(DIVES[0] + 0.02, DIVES[0] + 0.25, 0.025, gills, 1.2),
  ...trail(DIVES[0] + 0.25, BREACHES[0] - 0.15, 0.12, gills, 1),
  ...trail(DIVES[1] + 0.02, DIVES[1] + 0.25, 0.025, gills, 1.2),
  ...trail(DIVES[1] + 0.25, BREACHES[1] - 0.15, 0.12, gills, 1),
  ...trail(PLUNGE_AT + 0.03, PLUNGE_AT + 0.6, 0.02, gannet, 1.3),
  ...trail(PLUNGE_AT + 0.6, PLUNGE_AT + 1.4, 0.1, gannet, 1),
];

/** Where each bubble is on screen at t (null once it has popped or reached the surface). */
export function bubbleAt(b: Bubble, t: number): { readonly x: number; readonly y: number; readonly r: number; readonly alpha: number } | null {
  const s = wrap(t - b.at);
  if (s > b.life) return null;
  const y = b.y - b.rise * s - 40 * s * s;
  if (y < SURFACE_Y + 10) return null;
  const x = b.wx - CAMERA.at(b.at + s) + 6 * Math.sin(b.phase + s * 9);
  return { x, y, r: b.r * (1 + 0.3 * s), alpha: Math.min(1, s * 12) * (1 - s / b.life) };
}
