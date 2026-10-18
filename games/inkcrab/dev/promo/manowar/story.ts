import { BOIL } from '../../../src/art/palette';
import { BOIL_FPS } from '../sprites';
import { clamp01, curveAt, lerp, ramp, window01 } from '../short';
import { TEMPO, WORDS } from './words';

/**
 * "This is NOT a jellyfish": the Portuguese man o' war, a siphonophore, a
 * colony of zooids that can't live alone; its tentacles can outgrow a bus;
 * stranded and dead it still stings; and its float's sail is set to the left
 * or to the right, so the wind sends them apart. Told by a narrator
 * (words.ts), every beat timed to the words, a function of time in seconds
 * over a loop of LOOP_S. Each sentence is a new mood, and the picture
 * changes with it:
 *
 *   0     suspense: a man o' war stranded on wet sand, the game's hermit crab
 *         creeping towards one of its tentacles; a slow push-in
 *   2.4   curious: the camera dives into the cluster under the float, which
 *         resolves into the colony, close up in the water
 *   4.8   "tiny animals": each polyp opens its eyes; "living as one": warm
 *         light, they sway in step and blink together
 *   6.9   surprise, its jobs in turn: the float puffs up, the stingers zap,
 *         a feeding polyp gulps a tiny shrimp
 *   9.9   nervous awe: on the sand by the beach road its tentacles stretch
 *         out beside a parked bus and past its front on "BUS!"
 *   12.5  eerie: back on the beach, dim; the crab tiptoes up to the tentacle
 *   14.7  shock: ZAP! a flash, it yelps and backflips into its shell
 *   15.7  playful: two floats bobbing at sea, one sail leaning left and one
 *         right, and the wind pushing them apart
 *   18.9  soft: the beach again; the crab peeks out and creeps back towards
 *         the tentacle, and the loop finishes the sentence.
 */
export const LOOP_S = 21;

/** The line boil steps at 8 a second: 168 steps, 56 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS % BOIL;

const HALF = LOOP_S / 2;
/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Time measured from the loop point, negative before it: beats that run across the seam use this. */
export const seam = (t: number): number => (wrap(t) < HALF ? wrap(t) : wrap(t) - LOOP_S);

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const THE_AT = said('The');
export const MAN_AT = said('man');
export const COLONY_AT = said('COLONY');
export const TINY_AT = said('tiny');
export const ANIMALS_AT = said('animals,');
export const LIVING_AT = said('living');
export const ONE_AT = said('one.');
export const MAKES_AT = said('One');
export const FLOAT_AT = said('float,');
export const SOME_STING_AT = said('some', 1);
export const STING_AT = said('sting,');
export const SOME_EAT_AT = said('some', 2);
export const EAT_AT = said('eat…');
export const AND_AT = said('and', 1);
export const TENTACLES_AT = said('tentacles');
export const LONGER_AT = said('longer');
export const BUS_AT = said('BUS!');
export const EVEN_AT = said('Even');
export const SAND_AT = said('sand…');
export const STILL_AT = said('STILL');
export const STING2_AT = said('sting!');
export const OH_AT = said('Oh,');
export const SAIL_AT = said('sail?');
export const SOME_LEFT_AT = said('Some');
export const LEFT_AT = said('left…');
export const SOME_RIGHT_AT = said('some', 3);
export const RIGHT_AT = said('right.');
export const SO_AT = said('So');
export const WHATEVER_AT = said('whatever');
export const DO_AT = said('do,');

// ---------------------------------------------------------------- the cuts

export type SceneId = 'beach' | 'colony' | 'road' | 'sea';
/** Each new mood is a new picture: a cross-fade into `to` around `at`, `fade` s long. */
interface Cut {
  readonly at: number;
  readonly to: SceneId;
  readonly fade: number;
}
export const CUTS: readonly Cut[] = [
  // The dive into the cluster resolves into the colony.
  { at: COLONY_AT - 0.1, to: 'colony', fade: 0.45 },
  { at: AND_AT - 0.06, to: 'road', fade: 0.22 },
  { at: EVEN_AT - 0.12, to: 'beach', fade: 0.3 },
  { at: OH_AT - 0.12, to: 'sea', fade: 0.22 },
  { at: SO_AT - 0.12, to: 'beach', fade: 0.3 },
];

/** The picture at t: `base`, with `over` fading in over it (`mix` 0 .. 1) during a cut. */
export function sceneAt(t: number): { readonly base: SceneId; readonly over: SceneId | null; readonly mix: number } {
  const w = wrap(t);
  for (let i = 0; i < CUTS.length; i++) {
    const c = CUTS[i]!;
    if (Math.abs(w - c.at) < c.fade / 2) {
      return { base: CUTS[(i + CUTS.length - 1) % CUTS.length]!.to, over: c.to, mix: ramp(w, c.at - c.fade / 2, c.at + c.fade / 2) };
    }
  }
  let base = CUTS[CUTS.length - 1]!.to;
  for (const c of CUTS) if (w >= c.at) base = c.to;
  return { base, over: null, mix: 0 };
}

/** The beach shows twice: across the loop point (A) and from "Even dead" (B). */
const inBeachB = (t: number): boolean => wrap(t) > AND_AT && wrap(t) < SO_AT - 0.3;

// ---------------------------------------------------------------- the beach

/** The stranded man o' war: its float's ground point on the wet sand, and its size (screen px per unit). */
export const FLOAT = { x: 650, ground: 896, scale: 4.6 } as const;
/** The tip of the tentacle the crab creeps up to, and the sand the crab walks on. */
export const TIP = { x: 352, y: 1046 } as const;
export const CRAB_GROUND = 1056;
/** Screen px per unit of the crab's drawing. */
export const CRAB_SCALE = 1.55;
/** Where the zap throws it, shut in its shell. */
const THROWN_X = 110;
/** Close enough for its claws (52 units in front of its foot) to touch the tip. */
const TOUCH_X = TIP.x - 52 * CRAB_SCALE - 6;

/** The camera on the beach: the world point (x, y) is drawn at ANCHOR, `z` times its size. */
export interface Cam {
  readonly z: number;
  readonly x: number;
  readonly y: number;
}
export const ANCHOR = { x: 540, y: 820 } as const;
/** Where the dive ends: the cluster under the float. */
const CLUSTER = { x: 630, y: 900 } as const;
const DIVE_Z = 3.4;
/** Seam time the beach comes back after the sea, and when the crab is out and creeping again. */
const BACK_AT = SO_AT - LOOP_S - 0.3;
const PEEK_TO = DO_AT - LOOP_S;

export function camAt(t: number): Cam {
  const w = wrap(t);
  if (inBeachB(t)) {
    // Eerie: a slow creep in on the crab and the tentacle, a jolt at the zap.
    const k = ramp(w, EVEN_AT - 0.2, STILL_AT);
    const jolt = w > STILL_AT ? 14 * Math.exp(-(w - STILL_AT) * 7) * Math.sin(45 * (w - STILL_AT)) : 0;
    return { z: lerp(1, 1.12, k), x: lerp(ANCHOR.x, 470, k) + jolt, y: lerp(ANCHOR.y, 890, k) + jolt * 0.6 };
  }
  // A slow push-in from the moment the beach comes back, through the hook, then the dive.
  const u = seam(t);
  const push = clamp01((u - BACK_AT) / (THE_AT - BACK_AT));
  const dive = ramp(u, THE_AT, COLONY_AT + 0.35) ** 1.4;
  return {
    z: lerp(lerp(1, 1.07, push), DIVE_Z, dive),
    x: lerp(lerp(ANCHOR.x, 520, push), CLUSTER.x, dive),
    y: lerp(lerp(ANCHOR.y, 846, push), CLUSTER.y, dive),
  };
}

/** The hermit crab on the beach. */
export interface CrabPose {
  readonly x: number;
  readonly y: number;
  /** 0 out walking .. 1 shut in its shell. */
  readonly hidden: number;
  /** Radians about its shell's middle (the backflip). */
  readonly rot: number;
}

/** Creeping back after the sea, through the hook, keyed across the loop point (seam time). */
const CREEP = [
  { t: PEEK_TO, at: THROWN_X, rate: 0 },
  { t: 0, at: 196 },
  { t: THE_AT, at: 232 },
  { t: COLONY_AT + 0.3, at: 244, rate: 0 },
] as const;
const JUMP_FROM = STILL_AT + 0.1;
const LAND_AT = STING2_AT + 0.12;
const TIPTOES = 5;

export function crabAt(t: number): CrabPose {
  const w = wrap(t);
  if (inBeachB(t)) {
    // Tiptoe: five slow steps, a pause between each, up to the tentacle.
    const p = clamp01((w - EVEN_AT) / (STILL_AT - 0.05 - EVEN_AT));
    const step = p - Math.sin(2 * Math.PI * TIPTOES * p) / (2 * Math.PI * TIPTOES);
    const toe = -7 * Math.abs(Math.sin(Math.PI * TIPTOES * p));
    if (w < JUMP_FROM) return { x: lerp(120, TOUCH_X, step), y: CRAB_GROUND + toe, hidden: ramp(w, STILL_AT - 0.02, JUMP_FROM), rot: 0 };
    // ZAP: a backflip away, landing shut in its shell, rocking to a stop.
    const s = clamp01((w - JUMP_FROM) / (LAND_AT - JUMP_FROM));
    const rock = w > LAND_AT ? 0.3 * Math.exp(-(w - LAND_AT) * 5) * Math.sin(16 * (w - LAND_AT)) : 0;
    return { x: lerp(TOUCH_X, THROWN_X, smoothish(s)), y: CRAB_GROUND - 135 * Math.sin(Math.PI * s), hidden: 1, rot: -2 * Math.PI * smoothish(s) + rock };
  }
  const u = seam(t);
  return { x: curveAt(CREEP, u).at, y: CRAB_GROUND - 3 * Math.abs(Math.sin(2 * Math.PI * 1.5 * u)), hidden: 1 - ramp(u, WHATEVER_AT - LOOP_S + 0.08, PEEK_TO), rot: 0 };
}
/** A gentler ease than smoothstep: the jump leaves fast and lands fast. */
const smoothish = (s: number): number => 0.5 * s + 0.5 * s * s * (3 - 2 * s);

/** Eerie: the beach dims on "Even dead", and the zap's flash lifts it. */
export const dimAt = (t: number): number => (inBeachB(t) ? ramp(wrap(t), EVEN_AT - 0.2, EVEN_AT + 0.45) * (1 - ramp(wrap(t), STILL_AT, STILL_AT + 0.3)) : 0);
/** The ZAP: bolts from the tentacle, and the flash, 0 .. 1 of its life. */
export const zapAt = (t: number): number => (inBeachB(t) ? window01(wrap(t), STILL_AT - 0.03, STILL_AT + 0.32, 0.03) : 0);
export const flashAt = (t: number): number => (inBeachB(t) ? (wrap(t) - (STILL_AT - 0.02)) / 0.45 : -1);
/** Sparks off the tentacle again on "sting!". */
export const sparkAt = (t: number): number => (inBeachB(t) ? window01(wrap(t), STING2_AT - 0.03, STING2_AT + 0.3, 0.04) : 0);
/** The crab's yelp: a "!" over it. */
export const yelpAt = (t: number): number => (inBeachB(t) ? window01(wrap(t), STILL_AT + 0.04, LAND_AT + 0.35, 0.08) : 0);
/** The name, on "Portuguese man o' war", as the camera dives (not in the hook). */
export const nameLabel = (t: number): number => window01(seam(t), MAN_AT - 0.45, COLONY_AT - 0.15, 0.18);
/** The surf washing up and back, whole cycles a loop. */
export const washAt = (t: number): number => 0.5 + 0.5 * Math.sin((2 * Math.PI * 4 * wrap(t)) / LOOP_S);

// ---------------------------------------------------------------- the colony, close up

/** The colony keeps zooming in a little as it resolves out of the dive. */
export const colonyZoomAt = (t: number): number => lerp(0.78, 1, ramp(wrap(t), COLONY_AT - 0.35, COLONY_AT + 0.9));
/** Polyp `i`'s eyes opening on "tiny animals", one after another. */
export const eyesAt = (i: number, t: number): number => ramp(wrap(t), TINY_AT - 0.05 + i * 0.045, TINY_AT + 0.13 + i * 0.045);
/** They all blink together on "one". */
export const blinkAt = (t: number): number => window01(wrap(t), ONE_AT - 0.02, ONE_AT + 0.24, 0.08);
/** Warm light and smiles for "living as one". */
export const warmAt = (t: number): number => window01(wrap(t), LIVING_AT - 0.15, MAKES_AT + 0.15, 0.3);
export const smileAt = (t: number): number => ramp(wrap(t), LIVING_AT - 0.1, LIVING_AT + 0.2);
/** How far the polyps sway in step (0: each its own way). */
export const unisonAt = (t: number): number => window01(wrap(t), LIVING_AT - 0.2, MAKES_AT + 0.25, 0.4);
const SWAY_HZ = 1.25;
/** Polyp `i`'s sway, radians: idle, each its own way; in step and wider for "living as one". */
export function swayAt(i: number, t: number): number {
  const w = wrap(t);
  const u = unisonAt(t);
  const own = 0.05 * Math.sin(2 * Math.PI * (SWAY_HZ * 0.8 * w) + i * 1.9);
  const step = 0.17 * Math.sin(2 * Math.PI * SWAY_HZ * (w - LIVING_AT));
  return (1 - u) * own + u * step;
}

/** Its jobs in turn, each highlighted: the float, the stingers, the feeders. */
export const floatJob = (t: number): number => window01(wrap(t), MAKES_AT - 0.05, SOME_STING_AT, 0.15);
export const stingJob = (t: number): number => window01(wrap(t), SOME_STING_AT - 0.05, SOME_EAT_AT, 0.15);
export const eatJob = (t: number): number => window01(wrap(t), SOME_EAT_AT - 0.05, AND_AT + 0.1, 0.15);
/** The float puffing up on "float": out and back with a little overshoot. */
export function puffAt(t: number): number {
  const u = clamp01((wrap(t) - (FLOAT_AT - 0.3)) / 1);
  return Math.sin(Math.PI * u) * (1 - 0.35 * Math.sin(3 * Math.PI * u));
}
export const floatLabel = (t: number): number => window01(wrap(t), FLOAT_AT - 0.1, SOME_STING_AT + 0.15, 0.15);
/** The stingers' zap on "sting". */
export const stingZapAt = (t: number): number => window01(wrap(t), STING_AT - 0.08, STING_AT + 0.5, 0.05);

/** The feeder that eats, and the tiny shrimp it gulps on "eat". */
export const GULP_AT = EAT_AT + 0.06;
export interface Shrimp {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly alpha: number;
  readonly kick: number;
}
export function shrimpAt(t: number, mouth: { readonly x: number; readonly y: number }): Shrimp | null {
  const w = wrap(t);
  const from = SOME_STING_AT + 0.2;
  if (w < from || w > GULP_AT + 0.2) return null;
  const s = ramp(w, from, GULP_AT - 0.05);
  const x = lerp(1180, mouth.x + 40, s);
  const y = lerp(mouth.y + 160, mouth.y + 30, s) + 14 * Math.sin(2 * Math.PI * 1.6 * (w - from)) * (1 - s);
  const gone = ramp(w, GULP_AT - 0.04, GULP_AT + 0.12);
  return { x: lerp(x, mouth.x, gone), y: lerp(y, mouth.y, gone), scale: 1 - 0.85 * gone, alpha: 1 - ramp(w, GULP_AT + 0.05, GULP_AT + 0.16), kick: Math.sin(2 * Math.PI * 5 * w) };
}
/** Its mouth opening for the shrimp, and the lump going down after the gulp (0 .. 1 of the way). */
export const mouthAt = (t: number): number => window01(wrap(t), GULP_AT - 0.28, GULP_AT + 0.1, 0.1);
export const gulpAt = (t: number): number => (wrap(t) - (GULP_AT + 0.08)) / 0.55;

// ---------------------------------------------------------------- the beach road, the bus

/** The bus parked on the road, from its back to its front bumper, and the float on the sand below. */
export const BUS = { x0: 168, x1: 918, bottom: 762 } as const;
export const SMALL_FLOAT = { x: 150, ground: 966, scale: 1.9 } as const;
/** Where the longest tentacle's tip has got to: out past the bus's front on "BUS!". */
const REACH = [
  { t: AND_AT - 0.2, at: 300, rate: 0 },
  { t: TENTACLES_AT + 0.15, at: 380 },
  { t: LONGER_AT, at: 660 },
  { t: BUS_AT, at: BUS.x1 + 12 },
  { t: BUS_AT + 0.3, at: 1040 },
  { t: BUS_AT + 0.7, at: 1022, rate: 0 },
] as const;
export const reachAt = (t: number): number => curveAt(REACH, wrap(t)).at;
/** The dashed lines down from the bus's back and front, on "longer". */
export const guidesAt = (t: number): number => window01(wrap(t), LONGER_AT - 0.1, EVEN_AT + 0.1, 0.2);
/** The tip passing the front line: it turns red. */
export const passedAt = (t: number): number => ramp(wrap(t), BUS_AT - 0.03, BUS_AT + 0.1);
export const passBurstAt = (t: number): number => (wrap(t) - (BUS_AT - 0.02)) / 0.6;
/** The camera pulls back as the tentacles stretch, and jolts on "BUS!". */
export function roadCamAt(t: number): Cam {
  const w = wrap(t);
  const jolt = w > BUS_AT ? 10 * Math.exp(-(w - BUS_AT) * 6) * Math.sin(45 * (w - BUS_AT)) : 0;
  return { z: lerp(1.1, 1, ramp(w, AND_AT - 0.1, BUS_AT)), x: ANCHOR.x + jolt, y: lerp(900, ANCHOR.y, ramp(w, AND_AT - 0.1, BUS_AT)) + jolt * 0.5 };
}

// ---------------------------------------------------------------- at sea: left and right

/** The sea's surface where the floats ride, and their size. */
export const SURFACE = 900;
export const SEA_SCALE = 2.5;
export interface Rider {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  /** Highlighted while the narrator says its side. */
  readonly hi: number;
}
const bob = (t: number, phase: number): number => Math.sin(2 * Math.PI * 0.85 * wrap(t) + phase);
/** The left-handed float (sail leaning left): blown off to the left on "Some lean left". */
export function leftFloatAt(t: number): Rider {
  const w = wrap(t);
  const hi = window01(w, SOME_LEFT_AT - 0.05, SOME_RIGHT_AT, 0.15);
  return { x: lerp(330, 196, ramp(w, SOME_LEFT_AT, SO_AT)), y: SURFACE + 9 * bob(t, 0), rot: 0.05 * bob(t, 1.3) + 0.09 * hi * Math.sin(2 * Math.PI * 2.2 * (w - SOME_LEFT_AT)), hi };
}
/** The right-handed one: blown off to the right on "some lean right". */
export function rightFloatAt(t: number): Rider {
  const w = wrap(t);
  const hi = window01(w, SOME_RIGHT_AT - 0.05, SO_AT + 0.1, 0.12);
  return { x: lerp(752, 886, ramp(w, SOME_RIGHT_AT - 0.1, SO_AT + 0.1)), y: SURFACE + 9 * bob(t, 2.1), rot: 0.05 * bob(t, 3.4) - 0.09 * hi * Math.sin(2 * Math.PI * 2.2 * (w - SOME_RIGHT_AT)), hi };
}
export const sailLabel = (t: number): number => window01(wrap(t), SAIL_AT - 0.1, SOME_LEFT_AT + 0.35, 0.15);
/** The wind: it gets up on "Some", and its streaks run out over each float. */
export const windAt = (t: number): number => window01(wrap(t), SOME_LEFT_AT - 0.25, SO_AT + 0.2, 0.35);
