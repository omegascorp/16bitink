import type { Pt } from '../logic/path';
import { line, spiral, zigzag } from './shapes';
import type { LevelDef } from './types';

/** Seconds to beat: the time to roll out and pop the bar's worth of marbles, with some slack. */
const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

/** The middle of the board, where pivot geckos usually sit. */
const C = { x: 640, y: 400 } as const;

/** Level 5's track: in from the right edge along the top, then a loop round the gecko ending in a hook. */
const FERN: Pt[] = [
  ...line({ x: 1310, y: 110 }, { x: 760, y: 110 }, 4),
  ...spiral(560, 400, 290, 150, 1.15, -Math.PI / 2 - 0.25, -1, 1.7, 1),
];

/** Level 6: two half-spirals, one round each side of the gecko. */
const TWO_LEFT: Pt[] = spiral(640, 400, 300, 150, 0.95, -Math.PI / 2 - 0.15, -1, 1.75, 1);
const TWO_RIGHT: Pt[] = spiral(640, 400, 300, 150, 0.95, Math.PI / 2 - 0.15, -1, 1.75, 1);

/** Level 10: two spirals wound into each other, each starting on its own side. */
const WELL_A: Pt[] = spiral(640, 400, 305, 165, 1.2, Math.PI, 1, 1.75, 1);
const WELL_B: Pt[] = spiral(640, 400, 305, 165, 1.2, 0, 1, 1.75, 1);

/** Chapter 1, The Garden: free. Pivot levels teach the basics; rail levels arrive at 4. */
export const CHAPTER_1: readonly LevelDef[] = [
  {
    id: 'garden-1', name: 'First Pebbles', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 300, 165, 1.2, Math.PI * 0.85, 1, 1.7, 1) }],
    colours: 3, speed: 30, goal: 1000, par: par(1000, 30), charms: [], teach: ['spit', 'swap'],
  },
  {
    id: 'garden-2', name: 'Moss Steps', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 300, 150, 1.45, 0.1, -1, 1.75, 1) }],
    colours: 3, speed: 33, goal: 1400, par: par(1400, 33), charms: ['slow'],
  },
  {
    id: 'garden-3', name: 'Snail Trail', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 305, 135, 1.8, -Math.PI / 2, 1, 1.75, 1) }],
    colours: 4, speed: 34, goal: 1800, par: par(1800, 34), charms: ['slow', 'reverse'], teach: ['pull'],
  },
  {
    id: 'garden-4', name: 'The Branch', shooter: { kind: 'rail', y: 638, x0: 90, x1: 1190 },
    tracks: [{ points: zigzag(170, 1110, 120, 440, 3) }],
    colours: 4, speed: 34, goal: 1700, par: par(1700, 34), charms: ['slow', 'reverse'], teach: ['rail', 'catch'],
  },
  {
    id: 'garden-5', name: 'Fern Corner', shooter: { kind: 'pivot', x: 560, y: 400 },
    tracks: [{ points: FERN }],
    colours: 4, speed: 36, goal: 2100, par: par(2100, 36), charms: ['slow', 'reverse', 'burst'],
  },
  {
    id: 'garden-6', name: 'Two Paths', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: TWO_LEFT }, { points: TWO_RIGHT }],
    colours: 4, speed: 26, goal: 2300, par: par(2300, 40), charms: ['slow', 'reverse', 'burst'],
  },
  {
    id: 'garden-7', name: 'Rain Barrel', shooter: { kind: 'rail', y: 638, x0: 90, x1: 1190 },
    tracks: [{ points: zigzag(1170, 110, 95, 515, 5) }],
    colours: 4, speed: 38, goal: 2500, par: par(2500, 38), charms: ['slow', 'reverse', 'burst', 'aim'],
  },
  {
    id: 'garden-8', name: 'The Old Wall', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 305, 160, 1.9, Math.PI / 2, -1, 1.75, 1) }],
    colours: 5, speed: 34, goal: 2700, par: par(2700, 34), charms: ['slow', 'reverse', 'burst', 'aim'],
  },
  {
    id: 'garden-9', name: 'Twin Drains', shooter: { kind: 'rail', y: 638, x0: 90, x1: 1190 },
    tracks: [{ points: zigzag(110, 560, 95, 455, 4) }, { points: zigzag(1170, 720, 95, 455, 4) }],
    colours: 5, speed: 26, goal: 2800, par: par(2800, 40), charms: ['slow', 'reverse', 'burst', 'aim'],
  },
  {
    id: 'garden-10', name: 'The Well', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: WELL_A }, { points: WELL_B }],
    colours: 5, speed: 30, goal: 3400, par: par(3400, 44), charms: ['slow', 'reverse', 'burst', 'aim'],
  },
];
