import type { Pt } from '../logic/path';
import { bridged } from './cross';
import { curlRows, line, meander, spiral } from './shapes';
import type { LevelDef } from './types';

/**
 * Chapter 7, The Wild Meadow. SERVER-ONLY, like every paid chapter: only
 * content/paid.ts imports it. New here: chameleon marbles, which all take
 * the next colour every few seconds (1), and the Rain charm, a shower that
 * pops every marble in a column (3). Tracks meander and loop through the
 * long grass; the gecko hops between millstones; tunnels are grassy banks.
 * Then a twist a level (leaves, restless stones, a late burrow, gold, wind,
 * no swaps, a blitz) and the Great Chameleon.
 */

const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const RAIL = { kind: 'rail', y: 638, x0: 90, x1: 1190 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly', 'inkpot', 'geode', 'hedgehog', 'rain'] as const;
const from = (start: Pt, shape: readonly Pt[], n = 3): Pt[] => [...line(start, shape[0]!, n), ...shape];

/**
 * A row curling into three loop-the-loops along `y` (each reaching `b`
 * above and below it), then a half-turn and straight back along `back`
 * to the well: a lasso thrown along the grass.
 */
function lasso(y: number, b: number, back: number): Pt[] {
  const curls = curlRows(110, 1170, y, y, 1, 3, b);
  const r = (back - y - b) / 2;
  const turn = Array.from({ length: 7 }, (_, k) => {
    const ang = -Math.PI / 2 + ((k + 1) / 8) * Math.PI;
    return { x: 1170 + Math.cos(ang) * r, y: y + b + r + Math.sin(ang) * r };
  });
  return from({ x: -30, y: y + b }, [...curls, ...turn, ...line({ x: 1170, y: back }, { x: 150, y: back }, 10), { x: 150, y: back }]);
}
const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => ({ x: 1280 - p.x, y: p.y }));

/** Levels 2 and 6: on a rail. */
const LASSO: Pt[] = lasso(205, 130, 480);
/** Level 8: above the gecko. */
const PARSLEY: Pt[] = lasso(205, 125, 450);
/** Level 5: a wavering row along the top and another along the bottom. */
const FLOWERS_TOP: Pt[] = from({ x: -30, y: 110 }, meander(90, 1190, 100, 235, 2, 22, 3));
const FLOWERS_LOW: Pt[] = from({ x: 1310, y: 510 }, meander(1190, 90, 510, 625, 2, 22, 3), 2);
/** Level 10: three wavering rows across the top of the meadow; the Great Chameleon walks its round below them. */
const MIDSUMMER: Pt[] = from({ x: -30, y: 100 }, meander(100, 1180, 100, 300, 3, 20, 2.5));
const CHAMELEON_ROUND: Pt[] = [{ x: 220, y: 470 }, { x: 640, y: 498 }, { x: 1060, y: 470 }, { x: 640, y: 442 }];

export const CHAPTER_7: readonly LevelDef[] = [
  {
    id: 'meadow-1', name: 'Long Grass', shooter: { kind: 'pivot', x: 640, y: 590 },
    tracks: [{ points: from({ x: -30, y: 100 }, meander(100, 1180, 100, 400, 3, 26, 2.5)) }],
    colours: 4, speed: 28, goal: 2800, par: par(2800, 28), charms: ['slow', 'reverse', 'burst', 'hedgehog'], teach: ['chameleon'], chameleons: 0.08,
  },
  {
    id: 'meadow-2', name: 'Poppies', shooter: RAIL,
    tracks: bridged([{ points: LASSO }]),
    colours: 4, speed: 30, goal: 2900, par: par(2900, 30), charms: ['slow', 'reverse', 'burst', 'aim'], chameleons: 0.1, leaves: 2,
  },
  {
    id: 'meadow-3', name: 'Rain Cloud', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 305, 140, 1.8, Math.PI * 0.2, 1, 1.75, 1) }],
    colours: 5, speed: 30, goal: 3000, par: par(3000, 30), charms: ['rain', 'slow', 'hedgehog'], teach: ['rain'], chameleons: 0.1,
  },
  {
    id: 'meadow-4', name: 'The Stile', shooter: { kind: 'hop', pads: [{ x: 430, y: 600 }, { x: 850, y: 600 }] },
    tracks: [{ points: from({ x: 1310, y: 100 }, meander(1180, 100, 100, 430, 3, 28, 2)) }],
    colours: 5, speed: 28, goal: 3100, par: par(3100, 28), charms: ALL, chameleons: 0.12, restless: 7,
  },
  {
    id: 'meadow-5', name: 'Cornflowers', shooter: { kind: 'pivot', ...C, y: 378 },
    tracks: [{ points: FLOWERS_TOP }, { points: FLOWERS_LOW, opensAt: 0.35 }],
    colours: 5, speed: 22, goal: 3100, par: par(3100, 34), charms: ALL, chameleons: 0.12,
  },
  {
    id: 'meadow-6', name: 'Butterflies', shooter: RAIL,
    tracks: bridged([{ points: mirror(LASSO) }]),
    colours: 5, speed: 31, goal: 3300, par: par(3300, 31), charms: ALL, chameleons: 0.13, mode: { kind: 'gold', count: 7 },
  },
  {
    id: 'meadow-7', name: 'Mown Circle', shooter: { kind: 'hop', pads: [{ x: 420, y: 450 }, { x: 640, y: 330 }, { x: 860, y: 450 }] },
    tracks: [{ points: spiral(640, 400, 312, 250, 1.15, Math.PI, 1, 1.75, 1), tunnels: [{ from: 0.48, to: 0.58 }] }],
    colours: 5, speed: 30, goal: 3400, par: par(3400, 30), charms: ALL, chameleons: 0.14, wind: 360,
  },
  {
    id: 'meadow-8', name: 'Cow Parsley', shooter: { kind: 'pivot', x: 640, y: 600 },
    tracks: bridged([{ points: mirror(PARSLEY) }]),
    colours: 5, speed: 28, goal: 3400, par: par(3400, 28), charms: ALL, chameleons: 0.14, twine: 0.08, noSwap: true,
  },
  {
    id: 'meadow-9', name: 'Skylark', shooter: RAIL,
    tracks: [{ points: from({ x: 1310, y: 95 }, meander(1170, 110, 95, 500, 4, 18, 3)), tunnels: [{ from: 0.3, to: 0.36 }, { from: 0.62, to: 0.68 }] }],
    colours: 5, speed: 32, goal: 3600, par: 300, charms: ALL, chameleons: 0.15, mode: { kind: 'blitz', seconds: 180 },
  },
  {
    id: 'meadow-10', name: 'Midsummer', shooter: { kind: 'pivot', x: 640, y: 632 },
    tracks: [{ points: MIDSUMMER, tunnels: [{ from: 0.4, to: 0.47 }] }],
    colours: 5, speed: 28, goal: 4200, par: 190, charms: ALL, chameleons: 0.12,
    boss: { kind: 'chameleon', hp: 9, spots: CHAMELEON_ROUND },
  },
];
