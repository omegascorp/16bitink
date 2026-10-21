import type { Pt } from '../logic/path';
import { bridged } from './cross';
import { figure8, line, spiral, zigzag } from './shapes';
import type { LevelDef } from './types';

/**
 * Chapter 4, The Orchard. SERVER-ONLY, like every paid chapter: only
 * content/paid.ts imports it. New here: windfalls roll across the grass —
 * spit one for points and a free charm (1) — and marbles closed in buds,
 * which can't pop until a match beside them makes them blossom (2). The
 * gecko hops between tree stumps.
 */

const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const RAIL = { kind: 'rail', y: 638, x0: 90, x1: 1190 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly', 'inkpot'] as const;
const from = (start: Pt, shape: readonly Pt[], n = 3): Pt[] => [...line(start, shape[0]!, n), ...shape];

/** Level 5: two half-spirals, one round each side, each under a log. */
const ROW_L: Pt[] = spiral(640, 400, 305, 150, 1.0, -Math.PI / 2 - 0.15, -1, 1.75, 1);
const ROW_R: Pt[] = spiral(640, 400, 305, 150, 1.0, Math.PI / 2 - 0.15, -1, 1.75, 1);
/** Level 10: two spirals wound into each other. */
const PEAR_A: Pt[] = spiral(640, 400, 305, 165, 1.2, Math.PI, 1, 1.75, 1);
const PEAR_B: Pt[] = spiral(640, 400, 305, 165, 1.2, 0, 1, 1.75, 1);

export const CHAPTER_4: readonly LevelDef[] = [
  {
    id: 'orchard-1', name: 'Windfalls', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 300, 160, 1.4, 0.2, -1, 1.75, 1) }],
    colours: 4, speed: 32, goal: 2700, par: par(2700, 32), charms: ['slow', 'reverse', 'burst'], teach: ['fruit'], fruit: true,
  },
  {
    id: 'orchard-2', name: 'Blossom', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 305, 150, 1.6, -Math.PI / 2, 1, 1.75, 1) }],
    colours: 4, speed: 32, goal: 2800, par: par(2800, 32), charms: ['slow', 'reverse', 'burst', 'inkpot'], teach: ['bud'], buds: 0.15, fruit: true,
  },
  {
    id: 'orchard-3', name: 'The Ladder', shooter: RAIL,
    tracks: [{ points: zigzag(170, 1110, 110, 450, 4) }],
    colours: 4, speed: 34, goal: 2900, par: par(2900, 34), charms: ['slow', 'reverse', 'burst', 'inkpot'], buds: 0.1, fruit: true,
  },
  {
    id: 'orchard-4', name: 'Stumps', shooter: { kind: 'hop', pads: [{ x: 470, y: 420 }, { x: 810, y: 420 }] },
    tracks: [{ points: spiral(640, 400, 305, 210, 0.92, Math.PI * 0.25, 1, 1.75, 1) }],
    colours: 5, speed: 30, goal: 2900, par: par(2900, 30), charms: ALL, buds: 0.12, fruit: true,
  },
  {
    id: 'orchard-5', name: 'Apple Rows', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: ROW_L, tunnels: [{ from: 0.35, to: 0.47 }] }, { points: ROW_R, tunnels: [{ from: 0.35, to: 0.47 }] }],
    colours: 4, speed: 26, goal: 3100, par: par(3100, 40), charms: ALL, buds: 0.12, fruit: true,
  },
  {
    id: 'orchard-6', name: 'The Pear Tree', shooter: RAIL,
    tracks: bridged([{ points: from({ x: 1310, y: 300 }, figure8(640, 300, 440, 400, Math.PI / 2, 0.9, -1)) }]),
    colours: 5, speed: 30, goal: 3200, par: par(3200, 30), charms: ALL, buds: 0.15,
  },
  {
    id: 'orchard-7', name: 'Plum Alley', shooter: { kind: 'hop', pads: [{ x: 420, y: 450 }, { x: 640, y: 330 }, { x: 860, y: 450 }] },
    tracks: [{ points: spiral(640, 400, 310, 250, 1.15, Math.PI * 0.6, -1, 1.75, 1), tunnels: [{ from: 0.4, to: 0.5 }] }],
    colours: 5, speed: 32, goal: 3300, par: par(3300, 32), charms: ALL, buds: 0.18, fruit: true,
  },
  {
    id: 'orchard-8', name: 'The Cider Press', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 305, 160, 1.9, 0, 1, 1.75, 1) }],
    colours: 5, speed: 34, goal: 3400, par: par(3400, 34), charms: ALL, buds: 0.2,
  },
  {
    id: 'orchard-9', name: 'Harvest', shooter: RAIL,
    tracks: [{ points: zigzag(110, 560, 95, 455, 4), tunnels: [{ from: 0.5, to: 0.6 }] }, { points: zigzag(1170, 720, 95, 455, 4), tunnels: [{ from: 0.5, to: 0.6 }] }],
    colours: 5, speed: 26, goal: 3500, par: par(3500, 40), charms: ALL, buds: 0.15, fruit: true,
  },
  {
    id: 'orchard-10', name: 'The Old Pear', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: PEAR_A }, { points: PEAR_B }],
    colours: 5, speed: 30, goal: 4000, par: par(4000, 46), charms: ALL, buds: 0.2, fruit: true,
  },
];
