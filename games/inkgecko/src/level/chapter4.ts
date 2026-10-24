import type { Pt } from '../logic/path';
import { bridged } from './cross';
import { figure8, line, meander, spiral, squareSpiral, zigzag } from './shapes';
import type { LevelDef } from './types';

/**
 * Chapter 4, The Orchard. SERVER-ONLY, like every paid chapter: only
 * content/paid.ts imports it. New here: windfalls roll across the grass —
 * spit one for points and a free charm (1) — and marbles closed in buds,
 * which can't pop until a match beside them makes them blossom (2). The
 * gecko hops between tree stumps. Then a twist a level (wind, gold, a late
 * burrow, a hold-out, restless stumps, falling leaves, two paces) and the
 * Magpie.
 */

const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const RAIL = { kind: 'rail', y: 638, x0: 90, x1: 1190 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly', 'inkpot'] as const;
const from = (start: Pt, shape: readonly Pt[], n = 3): Pt[] => [...line(start, shape[0]!, n), ...shape];

/** Level 5: two rows of trees, one along the top of the orchard and one along the bottom, the gecko between. */
const ROW_TOP: Pt[] = from({ x: -30, y: 105 }, meander(120, 1160, 105, 262, 2, 12, 4));
const ROW_LOW: Pt[] = from({ x: 1310, y: 538 }, meander(1160, 120, 538, 660, 2, 12, 4));
/** Level 8: a rounded square, like the press's frame. */
const PRESS: Pt[] = squareSpiral(640, 400, 305, 165, 1.5, 0, 1, 1.75, 1, 0.45);
/** Level 9: two bands across the orchard, the high one quick, the low one slow. */
const BAND_HIGH: Pt[] = from({ x: -30, y: 95 }, meander(110, 1170, 95, 215, 2, 12, 3));
const BAND_LOW: Pt[] = from({ x: 1310, y: 335 }, meander(1170, 110, 335, 455, 2, 12, 3));
/** Level 10: an eight under the old pear's branches; the posts the Magpie lands on between it and the gecko's branch. */
const OLD_PEAR: Pt[] = from({ x: 1310, y: 220 }, figure8(640, 220, 470, 260, Math.PI / 2, 0.9, -1));
const POSTS: Pt[] = [{ x: 210, y: 478 }, { x: 490, y: 492 }, { x: 790, y: 492 }, { x: 1070, y: 478 }];

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
    colours: 4, speed: 32, goal: 2900, par: par(2900, 32), charms: ['slow', 'reverse', 'burst', 'inkpot'], buds: 0.1, fruit: true, wind: 360,
  },
  {
    id: 'orchard-4', name: 'Stumps', shooter: { kind: 'hop', pads: [{ x: 470, y: 420 }, { x: 810, y: 420 }] },
    tracks: [{ points: spiral(640, 400, 305, 210, 0.92, Math.PI * 0.25, 1, 1.75, 1) }],
    colours: 5, speed: 30, goal: 2900, par: par(2900, 30), charms: ALL, buds: 0.12, fruit: true, mode: { kind: 'gold', count: 6 },
  },
  {
    id: 'orchard-5', name: 'Apple Rows', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: ROW_TOP, tunnels: [{ from: 0.35, to: 0.45 }] }, { points: ROW_LOW, tunnels: [{ from: 0.35, to: 0.45 }], opensAt: 0.3 }],
    colours: 4, speed: 28, goal: 3100, par: par(3100, 40), charms: ALL, buds: 0.12, fruit: true,
  },
  {
    id: 'orchard-6', name: 'The Pear Tree', shooter: RAIL,
    tracks: bridged([{ points: from({ x: 1310, y: 300 }, figure8(640, 300, 440, 400, Math.PI / 2, 0.9, -1)) }]),
    colours: 5, speed: 30, goal: 3200, par: 210, charms: ALL, buds: 0.15, mode: { kind: 'holdout', seconds: 80 },
  },
  {
    id: 'orchard-7', name: 'Plum Alley', shooter: { kind: 'hop', pads: [{ x: 420, y: 450 }, { x: 640, y: 330 }, { x: 860, y: 450 }] },
    tracks: [{ points: spiral(640, 400, 310, 250, 1.15, Math.PI * 0.6, -1, 1.75, 1), tunnels: [{ from: 0.4, to: 0.5 }] }],
    colours: 5, speed: 30, goal: 3300, par: par(3300, 30), charms: ALL, buds: 0.18, fruit: true, restless: 6,
  },
  {
    id: 'orchard-8', name: 'The Cider Press', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: PRESS }],
    colours: 5, speed: 32, goal: 3400, par: par(3400, 32), charms: ALL, buds: 0.2, leaves: 2,
  },
  {
    id: 'orchard-9', name: 'Harvest', shooter: RAIL,
    tracks: [{ points: BAND_HIGH, tunnels: [{ from: 0.5, to: 0.6 }], pace: 1.2 }, { points: BAND_LOW, tunnels: [{ from: 0.5, to: 0.6 }], pace: 0.8 }],
    colours: 5, speed: 20, goal: 3500, par: 230, charms: ALL, buds: 0.15, fruit: true,
  },
  {
    id: 'orchard-10', name: 'The Old Pear', shooter: RAIL,
    tracks: bridged([{ points: OLD_PEAR }]),
    colours: 5, speed: 28, goal: 4000, par: 180, charms: ALL, buds: 0.15, fruit: true,
    boss: { kind: 'magpie', hp: 10, spots: POSTS },
  },
];
