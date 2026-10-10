import type { Lane } from '../../logic/sailing';
import type { LayerId, ThemeId } from '../backdrop';
import type { Draw } from '../kit';
import { gull } from './coast';
import { kestrel, tern } from './desert';
import { sampan } from './estuary';
import { egretFlying, ibis, kite } from './mudLife';
import { bird, seaplane } from './tropic';

/** A drawing's extent around its anchor, in design px. */
export interface Extent {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/**
 * Something in the backdrop that moves on its own: birds flying over, a
 * seaplane, a fisherman drifting in his sampan. Each is its own sprite on
 * a layer, moving along a lane (see sailing.ts) and repeating every tile as
 * the layers do; frames play in turn (wingbeats, a rod dipping).
 */
export interface MoverSpec extends Lane {
  readonly layer: LayerId;
  /** Its anchor's height in the layer, design px. */
  readonly y: number;
  readonly box: Extent;
  /** Drawings to cycle through, and how many a second. */
  readonly frames: number;
  readonly fps: number;
  /** Draws frame `f` with its anchor at (x, y), facing right. */
  readonly draw: (d: Draw, x: number, y: number, f: number) => void;
  /** Design px it rises and falls (a bird's undulating flight, a boat on the water). */
  readonly bob?: number;
  /** Circling round its place on the lane, as a soaring bird does: radius (design px) and seconds a turn. */
  readonly circle?: { readonly r: number; readonly period: number };
  /** Turns to face the way it's going (round its circle too); otherwise it keeps its drawing as it is. */
  readonly turns?: boolean;
}

/** Wingbeat frames per bird. */
const BEAT = 6;

/** Where a wing is at frame `f` of a beat, -1..1; `phase` keeps a flock's birds out of step. */
const flap = (f: number, phase: number): number => Math.sin((f / BEAT) * Math.PI * 2 + phase);

type Bird = (d: Draw, x: number, y: number, s: number, flap: number) => void;

/**
 * A flock as one mover: birds at offsets (dx, dy, scale) from its anchor,
 * each beating its wings out of step with the others. `beat` scales the
 * wingbeat (gliders barely move theirs).
 */
function flock(members: readonly (readonly [number, number, number])[], draw: Bird, beat = 1): Pick<MoverSpec, 'box' | 'frames' | 'draw'> {
  const xs = members.map(([dx, , s]) => [dx - 14 * s, dx + 14 * s]).flat();
  const ys = members.map(([, dy, s]) => [dy - 10 * s, dy + 7 * s]).flat();
  return {
    box: { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) },
    frames: BEAT,
    draw: (d, x, y, f) => members.forEach(([dx, dy, s], i) => draw(d, x + dx, y + dy, s, flap(f, i * 1.9) * beat)),
  };
}

const ibisBird: Bird = (d, x, y, s, f) => ibis(d, x, y, s, f);
const egretBird: Bird = (d, x, y, s, f) => egretFlying(d, x, y, s, f);
const gullBird: Bird = (d, x, y, s, f) => gull(d, x, y, s, f);
const ternBird: Bird = (d, x, y, s, f) => tern(d, x, y, s, f);
const frigateBird: Bird = (d, x, y, s, f) => bird(d, x, y, s, f);

export const THEME_MOVERS: Readonly<Record<ThemeId, readonly MoverSpec[]>> = {
  // Frigatebirds gliding over the lagoon, and the seaplane droning across.
  atoll: [
    { layer: 'sky', y: 120, x: 560, speed: 7, bob: 2, fps: 2, turns: true, ...flock([[0, 5, 1], [25, -8, 0.8], [42, 8, 0.6]], frigateBird, 0.35) },
    { layer: 'sky', y: 140, x: 720, speed: -5, bob: 1.5, fps: 1.5, turns: true, ...flock([[0, 0, 0.7]], frigateBird, 0.35) },
    { layer: 'sky', y: 60, x: 70, speed: 6, bob: 2, fps: 2, turns: true, ...flock([[0, 0, 0.9]], frigateBird, 0.35) },
    { layer: 'sky', y: 95, x: 905, speed: -8, bob: 1.5, fps: 2, turns: true, ...flock([[0, 0, 0.6]], frigateBird, 0.35) },
    {
      layer: 'sky', y: 60, x: 330, speed: -20, frames: 1, fps: 1, bob: 0.6,
      box: { left: -38, right: 34, top: -18, bottom: 16 }, draw: (d, x, y) => seaplane(d, x, y, 1.3),
    },
  ],
  // Terns beating along the shore, and a kestrel hanging on the wind.
  dunes: [
    { layer: 'sky', y: 118, x: 450, speed: 14, bob: 2, fps: 8, turns: true, ...flock([[0, 2, 0.8], [22, -8, 0.65], [38, 8, 0.55]], ternBird) },
    { layer: 'sky', y: 140, x: 930, speed: -11, bob: 2, fps: 7, turns: true, ...flock([[0, 0, 0.7]], ternBird) },
    { layer: 'sky', y: 58, x: 120, speed: 9, bob: 1.5, fps: 7, turns: true, ...flock([[0, 0, 0.7]], ternBird) },
    {
      layer: 'sky', y: 120, x: 700, speed: 0, frames: 1, fps: 1, bob: 1.2, circle: { r: 3, period: 5 },
      box: { left: -11, right: 11, top: -8, bottom: 9 }, draw: (d, x, y) => kestrel(d, x, y, 0.9),
    },
  ],
  // Gulls riding the wind over the rocks: some with it, some beating against it.
  rockpool: [
    { layer: 'sky', y: 96, x: 600, speed: 12, bob: 3, fps: 4, turns: true, ...flock([[0, -8, 1.25], [46, 8, 0.9]], gullBird) },
    { layer: 'sky', y: 80, x: 690, speed: -6, bob: 2.5, fps: 5, turns: true, ...flock([[0, 0, 0.7]], gullBird) },
    { layer: 'sky', y: 34, x: 300, speed: 10, bob: 2, fps: 4, turns: true, ...flock([[0, 0, 0.8]], gullBird) },
    { layer: 'sky', y: 156, x: 990, speed: -7, bob: 2, fps: 5, turns: true, ...flock([[0, 0, 0.85]], gullBird) },
    { layer: 'sky', y: 112, x: 40, speed: 14, bob: 3, fps: 4, turns: true, ...flock([[0, 0, 0.6]], gullBird) },
    { layer: 'sky', y: 40, x: 770, speed: 9, bob: 2, fps: 4, turns: true, ...flock([[0, 0, 0.55]], gullBird) },
    { layer: 'cliffs', y: 137, x: 470, speed: 8, range: [380, 620], bob: 3, fps: 4, turns: true, ...flock([[0, -17, 0.6], [50, 17, 0.5]], gullBird) },
  ],
  // A skein of ibis and three egrets flying over, a kite circling, and a fisherman drifting in his sampan.
  mangrove: [
    { layer: 'sky', y: 88, x: 300, speed: 13, bob: 1.5, fps: 6, turns: true, ...flock([[0, -16, 0.85], [18, -8, 0.8], [36, -2, 0.8], [54, 6, 0.75], [72, 10, 0.7], [92, 16, 0.7]], ibisBird) },
    { layer: 'sky', y: 134, x: 600, speed: -9, bob: 2, fps: 4, turns: true, ...flock([[0, -2, 1], [28, 8, 0.85], [52, -6, 0.8]], egretBird) },
    // The kite wheels in wide circles, gliding with a lazy beat now and then; it faces the way it's going round.
    {
      layer: 'sky', y: 58, x: 960, speed: 1.5, frames: BEAT, fps: 1.5, circle: { r: 44, period: 24 }, turns: true,
      box: { left: -24, right: 14, top: -22, bottom: 6 }, draw: (d, x, y, f) => kite(d, x, y, 1.1, flap(f, 0)),
    },
    {
      layer: 'river', y: 82, x: 640, speed: 1.2, range: [600, 700], frames: 4, fps: 0.8, bob: 0.4, turns: true,
      box: { left: -20, right: 20, top: -16, bottom: 6 }, draw: (d, x, y, f) => sampan(d, x, y, 0.9, Math.sin((f / 4) * Math.PI * 2)),
    },
  ],
};
