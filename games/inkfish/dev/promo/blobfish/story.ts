import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, curveAt, type Key, ramp } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This is not what a blobfish looks like": the famous pink blob is a
 * blobfish wrecked by being hauled up from the deep, told by a narrator
 * (words.ts). Every beat is timed to the words, a function of time in
 * seconds over a loop of LOOP_S.
 *
 *   0     close on the sagging pink blob, hanging in a net over the sea,
 *         labelled "World's Ugliest Animal"; struck out on "not"
 *   2.4   "A kilometre down…": the net drops into the sea and down a
 *         kilometre, a depth readout counting; ink arrows squeeze in
 *   5.7   on "…a hundred times harder" it lands on the seafloor, ×100;
 *   7     "That pressure holds its soft body in shape": the blob firms up
 *         into an ordinary fish, a ring pulsing round it on "normal"
 *   11.3  "But haul it up too fast": the net is hauled up, the depth and
 *         the arrows fall away, it breaks the surface
 *   13.6  "…its jelly-like flesh sags… and melts into this": it swells and
 *         slumps back into the blob
 *   18.9  "So whatever the internet tells you,": the label comes back, and
 *         the loop finishes the sentence.
 *
 * World units are px at zoom 1. y points down, with the sea's surface at 0;
 * the fish's position is the lowest point of its belly, where it rests.
 */
export const LOOP_S = 608 / 30;

/**
 * The line boil steps BOIL_STEPS times a loop: 54 whole cycles of the
 * game's 3 boil frames at very nearly its 8 a second. (A loop can't be a
 * whole number of both 30 fps video frames and 8 fps boil cycles without
 * leaving too long or too short a gap in the voice at the loop point.)
 */
export const BOIL_STEPS = 162;
export const boilAt = (t: number): number => Math.floor((t / LOOP_S) * BOIL_STEPS + 1e-9) % BOIL_STEPS;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const STRIKE_AT = said('not');
/** The net drops a beat before "A kilometre down", and hits the water. */
export const DIVE_FROM = said('A') - 0.15;
export const ENTRY_AT = DIVE_FROM + 0.45;
export const SQUEEZE_AT = said('squeezes');
export const HUNDRED_AT = said('hundred');
/** On the seafloor, a kilometre down and a hundred atmospheres, as the narrator says "…a hundred times harder". */
export const LAND_AT = said('harder') + 0.1;
export const HOLDS_AT = said('holds');
export const SHAPE_AT = said('shape:');
export const NORMAL_AT = said('normal');
/** "But…": the rope snaps taut; "haul": up it goes. */
export const TUG_AT = said('But');
export const LIFT_FROM = said('haul');
/** It breaks the surface on "…the pressure gone", and swings up to where it hung. */
export const BREACH_AT = said('pressure', 2) + 0.15;
export const UP_BY = BREACH_AT + 0.45;
export const SAGS_AT = said('sags...');
export const MELTS_AT = said('melts');
export const THIS_AT = said('this.');
export const INTERNET_AT = said('internet');

/** The fish, nose to tail. */
export const FISH_LEN = 400;
/** How high above the sea it hangs in the net. */
export const HANG = 0.5 * FISH_LEN;
/** A kilometre down, drawn 2 px a metre. */
export const DEPTH_M = 1000;
const PX_PER_M = 2;
export const REST_Y = DEPTH_M * PX_PER_M;
/** The sand, just under the net the fish lies in. */
export const FLOOR_Y = REST_Y + 0.03 * FISH_LEN;

// ---------------------------------------------------------------- the haul

/**
 * The fish's height: hanging, a fast drop braking onto the seafloor, a
 * rest, then an even faster haul up through the surface. Keys with their
 * speeds, so it flies through the surface rather than stopping there.
 */
const DEPTH_KEYS: readonly Key[] = [
  { t: 0, at: -HANG, rate: 0 },
  { t: DIVE_FROM, at: -HANG, rate: 0 },
  { t: ENTRY_AT, at: 0, rate: 900 },
  { t: LAND_AT, at: REST_Y, rate: 0 },
  { t: LIFT_FROM, at: REST_Y, rate: 0 },
  { t: BREACH_AT, at: 0, rate: -1200 },
  { t: UP_BY, at: -HANG, rate: 0 },
  { t: LOOP_S, at: -HANG, rate: 0 },
];

/** The fish's world y (its belly), and how fast it moves, px/s. */
export const fishY = (t: number): { readonly at: number; readonly rate: number } => curveAt(DEPTH_KEYS, t);

/** The depth readout, metres: 0 at the surface (and above it) to 1,000 on the seafloor. */
export const metresAt = (t: number): number => Math.min(DEPTH_M, DEPTH_M * clamp01(fishY(t).at / REST_Y + 1e-9));

/** Pressure, in atmospheres: one of air, plus one more for every ~10 m of seawater. */
export const atmospheresAt = (t: number): number => 1 + metresAt(t) / 10.1;

/** How firmly the arrows squeeze, 0 .. 1: with depth. */
export const squeezeAt = (t: number): number => ramp(metresAt(t), 60, 900);

/** The arrows push in harder on the narrator's stresses: 0 .. 1 .. 0 over half a second each. */
const PUSHES = [SQUEEZE_AT, HUNDRED_AT, HOLDS_AT, SHAPE_AT] as const;
export const pushAt = (t: number): number => PUSHES.reduce((m, p) => Math.max(m, Math.sin(Math.PI * clamp01((t - p) / 0.5))), 0);

// ---------------------------------------------------------------- its body

/**
 * How far it has sagged: 1 the melted blob, 0 a firm, ordinary fish. A
 * little firmer on the way down as the pressure builds, firm by "normal";
 * swelling as the pressure goes, sagging on "sags…", fully melted on "this".
 */
const SAG_KEYS: readonly Key[] = [
  { t: 0, at: 1, rate: 0 },
  { t: SQUEEZE_AT, at: 1, rate: 0 },
  { t: LAND_AT, at: 0.82 },
  { t: HOLDS_AT + 0.35, at: 0.5 },
  { t: NORMAL_AT, at: 0, rate: 0 },
  { t: LIFT_FROM, at: 0, rate: 0 },
  { t: BREACH_AT + 0.3, at: 0.2 },
  { t: SAGS_AT, at: 0.42 },
  { t: MELTS_AT, at: 0.78 },
  { t: THIS_AT + 0.25, at: 1, rate: 0 },
  { t: LOOP_S, at: 1, rate: 0 },
];
export const sagAt = (t: number): number => clamp01(curveAt(SAG_KEYS, t).at);

/** Puffing up as the pressure comes off, before it sags, 0 .. 1 .. 0. */
export const swellAt = (t: number): number => Math.min(ramp(t, LIFT_FROM + 0.6, BREACH_AT + 0.4), 1 - ramp(t, SAGS_AT - 0.6, MELTS_AT + 0.3));

/**
 * The jelly's wobble after each knock (landing, each squeeze, the tug of
 * the rope, breaking the surface, the melt): a quick decaying jiggle, gone
 * long before the loop point.
 */
const KNOCKS = [LAND_AT, HOLDS_AT, SHAPE_AT, LIFT_FROM, BREACH_AT, SAGS_AT, MELTS_AT] as const;
export const wobbleAt = (t: number): number =>
  KNOCKS.reduce((s, k) => (t < k ? s : s + Math.exp(-(t - k) / 0.32) * Math.sin(2 * Math.PI * 3.2 * (t - k))), 0);

/** The net: 0 hanging from its rope, 1 lying slack on the seafloor. */
export const slackAt = (t: number): number => Math.min(ramp(t, LAND_AT - 0.1, LAND_AT + 0.6), 1 - ramp(t, TUG_AT, LIFT_FROM + 0.1));

/** Swinging gently from the rope while it hangs over the sea: radians. A whole number of swings per loop. */
const SWINGS = 9;
const SWING = 0.04;
export const swingAt = (t: number): number => SWING * clamp01(-fishY(t).at / HANG) * Math.sin((2 * Math.PI * SWINGS * t) / LOOP_S);
/** The rope's knot, above the fish, that it swings from. */
export const PIVOT = 1.9 * FISH_LEN;

export interface FishPose {
  /** Belly, world px. */
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly sag: number;
  readonly swell: number;
  readonly wobble: number;
  readonly slack: number;
}

export function fishAt(t: number): FishPose {
  const angle = swingAt(t);
  return {
    x: -PIVOT * Math.sin(angle),
    y: fishY(t).at,
    angle,
    sag: sagAt(t),
    swell: swellAt(t),
    wobble: wobbleAt(t),
    slack: slackAt(t),
  };
}

// ---------------------------------------------------------------- the camera

export interface Camera {
  /** The world point at the middle of the picture, and px per world px. */
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** Close on the blob; wider for the dive; in a little for the reveal. */
export const CLOSE = 2.2;
export const MID = 1.3;
export const NEAR = 1.65;
const ZOOM_KEYS: readonly Key[] = [
  { t: 0, at: Math.log(CLOSE), rate: 0 },
  { t: DIVE_FROM, at: Math.log(CLOSE), rate: 0 },
  { t: ENTRY_AT + 1.4, at: Math.log(MID), rate: 0 },
  { t: HOLDS_AT, at: Math.log(MID), rate: 0 },
  { t: NORMAL_AT + 0.3, at: Math.log(NEAR), rate: 0 },
  { t: LIFT_FROM, at: Math.log(NEAR), rate: 0 },
  { t: BREACH_AT, at: Math.log(MID), rate: 0 },
  { t: THIS_AT + 0.3, at: Math.log(CLOSE), rate: 0 },
  { t: LOOP_S, at: Math.log(CLOSE), rate: 0 },
];
export const zoomAt = (t: number): number => Math.exp(curveAt(ZOOM_KEYS, t).at);

/** Where its belly sits on screen, clear of the captions, and how far it runs ahead of the camera when moving fast (s of motion). */
export const BELLY_Y = 880;
const LEAD_S = 0.11;
const SEABED_DROP = 120;
/** Its nose bulb weighs its drawing to the right: the camera sits a touch right so it looks centred. */
const SHIFT_X = 0.05 * FISH_LEN;

export function cameraAt(t: number): Camera {
  const zoom = zoomAt(t);
  const { at, rate } = fishY(t);
  // The camera follows its fall and its haul a moment late, so it leads.
  const lead = LEAD_S * rate * zoom;
  // Lower in the picture on the seafloor: the fish in the middle, less sand.
  const belly = BELLY_Y + SEABED_DROP * clamp01(at / REST_Y);
  return { x: SHIFT_X, y: at - (belly + lead - 960) / zoom, zoom };
}

/** How far marine snow has scrolled past, screen px: with the water, back where it began by the loop point. */
export const SNOW_PER_PX = 1.4;
export const snowScroll = (t: number): number => (fishY(t).at + HANG) * SNOW_PER_PX;

// ---------------------------------------------------------------- marks on the picture

/** The "World's Ugliest Animal" label: there at the start (and the end), gone for the dive. */
export const labelAt = (t: number): number => Math.max(1 - ramp(t, DIVE_FROM - 0.2, DIVE_FROM + 0.1), ramp(t, INTERNET_AT - 0.05, INTERNET_AT + 0.4));
/** Struck through on "not", 0 .. 1; not yet when it comes back at the end. */
export const strikeAt = (t: number): number => (t < INTERNET_AT - 1 ? ramp(t, STRIKE_AT, STRIKE_AT + 0.3) : 0);

/** The depth and pressure readout, 0 .. 1. */
export const readoutAt = (t: number): number => Math.min(ramp(t, DIVE_FROM + 0.15, DIVE_FROM + 0.45), 1 - ramp(t, UP_BY + 0.5, UP_BY + 0.9));

/** The pressure readout lighting up as it reaches ×100, 0 .. 1 .. 0. */
export const hundredPulse = (t: number): number => Math.sin(Math.PI * clamp01((t - (LAND_AT - 0.15)) / 0.8));

/** A splash where it goes in and where it comes out: 0 .. 1 over its life, or outside that. */
export const SPLASHES = [ENTRY_AT, BREACH_AT] as const;
export const splashAge = (t: number, at: number): number => (t - at) / (at === ENTRY_AT ? 0.6 : 0.9);

/** A ring of chalk pulsing out round it as it becomes "a perfectly normal fish": 0 .. 1 over its life, or outside that. */
export const revealAge = (t: number): number => (t - NORMAL_AT) / 0.9;

/** A puff of silt where it lands: 0 .. 1 over its life, or outside that. */
export const puffAge = (t: number): number => (t - LAND_AT) / 1.4;

/**
 * Seawater dripping off the net while it hangs, each drop let go at one of
 * these moments: a burst as it comes out of the sea, then steady drips. The
 * last one falls across the loop point (drops are timed round the loop).
 */
export const DRIPS: readonly { readonly at: number; readonly dx: number }[] = [
  { at: 0.3, dx: -0.12 }, { at: 1.05, dx: 0.18 }, { at: 1.75, dx: -0.02 },
  { at: BREACH_AT + 0.1, dx: -0.3 }, { at: BREACH_AT + 0.18, dx: 0.22 }, { at: BREACH_AT + 0.26, dx: 0.05 },
  { at: BREACH_AT + 0.36, dx: -0.16 }, { at: BREACH_AT + 0.5, dx: 0.3 }, { at: BREACH_AT + 0.75, dx: -0.06 },
  { at: 14.6, dx: 0.12 }, { at: 15.4, dx: -0.2 }, { at: 16.3, dx: 0.04 }, { at: 17.2, dx: 0.2 },
  { at: 18.1, dx: -0.1 }, { at: 18.95, dx: 0.14 }, { at: 19.75, dx: -0.04 },
];
const GRAVITY = 2600;
/** Below the belly, where drops fall from the net. */
export const NET_DROP = 0.04 * FISH_LEN;

export interface Drop {
  readonly x: number;
  readonly y: number;
  /** Falling (in the air), or the ring it left on the water, 0 .. 1. */
  readonly ring: number | null;
}

/** When a drop let go at `at` hits the sea, s after letting go. */
function fallTime(at: number): number {
  const from = fishY(at).at + NET_DROP;
  return Math.sqrt((2 * Math.max(0, -from)) / GRAVITY);
}
const RING_S = 0.8;

/** The drops on screen at time t, in world px. */
export function dropsAt(t: number): Drop[] {
  return DRIPS.flatMap((d): Drop[] => {
    const age = (((t - d.at) % LOOP_S) + LOOP_S) % LOOP_S;
    const fall = fallTime(d.at);
    if (age > fall + RING_S) return [];
    const from = fishAt(d.at);
    const x = from.x + d.dx * FISH_LEN;
    if (age < fall) return [{ x, y: from.y + NET_DROP + 0.5 * GRAVITY * age * age, ring: null }];
    return [{ x, y: 0, ring: (age - fall) / RING_S }];
  });
}

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines by hand, at most four words, broken at the phrases. */
const LINE_SIZES = [4, 4, 3, 4, 4, 3, 3, 3, 2, 2, 2, 4, 2, 3, 2, 3, 1, 4, 2, 4] as const;

export const LINES: readonly Line[] = (() => {
  const groups = LINE_SIZES.map((n, i) => {
    const from = LINE_SIZES.slice(0, i).reduce((s: number, m) => s + m, 0);
    return WORDS.slice(from, from + n);
  });
  return groups.map((g, i) => ({
    words: g,
    from: g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** When each drop hits the water, round the loop. */
export const dripTimes = (): number[] => DRIPS.map((d) => (d.at + fallTime(d.at)) % LOOP_S);

/** Quiet under the voice: it does the talking. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'click', t: STRIKE_AT + 0.05, pitch: 0.8, gain: 0.25, pan: 0 },
  { id: 'lunge', t: DIVE_FROM + 0.1, pitch: 0.6, gain: 0.16, pan: 0 },
  { id: 'splash', t: ENTRY_AT, pitch: 0.75, gain: 0.32, pan: 0 },
  { id: 'suck', t: SQUEEZE_AT - 0.1, pitch: 0.55, gain: 0.12, pan: 0 },
  { id: 'lunge', t: LAND_AT, pitch: 0.45, gain: 0.16, pan: 0 },
  { id: 'suck', t: HOLDS_AT - 0.1, pitch: 0.5, gain: 0.1, pan: 0 },
  { id: 'grow', t: NORMAL_AT + 0.1, pitch: 0.75, gain: 0.07, pan: 0 },
  { id: 'hooked', t: TUG_AT, pitch: 0.65, gain: 0.16, pan: 0.2 },
  { id: 'dash', t: LIFT_FROM + 0.2, pitch: 0.55, gain: 0.16, pan: 0 },
  { id: 'splash', t: BREACH_AT, pitch: 1, gain: 0.32, pan: 0 },
  { id: 'yuck', t: SAGS_AT + 0.05, pitch: 0.55, gain: 0.08, pan: 0 },
  { id: 'lose', t: THIS_AT + 0.05, pitch: 0.7, gain: 0.07, pan: 0 },
  ...dripTimes().map((t, i): SoundCue => ({ id: 'drop', t, pitch: 1.3 + 0.07 * (i % 4), gain: 0.05, pan: DRIPS[i]!.dx })),
];
