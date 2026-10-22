import type { Pt } from '../logic/path';
import { bridged } from './cross';
import { figure8, line, spiral, turned } from './shapes';
import type { LevelDef } from './types';

/**
 * Chapter 3, The Greenhouse. SERVER-ONLY, like every paid chapter: only
 * content/paid.ts imports it. New here: tracks that cross (one rolls over
 * the other's tunnel; marbles in the tunnel are hidden) (1), and the Ink
 * Pot charm, which pops every marble of one colour (3).
 */

/** Seconds to beat, as chapter 1 reckons it. */
const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const RAIL = { kind: 'rail', y: 638, x0: 90, x1: 1190 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly', 'inkpot'] as const;

/** An entry leg from off the board into the start of a shape. */
const from = (start: Pt, shape: readonly Pt[], n = 3): Pt[] => [...line(start, shape[0]!, n), ...shape];

/** Level 1: in from the left, round a figure of eight above the branch. */
const BENCH = from({ x: -30, y: 300 }, figure8(640, 300, 440, 400, -Math.PI / 2, 0.9));
/** Level 2: in from the right, round an eight above the gecko. */
const TRAYS = from({ x: 1310, y: 250 }, figure8(640, 250, 470, 330, Math.PI / 2, 0.9));
/** Level 6 and 10: in at the top left, down, along the bottom and up the right; and in at the left, up, across the top and down. */
const U_SHAPE: Pt[] = [{ x: -30, y: 110 }, { x: 120, y: 120 }, { x: 180, y: 220 }, { x: 185, y: 560 }, { x: 260, y: 650 }, { x: 640, y: 655 }, { x: 1020, y: 650 }, { x: 1095, y: 560 }, { x: 1100, y: 380 }, { x: 1080, y: 250 }];
const CAP_SHAPE: Pt[] = [{ x: -30, y: 470 }, { x: 200, y: 470 }, { x: 320, y: 430 }, { x: 335, y: 220 }, { x: 400, y: 140 }, { x: 640, y: 135 }, { x: 880, y: 140 }, { x: 945, y: 220 }, { x: 950, y: 420 }, { x: 930, y: 540 }];
/** Level 7: two upright eights side by side. */
const LEFT_8 = from({ x: -30, y: 80 }, turned(figure8(380, 290, 210, 300, -Math.PI / 2, 0.88), 380, 290, Math.PI / 2), 4);
const RIGHT_8 = from({ x: 1310, y: 80 }, turned(figure8(900, 290, 210, 300, -Math.PI / 2, 0.88, -1), 900, 290, Math.PI / 2), 4);
/** Level 10: level 6's shapes the other way round. */
const flip = (pts: readonly Pt[]): Pt[] => pts.map((p) => ({ x: 1280 - p.x, y: p.y }));

export const CHAPTER_3: readonly LevelDef[] = [
  {
    id: 'glass-1', name: 'Potting Bench', shooter: RAIL,
    tracks: bridged([{ points: BENCH }]),
    colours: 4, speed: 30, goal: 2600, par: par(2600, 30), charms: ['slow', 'reverse', 'burst'], teach: ['cross'],
  },
  {
    id: 'glass-2', name: 'Seed Trays', shooter: { kind: 'pivot', x: 640, y: 600 },
    tracks: bridged([{ points: TRAYS }]),
    colours: 4, speed: 32, goal: 2700, par: par(2700, 32), charms: ['slow', 'reverse', 'burst', 'aim'],
  },
  {
    id: 'glass-3', name: 'Ink Pot', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 305, 150, 1.7, Math.PI, 1, 1.75, 1) }],
    colours: 5, speed: 32, goal: 2800, par: par(2800, 32), charms: ['inkpot', 'slow', 'burst'], teach: ['inkpot'],
  },
  {
    id: 'glass-4', name: 'Cold Frames', shooter: RAIL,
    tracks: bridged([
      { points: [{ x: -30, y: 110 }, { x: 260, y: 115 }, { x: 640, y: 260 }, { x: 980, y: 420 }, { x: 1060, y: 480 }] },
      { points: [{ x: 1310, y: 110 }, { x: 1020, y: 115 }, { x: 640, y: 260 }, { x: 300, y: 420 }, { x: 220, y: 480 }] },
    ]),
    colours: 4, speed: 26, goal: 2800, par: par(2800, 38), charms: ['slow', 'reverse', 'burst', 'inkpot'],
  },
  {
    id: 'glass-5', name: 'The Vine', shooter: { kind: 'hop', pads: [{ x: 300, y: 590 }, { x: 980, y: 590 }] },
    tracks: bridged([{ points: from({ x: -30, y: 270 }, figure8(640, 270, 430, 300, -Math.PI / 2, 0.88)) }]),
    colours: 5, speed: 28, goal: 3000, par: par(3000, 28), charms: ALL,
  },
  {
    id: 'glass-6', name: 'Tomato Rows', shooter: { kind: 'pivot', ...C },
    tracks: bridged([{ points: U_SHAPE }, { points: CAP_SHAPE }]),
    colours: 4, speed: 26, goal: 3100, par: par(3100, 40), charms: ALL,
  },
  {
    id: 'glass-7', name: 'Watering Can', shooter: RAIL,
    tracks: bridged([{ points: LEFT_8 }, { points: RIGHT_8 }]),
    colours: 5, speed: 24, goal: 3200, par: par(3200, 40), charms: ALL,
  },
  {
    id: 'glass-8', name: 'Glass Maze', shooter: { kind: 'pivot', x: 640, y: 610 },
    tracks: bridged([
      { points: [{ x: -30, y: 100 }, { x: 300, y: 110 }, { x: 640, y: 250 }, { x: 980, y: 400 }, { x: 1130, y: 420 }, { x: 1150, y: 300 }] },
      { points: [{ x: 1310, y: 100 }, { x: 980, y: 110 }, { x: 640, y: 250 }, { x: 300, y: 400 }, { x: 150, y: 420 }, { x: 130, y: 300 }] },
    ]),
    colours: 5, speed: 24, goal: 3200, par: par(3200, 38), charms: ALL,
  },
  {
    id: 'glass-9', name: 'Hot Bed', shooter: { kind: 'hop', pads: [{ x: 300, y: 600 }, { x: 640, y: 610 }, { x: 980, y: 600 }] },
    tracks: bridged([{ points: from({ x: 1310, y: 250 }, figure8(640, 250, 460, 320, Math.PI / 2, 0.9, -1)) }]),
    colours: 5, speed: 27, goal: 3300, par: par(3300, 27), charms: ALL,
  },
  {
    id: 'glass-10', name: 'The Palm House', shooter: { kind: 'pivot', ...C },
    tracks: bridged([{ points: flip(CAP_SHAPE) }, { points: flip(U_SHAPE) }]),
    colours: 5, speed: 24, goal: 3500, par: par(3500, 40), charms: ALL,
  },
];
