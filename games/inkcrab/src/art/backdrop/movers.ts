import type { Lane } from '../../logic/sailing';
import type { LayerId, ThemeId } from '../backdrop';
import type { Draw } from '../kit';
import { gull } from './coast';
import { booby, frigatebird, pelican } from './galapagos';
import { kestrel, tern } from './desert';
import { dolphin, laughingGull, osprey } from './gulfAnimals';
import { sampan } from './estuary';
import { houseCrow, littleCormorant } from './keralaBirds';
import { eider, kittiwake, raven } from './labradorBirds';
import { egretFlying, ibis, kite } from './mudLife';
import { cormorant, westernGull } from './pnwBirds';
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
const frigateSide: Bird = (d, x, y, s, f) => frigatebird(d, x, y, s, f);
const boobyBird: Bird = (d, x, y, s, f) => booby(d, x, y, s, f);
const pelicanBird: Bird = (d, x, y, s, f) => pelican(d, x, y, s, f);
const westernGullBird: Bird = (d, x, y, s, f) => westernGull(d, x, y, s, f);
const cormorantBird: Bird = (d, x, y, s, f) => cormorant(d, x, y, s, f);
const laughingGullBird: Bird = (d, x, y, s, f) => laughingGull(d, x, y, s, f);
const ospreyBird: Bird = (d, x, y, s, f) => osprey(d, x, y, s, f);
const crowBird: Bird = (d, x, y, s, f) => houseCrow(d, x, y, s, f);
const littleCormorantBird: Bird = (d, x, y, s, f) => littleCormorant(d, x, y, s, f);
const drakeBird: Bird = (d, x, y, s, f) => eider(d, x, y, s, f, true);
const henBird: Bird = (d, x, y, s, f) => eider(d, x, y, s, f, false);
const kittiwakeBird: Bird = (d, x, y, s, f) => kittiwake(d, x, y, s, f);

/** Two flocks flown as one mover (eider drakes and ducks in the same line). */
function together(a: Pick<MoverSpec, 'box' | 'frames' | 'draw'>, b: Pick<MoverSpec, 'box' | 'frames' | 'draw'>): Pick<MoverSpec, 'box' | 'frames' | 'draw'> {
  return {
    box: { left: Math.min(a.box.left, b.box.left), right: Math.max(a.box.right, b.box.right), top: Math.min(a.box.top, b.box.top), bottom: Math.max(a.box.bottom, b.box.bottom) },
    frames: BEAT,
    draw: (d, x, y, f) => {
      a.draw(d, x, y, f);
      b.draw(d, x, y, f);
    },
  };
}

/** Frames in a raven's cycle: a few wingbeats, then a roll right over onto its back and up again. */
const TUMBLE_FRAMES = 12;
const TUMBLE_FROM = 4;

/** A raven on the wind at scale `s`, `phase` frames into its cycle, so a pair don't tumble together. */
function tumbling(s: number, phase: number): Pick<MoverSpec, 'box' | 'frames' | 'draw'> {
  return {
    box: { left: -17 * s, right: 10 * s, top: -9 * s, bottom: 9 * s },
    frames: TUMBLE_FRAMES,
    draw: (d, x, y, f) => {
      const k = (f + phase) % TUMBLE_FRAMES;
      const roll = k < TUMBLE_FROM ? 1 : Math.cos((Math.PI * 2 * (k - TUMBLE_FROM)) / (TUMBLE_FRAMES - TUMBLE_FROM));
      raven(d, x, y, s, k < TUMBLE_FROM ? flap(k, 0) : 0.2, roll);
    },
  };
}

/** Frames in a dolphin's cycle: rolling up through the surface and down for the first ROLL of them, then under. */
const ROLL_FRAMES = 14;
const ROLL = 8;

/** A pair of dolphins rolling through the swell, the second a little behind and out of step. */
function dolphins(d: Draw, x: number, y: number, f: number): void {
  const roll = (k: number): number => (((f - k) % ROLL_FRAMES) + ROLL_FRAMES) % ROLL_FRAMES / ROLL;
  dolphin(d, x - 26, y + 3, 0.85, roll(3));
  dolphin(d, x, y, 1, roll(0));
}

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
  ],  // Frigatebirds hanging on the wind over the volcano, boobies beating along low over the sea, pelicans gliding in file.
  basalt: [
    { layer: 'sky', y: 70, x: 380, speed: 2, bob: 1.5, fps: 1.5, circle: { r: 36, period: 22 }, turns: true, ...flock([[0, 0, 1.2]], frigateSide, 0.35) },
    { layer: 'sky', y: 120, x: 900, speed: -4, bob: 2, fps: 1.5, circle: { r: 24, period: 17 }, turns: true, ...flock([[0, 0, 0.9]], frigateSide, 0.35) },
    { layer: 'sky', y: 40, x: 120, speed: 5, bob: 1.5, fps: 1.5, turns: true, ...flock([[0, 0, 0.75], [30, 10, 0.65]], frigateSide, 0.35) },
    { layer: 'sea', y: 70, x: 640, speed: -3, bob: 2, fps: 1.5, circle: { r: 30, period: 19 }, turns: true, ...flock([[0, 0, 1]], frigateSide, 0.35) },
    { layer: 'sea', y: 150, x: 200, speed: 11, bob: 1.5, fps: 6, turns: true, ...flock([[0, 0, 0.6], [20, 4, 0.55], [38, 1, 0.55]], boobyBird) },
    { layer: 'cliffs', y: 214, x: 560, speed: 15, bob: 2, fps: 7, turns: true, ...flock([[0, 0, 0.95], [26, 5, 0.9], [50, -2, 0.85], [74, 4, 0.9]], boobyBird) },
    { layer: 'cliffs', y: 150, x: 900, speed: -8, bob: 2.5, fps: 2.5, turns: true, ...flock([[0, 0, 1.1], [34, 4, 1.05], [68, 8, 1]], pelicanBird, 0.7) },
  ],
  // Western gulls on the wind over the fog, brown pelicans gliding in file, cormorants beating hard and low over the water.
  kelp: [
    { layer: 'sky', y: 96, x: 300, speed: 9, bob: 3, fps: 3, turns: true, ...flock([[0, -6, 1.4], [46, 8, 1.05]], westernGullBird) },
    { layer: 'sky', y: 60, x: 820, speed: -2, bob: 2, fps: 1.5, circle: { r: 30, period: 20 }, turns: true, ...flock([[0, 0, 1.15]], westernGullBird, 0.35) },
    { layer: 'sky', y: 150, x: 60, speed: 12, bob: 2, fps: 4, turns: true, ...flock([[0, 0, 0.9]], westernGullBird) },
    { layer: 'sky', y: 124, x: 600, speed: -10, bob: 2.5, fps: 3.5, turns: true, ...flock([[0, 0, 0.75]], westernGullBird) },
    { layer: 'sea', y: 104, x: 200, speed: 7, bob: 1.5, fps: 2, turns: true, ...flock([[0, 0, 0.42], [16, 2, 0.41], [32, 4, 0.4], [48, 6, 0.39], [64, 7, 0.38]], pelicanBird, 0.6) },
    { layer: 'sea', y: 150, x: 860, speed: -9, bob: 0.8, fps: 7, turns: true, ...flock([[0, 0, 0.5], [16, 1, 0.48]], cormorantBird) },
    { layer: 'cliffs', y: 196, x: 700, speed: -10, bob: 2, fps: 2.5, turns: true, ...flock([[0, 0, 1.1], [34, 4, 1.05], [68, 6, 1], [102, 9, 1]], pelicanBird, 0.7) },
    { layer: 'cliffs', y: 236, x: 300, speed: 18, bob: 1, fps: 8, turns: true, ...flock([[0, 0, 0.9], [22, 2, 0.85], [42, -1, 0.85]], cormorantBird) },
  ],
  // An osprey circling high, laughing gulls on the wind, brown pelicans in file low over the water, dolphins rolling.
  wreck: [
    { layer: 'sky', y: 60, x: 760, speed: 1.5, bob: 1.5, fps: 1.5, circle: { r: 46, period: 26 }, turns: true, ...flock([[0, 0, 1.15]], ospreyBird, 0.35) },
    { layer: 'sky', y: 112, x: 260, speed: 11, bob: 2.5, fps: 4, turns: true, ...flock([[0, -5, 1.05], [30, 6, 0.9]], laughingGullBird) },
    { layer: 'sky', y: 150, x: 900, speed: -8, bob: 2, fps: 4.5, turns: true, ...flock([[0, 0, 0.8]], laughingGullBird) },
    { layer: 'sky', y: 42, x: 80, speed: 9, bob: 2, fps: 4, turns: true, ...flock([[0, 0, 0.65]], laughingGullBird) },
    { layer: 'sea', y: 100, x: 120, speed: 6, bob: 1.2, fps: 2, turns: true, ...flock([[0, 0, 0.42], [16, 2, 0.41], [32, 3, 0.4], [48, 5, 0.39], [64, 6, 0.38], [80, 8, 0.37]], pelicanBird, 0.6) },
    {
      layer: 'sea', y: 152, x: 560, speed: 4, frames: ROLL_FRAMES, fps: 4, turns: true,
      box: { left: -44, right: 22, top: -20, bottom: 6 }, draw: dolphins,
    },
    { layer: 'cliffs', y: 168, x: 820, speed: -9, bob: 2, fps: 2.5, turns: true, ...flock([[0, 0, 1.1], [34, 4, 1.05], [68, 7, 1], [102, 9, 1]], pelicanBird, 0.7) },
    { layer: 'cliffs', y: 126, x: 640, speed: 1, bob: 2, fps: 3, circle: { r: 40, period: 16 }, turns: true, ...flock([[0, 0, 1.1]], laughingGullBird, 0.6) },
  ],
  // Brahminy kites wheeling under the cloud, house crows flapping across, little egrets in a line and cormorants low over the chop.
  harbour: [
    {
      layer: 'sky', y: 74, x: 640, speed: 1.2, frames: BEAT, fps: 1.5, circle: { r: 46, period: 24 }, turns: true,
      box: { left: -24, right: 14, top: -22, bottom: 6 }, draw: (d, x, y, f) => kite(d, x, y, 1.15, flap(f, 0)),
    },
    {
      layer: 'sky', y: 130, x: 180, speed: -1.6, frames: BEAT, fps: 1.5, circle: { r: 30, period: 19 }, turns: true,
      box: { left: -24, right: 14, top: -22, bottom: 6 }, draw: (d, x, y, f) => kite(d, x, y, 0.85, flap(f, 2)),
    },
    { layer: 'sky', y: 150, x: 860, speed: 10, bob: 2.5, fps: 5, turns: true, ...flock([[0, 0, 1], [24, -9, 0.9], [44, 4, 0.85]], crowBird) },
    { layer: 'sky', y: 96, x: 420, speed: -8, bob: 2, fps: 5, turns: true, ...flock([[0, 0, 0.75]], crowBird) },
    { layer: 'sea', y: 112, x: 520, speed: 6, bob: 1.5, fps: 3.5, turns: true, ...flock([[0, 0, 0.55], [18, 3, 0.52], [36, 5, 0.5], [54, 8, 0.48]], egretBird) },
    { layer: 'sea', y: 156, x: 900, speed: -11, bob: 0.8, fps: 8, turns: true, ...flock([[0, 0, 0.55], [17, 1, 0.52], [33, 2, 0.5]], littleCormorantBird) },
    { layer: 'cliffs', y: 150, x: 360, speed: 8, bob: 2.5, fps: 3, turns: true, ...flock([[0, -6, 1.15], [34, 6, 1.05], [64, 0, 1]], egretBird) },
    { layer: 'cliffs', y: 196, x: 860, speed: -12, bob: 2, fps: 5.5, turns: true, ...flock([[0, 0, 1.15], [26, -8, 1.05]], crowBird) },
  ],
  // Kittiwakes riding the gale, ravens tumbling on it, eiders beating low over the sea in lines, drakes and ducks together.
  frost: [
    { layer: 'sky', y: 112, x: 260, speed: 12, bob: 3, fps: 3.5, turns: true, ...flock([[0, -6, 1.15], [30, 6, 1], [58, -2, 0.9]], kittiwakeBird) },
    { layer: 'sky', y: 70, x: 840, speed: -5, bob: 3, fps: 4, turns: true, ...flock([[0, 0, 0.85]], kittiwakeBird) },
    { layer: 'sky', y: 150, x: 600, speed: 9, bob: 2, fps: 4, turns: true, ...flock([[0, 0, 0.7]], kittiwakeBird) },
    { layer: 'sky', y: 84, x: 460, speed: 3, fps: 4, circle: { r: 34, period: 15 }, turns: true, ...tumbling(1.3, 0) },
    { layer: 'sky', y: 100, x: 520, speed: 3, fps: 4, circle: { r: 26, period: 13 }, turns: true, ...tumbling(1.1, 6) },
    { layer: 'sea', y: 102, x: 300, speed: 15, bob: 0.6, fps: 8, turns: true, ...together(flock([[0, 0, 0.5], [32, 2, 0.48], [64, 3, 0.46]], drakeBird), flock([[16, 1, 0.48], [48, 2, 0.47], [80, 4, 0.45]], henBird)) },
    { layer: 'sea', y: 140, x: 820, speed: -12, bob: 0.6, fps: 8, turns: true, ...together(flock([[0, 0, 0.6], [36, 3, 0.58]], drakeBird), flock([[18, 1, 0.6]], henBird)) },
    { layer: 'cliffs', y: 120, x: 150, speed: 2, fps: 4, circle: { r: 40, period: 17 }, turns: true, ...tumbling(1.5, 3) },
    { layer: 'cliffs', y: 168, x: 560, speed: 10, bob: 3, fps: 3.5, turns: true, ...flock([[0, -5, 1.2], [36, 6, 1.1]], kittiwakeBird) },
    { layer: 'cliffs', y: 244, x: 880, speed: 17, bob: 0.8, fps: 8, turns: true, ...together(flock([[0, 0, 0.95], [44, 2, 0.9]], drakeBird), flock([[22, 1, 0.92], [66, 3, 0.88]], henBird)) },
  ],
};
