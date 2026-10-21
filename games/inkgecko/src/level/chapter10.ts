import type { Pt } from '../logic/path';
import { bridged } from './cross';
import { curlRows, figure8, line, meander, spiral, squareSpiral } from './shapes';
import type { LevelDef } from './types';

/**
 * Chapter 10, The Night Garden, the last. SERVER-ONLY, like every paid
 * chapter: only content/paid.ts imports it. New here: night — only what
 * the gecko, the lanterns by the wells and the burrows light can be seen
 * (1) — and the Lantern charm, which lights the whole garden for a while
 * (3). The garden brings back a little of everything before it.
 */

const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const RAIL = { kind: 'rail', y: 638, x0: 90, x1: 1190 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly', 'inkpot', 'geode', 'hedgehog', 'rain', 'lantern'] as const;
const from = (start: Pt, shape: readonly Pt[], n = 3): Pt[] => [...line(start, shape[0]!, n), ...shape];
const night = { dark: true } as const;

/** A row curling into loops along `y`, then a half-turn and straight back along `back`. */
function curlBack(y: number, b: number, back: number, mirror = false): Pt[] {
  const curls = curlRows(110, 1170, y, y, 1, 3, b);
  const r = (back - y - b) / 2;
  const turn = Array.from({ length: 7 }, (_, k) => {
    const ang = -Math.PI / 2 + ((k + 1) / 8) * Math.PI;
    return { x: 1170 + Math.cos(ang) * r, y: y + b + r + Math.sin(ang) * r };
  });
  const pts = from({ x: -30, y: y + b }, [...curls, ...turn, ...line({ x: 1170, y: back }, { x: 150, y: back }, 10), { x: 150, y: back }]);
  return mirror ? pts.map((p) => ({ x: 1280 - p.x, y: p.y })) : pts;
}
/** Level 5: two squared half-spirals, one round each side, like box hedges. */
const BOX_L: Pt[] = squareSpiral(640, 400, 300, 150, 0.95, -Math.PI / 2 - 0.15, -1, 1.75, 1, 0.8);
const BOX_R: Pt[] = squareSpiral(640, 400, 300, 150, 0.95, Math.PI / 2 - 0.15, -1, 1.75, 1, 0.8);
/** Level 9: a wavering row down each half of the garden. */
const MIDNIGHT_L: Pt[] = from({ x: -30, y: 110 }, meander(80, 500, 110, 470, 3, 20, 2));
const MIDNIGHT_R: Pt[] = from({ x: 1310, y: 110 }, meander(1200, 780, 110, 470, 3, 20, 2));
/** Level 10: two spirals wound into each other round three stones. */
const LAST_A: Pt[] = spiral(640, 400, 312, 225, 1.05, Math.PI * 0.35, 1, 1.75, 1);
const LAST_B: Pt[] = spiral(640, 400, 312, 225, 1.05, Math.PI * 1.35, 1, 1.75, 1);

export const CHAPTER_10: readonly LevelDef[] = [
  {
    id: 'night-1', name: 'Moonrise', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 300, 160, 1.4, Math.PI * 0.85, 1, 1.75, 1) }],
    colours: 5, speed: 26, goal: 2800, par: par(2800, 26), charms: ['slow', 'reverse', 'burst', 'inkpot'], teach: ['dark'], ...night,
  },
  {
    id: 'night-2', name: 'Night Stocks', shooter: RAIL,
    tracks: [{ points: from({ x: -30, y: 110 }, meander(110, 1170, 110, 470, 3, 22, 2.5)) }],
    colours: 5, speed: 28, goal: 2900, par: par(2900, 28), charms: ['slow', 'reverse', 'burst', 'aim'], ...night,
  },
  {
    id: 'night-3', name: 'Lantern Light', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: squareSpiral(640, 400, 308, 140, 1.8, -Math.PI / 2, -1, 1.75, 1, 0.6) }],
    colours: 6, speed: 25, goal: 3000, par: par(3000, 25), charms: ['lantern', 'slow', 'burst', 'hedgehog'], teach: ['lantern'], ...night,
  },
  {
    id: 'night-4', name: 'Moon Bridge', shooter: { kind: 'hop', pads: [{ x: 430, y: 600 }, { x: 850, y: 600 }] },
    tracks: bridged([{ points: curlBack(205, 125, 450) }]),
    colours: 6, speed: 22, goal: 2800, par: par(2800, 22), charms: ALL, ...night,
  },
  {
    id: 'night-5', name: 'Box Hedges', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: BOX_L }, { points: BOX_R }],
    colours: 6, speed: 20, goal: 3100, par: par(3100, 32), charms: ALL, ...night,
  },
  {
    id: 'night-6', name: 'Moonflowers', shooter: RAIL,
    tracks: bridged([{ points: from({ x: -30, y: 300 }, figure8(640, 300, 440, 400, -Math.PI / 2, 0.9)) }]),
    colours: 6, speed: 27, goal: 3200, par: par(3200, 27), charms: ALL, chameleons: 0.08, ...night,
  },
  {
    id: 'night-7', name: 'The Moon Pool', shooter: { kind: 'hop', pads: [{ x: 420, y: 450 }, { x: 640, y: 330 }, { x: 860, y: 450 }] },
    tracks: [{ points: spiral(640, 400, 312, 250, 1.15, Math.PI, 1, 1.75, 1), tunnels: [{ from: 0.48, to: 0.58 }] }],
    colours: 6, speed: 27, goal: 3300, par: par(3300, 27), charms: ALL, twine: 0.08, ...night,
  },
  {
    id: 'night-8', name: 'Night Scented', shooter: { kind: 'pivot', x: 640, y: 600 },
    tracks: bridged([{ points: curlBack(205, 125, 450, true) }]),
    colours: 6, speed: 19, goal: 2800, par: par(2800, 20), charms: ALL, ...night,
  },
  {
    id: 'night-9', name: 'Midnight', shooter: RAIL,
    tracks: [{ points: MIDNIGHT_L }, { points: MIDNIGHT_R }],
    colours: 6, speed: 18, goal: 3000, par: par(3000, 30), charms: ALL, stones: 0.05, ...night,
  },
  {
    id: 'night-10', name: 'The Last Lantern', shooter: { kind: 'hop', pads: [{ x: 440, y: 450 }, { x: 640, y: 340 }, { x: 840, y: 450 }] },
    tracks: [{ points: LAST_A, tunnels: [{ from: 0.35, to: 0.45 }] }, { points: LAST_B, tunnels: [{ from: 0.35, to: 0.45 }] }],
    colours: 6, speed: 22, goal: 4200, par: par(4200, 44), charms: ALL, twine: 0.08, chameleons: 0.08, ...night,
  },
];
