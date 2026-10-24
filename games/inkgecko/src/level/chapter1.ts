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

/** Level 10: three rows back and forth across the top of the lawn, the Mole's molehills between them and the gecko. */
const MOLE_ROWS: Pt[] = [...line({ x: 1310, y: 100 }, { x: 1150, y: 100 }, 2), ...zigzag(1150, 130, 100, 320, 3)];
const MOLEHILLS: Pt[] = [{ x: 250, y: 462 }, { x: 500, y: 450 }, { x: 780, y: 450 }, { x: 1030, y: 462 }];

/**
 * Chapter 1, The Garden: free. Pivot levels teach the basics; rail levels
 * arrive at 4. Each level past the first few has its own twist (golden
 * marbles, a hold-out, a late burrow, leaves, surges, lines at two speeds),
 * and the Mole waits at the end.
 */
export const CHAPTER_1: readonly LevelDef[] = [
  {
    id: 'garden-1', name: 'First Pebbles', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 300, 165, 1.2, Math.PI * 0.85, 1, 1.7, 1) }],
    colours: 3, speed: 30, goal: 1000, par: par(1000, 30), charms: [], teach: ['spit', 'swap'],
  },
  {
    id: 'garden-2', name: 'Moss Steps', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 300, 150, 1.45, 0.1, -1, 1.75, 1) }],
    colours: 3, speed: 33, goal: 1400, par: par(1400, 33), charms: ['slow'], mode: { kind: 'gold', count: 5 },
  },
  {
    id: 'garden-3', name: 'Snail Trail', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 305, 135, 1.8, -Math.PI / 2, 1, 1.75, 1) }],
    colours: 4, speed: 34, goal: 1800, par: par(1800, 34), charms: ['slow', 'reverse'], teach: ['pull'],
  },
  {
    id: 'garden-4', name: 'The Branch', shooter: { kind: 'rail', y: 638, x0: 90, x1: 1190 },
    tracks: [{ points: zigzag(170, 1110, 120, 440, 3) }],
    colours: 4, speed: 34, goal: 1700, par: 140, charms: ['slow', 'reverse'], teach: ['rail', 'catch'],
  },
  {
    id: 'garden-5', name: 'Fern Corner', shooter: { kind: 'pivot', x: 560, y: 400 },
    tracks: [{ points: FERN }],
    colours: 4, speed: 38, goal: 2100, par: 120, charms: ['slow', 'reverse', 'burst'], mode: { kind: 'holdout', seconds: 70 },
  },
  {
    id: 'garden-6', name: 'Two Paths', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: TWO_LEFT }, { points: TWO_RIGHT, opensAt: 0.35 }],
    colours: 4, speed: 26, goal: 2300, par: par(2300, 40), charms: ['slow', 'reverse', 'burst'],
  },
  {
    id: 'garden-7', name: 'Rain Barrel', shooter: { kind: 'rail', y: 638, x0: 90, x1: 1190 },
    tracks: [{ points: zigzag(1170, 110, 95, 515, 5) }],
    colours: 4, speed: 36, goal: 2500, par: 205, charms: ['slow', 'reverse', 'burst', 'aim'], leaves: 2,
  },
  {
    id: 'garden-8', name: 'The Old Wall', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 305, 160, 1.9, Math.PI / 2, -1, 1.75, 1) }],
    colours: 5, speed: 32, goal: 2700, par: par(2700, 32), charms: ['slow', 'reverse', 'burst', 'aim'], surge: 13,
  },
  {
    id: 'garden-9', name: 'Twin Drains', shooter: { kind: 'rail', y: 638, x0: 90, x1: 1190 },
    tracks: [{ points: zigzag(110, 560, 95, 455, 4), pace: 1.3 }, { points: zigzag(1170, 720, 95, 455, 4), pace: 0.75 }],
    colours: 5, speed: 24, goal: 2800, par: 185, charms: ['slow', 'reverse', 'burst', 'aim'],
  },
  {
    id: 'garden-10', name: 'Mole Hill', shooter: { kind: 'pivot', x: 640, y: 610 },
    tracks: [{ points: MOLE_ROWS }],
    colours: 5, speed: 30, goal: 3400, par: 150, charms: ['slow', 'reverse', 'burst', 'aim'],
    boss: { kind: 'mole', hp: 9, spots: MOLEHILLS },
  },
];
