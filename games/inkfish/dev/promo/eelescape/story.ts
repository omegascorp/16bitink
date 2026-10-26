import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, ramp, smooth, window01 } from '../short';
import { EEL_LEN } from './shape';
import { LOOP_S, TEMPO, WORDS } from './words';
import { X_EEL_LEN, X_GILL_S, X_THROAT_S } from './xshape';

export { LOOP_S };

/**
 * "This eel got swallowed alive and escaped": Hasegawa et al., Current
 * Biology, September 2024 (Nagasaki University). Juvenile Japanese eels fed
 * to dark sleepers (a chunky river fish) were filmed by X-ray. An eel lasts
 * about three minutes in the stomach; some swam backwards, tail first, up
 * the gullet and squeezed out of a gill slit. 9 of 32 caught (28%) got out.
 *
 * Every beat is a function of video time t (seconds) over a loop of LOOP_S,
 * timed to the narrator's words (words.ts):
 *
 *   0     "This eel got swallowed alive…" (thrill, shock): the dark sleeper's
 *         head fills the frame, mouth wide, an eel's tail whipping out of its
 *         lips; the jaws snap shut on "swallowed" and the tail is gone
 *   2.1   "and ESCAPED!" (triumph): the eel's tail pokes out of the gill
 *         cover, a flash, a golden glow
 *   3.0   "Scientists in Japan X-rayed fish that had just eaten young eels."
 *         (curious): a scan line wipes the picture to an X-ray: the fish a
 *         glowing skeleton, the eel a bright line inside; two scientists, the
 *         flag of Japan, a scan sweeping across
 *   7.3   "Inside the stomach, an eel lasts about three minutes…" (nervous):
 *         in to the stomach, pulsing red-orange with a heartbeat; a stopwatch
 *         from "3:00" counting down
 *   10.6  "so they swam BACKWARDS, up the throat," (dramatic): the eel reverses
 *         tail first along a dotted path up the gullet to the gill slit
 *   12.8  "and squeezed out through the GILLS!" (excited): back in colour, the
 *         eel squirms out of the gill slit and away
 *   15.0  "About one in four made it." (bittersweet): four little eels in a
 *         row; one swims off sparkling, three fade to grey outlines
 *   16.6  "So yes," (sly): back to the gulp of frame 1.
 */

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Whole cycles a loop, as a phase in radians: wiggles that are where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}
/** When a word ends. */
export function ends(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const EEL_AT = said('eel');
export const SWALLOWED_AT = said('swallowed');
export const ALIVE_AT = said('alive…');
export const AND_AT = said('and');
export const ESCAPED_AT = said('ESCAPED!');
export const ESCAPED_END = ends('ESCAPED!');
export const SCIENTISTS_AT = said('Scientists');
export const JAPAN_AT = said('Japan');
export const XRAYED_AT = said('X-rayed');
export const FISH_AT = said('fish');
export const YOUNG_AT = said('young');
export const EELS_AT = said('eels.');
export const EELS_END = ends('eels.');
export const INSIDE_AT = said('Inside');
export const STOMACH_AT = said('stomach,');
export const THREE_AT = said('three');
export const MINUTES_AT = said('minutes…');
export const MINUTES_END = ends('minutes…');
export const SO_AT = said('so');
export const SWAM_AT = said('swam');
export const BACKWARDS_AT = said('BACKWARDS,');
export const UP_AT = said('up');
export const THROAT_AT = said('throat,');
export const THROAT_END = ends('throat,');
export const AND2_AT = said('and', 2);
export const SQUEEZED_AT = said('squeezed');
export const OUT_AT = said('out');
export const GILLS_AT = said('GILLS!');
export const GILLS_END = ends('GILLS!');
export const ABOUT_AT = said('About');
export const ONE_AT = said('one');
export const FOUR_AT = said('four');
export const MADE_AT = said('made');
export const IT_END = ends('it.');
export const SO_YES_AT = said('So');

// ---------------------------------------------------------------- scenes

export type SceneId = 'river' | 'xray' | 'odds';

/** Cuts: [from, to, the scene before, the scene after]. The first is a scan wipe to the X-ray. */
export const CUTS: readonly (readonly [number, number, SceneId, SceneId])[] = [
  [ESCAPED_END + 0.05, SCIENTISTS_AT - 0.06, 'river', 'xray'],
  [THROAT_END, AND2_AT, 'xray', 'river'],
  [ABOUT_AT - 0.25, ABOUT_AT - 0.03, 'river', 'odds'],
  [IT_END + 0.06, SO_YES_AT - 0.05, 'odds', 'river'],
];

/** What's on screen at t: one scene, or two mixing (`mix` of the second over the first). */
export interface SceneMix {
  readonly a: SceneId;
  readonly b: SceneId | null;
  readonly mix: number;
}

export function sceneAt(t: number): SceneMix {
  const u = wrap(t);
  for (let i = CUTS.length - 1; i >= 0; i--) {
    const [from, to, before, after] = CUTS[i]!;
    if (u >= to) return { a: after, b: null, mix: 0 };
    if (u >= from) return { a: before, b: after, mix: ramp(u, from, to) };
  }
  return { a: 'river', b: null, mix: 0 };
}

/** Whether a scene is on screen at t (alone or mixing). */
export const shows = (id: SceneId, t: number): boolean => {
  const s = sceneAt(t);
  return s.a === id || (s.b === id && s.mix > 0);
};

// ---------------------------------------------------------------- the gulp (frame 1 and the end)

/** The jaws shut on the eel's tail, on "swallowed". */
export const SHUT_T = SWALLOWED_AT + 0.22;

/**
 * The gulp runs on its own clock: 0 is frame 1 (the eel half in the open
 * mouth, its tail whipping outside), 1 the jaws shut with the eel all in,
 * below 0 the eel still outside being sucked in. The hook slides it in, then
 * slurps it on "swallowed"; the end runs it from -1 up to 0 at the pace the
 * hook starts at.
 */
const OPENING_RATE = 0.28;
const HOOK_CLOCK: readonly Key[] = [
  { t: 0, at: 0, rate: OPENING_RATE },
  { t: SWALLOWED_AT, at: 0.3, rate: 0.6 },
  { t: SHUT_T, at: 1, rate: 1.6 },
  { t: 2, at: 1.5, rate: 0 },
];
export const END_START = CUTS[3]![0];
const END_CLOCK: readonly Key[] = [
  { t: END_START, at: -1, rate: 0.45 },
  { t: 17.4, at: -0.38, rate: 0.7 },
  { t: LOOP_S, at: 0, rate: OPENING_RATE },
];

export function gulpAt(t: number): number {
  const u = wrap(t);
  return u < 16 ? curveAt(HOOK_CLOCK, u).at : curveAt(END_CLOCK, u).at;
}

/** How wide the mouth is open at gulp g, 0 shut .. 1 wide. */
export function jawOf(g: number): number {
  if (g <= 0) return 0.72 + 0.28 * smooth(g + 1);
  return 1 - smooth((g - 0.42) / 0.55);
}

/** Where the eel's head is along the swallow path at gulp g (0 = at the lips): half in at frame 1, all in when the jaws shut. */
export const eelHeadOf = (g: number): number => EEL_LEN / 2 + Math.max(-1, Math.min(1.2, g)) * (EEL_LEN / 2 + 60);

// ---------------------------------------------------------------- the escape, in colour

/**
 * The eel's tail along the escape path (0 = at the gill slit; the eel is
 * tail first, its head EEL_LEN behind). It pokes out on "ESCAPED!", is
 * still out when the colour comes back, and squeezes free on "GILLS!".
 */
const POKE: readonly Key[] = [
  { t: ESCAPED_AT - 0.08, at: -20, rate: 0 },
  { t: ESCAPED_AT + 0.28, at: 200, rate: 260 },
  { t: CUTS[0]![1] + 0.1, at: 270, rate: 0 },
];
const SQUEEZE: readonly Key[] = [
  { t: THROAT_END, at: 120, rate: 40 },
  { t: SQUEEZED_AT, at: 160, rate: 120 },
  { t: GILLS_AT - 0.05, at: EEL_LEN * 0.72, rate: 520 },
  { t: GILLS_AT + 0.3, at: EEL_LEN + 90, rate: 800 },
  { t: CUTS[2]![1], at: EEL_LEN + 700, rate: 800 },
];

export function escapeAt(t: number): number {
  const u = wrap(t);
  if (u < ESCAPED_AT - 0.08) return -20;
  if (u < 8) return curveAt(POKE, u).at;
  if (u < THROAT_END) return -20;
  if (u < 16) return curveAt(SQUEEZE, u).at;
  return -20;
}

// ---------------------------------------------------------------- the river camera and the fish's face

/** The river camera: world point `focus` at the frame's point (540, 800), `zoom` screen px per world px. */
export interface Cam {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}
export const CAM_AT = { x: 540, y: 800 } as const;
const REST: Cam = { x: 540, y: 800, zoom: 1 };

type CamKey = { readonly t: number } & Cam & { readonly rate?: Partial<Cam> };
const camCurve = (keys: readonly CamKey[], u: number): Cam => {
  const pick = (k: keyof Cam): number => curveAt(keys.map((c) => ({ t: c.t, at: c[k], rate: c.rate?.[k] })), u).at;
  return { x: pick('x'), y: pick('y'), zoom: pick('zoom') };
};
/** The slow push in at frame 1 (zoom per second), matched at the loop's end. */
const PUSH = 0.012;
const HOOK_CAM: readonly CamKey[] = [
  { t: 0, ...REST, rate: { x: 0, y: 0, zoom: PUSH } },
  { t: SWALLOWED_AT, x: 530, y: 812, zoom: 1.03 },
  { t: SHUT_T + 0.15, x: 480, y: 840, zoom: 1.13 },
  { t: ALIVE_AT + 0.45, x: 495, y: 842, zoom: 1.15 },
  { t: ESCAPED_AT + 0.3, x: 770, y: 905, zoom: 1.38 },
  { t: CUTS[0]![1] + 0.1, x: 790, y: 915, zoom: 1.46 },
];
const SQUEEZE_CAM: readonly CamKey[] = [
  { t: THROAT_END, x: 780, y: 915, zoom: 1.42 },
  { t: SQUEEZED_AT, x: 790, y: 920, zoom: 1.45 },
  { t: GILLS_AT, x: 850, y: 960, zoom: 1.3 },
  { t: GILLS_AT + 0.5, x: 960, y: 1020, zoom: 1.1 },
  { t: CUTS[2]![1], x: 1000, y: 1030, zoom: 1.05 },
];
const END_CAM: readonly CamKey[] = [
  { t: END_START, x: 600, y: 860, zoom: 1.12 },
  { t: 17.3, x: 560, y: 816, zoom: 1.03 },
  { t: LOOP_S, ...REST, rate: { x: 0, y: 0, zoom: PUSH } },
];

export function riverCamAt(t: number): Cam {
  const u = wrap(t);
  if (u < 8) return camCurve(HOOK_CAM, u);
  if (u < 16) return camCurve(SQUEEZE_CAM, u);
  return camCurve(END_CAM, u);
}

/** Jolts of the picture: the jaws snapping shut, the tail popping out, the eel squeezing free. px. */
const JOLTS: readonly (readonly [number, number])[] = [[SHUT_T, 24], [ESCAPED_AT + 0.05, 12], [GILLS_AT + 0.05, 14]];
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = wrap(t);
  let x = 0;
  let y = 0;
  for (const [at, amp] of JOLTS) {
    const s = u - at;
    if (s < 0 || s > 0.45) continue;
    const a = amp * (1 - s / 0.45) ** 2;
    x += a * Math.sin(s * 115);
    y += a * 0.7 * Math.cos(s * 140);
  }
  return { x, y };
}

/** A white flash at the gill slit: the tail popping out, and the eel squeezing free. 0 .. 1. */
export function flashAt(t: number): number {
  const u = wrap(t);
  const pop = (at: number): number => (u < at ? 0 : u < at + 0.06 ? (u - at) / 0.06 : Math.max(0, 1 - (u - at - 0.06) / 0.5));
  return Math.max(pop(ESCAPED_AT), pop(GILLS_AT));
}

/** The fish's face: its pupil (1 hungry and wide .. small in shock), where it looks (-1 ahead at the eel .. 1 back at its gill), and a sly narrowed eye at the end. */
export interface Face {
  readonly pupil: number;
  readonly look: number;
  readonly sly: number;
}
export function faceAt(t: number): Face {
  const u = wrap(t);
  const shock = Math.max(window01(u, ESCAPED_AT - 0.05, 3.4, 0.15), window01(u, SQUEEZED_AT - 0.1, 15.3, 0.2));
  return {
    pupil: 1 - 0.5 * shock - 0.15 * window01(u, SHUT_T - 0.1, AND_AT, 0.15),
    look: -1 + 2 * shock,
    sly: window01(u, SO_YES_AT - 0.1, 17.95, 0.35),
  };
}

/** The river's grades, 0 .. 1 each: the gulp's shock, the golden triumph, the bright excitement. */
export const shockAt = (t: number): number => window01(wrap(t), SHUT_T - 0.08, AND_AT + 0.1, 0.2);
export const triumphAt = (t: number): number => window01(wrap(t), ESCAPED_AT - 0.1, 3.5, 0.25);
export const excitedAt = (t: number): number => window01(wrap(t), THROAT_END, 15.4, 0.3);

// ---------------------------------------------------------------- the X-ray

/** The X-ray camera: world point (x, y) at the frame's point (540, 790). */
export const XCAM_AT = { x: 540, y: 740 } as const;
const X_REST: Cam = { x: 560, y: 770, zoom: 1.04 };
const X_CAM: readonly CamKey[] = [
  { t: 2.5, ...X_REST },
  { t: INSIDE_AT - 0.15, x: 560, y: 772, zoom: 1.08 },
  { t: STOMACH_AT + 0.35, x: 470, y: 805, zoom: 1.8 },
  { t: MINUTES_END, x: 468, y: 806, zoom: 1.92 },
  { t: SWAM_AT + 0.2, x: 410, y: 812, zoom: 1.7 },
  { t: THROAT_END, x: 360, y: 822, zoom: 1.85 },
  { t: 13.5, ...X_REST },
];
export function xCamAt(t: number): Cam {
  return camCurve(X_CAM, wrap(t));
}

/** A tremble in the stomach beat, px. */
export function trembleAt(t: number): { readonly x: number; readonly y: number } {
  const k = 3.5 * window01(wrap(t), INSIDE_AT, SO_AT, 0.3);
  return { x: k * Math.sin(cycles(170, t)), y: k * Math.cos(cycles(130, t)) };
}

/** The eel's tail along the X-ray path: at rest in the stomach, then backwards up the gullet and just out of the gill slit by "throat". */
const X_SWIM: readonly Key[] = [
  { t: SO_AT, at: X_EEL_LEN, rate: 0 },
  { t: THROAT_AT, at: X_THROAT_S },
  { t: THROAT_END + 0.1, at: X_GILL_S + 35, rate: 60 },
];
export function xEelAt(t: number): number {
  const u = wrap(t);
  return u < SO_AT || u > 13.3 ? X_EEL_LEN : curveAt(X_SWIM, u).at;
}

/** The dotted way out, drawn ahead of the eel, 0 .. 1. */
export const pathAt = (t: number): number => window01(wrap(t), SO_AT - 0.05, THROAT_END + 0.4, 0.25);
/** The scan line sweeping the X-ray on "X-rayed", 0 (top) .. 1 (bottom), or null when not sweeping. */
export function scanAt(t: number): number | null {
  const u = wrap(t);
  const from = XRAYED_AT - 0.08;
  const to = XRAYED_AT + 0.75;
  return u >= from && u <= to ? (u - from) / (to - from) : null;
}
/** The fish's bones glowing brighter on "fish", the eel on "young eels", 0 .. 1. */
export const bonesAt = (t: number): number => window01(wrap(t), FISH_AT - 0.05, FISH_AT + 0.75, 0.2);
export const eelGlowAt = (t: number): number => window01(wrap(t), YOUNG_AT - 0.05, EELS_END + 0.35, 0.2);
/** How red-orange and anxious the stomach is, 0 .. 1. */
export const stomachAt = (t: number): number => window01(wrap(t), INSIDE_AT - 0.1, THROAT_END, 0.3);

/** Heartbeats in the stomach beat (lub-dub), quickening: the times of each "lub". */
export const HEARTBEATS: readonly number[] = [0, 0.62, 1.2, 1.74, 2.24, 2.7, 3.12].map((d) => INSIDE_AT + 0.05 + d);
/** The stomach's throb with each heartbeat, 0 .. 1. */
export function throbAt(t: number): number {
  const u = wrap(t);
  let k = 0;
  for (const b of HEARTBEATS) {
    for (const [d, a] of [[0, 1], [0.17, 0.6]] as const) {
      const s = u - b - d;
      if (s > 0 && s < 0.3) k = Math.max(k, a * Math.sin((Math.PI * s) / 0.3) ** 2);
    }
  }
  return k;
}
/** The dramatic violet grade for "BACKWARDS", 0 .. 1. */
export const dramaAt = (t: number): number => window01(wrap(t), SO_AT - 0.1, THROAT_END + 0.2, 0.3);

// ---------------------------------------------------------------- the X-ray's labels

/** Two scientists sliding in from the right, from "Scientists" to the stomach. 0 .. 1. */
export const scientistsAt = (t: number): number => window01(wrap(t), SCIENTISTS_AT - 0.12, INSIDE_AT - 0.05, 0.3);
/** Japan's flag and name, from "Japan". */
export const japanAt = (t: number): number => window01(wrap(t), JAPAN_AT - 0.06, INSIDE_AT - 0.1, 0.2);
/** The stopwatch, from "three" until the colour comes back. */
export const timerAt = (t: number): number => window01(wrap(t), THREE_AT - 0.06, AND2_AT + 0.05, 0.15);
/** The stopwatch's reading, seconds: 3:00 on "three minutes", then running down fast. */
export const timerSecondsAt = (t: number): number => {
  const u = wrap(t);
  return u > 13.3 ? 180 : Math.max(0, 180 - 22 * Math.max(0, u - MINUTES_END));
};

// ---------------------------------------------------------------- one in four

/** Each of the four eels arriving, 0 .. 1 (i = 0 .. 3). */
export const eelInAt = (i: number, t: number): number => {
  const u = wrap(t);
  return u > 16.95 ? 1 - ramp(u, 16.95, 17.2) : ramp(u, ABOUT_AT - 0.3 + i * 0.09, ABOUT_AT + 0.15 + i * 0.09);
};
/** The first eel lit up gold on "one". */
export const winnerAt = (t: number): number => window01(wrap(t), ONE_AT - 0.05, 17.3, 0.15);
/** "1 in 4" on "four". */
export const ratioAt = (t: number): number => window01(wrap(t), FOUR_AT - 0.08, 17.3, 0.15);
/** The winner swimming off, 0 .. 1, from "made". */
export const swimOffAt = (t: number): number => ramp(wrap(t), MADE_AT - 0.05, MADE_AT + 0.95) * (wrap(t) < 17.3 ? 1 : 0);
/** The other three fading to grey outlines, 0 .. 1. */
export const greyAt = (t: number): number => ramp(wrap(t), MADE_AT, MADE_AT + 0.45) * (wrap(t) < 17.3 ? 1 : 0);
