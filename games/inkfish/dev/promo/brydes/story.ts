import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, lerp, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This Whale Just Opens Its Mouth And Waits": a Bryde's whale in the upper
 * Gulf of Thailand "tread-water feeds": it hangs head-up at the surface, jaws
 * wide, and the anchovies drift in (Iwata et al. 2017); about 12 m / 40 ft;
 * calves seem to learn it by copying adults. Every beat a function of time in
 * seconds over a loop of LOOP_S, timed to the words (words.ts). One mood a
 * sentence:
 *
 *   0     "This whale doesn't CHASE its food… it just opens wide and WAITS!"
 *         (mischievous): the head up out of the dusk sea, jaw dropped, anchovies
 *         pouring over the lip into the dark mouth; a sly eye, then a smug one
 *   4.6   "In the Gulf of Thailand," (surprised): a place tag, a cool flash
 *   6.1   "forty-foot Bryde's whales hang at the surface," : the camera pulls
 *         back to the whole whale hanging below the surface, "40 ft / 12 m"
 *   8.3   "jaws open…" : push back in on the mouth
 *   9.7   "and the fish drift right in!" (nervous): the fish close up, worried
 *         eyes, drifting to the lip; they pour in on "in!", the mouth shuts: gulp
 *  11.9   "No lunging. No chasing." (chuckles): two crossed-out gag cards; the
 *         whale just bobs and burps a bubble
 *  13.7   "And the calves seem to COPY their moms!" (excited): a calf beside
 *         the mother opens its little mouth too
 *  15.95  "Honestly? Laziest genius in the ocean." (sarcastic): a half-lidded
 *         eye close up, a lazy bubble; pull back to the dusk ocean
 *  18.7   "So": the mouth opens again into frame 1.
 */

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const OPENS_AT = said('opens');
export const WAITS_AT = said('WAITS!');
export const GULF_AT = said('Gulf');
export const THAILAND_AT = said('Thailand,');
export const FORTY_AT = said('forty-foot');
export const BRYDES_AT = said('Bryde\'s');
export const WHALES_AT = said('whales');
export const HANG_AT = said('hang');
export const JAWS_AT = said('jaws');
export const OPEN_AT = said('open…');
export const AND_AT = said('and', 2);
export const FISH_AT = said('fish');
export const DRIFT_AT = said('drift');
export const IN_AT = said('in!');
export const NO_AT = said('No');
export const LUNGING_AT = said('lunging.');
export const NO2_AT = said('No', 2);
export const CHASING_AT = said('chasing.');
export const CALVES_AT = said('calves');
export const COPY_AT = said('COPY');
export const MOMS_AT = said('moms!');
export const HONESTLY_AT = said('Honestly?');
export const LAZIEST_AT = said('Laziest');
export const OCEAN_AT = said('ocean.');
export const SO_AT = said('So');

export interface Pt {
  readonly x: number;
  readonly y: number;
}
export interface View extends Pt {
  readonly zoom: number;
}

/** The world: the whale hangs head-up, its jaw hinge at the origin; the water's surface is y = WATER. */
export const WATER = 110;
export const FOCUS = { x: 540, y: 960 } as const;
export const toScreen = (v: View, p: Pt): Pt => ({ x: (p.x - v.x) * v.zoom + FOCUS.x, y: (p.y - v.y) * v.zoom + FOCUS.y });

// ---------------------------------------------------------------- the whale

export type EyeMood = 'sly' | 'smug' | 'wide' | 'happy' | 'lazy';

export interface WhalePose {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  readonly scale: number;
  /** 0 shut .. 1 wide open. */
  readonly gape: number;
  /** The throat: 0 slack .. 1 bulging with the gulp. */
  readonly bulge: number;
  readonly eye: EyeMood;
}

/** The jaw closes on "in!" (the gulp) and opens again for the chuckle, droops for the lazy line, opens fully on "So". */
export function gapeAt(t: number): number {
  const u = wrap(t);
  const shut = ramp(u, IN_AT - 0.05, IN_AT + 0.15) * (1 - ramp(u, 13.45, 14.2));
  const crack = 0.12 * window01(u, 12.9, 13.5, 0.15);
  const droop = 0.3 * ramp(u, 16.6, 17.4) * (1 - ramp(u, SO_AT, SO_AT + 0.6));
  return Math.min(1, Math.max(0, 1 - shut + crack - droop));
}

/** The throat swells as the gulp goes down, and a little at the burp. */
export function bulgeAt(t: number): number {
  const u = wrap(t);
  const gulp = ramp(u, IN_AT, IN_AT + 0.25) * (1 - ramp(u, IN_AT + 0.5, IN_AT + 1.7));
  const burp = 0.35 * window01(u, 12.85, 13.5, 0.2);
  return gulp + burp + 0.12 * gapeAt(u);
}

export function eyeAt(t: number): EyeMood {
  const u = wrap(t);
  if (u < WAITS_AT - 0.2) return 'sly';
  if (u < GULF_AT - 0.1) return 'smug';
  if (u < IN_AT) return 'wide';
  if (u < CALVES_AT - 0.3) return 'happy';
  if (u < HONESTLY_AT - 0.05) return 'wide';
  if (u < SO_AT - 0.1) return 'lazy';
  return 'sly';
}

/** The mother: swaying a little, bobbing more for the chuckle. */
export function whaleAt(t: number): WhalePose {
  const u = wrap(t);
  const bob = 16 * Math.sin(cycles(5, u)) * window01(u, NO_AT - 0.1, CALVES_AT, 0.3);
  return {
    x: 0, y: bob + 4 * Math.sin(cycles(3, u)), tilt: 0.04 + 0.01 * Math.sin(cycles(2, u)), scale: 1,
    gape: gapeAt(u), bulge: bulgeAt(u), eye: eyeAt(u),
  };
}

/** The second whale far behind, there for "whales" (plural). */
export function buddyAt(t: number): { readonly pose: WhalePose; readonly shown: number } {
  const u = wrap(t);
  const shown = window01(u, WHALES_AT - 0.1, OPEN_AT + 0.2, 0.4);
  return { shown, pose: { x: -440, y: 40 + 8 * Math.sin(cycles(4, u) + 1), tilt: 0.08, scale: 0.72, gape: 1, bulge: 0.1, eye: 'smug' } };
}

/** The calf beside its mother: rises on "calves", opens its little mouth on "COPY", sinks away after "moms!". */
export function calfAt(t: number): { readonly pose: WhalePose; readonly shown: number } {
  const u = wrap(t);
  const shown = window01(u, CALVES_AT - 0.35, HONESTLY_AT + 0.2, 0.55);
  const copy = ramp(u, COPY_AT - 0.25, COPY_AT + 0.3);
  return {
    shown,
    pose: {
      x: 700, y: 1500 * (1 - shown) + 60 + 6 * Math.sin(cycles(6, u)), tilt: 0.12, scale: 0.46, gape: copy * shown,
      bulge: 0.15 * copy * shown, eye: u > COPY_AT + 0.3 && u < HONESTLY_AT ? 'happy' : 'wide',
    },
  };
}

// ---------------------------------------------------------------- the anchovies

/** The stream's own clock, in whole transits a loop (a fish is back where it was at the seam); it speeds up as they pour in. */
const TRANSITS = 7;
const SURGE = 1.1;
export const streamAt = (t: number): number => {
  const u = wrap(t);
  return ((TRANSITS - SURGE) * u) / LOOP_S + SURGE * ramp(u, IN_AT - 0.6, IN_AT + 0.1);
};

/** The fish's worried eyes, 0 .. 1: they see the mouth coming. */
export const worryAt = (t: number): number => window01(wrap(t), AND_AT - 0.1, IN_AT + 0.1, 0.25);

/** How much of the stream is flowing: only while the jaw is open. */
export const flowAt = (gape: number): number => ramp(gape, 0.25, 0.8);

// ---------------------------------------------------------------- the camera

/** Frame 1: the open mouth, big. */
export const CAM0: View = { x: 0, y: 40, zoom: 1.2 };

const CAM: readonly (View & { readonly t: number })[] = [
  { t: 0, ...CAM0 },
  { t: WAITS_AT - 0.1, x: 0, y: 30, zoom: 1.3 },
  { t: GULF_AT - 0.3, x: 0, y: 30, zoom: 1.32 },
  { t: GULF_AT + 0.6, x: 0, y: -20, zoom: 0.95 },
  { t: FORTY_AT - 0.2, x: 40, y: 150, zoom: 0.9 },
  { t: HANG_AT, x: 20, y: 700, zoom: 0.8 },
  { t: JAWS_AT - 0.1, x: 20, y: 700, zoom: 0.8 },
  { t: OPEN_AT + 0.1, x: 0, y: 90, zoom: 1.15 },
  { t: AND_AT + 0.3, x: 0, y: 40, zoom: 1.5 },
  { t: IN_AT + 0.1, x: 0, y: 30, zoom: 1.56 },
  { t: IN_AT + 0.6, x: 0, y: 50, zoom: 1.35 },
  { t: NO_AT + 0.35, x: -200, y: 60, zoom: 0.8 },
  { t: CHASING_AT + 0.4, x: -200, y: 60, zoom: 0.8 },
  { t: CALVES_AT - 0.2, x: 350, y: 150, zoom: 0.85 },
  { t: MOMS_AT, x: 350, y: 150, zoom: 0.85 },
  { t: HONESTLY_AT + 0.35, x: -200, y: 60, zoom: 2.2 },
  { t: LAZIEST_AT + 0.6, x: -195, y: 60, zoom: 2.35 },
  { t: OCEAN_AT + 0.2, x: 0, y: 300, zoom: 0.65 },
  { t: SO_AT, x: 0, y: 300, zoom: 0.65 },
  { t: LOOP_S - 0.2, ...CAM0 },
  { t: LOOP_S, ...CAM0 },
];
const track = (f: (k: (typeof CAM)[number]) => number): Key[] => CAM.map((k) => ({ t: k.t, at: f(k), rate: 0 }));
const CAM_X = track((k) => k.x);
const CAM_Y = track((k) => k.y);
const CAM_Z = track((k) => Math.log(k.zoom));

export function cameraAt(t: number): View {
  const u = wrap(t);
  return { x: curveAt(CAM_X, u).at, y: curveAt(CAM_Y, u).at, zoom: Math.exp(curveAt(CAM_Z, u).at) };
}

/** Jolts: the gulp, and the burp. */
export function shakeAt(t: number): Pt {
  let x = 0;
  let y = 0;
  for (const j of [{ at: IN_AT + 0.08, amp: 22 }, { at: 13.0, amp: 7 }]) {
    const d = wrap(t) - j.at;
    if (d < 0 || d > 0.4) continue;
    const amp = j.amp * (1 - d / 0.4) ** 2;
    x += amp * Math.sin(d * 110);
    y += amp * 0.7 * Math.cos(d * 140);
  }
  return { x, y };
}

// ---------------------------------------------------------------- the props

/** The sly look at the surface: gulls circling for "WAITS!" and again for the wide ocean. */
export const gullsAt = (t: number): number => Math.max(window01(wrap(t), WAITS_AT - 0.3, OPEN_AT, 0.5), window01(wrap(t), 17.6, SO_AT + 0.2, 0.3));

export function gullAt(i: number, t: number): { readonly x: number; readonly y: number; readonly flap: number } {
  const a = cycles(1, t) * (i % 2 ? 1 : -1) + i * 2.6;
  return { x: 150 + 25 * i + 360 * Math.cos(a), y: -330 - 70 * i + 60 * Math.sin(a * 2), flap: Math.sin(cycles(26, t) + i) };
}

/** "Gulf of Thailand" on the water, 0 .. 1. */
export const placeAt = (t: number): number => window01(wrap(t), GULF_AT - 0.15, FORTY_AT - 0.1, 0.25);

/** The length bar "40 ft / 12 m": drawn head to tail from "forty-foot", gone as the jaws open; `ding` pops the label. */
export function barAt(t: number): { readonly draw: number; readonly shown: number; readonly pop: number } {
  const u = wrap(t);
  const d = u - (FORTY_AT + 0.25);
  return {
    draw: u < JAWS_AT + 0.3 ? ramp(u, FORTY_AT - 0.1, FORTY_AT + 0.7) : 0, shown: window01(u, FORTY_AT - 0.15, JAWS_AT + 0.1, 0.2),
    pop: d > 0 && d < 0.6 ? 0.14 * Math.exp(-6 * d) * Math.sin(12 * d + 1.2) + 0.08 * Math.exp(-8 * d) : 0,
  };
}

/** The two gag cards ("lunging" ✗, "chasing" ✗): slide in on their words, with the ✗ stamped a beat after; out on "And". */
export function cardAt(n: 0 | 1, t: number): { readonly slide: number; readonly cross: number } {
  const u = wrap(t);
  const at = n === 0 ? NO_AT : NO2_AT;
  return { slide: ramp(u, at - 0.05, at + 0.3) * (1 - ramp(u, CALVES_AT - 0.35, CALVES_AT)), cross: ramp(u, at + 0.35, at + 0.5) * (1 - ramp(u, CALVES_AT - 0.35, CALVES_AT)) };
}

/** A bubble from the mouth, 0 .. 1 over its life (-1 not yet / gone). */
export const BUBBLES = [{ from: 13.0, to: 14.45 }, { from: 16.45, to: 18.3 }] as const;
export const bubbleAt = (n: 0 | 1, t: number): number => {
  const u = wrap(t);
  const b = BUBBLES[n];
  return u < b.from || u >= b.to ? -1 : (u - b.from) / (b.to - b.from);
};

/** The splash of the gulp, 0 .. 1 (-1 outside). */
export const splashAt = (t: number): number => {
  const d = wrap(t) - (IN_AT - 0.02);
  return d < 0 || d > 1.2 ? -1 : d / 1.2;
};

/** The colour of each beat's mood washed over the picture: [r, g, b, alpha]. */
const GRADE: readonly { readonly t: number; readonly c: readonly number[] }[] = [
  { t: 0, c: [255, 150, 80, 0.1] },
  { t: GULF_AT - 0.1, c: [255, 150, 80, 0.1] },
  { t: GULF_AT + 0.2, c: [120, 200, 255, 0.14] },
  { t: JAWS_AT, c: [100, 170, 230, 0.06] },
  { t: AND_AT + 0.2, c: [70, 120, 100, 0.2] },
  { t: IN_AT + 0.2, c: [255, 240, 200, 0.12] },
  { t: NO_AT, c: [255, 215, 110, 0.1] },
  { t: CALVES_AT, c: [255, 120, 160, 0.13] },
  { t: HONESTLY_AT, c: [255, 170, 70, 0.17] },
  { t: SO_AT, c: [255, 170, 70, 0.17] },
  { t: LOOP_S, c: [255, 150, 80, 0.1] },
];
export function gradeAt(t: number): readonly number[] {
  const u = wrap(t);
  let i = 1;
  while (i < GRADE.length - 1 && GRADE[i]!.t < u) i++;
  const [a, b] = [GRADE[i - 1]!, GRADE[i]!];
  const k = ramp(u, a.t, b.t);
  return a.c.map((v, j) => lerp(v, b.c[j]!, k));
}

/** The cool flash as the place tag lands. */
export const flashAt = (t: number): number => {
  const d = wrap(t) - GULF_AT;
  return d > 0 && d < 0.5 ? 0.2 * Math.exp(-8 * d) : 0;
};
