import type { Pt } from '../logic/path';
import { bridged } from './cross';
import { figure8, line, spiral, zigzag } from './shapes';
import type { LevelDef } from './types';

/**
 * Chapter 5, The Rockery. SERVER-ONLY, like every paid chapter: only
 * content/paid.ts imports it. New here: stones in the line, which match
 * nothing and break when a pop happens beside them (1), and the Geode
 * charm, a crystal spit that turns the colour of whatever it hits (3). The
 * gecko hops between stepping stones; tunnels are stone slabs. Then a
 * twist a level (surges, gold, no swaps, a pacing gecko, a blitz, a late
 * colour, leaves) and the Old Tortoise, who leads the last line.
 */

const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const RAIL = { kind: 'rail', y: 638, x0: 90, x1: 1190 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly', 'inkpot', 'geode'] as const;
const from = (start: Pt, shape: readonly Pt[], n = 3): Pt[] => [...line(start, shape[0]!, n), ...shape];

/** Level 6: one wide loop round a hollow the gecko paces in. */
const RILL: Pt[] = spiral(640, 400, 305, 238, 1.3, -Math.PI / 2, 1, 1.75, 1);
/** Level 10: one long spiral up the rockery, the Old Tortoise at its head. */
const SUMMIT: Pt[] = spiral(640, 400, 310, 165, 1.65, Math.PI * 0.55, 1, 1.75, 1);

export const CHAPTER_5: readonly LevelDef[] = [
  {
    id: 'rock-1', name: 'Gravel Path', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 300, 160, 1.4, Math.PI * 0.85, 1, 1.75, 1) }],
    colours: 4, speed: 30, goal: 2800, par: par(2800, 30), charms: ['slow', 'reverse', 'burst', 'inkpot'], teach: ['stone'], stones: 0.08,
  },
  {
    id: 'rock-2', name: 'Stepping Stones', shooter: { kind: 'hop', pads: [{ x: 470, y: 420 }, { x: 810, y: 420 }] },
    tracks: [{ points: spiral(640, 400, 305, 210, 0.9, -Math.PI * 0.25, 1, 1.75, 1) }],
    colours: 4, speed: 28, goal: 2900, par: par(2900, 28), charms: ['slow', 'reverse', 'burst', 'inkpot'], stones: 0.1, surge: 12,
  },
  {
    id: 'rock-3', name: 'The Geode', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 305, 140, 1.8, -Math.PI / 2, -1, 1.75, 1) }],
    colours: 5, speed: 32, goal: 3000, par: par(3000, 32), charms: ['geode', 'slow', 'burst'], teach: ['geode'], stones: 0.1,
  },
  {
    id: 'rock-4', name: 'Scree', shooter: RAIL,
    tracks: [{ points: zigzag(1110, 170, 110, 460, 4), tunnels: [{ from: 0.22, to: 0.3 }, { from: 0.6, to: 0.68 }] }],
    colours: 5, speed: 32, goal: 3000, par: par(3000, 32), charms: ALL, stones: 0.12, mode: { kind: 'gold', count: 6 },
  },
  {
    id: 'rock-5', name: 'Alpine Cushions', shooter: { kind: 'hop', pads: [{ x: 300, y: 590 }, { x: 640, y: 610 }, { x: 980, y: 590 }] },
    tracks: bridged([{ points: from({ x: -30, y: 260 }, figure8(640, 260, 450, 320, -Math.PI / 2, 0.88)) }]),
    colours: 5, speed: 30, goal: 3200, par: par(3200, 30), charms: ALL, stones: 0.12, noSwap: true,
  },
  {
    id: 'rock-6', name: 'The Rill', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: RILL, tunnels: [{ from: 0.42, to: 0.52 }] }],
    colours: 5, speed: 30, goal: 3300, par: par(3300, 30), charms: ALL, stones: 0.14, wander: { rx: 60, ry: 34, period: 11 },
  },
  {
    id: 'rock-7', name: 'Boulder Run', shooter: RAIL,
    tracks: bridged([{ points: from({ x: -30, y: 300 }, figure8(640, 300, 440, 400, -Math.PI / 2, 0.9)) }]),
    colours: 5, speed: 30, goal: 3400, par: par(3400, 30), charms: ALL, stones: 0.15, mode: { kind: 'blitz', seconds: 175 },
  },
  {
    id: 'rock-8', name: 'Saxifrage', shooter: { kind: 'hop', pads: [{ x: 420, y: 450 }, { x: 640, y: 330 }, { x: 860, y: 450 }] },
    tracks: [{ points: spiral(640, 400, 310, 250, 1.15, -Math.PI / 2, -1, 1.75, 1), tunnels: [{ from: 0.5, to: 0.6 }] }],
    colours: 5, speed: 32, goal: 3500, par: par(3500, 32), charms: ALL, stones: 0.16, colourAt: 0.45,
  },
  {
    id: 'rock-9', name: 'The Cairn', shooter: RAIL,
    tracks: [{ points: zigzag(110, 1170, 95, 515, 5), tunnels: [{ from: 0.3, to: 0.36 }, { from: 0.62, to: 0.68 }] }],
    colours: 5, speed: 36, goal: 3700, par: 315, charms: ALL, stones: 0.18, leaves: 3,
  },
  {
    id: 'rock-10', name: 'The Summit', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: SUMMIT }],
    colours: 5, speed: 28, goal: 4200, par: 190, charms: ALL, stones: 0.1,
    boss: { kind: 'tortoise', hp: 12, spots: [], line: 0 },
  },
];
