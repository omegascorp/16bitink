import type { Pt } from '../logic/path';
import { line, spiral, zigzag } from './shapes';
import type { LevelDef } from './types';

/**
 * Chapter 2, The Pond: the full game's first chapter. SERVER-ONLY, like every
 * paid chapter: only content/paid.ts imports it. New here: lily pads to hop
 * between (2), tracks that run under logs where marbles can't be hit (1),
 * and the Dragonfly charm, a spit that flies through every marble in its way (3).
 * Then a twist a level (drifting leaves, restless pads, the tide, a blitz,
 * gold, wind) and the Bullfrog.
 */

/** Seconds to beat, as chapter 1 reckons it. */
const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly'] as const;

/** Level 6: two half-spirals, as in Two Paths, each dipping under a log. */
const STREAM_L: Pt[] = spiral(640, 400, 305, 150, 1.0, -Math.PI / 2 - 0.15, -1, 1.75, 1);
const STREAM_R: Pt[] = spiral(640, 400, 305, 150, 1.0, Math.PI / 2 - 0.15, -1, 1.75, 1);

/** Level 10: three rows across the top of the pond, the Bullfrog's lily pads below them, the gecko's at the bank. */
const BULLRUSH_ROWS: Pt[] = [...line({ x: -30, y: 96 }, { x: 130, y: 96 }, 2), ...zigzag(130, 1150, 96, 300, 3)];
const FROG_PADS: Pt[] = [{ x: 300, y: 452 }, { x: 640, y: 470 }, { x: 980, y: 452 }];

export const CHAPTER_2: readonly LevelDef[] = [
  {
    id: 'pond-1', name: 'Still Water', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 305, 165, 1.5, -Math.PI / 2, 1, 1.75, 1), tunnels: [{ from: 0.3, to: 0.42 }] }],
    colours: 4, speed: 32, goal: 2400, par: par(2400, 32), charms: ['slow', 'reverse', 'burst'], teach: ['tunnel'],
  },
  {
    id: 'pond-2', name: 'Lily Pads', shooter: { kind: 'hop', pads: [{ x: 470, y: 420 }, { x: 810, y: 420 }] },
    tracks: [{ points: spiral(640, 400, 305, 210, 0.9, Math.PI * 0.75, 1, 1.75, 1) }],
    colours: 4, speed: 30, goal: 2200, par: par(2200, 30), charms: ['slow', 'reverse', 'burst'], teach: ['hop'],
  },
  {
    id: 'pond-3', name: 'Dragonfly', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: spiral(640, 400, 305, 140, 1.8, Math.PI / 2, -1, 1.75, 1) }],
    colours: 4, speed: 34, goal: 2600, par: par(2600, 34), charms: ['dragonfly', 'slow', 'burst'], teach: ['dragonfly'],
  },
  {
    id: 'pond-4', name: 'Reed Bank', shooter: { kind: 'rail', y: 638, x0: 90, x1: 1190 },
    tracks: [{ points: zigzag(170, 1110, 110, 460, 4), tunnels: [{ from: 0.22, to: 0.3 }, { from: 0.6, to: 0.68 }] }],
    colours: 4, speed: 34, goal: 2500, par: 255, charms: ['slow', 'reverse', 'dragonfly'], leaves: 2,
  },
  {
    id: 'pond-5', name: 'Stepping Stones', shooter: { kind: 'hop', pads: [{ x: 420, y: 450 }, { x: 640, y: 330 }, { x: 860, y: 450 }] },
    tracks: [{ points: spiral(640, 400, 310, 250, 1.15, -Math.PI / 2, -1, 1.75, 1), tunnels: [{ from: 0.45, to: 0.55 }] }],
    colours: 5, speed: 32, goal: 2700, par: par(2700, 32), charms: ALL, restless: 7,
  },
  {
    id: 'pond-6', name: 'Two Streams', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: STREAM_L, tunnels: [{ from: 0.4, to: 0.52 }] }, { points: STREAM_R, tunnels: [{ from: 0.4, to: 0.52 }] }],
    colours: 4, speed: 30, goal: 2800, par: par(2800, 40), charms: ALL, tide: 11,
  },
  {
    id: 'pond-7', name: 'Kingcups', shooter: { kind: 'rail', y: 638, x0: 90, x1: 1190 },
    tracks: [
      { points: zigzag(110, 560, 95, 455, 4), tunnels: [{ from: 0.35, to: 0.45 }] },
      { points: zigzag(1170, 720, 95, 455, 4), tunnels: [{ from: 0.55, to: 0.65 }] },
    ],
    colours: 5, speed: 22, goal: 3000, par: 200, charms: ALL, mode: { kind: 'blitz', seconds: 185 },
  },
  {
    id: 'pond-8', name: 'The Footbridge', shooter: { kind: 'hop', pads: [{ x: 470, y: 420 }, { x: 810, y: 420 }] },
    tracks: [{ points: spiral(640, 400, 305, 210, 0.95, -Math.PI / 2, -1, 1.75, 1), tunnels: [{ from: 0.18, to: 0.28 }, { from: 0.55, to: 0.66 }] }],
    colours: 5, speed: 34, goal: 3100, par: par(3100, 34), charms: ALL, mode: { kind: 'gold', count: 6 },
  },
  {
    id: 'pond-9', name: 'The Weir', shooter: { kind: 'rail', y: 638, x0: 90, x1: 1190 },
    tracks: [{ points: zigzag(1170, 110, 95, 515, 5), tunnels: [{ from: 0.15, to: 0.21 }, { from: 0.5, to: 0.56 }] }],
    colours: 5, speed: 36, goal: 3300, par: 335, charms: ALL, wind: 380,
  },
  {
    id: 'pond-10', name: 'The Bullfrog', shooter: { kind: 'hop', pads: [{ x: 470, y: 632 }, { x: 810, y: 632 }] },
    tracks: [{ points: BULLRUSH_ROWS, tunnels: [{ from: 0.3, to: 0.38 }, { from: 0.62, to: 0.7 }] }],
    colours: 5, speed: 30, goal: 3800, par: 170, charms: ALL,
    boss: { kind: 'frog', hp: 11, spots: FROG_PADS },
  },
];
