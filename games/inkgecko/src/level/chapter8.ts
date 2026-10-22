import type { Pt } from '../logic/path';
import { bridged } from './cross';
import { figure8, line, meander, squareSpiral, zigzag } from './shapes';
import type { LevelDef } from './types';

/**
 * Chapter 8, The Old Barn. SERVER-ONLY, like every paid chapter: only
 * content/paid.ts imports it. New here: the barn's timber walls, which
 * shots bounce off, so a marble can be banked round the line (1), and a
 * sixth colour (3). The gecko hops between hay bales; tunnels run under
 * rows of bales.
 */

const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const RAIL = { kind: 'rail', y: 638, x0: 90, x1: 1190 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly', 'inkpot', 'geode', 'hedgehog', 'rain'] as const;
const from = (start: Pt, shape: readonly Pt[], n = 3): Pt[] => [...line(start, shape[0]!, n), ...shape];
const barn = { walls: true } as const;

/** Level 5: a wavering pair of rows along the top wall and another along the bottom. */
const FLOOR_TOP: Pt[] = from({ x: -30, y: 100 }, meander(90, 1190, 100, 235, 2, 16, 2));
const FLOOR_LOW: Pt[] = from({ x: 1310, y: 510 }, meander(1190, 90, 510, 625, 2, 16, 2), 2);
/** Level 9: a row down each side of the barn. */
const SACKS_L: Pt[] = from({ x: -30, y: 110 }, meander(80, 500, 110, 470, 3, 14, 1));
const SACKS_R: Pt[] = from({ x: 1310, y: 110 }, meander(1200, 780, 110, 470, 3, 14, 1));
/** Level 10: two square spirals wound into each other. */
const DOORS_A: Pt[] = squareSpiral(640, 400, 310, 225, 1.05, Math.PI * 0.25, 1, 1.75, 1, 0.85);
const DOORS_B: Pt[] = squareSpiral(640, 400, 310, 225, 1.05, Math.PI * 1.25, 1, 1.75, 1, 0.85);

export const CHAPTER_8: readonly LevelDef[] = [
  {
    id: 'barn-1', name: 'Hayloft', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: squareSpiral(640, 400, 305, 160, 1.4, Math.PI * 0.85, 1, 1.75, 1, 0.85) }],
    colours: 5, speed: 28, goal: 2900, par: par(2900, 28), charms: ['slow', 'reverse', 'burst', 'hedgehog'], teach: ['bank'], ...barn,
  },
  {
    id: 'barn-2', name: 'Cart Shed', shooter: RAIL,
    tracks: [{ points: zigzag(1110, 170, 110, 470, 4), tunnels: [{ from: 0.22, to: 0.3 }, { from: 0.6, to: 0.68 }] }],
    colours: 5, speed: 30, goal: 3000, par: par(3000, 30), charms: ['slow', 'reverse', 'burst', 'aim', 'rain'], ...barn,
  },
  {
    id: 'barn-3', name: 'Milk Churns', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: squareSpiral(640, 400, 308, 140, 1.8, -Math.PI / 2, -1, 1.75, 1, 0.85) }],
    colours: 6, speed: 26, goal: 3000, par: par(3000, 26), charms: ['slow', 'reverse', 'burst', 'inkpot', 'hedgehog'], ...barn,
  },
  {
    id: 'barn-4', name: 'Hay Bales', shooter: { kind: 'hop', pads: [{ x: 470, y: 420 }, { x: 810, y: 420 }] },
    tracks: [{ points: squareSpiral(640, 400, 305, 210, 0.9, -Math.PI * 0.25, 1, 1.75, 1, 0.85), tunnels: [{ from: 0.55, to: 0.65 }] }],
    colours: 6, speed: 26, goal: 3100, par: par(3100, 26), charms: ALL, stones: 0.06, ...barn,
  },
  {
    id: 'barn-5', name: 'Threshing Floor', shooter: { kind: 'pivot', ...C, y: 378 },
    tracks: [{ points: FLOOR_TOP }, { points: FLOOR_LOW }],
    colours: 6, speed: 19, goal: 3000, par: par(3000, 30), charms: ALL, ...barn,
  },
  {
    id: 'barn-6', name: 'The Ladder', shooter: RAIL,
    tracks: [{ points: from({ x: 1310, y: 95 }, meander(1170, 110, 95, 500, 4, 10, 2)), tunnels: [{ from: 0.3, to: 0.36 }, { from: 0.62, to: 0.68 }] }],
    colours: 6, speed: 30, goal: 3300, par: par(3300, 30), charms: ALL, twine: 0.1, ...barn,
  },
  {
    id: 'barn-7', name: "Swallows' Nest", shooter: { kind: 'hop', pads: [{ x: 300, y: 590 }, { x: 640, y: 610 }, { x: 980, y: 590 }] },
    tracks: bridged([{ points: from({ x: -30, y: 260 }, figure8(640, 260, 450, 320, -Math.PI / 2, 0.88)) }]),
    colours: 6, speed: 27, goal: 3300, par: par(3300, 27), charms: ALL, chameleons: 0.08, ...barn,
  },
  {
    id: 'barn-8', name: 'Lantern Light', shooter: { kind: 'pivot', x: 640, y: 610 },
    tracks: [{ points: from({ x: -30, y: 90 }, meander(100, 1180, 90, 440, 4, 12, 1.5)) }],
    colours: 6, speed: 26, goal: 3400, par: par(3400, 26), charms: ALL, buds: 0.1, ...barn,
  },
  {
    id: 'barn-9', name: 'Grain Sacks', shooter: RAIL,
    tracks: [{ points: SACKS_L }, { points: SACKS_R }],
    colours: 6, speed: 20, goal: 3300, par: par(3300, 32), charms: ALL, stones: 0.07, ...barn,
  },
  {
    id: 'barn-10', name: 'The Big Doors', shooter: { kind: 'hop', pads: [{ x: 440, y: 450 }, { x: 640, y: 340 }, { x: 840, y: 450 }] },
    tracks: [{ points: DOORS_A, tunnels: [{ from: 0.35, to: 0.45 }] }, { points: DOORS_B, tunnels: [{ from: 0.35, to: 0.45 }] }],
    colours: 6, speed: 23, goal: 4000, par: par(4000, 40), charms: ALL, twine: 0.1, chameleons: 0.08, ...barn,
  },
];
