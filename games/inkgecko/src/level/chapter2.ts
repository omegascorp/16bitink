import type { Pt } from '../logic/path';
import { spiral, zigzag } from './shapes';
import type { LevelDef } from './types';

/**
 * Chapter 2, The Pond: the full game's first chapter. SERVER-ONLY, like every
 * paid chapter: only content/paid.ts imports it. New here: lily pads to hop
 * between (2), tracks that run under logs where marbles can't be hit (1),
 * and the Dragonfly charm, a spit that flies through every marble in its way (3).
 */

/** Seconds to beat, as chapter 1 reckons it. */
const par = (goal: number, speed: number): number => Math.round(((goal / 10) * 32) / speed * 0.55 + 20);

const C = { x: 640, y: 400 } as const;
const ALL = ['slow', 'reverse', 'burst', 'aim', 'dragonfly'] as const;

/** Level 6: two half-spirals, as in Two Paths, each dipping under a log. */
const STREAM_L: Pt[] = spiral(640, 400, 305, 150, 1.0, -Math.PI / 2 - 0.15, -1, 1.75, 1);
const STREAM_R: Pt[] = spiral(640, 400, 305, 150, 1.0, Math.PI / 2 - 0.15, -1, 1.75, 1);

/** Level 10: two spirals wound into each other, round three pads. */
const DEEP_A: Pt[] = spiral(640, 400, 310, 225, 1.05, Math.PI, 1, 1.75, 1);
const DEEP_B: Pt[] = spiral(640, 400, 310, 225, 1.05, 0, 1, 1.75, 1);

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
    colours: 4, speed: 34, goal: 2500, par: par(2500, 34), charms: ['slow', 'reverse', 'dragonfly'],
  },
  {
    id: 'pond-5', name: 'Stepping Stones', shooter: { kind: 'hop', pads: [{ x: 420, y: 450 }, { x: 640, y: 330 }, { x: 860, y: 450 }] },
    tracks: [{ points: spiral(640, 400, 310, 250, 1.15, -Math.PI / 2, -1, 1.75, 1), tunnels: [{ from: 0.45, to: 0.55 }] }],
    colours: 5, speed: 32, goal: 2700, par: par(2700, 32), charms: ALL,
  },
  {
    id: 'pond-6', name: 'Two Streams', shooter: { kind: 'pivot', ...C },
    tracks: [{ points: STREAM_L, tunnels: [{ from: 0.4, to: 0.52 }] }, { points: STREAM_R, tunnels: [{ from: 0.4, to: 0.52 }] }],
    colours: 4, speed: 26, goal: 2800, par: par(2800, 40), charms: ALL,
  },
  {
    id: 'pond-7', name: 'Kingcups', shooter: { kind: 'rail', y: 638, x0: 90, x1: 1190 },
    tracks: [
      { points: zigzag(110, 560, 95, 455, 4), tunnels: [{ from: 0.35, to: 0.45 }] },
      { points: zigzag(1170, 720, 95, 455, 4), tunnels: [{ from: 0.55, to: 0.65 }] },
    ],
    colours: 5, speed: 26, goal: 3000, par: par(3000, 40), charms: ALL,
  },
  {
    id: 'pond-8', name: 'The Footbridge', shooter: { kind: 'hop', pads: [{ x: 470, y: 420 }, { x: 810, y: 420 }] },
    tracks: [{ points: spiral(640, 400, 305, 210, 0.95, -Math.PI / 2, -1, 1.75, 1), tunnels: [{ from: 0.18, to: 0.28 }, { from: 0.55, to: 0.66 }] }],
    colours: 5, speed: 34, goal: 3100, par: par(3100, 34), charms: ALL,
  },
  {
    id: 'pond-9', name: 'The Weir', shooter: { kind: 'rail', y: 638, x0: 90, x1: 1190 },
    tracks: [{ points: zigzag(1170, 110, 95, 515, 5), tunnels: [{ from: 0.15, to: 0.21 }, { from: 0.5, to: 0.56 }] }],
    colours: 5, speed: 40, goal: 3300, par: par(3300, 40), charms: ALL,
  },
  {
    id: 'pond-10', name: 'Deep Water', shooter: { kind: 'hop', pads: [{ x: 440, y: 450 }, { x: 640, y: 340 }, { x: 840, y: 450 }] },
    tracks: [{ points: DEEP_A, tunnels: [{ from: 0.3, to: 0.4 }] }, { points: DEEP_B, tunnels: [{ from: 0.3, to: 0.4 }] }],
    colours: 5, speed: 28, goal: 3800, par: par(3800, 44), charms: ALL,
  },
];
