import { C, heightAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { TEMPO, WORDS } from './words';

/**
 * "This fish has heated eyes": a swordfish hunts hundreds of metres down,
 * where the water can be about 3 °C, and a heater organ in one of its eye
 * muscles keeps its eyes and brain 10–15 °C warmer than the water (Carey
 * 1982). Warm retinas follow fast motion up to more than ten times better
 * (Fritsches, Brill & Warrant 2005). Told by a narrator (words.ts) over the
 * game's swordfish, every beat timed to the words, a function of time in
 * seconds over a loop of LOOP_S.
 *
 *   0     [excited] the swordfish big in frame, its eye glowing orange
 *         under shimmering heat lines: "heated eyes"
 *   2.0   [curious] "Swordfish hunt deep down…": the camera sinks into
 *         dark water, the depth rolling to 550 m and the thermometer
 *         falling to 3 °C; frost creeps in on "freezing"
 *   5.0   [softly] "So a muscle next to each eye…": in close on the head,
 *         seen through the skin: the heater muscle glows beside the eye,
 *         warm waves on "heater" melt the frost; "eyes and brain" glow and
 *         the thermometer climbs to "+15 °C" on "fifteen degrees"
 *   10.1  [dramatically] "Warm eyes follow fast prey…": out again, a
 *         mackerel darts past, a cold eye's blur against a warm eye's
 *         sharp view, and "×10" lands on "TEN"
 *   13.9  [chuckles] "Forget heated seats.": a heated car seat, struck
 *         out, as the swordfish settles back into the opening pose, and the
 *         loop finishes the sentence.
 */
export const LOOP_S = 15;

/** The line boil steps at the game's 8 a second: 120 steps, 40 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const HEATED_AT = said('HEATED');
export const SWORDFISH_AT = said('Swordfish');
export const DEEP_AT = said('deep');
export const DOWN_AT = said('down,');
export const WATER_AT = said('water');
export const FREEZING_AT = said('freezing.');
export const SO_AT = said('So');
export const MUSCLE_AT = said('muscle');
export const EYE_AT = said('eye');
export const HEATER_AT = said('heater,');
export const KEEPING_AT = said('keeping');
export const EYES_AT = said('eyes');
export const BRAIN_AT = said('brain');
export const FIFTEEN_AT = said('fifteen');
export const DEGREES_AT = said('degrees');
export const WARMER_AT = said('warmer.');
export const WARM_AT = said('Warm');
export const FAST_AT = said('fast');
export const PREY_AT = said('prey');
export const TEN_AT = said('TEN');
export const BETTER_AT = said('better.');
export const FORGET_AT = said('Forget');
export const SEATS_AT = said('seats.');

/** A value keyed through the loop that comes round smoothly: keys in [0, LOOP_S), the last running on into the first. */
function looped(keys: readonly Key[]): (t: number) => number {
  const eased = keys.map((k) => ({ ...k, rate: k.rate ?? 0 }));
  const ext = [
    ...eased.slice(-2).map((k) => ({ ...k, t: k.t - LOOP_S })),
    ...eased,
    ...eased.slice(0, 2).map((k) => ({ ...k, t: k.t + LOOP_S })),
  ];
  return (t: number) => curveAt(ext, wrap(t)).at;
}

// ---------------------------------------------------------------- the swordfish

const SWORD = ANATOMY.swordfish;

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The swordfish on screen, always facing right. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  /** Nose up, radians (as drawSwimmer takes it). */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
}

/** Px on screen per fish-texture px. */
export const texScale = (f: Fish): number => f.len / (2 * SWORD.hl);

/** A point of the drawing (fish-texture px, nose to the right) on screen: the head never bends, so only scale and tilt. */
export function texToScreen(f: Fish, p: Pt): Pt {
  const k = texScale(f);
  const lx = (p.x - C) * k;
  const ly = (p.y - C) * k;
  const c = Math.cos(f.tilt);
  const s = Math.sin(f.tilt);
  return { x: f.x + lx * c + ly * s, y: f.y - lx * s + ly * c };
}

/** The eye, in fish-texture px, where giants.ts draws it. */
export const EYE_TEX: Pt = { x: xAt(SWORD, SWORD.eye.t), y: C - heightAt(SWORD, SWORD.eye.t) * 0.3 };
export const EYE_R_TEX = SWORD.eye.r;
export const eyeOf = (f: Fish): Pt => texToScreen(f, EYE_TEX);

/** The opening pose: big across the frame, swimming right. */
export const HOOK = { x: 470, y: 800, len: 720 } as const;
/** In close on the head: the eye here, the head filling the frame. */
export const CLOSE_LEN = 1700;
export const CLOSE_EYE: Pt = { x: 640, y: 720 };
const CLOSE = {
  x: CLOSE_EYE.x - ((EYE_TEX.x - C) * CLOSE_LEN) / (2 * SWORD.hl),
  y: CLOSE_EYE.y - ((EYE_TEX.y - C) * CLOSE_LEN) / (2 * SWORD.hl),
};
/** The hunt: smaller and lower, under the two eye views. */
export const HUNT = { x: 400, y: 960, len: 600 } as const;
/** Drifting forward as it swims, px a second, in the opening pose. */
const DRIFT = 14;

/** The dive into the deep, from "Swordfish" until just after "freezing". */
export const DIVE = { from: SWORDFISH_AT + 0.3, to: FREEZING_AT + 0.2 } as const;
/**
 * In to the head on "So a muscle…", out again on "warmer" (running on into "Warm eyes…", which
 * follows closely in this read: ~0.9 s keeps the pull-back under 80 px a frame), and home to the
 * opening pose before "Forget…".
 */
export const ZOOM_IN = { from: SO_AT - 0.15, to: MUSCLE_AT + 0.35 } as const;
export const ZOOM_OUT = { from: WARMER_AT + 0.15, to: WARM_AT + 0.25 } as const;
export const HOME = { from: BETTER_AT + 0.1, to: FORGET_AT } as const;

const fishX = looped([
  { t: 0, at: HOOK.x, rate: DRIFT },
  { t: DIVE.from, at: HOOK.x + DRIFT * DIVE.from, rate: DRIFT },
  { t: DIVE.to, at: 525 },
  { t: ZOOM_IN.from, at: 520 },
  { t: ZOOM_IN.to, at: CLOSE.x },
  { t: ZOOM_OUT.from, at: CLOSE.x - 30 },
  { t: ZOOM_OUT.to, at: HUNT.x },
  { t: FAST_AT, at: HUNT.x + 10 },
  // A lunge after the mackerel.
  { t: PREY_AT + 0.35, at: HUNT.x + 70 },
  { t: HOME.from, at: HUNT.x + 45 },
  { t: HOME.to, at: HOOK.x - DRIFT * (LOOP_S - HOME.to), rate: DRIFT },
]);
const fishY = looped([
  { t: 0, at: HOOK.y },
  { t: DIVE.from, at: HOOK.y },
  { t: (DIVE.from + DIVE.to) / 2, at: 850 },
  { t: DIVE.to, at: 815 },
  { t: ZOOM_IN.from, at: 815 },
  { t: ZOOM_IN.to, at: CLOSE.y },
  { t: ZOOM_OUT.from, at: CLOSE.y + 12 },
  { t: ZOOM_OUT.to, at: HUNT.y },
  { t: HOME.from, at: HUNT.y },
  { t: HOME.to, at: HOOK.y },
]);
const fishLen = looped([
  { t: 0, at: HOOK.len },
  { t: ZOOM_IN.from, at: HOOK.len },
  { t: ZOOM_IN.to, at: CLOSE_LEN },
  { t: ZOOM_OUT.from, at: CLOSE_LEN },
  { t: ZOOM_OUT.to, at: HUNT.len },
  { t: HOME.from, at: HUNT.len },
  { t: HOME.to, at: HOOK.len },
]);
/** Nose down into the dive, and down a touch at the mackerel. */
const fishTilt = looped([
  { t: 0, at: 0 },
  { t: DIVE.from, at: 0 },
  { t: (DIVE.from + DIVE.to) / 2 - 0.3, at: -0.13 },
  { t: DIVE.to, at: 0 },
  { t: FAST_AT, at: 0 },
  { t: PREY_AT + 0.3, at: -0.05 },
  { t: HOME.from, at: 0 },
]);

/** How far in on the head the camera is, 0 (the opening pose or further out) .. 1 (in close). */
export const closeAt = (len: number): number => clamp01((len - HOOK.len) / (CLOSE_LEN - HOOK.len));

export function swordfishAt(t: number): Fish {
  const len = fishLen(t);
  const still = 1 - 0.8 * closeAt(len);
  const w = (2 * Math.PI * t) / LOOP_S;
  return {
    x: fishX(t),
    y: fishY(t) + 14 * still * Math.sin(3 * w),
    len,
    tilt: fishTilt(t) + 0.025 * still * Math.cos(3 * w),
    beat: 24 * w,
    effort: 0.4 + 0.3 * Math.sin(Math.PI * ramp(t, DIVE.from, DIVE.to)) + 0.45 * window01(t, FAST_AT - 0.2, PREY_AT + 0.7, 0.25),
  };
}

// ---------------------------------------------------------------- the sea

/** How deep and dark the water is, 0.15 (the opening) .. 1 (the deep), back up as it heads home. */
export const deepAt = (t: number): number => 0.15 + 0.85 * ramp(t, DIVE.from, DIVE.to - 0.2) - 0.85 * ramp(t, HOME.from - 0.2, HOME.to);
/** How far the camera has sunk, in tiles of the drifting marks: down one in the dive, back up as it heads home. */
export const sunkAt = (t: number): number => ramp(t, DIVE.from, DIVE.to) - ramp(t, HOME.from - 0.2, HOME.to);

/** The depth readout, metres: rolling down to 550 on "deep down". */
export const DEPTH_M = 550;
export const depthAt = (t: number): number => Math.round(DEPTH_M * ramp(t, DEEP_AT - 0.1, DOWN_AT + 0.6));

/** The water temperature, °C: 24 falling to 3 by "freezing"; then the eye's, 15 °C warmer by "degrees warmer". */
export const WATER_C = 3;
export const WARMER_C = 15;
export const tempAt = (t: number): number =>
  lerp(24, WATER_C, ramp(t, WATER_AT - 0.1, FREEZING_AT + 0.05)) + WARMER_C * ramp(t, FIFTEEN_AT - 0.05, WARMER_AT);

// ---------------------------------------------------------------- the heat

/** The eye's orange glow: bright in the hook, dimmed by the cold, burning again from "eyes". */
export const eyeGlowAt = (t: number): number => 1 - 0.25 * ramp(t, DIVE.from, DIVE.to) - 0.25 * ramp(t, ZOOM_IN.from, ZOOM_IN.to) + 0.5 * ramp(t, EYES_AT - 0.05, EYES_AT + 0.3);
/** The heat shimmering up off the eye: in the hook, and again once warm eyes go hunting. */
export const shimmerAt = (t: number): number => Math.max(1 - ramp(t, SWORDFISH_AT - 0.1, SWORDFISH_AT + 0.4), ramp(t, WARM_AT - 0.2, WARM_AT + 0.3));
/** The heater muscle lighting up on "muscle", and its warm waves from "heater". */
export const muscleGlowAt = (t: number): number => window01(t, MUSCLE_AT - 0.1, ZOOM_OUT.from + 0.2, 0.3);
export const wavesAt = (t: number): number => window01(t, HEATER_AT - 0.05, ZOOM_OUT.from + 0.1, 0.35);
/** The brain warming on "brain". */
export const brainGlowAt = (t: number): number => window01(t, BRAIN_AT - 0.05, ZOOM_OUT.from + 0.2, 0.3);
/** Frost creeping in from the edges on "freezing", melted by the heater. */
export const frostAt = (t: number): number => Math.min(ramp(t, FREEZING_AT - 0.05, FREEZING_AT + 0.45), 1 - ramp(t, HEATER_AT + 0.2, KEEPING_AT + 0.6));

// ---------------------------------------------------------------- the prey

/** The mackerel's dash past the swordfish, left to right, on "fast prey". */
export const DART = { from: FAST_AT - 0.2, to: PREY_AT + 0.75 } as const;
export const PREY_LEN = 190;

export interface Prey {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly tilt: number;
  readonly beat: number;
}

export function preyAt(t: number): Prey | null {
  if (t < DART.from || t >= DART.to) return null;
  const u = (t - DART.from) / (DART.to - DART.from);
  return {
    x: lerp(-240, 1320, u),
    y: 815 - 35 * Math.sin(Math.PI * u),
    len: PREY_LEN,
    tilt: 0.12 * Math.cos(Math.PI * u),
    beat: t * 45,
  };
}

/** The mackerel inside the two eye views: darting across again and again, every DART_S. */
export const INSET_DART_S = 0.85;
export const insetDartAt = (t: number): number => wrap(t - WARM_AT) % INSET_DART_S / INSET_DART_S;

/** A jolt of the picture as "×10" lands, px. */
export function shakeAt(t: number): Pt {
  const s = t - TEN_AT;
  if (s < 0 || s > 0.35) return { x: 0, y: 0 };
  const fade = (1 - s / 0.35) ** 2;
  return { x: 10 * fade * Math.sin(s * 90), y: 8 * fade * Math.cos(s * 71) };
}
