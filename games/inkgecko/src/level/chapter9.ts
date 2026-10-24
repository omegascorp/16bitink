import type { Pt } from '../logic/path';
import { bridged } from './cross';
import { curlRows, figure8, line, meander, spiral, squareSpiral, zigzag } from './shapes';
import type { LevelDef, PillarDef } from './types';

/**
 * Chapter 9, The Ruins. SERVER-ONLY, like every paid chapter: only
 * content/paid.ts imports it. New here: broken columns standing on the
 * board, which shots glance off (1) — in the way, or a way round. Six
 * colours throughout from level 3. The gecko hops between fallen column
 * drums; tunnels run under collapsed arches. Then a twist a level (wind,
 * surges, restless drums, a late burrow, leaves, a blitz, gold, two paces) and the
 * Stone Lion, which only shots off a column can hurt.
 */

const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const RAIL = { kind: 'rail', y: 638, x0: 90, x1: 1190 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly', 'inkpot', 'geode', 'hedgehog', 'rain'] as const;
const from = (start: Pt, shape: readonly Pt[], n = 3): Pt[] => [...line(start, shape[0]!, n), ...shape];
const col = (x: number, y: number, r = 30): PillarDef => ({ x, y, r });

/** Level 5: a wavering pair of rows along the top and another along the bottom, columns between. */
const CLOISTER_TOP: Pt[] = from({ x: -30, y: 100 }, meander(90, 1190, 100, 235, 2, 16, 2));
const CLOISTER_LOW: Pt[] = from({ x: 1310, y: 510 }, meander(1190, 90, 510, 625, 2, 16, 2), 2);
/** Level 6: a row curling into loops, then straight back. */
function curlBack(y: number, b: number, back: number): Pt[] {
  const curls = curlRows(110, 1170, y, y, 1, 3, b);
  const r = (back - y - b) / 2;
  const turn = Array.from({ length: 7 }, (_, k) => {
    const ang = -Math.PI / 2 + ((k + 1) / 8) * Math.PI;
    return { x: 1170 + Math.cos(ang) * r, y: y + b + r + Math.sin(ang) * r };
  });
  return from({ x: -30, y: y + b }, [...curls, ...turn, ...line({ x: 1170, y: back }, { x: 150, y: back }, 10), { x: 150, y: back }]);
}
/** Level 9: a row down each side, the fallen statue's plinth below them. */
const STATUE_L: Pt[] = from({ x: -30, y: 110 }, meander(80, 500, 110, 470, 3, 14, 1));
const STATUE_R: Pt[] = from({ x: 1310, y: 110 }, meander(1200, 780, 110, 470, 3, 14, 1));
/** Level 10: a line down each side of the folly; the Stone Lion on its plinth at the top, two columns to glance shots into it. */
const FOLLY_L: Pt[] = from({ x: -30, y: 100 }, meander(70, 300, 100, 580, 5, 8, 1));
const FOLLY_R: Pt[] = from({ x: 1310, y: 100 }, meander(1210, 980, 100, 580, 5, 8, 1));
const PLINTH: Pt = { x: 640, y: 214 };

export const CHAPTER_9: readonly LevelDef[] = [
  {
    id: 'ruins-1', name: 'Broken Columns', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 300, 160, 1.4, Math.PI * 0.85, 1, 1.75, 1) }],
    pillars: [col(455, 400), col(825, 400)],
    colours: 5, speed: 28, goal: 2900, par: par(2900, 28), charms: ['slow', 'reverse', 'burst', 'inkpot'], teach: ['pillar'],
  },
  {
    id: 'ruins-2', name: 'Fallen Arch', shooter: RAIL,
    tracks: [{ points: zigzag(1110, 170, 110, 450, 4), tunnels: [{ from: 0.22, to: 0.3 }, { from: 0.6, to: 0.68 }] }],
    pillars: [col(380, 545, 26), col(900, 545, 26)],
    colours: 5, speed: 28, goal: 3000, par: 310, charms: ['slow', 'reverse', 'burst', 'aim', 'rain'], wind: 340,
  },
  {
    id: 'ruins-3', name: 'Mosaic Floor', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: squareSpiral(640, 400, 308, 145, 1.8, -Math.PI / 2, -1, 1.75, 1, 0.7) }],
    pillars: [col(450, 330, 24), col(830, 330, 24), col(450, 470, 24), col(830, 470, 24)],
    colours: 6, speed: 24, goal: 3000, par: par(3000, 24), charms: ['slow', 'reverse', 'burst', 'inkpot', 'hedgehog'], surge: 12,
  },
  {
    id: 'ruins-4', name: 'The Chapel', shooter: { kind: 'hop', pads: [{ x: 470, y: 440 }, { x: 810, y: 440 }] },
    tracks: [{ points: spiral(640, 400, 305, 210, 0.9, -Math.PI * 0.25, 1, 1.75, 1), tunnels: [{ from: 0.55, to: 0.65 }] }],
    pillars: [col(640, 330, 32)],
    colours: 6, speed: 26, goal: 3100, par: par(3100, 26), charms: ALL, restless: 7,
  },
  {
    id: 'ruins-5', name: 'Cloister', shooter: { kind: 'pivot', ...C, y: 378 },
    tracks: [{ points: CLOISTER_TOP }, { points: CLOISTER_LOW, opensAt: 0.35 }],
    pillars: [col(260, 378, 34), col(1020, 378, 34)],
    colours: 6, speed: 19, goal: 3000, par: par(3000, 30), charms: ALL,
  },
  {
    id: 'ruins-6', name: 'Ivy Walk', shooter: RAIL,
    tracks: bridged([{ points: curlBack(205, 130, 480) }]),
    pillars: [col(300, 560, 24), col(980, 560, 24)],
    colours: 6, speed: 28, goal: 3200, par: 380, charms: ALL, twine: 0.08, leaves: 2,
  },
  {
    id: 'ruins-7', name: 'Bell Tower', shooter: { kind: 'hop', pads: [{ x: 300, y: 590 }, { x: 640, y: 610 }, { x: 980, y: 590 }] },
    tracks: bridged([{ points: from({ x: -30, y: 260 }, figure8(640, 260, 450, 320, -Math.PI / 2, 0.88)) }]),
    pillars: [col(380, 270, 30), col(900, 270, 30)],
    colours: 6, speed: 26, goal: 3300, par: par(3300, 26), charms: ALL, stones: 0.06, mode: { kind: 'blitz', seconds: 185 },
  },
  {
    id: 'ruins-8', name: 'The Old Font', shooter: { kind: 'pivot', x: 640, y: 610 },
    tracks: [{ points: from({ x: -30, y: 90 }, meander(100, 1180, 90, 440, 4, 12, 1.5)) }],
    pillars: [col(330, 560, 30), col(950, 560, 30)],
    colours: 6, speed: 26, goal: 3400, par: par(3400, 26), charms: ALL, chameleons: 0.08, mode: { kind: 'gold', count: 7 },
  },
  {
    id: 'ruins-9', name: 'Fallen Statue', shooter: RAIL,
    tracks: [{ points: STATUE_L, pace: 1.3 }, { points: STATUE_R, pace: 0.75 }],
    pillars: [col(640, 555, 26)],
    colours: 6, speed: 18, goal: 3000, par: 255, charms: ALL,
  },
  {
    id: 'ruins-10', name: 'The Folly', shooter: { kind: 'pivot', x: 640, y: 622 },
    tracks: [{ points: FOLLY_L, tunnels: [{ from: 0.45, to: 0.53 }] }, { points: FOLLY_R, tunnels: [{ from: 0.45, to: 0.53 }] }],
    pillars: [col(462, 352, 30), col(818, 352, 30)],
    colours: 6, speed: 18, goal: 4000, par: 200, charms: ALL, stones: 0.06,
    boss: { kind: 'lion', hp: 7, spots: [PLINTH] },
  },
];
