import type { Pt } from '../logic/path';
import { bridged } from './cross';
import { figure8, line, meander, squareSpiral, zigzag } from './shapes';
import type { LevelDef } from './types';

/**
 * Chapter 8, The Old Barn. SERVER-ONLY, like every paid chapter: only
 * content/paid.ts imports it. New here: the barn's timber walls, which
 * shots bounce off, so a marble can be banked round the line (1), and a
 * sixth colour (3). The gecko hops between hay bales; tunnels run under
 * rows of bales. Then a twist a level (surges, charms galore, a pacing
 * gecko, a hold-out, gold, the tide, one life) and the Barn Cat up on the
 * beam, who swats straight shots back.
 */

const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const RAIL = { kind: 'rail', y: 638, x0: 90, x1: 1190 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly', 'inkpot', 'geode', 'hedgehog', 'rain'] as const;
const from = (start: Pt, shape: readonly Pt[], n = 3): Pt[] => [...line(start, shape[0]!, n), ...shape];
const barn = { walls: true } as const;

/** Level 5: one long line, two wavering rows along the top wall, down the side and two along the bottom; the gecko paces between. */
const THRESHING: Pt[] = [
  ...from({ x: -30, y: 100 }, meander(90, 1190, 100, 235, 2, 14, 2)),
  ...line({ x: 70, y: 300 }, { x: 70, y: 470 }, 3),
  ...meander(90, 1190, 528, 638, 2, 14, 2),
];
/** Level 9: a row down each side of the barn. */
const SACKS_L: Pt[] = from({ x: -30, y: 110 }, meander(80, 500, 110, 470, 3, 14, 1));
const SACKS_R: Pt[] = from({ x: 1310, y: 110 }, meander(1200, 780, 110, 470, 3, 14, 1));
/** Level 10: three rows across the barn floor below the gecko; the Barn Cat prowls the beam along the top wall. */
const DOOR_ROWS: Pt[] = from({ x: -30, y: 452 }, meander(110, 1170, 452, 668, 3, 10, 2));
const BEAM: Pt[] = [{ x: 200, y: 64 }, { x: 1080, y: 64 }];

export const CHAPTER_8: readonly LevelDef[] = [
  {
    id: 'barn-1', name: 'Hayloft', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: squareSpiral(640, 400, 305, 160, 1.4, Math.PI * 0.85, 1, 1.75, 1, 0.85) }],
    colours: 5, speed: 28, goal: 2900, par: par(2900, 28), charms: ['slow', 'reverse', 'burst', 'hedgehog'], teach: ['bank'], ...barn,
  },
  {
    id: 'barn-2', name: 'Cart Shed', shooter: RAIL,
    tracks: [{ points: zigzag(1110, 170, 110, 470, 4), tunnels: [{ from: 0.22, to: 0.3 }, { from: 0.6, to: 0.68 }] }],
    colours: 5, speed: 28, goal: 3000, par: 350, charms: ['slow', 'reverse', 'burst', 'aim', 'rain'], surge: 12, ...barn,
  },
  {
    id: 'barn-3', name: 'Milk Churns', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: squareSpiral(640, 400, 308, 140, 1.8, -Math.PI / 2, -1, 1.75, 1, 0.85) }],
    colours: 6, speed: 26, goal: 3000, par: par(3000, 26), charms: ['slow', 'reverse', 'burst', 'inkpot', 'hedgehog'], ...barn,
  },
  {
    id: 'barn-4', name: 'Hay Bales', shooter: { kind: 'hop', pads: [{ x: 470, y: 420 }, { x: 810, y: 420 }] },
    tracks: [{ points: squareSpiral(640, 400, 305, 210, 0.9, -Math.PI * 0.25, 1, 1.75, 1, 0.85), tunnels: [{ from: 0.55, to: 0.65 }] }],
    colours: 6, speed: 26, goal: 3100, par: par(3100, 26), charms: ALL, stones: 0.06, charmy: true, ...barn,
  },
  {
    id: 'barn-5', name: 'Threshing Floor', shooter: { kind: 'pivot', ...C, y: 384 },
    tracks: [{ points: THRESHING, tunnels: [{ from: 0.47, to: 0.52 }] }],
    colours: 6, speed: 24, goal: 3000, par: par(3000, 24), charms: ALL, wander: { rx: 130, ry: 0, period: 9 }, ...barn,
  },
  {
    id: 'barn-6', name: 'The Ladder', shooter: RAIL,
    tracks: [{ points: from({ x: 1310, y: 95 }, meander(1170, 110, 95, 500, 4, 10, 2)), tunnels: [{ from: 0.3, to: 0.36 }, { from: 0.62, to: 0.68 }] }],
    colours: 6, speed: 32, goal: 3300, par: 295, charms: ALL, twine: 0.1, mode: { kind: 'holdout', seconds: 90 }, ...barn,
  },
  {
    id: 'barn-7', name: "Swallows' Nest", shooter: { kind: 'hop', pads: [{ x: 300, y: 590 }, { x: 640, y: 610 }, { x: 980, y: 590 }] },
    tracks: bridged([{ points: from({ x: -30, y: 260 }, figure8(640, 260, 450, 320, -Math.PI / 2, 0.88)) }]),
    colours: 6, speed: 27, goal: 3300, par: par(3300, 27), charms: ALL, chameleons: 0.08, mode: { kind: 'gold', count: 7 }, ...barn,
  },
  {
    id: 'barn-8', name: 'Lantern Light', shooter: { kind: 'pivot', x: 640, y: 610 },
    tracks: [{ points: from({ x: -30, y: 90 }, meander(100, 1180, 90, 440, 4, 12, 1.5)) }],
    colours: 6, speed: 28, goal: 3400, par: 295, charms: ALL, buds: 0.1, tide: 11, ...barn,
  },
  {
    id: 'barn-9', name: 'Grain Sacks', shooter: RAIL,
    tracks: [{ points: SACKS_L }, { points: SACKS_R }],
    colours: 6, speed: 16, goal: 3300, par: par(3300, 28), charms: ALL, stones: 0.07, lives: 1, ...barn,
  },
  {
    id: 'barn-10', name: 'The Barn Cat', shooter: { kind: 'pivot', x: 640, y: 300 },
    tracks: [{ points: DOOR_ROWS, tunnels: [{ from: 0.4, to: 0.47 }] }],
    colours: 6, speed: 24, goal: 4000, par: 200, charms: ALL, twine: 0.08,
    boss: { kind: 'cat', hp: 9, spots: BEAM }, ...barn,
  },
];
