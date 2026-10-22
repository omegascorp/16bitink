import type { Pt } from '../logic/path';
import { bridged } from './cross';
import { figure8, line, meander, squareSpiral } from './shapes';
import type { LevelDef } from './types';

/**
 * Chapter 6, The Allotment. SERVER-ONLY, like every paid chapter: only
 * content/paid.ts imports it. New here: marbles tied with garden twine,
 * which pop as a pair (1), and the Hedgehog charm, which eats its way up the
 * line from the well (3). The tracks run square like the beds; the gecko
 * hops between upturned buckets; tunnels are fleece cloches.
 */

const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const RAIL = { kind: 'rail', y: 638, x0: 90, x1: 1190 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly', 'inkpot', 'geode', 'hedgehog'] as const;
const from = (start: Pt, shape: readonly Pt[], n = 3): Pt[] => [...line(start, shape[0]!, n), ...shape];

/** Level 5: two squared half-spirals, one round each side. */
const BEANS_L: Pt[] = squareSpiral(640, 400, 300, 150, 0.95, -Math.PI / 2 - 0.15, -1, 1.75, 1);
const BEANS_R: Pt[] = squareSpiral(640, 400, 300, 150, 0.95, Math.PI / 2 - 0.15, -1, 1.75, 1);
/** Level 9: a wavering row down each half of the plot. */
const SCARE_L: Pt[] = from({ x: -30, y: 110 }, meander(80, 500, 110, 470, 3, 22, 2));
const SCARE_R: Pt[] = from({ x: 1310, y: 110 }, meander(1200, 780, 110, 470, 3, 22, 2));
/** Level 10: two squared spirals wound into each other. */
const HARVEST_A: Pt[] = squareSpiral(640, 400, 310, 225, 1.05, Math.PI * 0.55, 1, 1.75, 1);
const HARVEST_B: Pt[] = squareSpiral(640, 400, 310, 225, 1.05, Math.PI * 1.55, 1, 1.75, 1);

export const CHAPTER_6: readonly LevelDef[] = [
  {
    id: 'plot-1', name: 'Bean Rows', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: squareSpiral(640, 400, 300, 160, 1.4, Math.PI * 0.85, 1, 1.75, 1) }],
    colours: 4, speed: 30, goal: 2800, par: par(2800, 30), charms: ['slow', 'reverse', 'burst', 'inkpot'], teach: ['twine'], twine: 0.12,
  },
  {
    id: 'plot-2', name: 'Seed Drills', shooter: RAIL,
    tracks: [{ points: from({ x: -30, y: 110 }, meander(110, 1170, 110, 470, 4, 20, 3)) }],
    colours: 4, speed: 30, goal: 2900, par: par(2900, 30), charms: ['slow', 'reverse', 'burst', 'aim'], twine: 0.14,
  },
  {
    id: 'plot-3', name: 'The Hedgehog', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: squareSpiral(640, 400, 305, 140, 1.8, -Math.PI / 2, -1, 1.75, 1) }],
    colours: 5, speed: 30, goal: 3000, par: par(3000, 30), charms: ['hedgehog', 'slow', 'burst'], teach: ['hedgehog'], twine: 0.12,
  },
  {
    id: 'plot-4', name: 'Water Butts', shooter: { kind: 'hop', pads: [{ x: 470, y: 420 }, { x: 810, y: 420 }] },
    tracks: [{ points: squareSpiral(640, 400, 305, 210, 0.9, -Math.PI * 0.25, 1, 1.75, 1), tunnels: [{ from: 0.55, to: 0.65 }] }],
    colours: 5, speed: 30, goal: 3000, par: par(3000, 30), charms: ALL, twine: 0.15,
  },
  {
    id: 'plot-5', name: 'Runner Beans', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: BEANS_L }, { points: BEANS_R }],
    colours: 5, speed: 24, goal: 3200, par: par(3200, 36), charms: ALL, twine: 0.15,
  },
  {
    id: 'plot-6', name: 'The Shed', shooter: RAIL,
    tracks: bridged([{ points: from({ x: -30, y: 300 }, figure8(640, 300, 440, 400, -Math.PI / 2, 0.9)) }]),
    colours: 5, speed: 30, goal: 3300, par: par(3300, 30), charms: ALL, twine: 0.16,
  },
  {
    id: 'plot-7', name: 'Onion Bed', shooter: { kind: 'hop', pads: [{ x: 420, y: 450 }, { x: 640, y: 330 }, { x: 860, y: 450 }] },
    tracks: [{ points: squareSpiral(640, 400, 310, 250, 1.15, -Math.PI / 2, -1, 1.75, 1), tunnels: [{ from: 0.5, to: 0.6 }] }],
    colours: 5, speed: 32, goal: 3400, par: par(3400, 32), charms: ALL, twine: 0.18,
  },
  {
    id: 'plot-8', name: 'Marrow Patch', shooter: { kind: 'pivot', x: 640, y: 610 },
    tracks: [{ points: from({ x: -30, y: 90 }, meander(100, 1180, 90, 440, 4, 18, 2)) }],
    colours: 5, speed: 30, goal: 3400, par: par(3400, 30), charms: ALL, twine: 0.16, buds: 0.08,
  },
  {
    id: 'plot-9', name: 'Scarecrow', shooter: RAIL,
    tracks: [{ points: SCARE_L }, { points: SCARE_R }],
    colours: 5, speed: 26, goal: 3600, par: par(3600, 38), charms: ALL, twine: 0.2,
  },
  {
    id: 'plot-10', name: 'Harvest Festival', shooter: { kind: 'hop', pads: [{ x: 440, y: 450 }, { x: 640, y: 340 }, { x: 840, y: 450 }] },
    tracks: [{ points: HARVEST_A, tunnels: [{ from: 0.35, to: 0.45 }] }, { points: HARVEST_B, tunnels: [{ from: 0.35, to: 0.45 }] }],
    colours: 5, speed: 26, goal: 4200, par: par(4200, 44), charms: ALL, twine: 0.22,
  },
];
