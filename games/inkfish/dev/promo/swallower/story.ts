import type { SfxId } from '../../../src/audio/recipes';
import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, lerp, ramp, window01 } from '../short';
import type { MealPose } from './swallow';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This fish swallowed a fish four times its length": the black swallower,
 * and the one found floating off Grand Cayman in 2007 with an 86 cm snake
 * mackerel coiled in its stomach. Told by a narrator (words.ts), every beat
 * timed to the words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     "This fish swallowed a fish FOUR times its length!": alone on dark
 *         water, the swallower's jaws stretched round the middle of a snake
 *         mackerel folded in half, its head end and tail end trailing out of
 *         the mouth, the fold showing through the stomach. It heaves; on
 *         "FOUR" a ding and four swallowers pop up along a mackerel at the
 *         top, one a word; the rest goes in with three heaves and a gulp,
 *         and the stomach balloons
 *   2.86  "It's a black swallower, from two kilometres down.": "black
 *         swallower"; it sinks with us, the readout ticking to 2,000 m
 *   5.61  "In two thousand seven, one floated up off the Cayman Islands…":
 *         "2007"; it rolls belly up and floats up, the water lightening, to
 *         the surface: an island with a palm, "Cayman Islands, 2007"
 *   9.06  "with an eighty-six centimetre fish coiled inside!": close on the
 *         stomach, lit through like an x-ray, the coiled mackerel in it,
 *         "86 cm"; a yellow tracer runs round the coil on "coiled"; a pop
 *         on "inside!"
 *   11.88 "Too big to digest. It never swam again.": pulled back, it floats
 *         still under the surface in soft shafts of light
 *   14.77 "Eyes bigger than its stomach?": a little ring round its eye, a
 *         huge one round its stomach
 *   16.31 "Nope. Because": the rings go, and the camera dives back down into
 *         the dark to the swallow, which is frame 1.
 *
 * World px are screen px at zoom 1. The swallower that floats up is gone
 * off the top of the screen by the time the camera reaches the deep again;
 * the one there is the same swallow a moment before frame 1 (swallow time
 * `t - LOOP_S`), so the end flows into the start.
 */
export const LOOP_S = 18;

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
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

export const SWALLOWED_AT = said('swallowed');
export const FISH2_AT = said('fish', 2);
export const FOUR_AT = said('FOUR');
export const TIMES_AT = said('times');
export const ITS_AT = said('its');
export const LENGTH_AT = said('length!');
export const BLACK_AT = said('black');
export const SWALLOWER_AT = said('swallower,');
export const FROM_AT = said('from');
export const KILOMETRES_AT = said('kilometres');
export const DOWN_AT = said('down.');
export const IN_AT = said('In');
export const TWO_AT = said('two', 2);
export const SEVEN_AT = said('seven,');
export const FLOATED_AT = said('floated');
export const UP_AT = said('up');
export const CAYMAN_AT = said('Cayman');
export const WITH_AT = said('with');
export const EIGHTY_AT = said('eighty-six');
export const COILED_AT = said('coiled');
export const INSIDE_AT = said('inside!');
export const TOO_AT = said('Too');
export const DIGEST_AT = said('digest.');
export const NEVER_AT = said('never');
export const EYES_AT = said('Eyes');
export const STOMACH_AT = said('stomach?');
export const NOPE_AT = said('Nope.');
export const BECAUSE_AT = said('Because');
/** The jaws shut on the last of it, just after "length!". */
export const GULP_AT = LENGTH_AT + 0.14;

// ---------------------------------------------------------------- the swallow (in swallow time u: t for the swallower, t - LOOP_S for the one at the end)

interface Heave {
  readonly at: number;
  readonly size: number;
  readonly dur: number;
}

/** Each heave hauls more of the mackerel in: small ones as it struggles, three big ones from "FOUR". */
export const HEAVES: readonly Heave[] = [
  { at: -1.35, size: 0.035, dur: 0.3 },
  { at: -0.6, size: 0.04, dur: 0.3 },
  { at: SWALLOWED_AT - 0.1, size: 0.04, dur: 0.3 },
  { at: FISH2_AT - 0.15, size: 0.045, dur: 0.3 },
  { at: FOUR_AT, size: 0.17, dur: 0.34 },
  { at: TIMES_AT + 0.08, size: 0.17, dur: 0.32 },
  { at: ITS_AT + 0.05, size: 0.18, dur: 0.3 },
];
const FOLD_FROM = -2;
const FOLD_START = 0.27;
const CREEP = 0.035;
/** All in, with a little to spare. */
export const FOLD_END = 1.04;

/** How far in the fold is (swallow.ts), 0 .. FOLD_END. */
export function foldAt(u: number): number {
  let f = FOLD_START + CREEP * (Math.min(Math.max(u, FOLD_FROM), GULP_AT) - FOLD_FROM);
  for (const h of HEAVES) f += h.size * ramp(u, h.at, h.at + h.dur);
  return Math.min(FOLD_END, f);
}

/** A heave's strain, 0 .. 1: a bump as each one hauls. */
export function heaveAt(u: number): number {
  return Math.max(0, ...HEAVES.map((h) => Math.sin(Math.PI * Math.min(1, Math.max(0, (u - h.at + 0.08) / (h.dur + 0.1))))));
}

/** The jaw: wide round the meal (wider still at each heave), shut on the gulp, then slack; a little agape once it's dead. */
export function jawAt(t: number, u: number): number {
  if (u < GULP_AT) return 0.97 + 0.06 * heaveAt(u);
  const shut = lerp(1, 0.08, ramp(u, GULP_AT, GULP_AT + 0.22));
  return t > IN_AT ? lerp(shut, 0.2, ramp(t, IN_AT, SEVEN_AT)) : shut;
}

/** How full the stomach is (swallow.ts sacAt): with the meal, and a wobble as the last of it lands. */
export function fillAt(u: number): number {
  const f = Math.min(1, foldAt(u));
  const s = u - GULP_AT;
  const pop = s > 0 ? 0.07 * Math.exp(-5 * s) * Math.sin(14 * s) : 0.025 * heaveAt(u);
  return f + pop;
}

export function mealAt(t: number, u: number): MealPose {
  return {
    fold: foldAt(u),
    jaw: jawAt(t, u),
    fill: fillAt(u),
    wriggle: { amount: 1 - 0.6 * ramp(u, FOUR_AT, GULP_AT), phase: 2 * Math.PI * 2.2 * u },
  };
}

// ---------------------------------------------------------------- the swallower in the world

/** Where it swallows (its body's middle, world px), how far it sinks with us, and the surface it floats up to. */
export const DEEP = { x: 330, y: 700 } as const;
const SINK = 520;
/** The sea's surface, world px. */
export const SURF = -2000;
/** Floating belly up, its stomach just under the surface. */
export const FLOAT = { x: 360, y: SURF + 400 } as const;

export interface Pose {
  /** Its body's middle, world px. */
  readonly x: number;
  readonly y: number;
  /** Nose up, radians. */
  readonly tilt: number;
  /** 0 upright .. 1 belly up. */
  readonly roll: number;
  /** Tail beat phase, and its size (local px at the tail tip). */
  readonly beat: number;
  readonly wag: number;
}

/** The swallow's pose: in the deep, lurching a little at each heave. */
function deepPose(u: number): Pose {
  const lurch = HEAVES.reduce((s, h) => s + 7 * ramp(u, h.at, h.at + h.dur), 0) - 30;
  return {
    x: DEEP.x + lurch,
    y: DEEP.y + 8 * Math.sin(1.3 * u) - 6 * heaveAt(u),
    tilt: 0.06 + 0.04 * heaveAt(u) + 0.02 * Math.sin(0.9 * u),
    roll: 0,
    beat: 2 * Math.PI * 2.6 * u,
    wag: 5 + 9 * heaveAt(u),
  };
}

/** It hangs, full, until it sinks with us on "kilometres". */
const HANG_TO = KILOMETRES_AT - 0.6;
const HUNG = deepPose(HANG_TO);
const Y_KEYS: readonly Key[] = [
  { t: HANG_TO, at: HUNG.y, rate: 0 },
  { t: DOWN_AT + 0.3, at: HUNG.y + SINK, rate: 0 },
  { t: SEVEN_AT - 0.1, at: HUNG.y + SINK, rate: 0 },
  { t: CAYMAN_AT + 0.25, at: FLOAT.y, rate: 0 },
];

/** The swallower from frame 1 on: the swallow, then hanging full, sinking, rolling over and floating up. */
export function swallowerAt(t: number): Pose {
  const u = wrap(t);
  const deep = deepPose(Math.min(u, HANG_TO));
  const roll = ramp(u, IN_AT - 0.1, SEVEN_AT + 0.15);
  const rise = ramp(u, SEVEN_AT, CAYMAN_AT + 0.25);
  // Floating at the top, it rocks on the swell.
  const swell = ramp(u, CAYMAN_AT, CAYMAN_AT + 1);
  return {
    x: lerp(deep.x, FLOAT.x, rise),
    y: (u < HANG_TO ? deep.y : curveAt(Y_KEYS, u).at) + swell * 7 * Math.sin(1.4 * u),
    tilt: lerp(deep.tilt, -0.05, roll) + 0.08 * Math.sin(Math.PI * roll) + swell * 0.025 * Math.sin(1.4 * u + 1),
    roll,
    beat: 2 * Math.PI * 2.6 * u,
    wag: (u < GULP_AT ? deep.wag : 5) * (1 - roll),
  };
}

/** The camera dives back down from here, and the swallow at the end shows from here (swallow time t - LOOP_S). */
export const DIVE_AT = NOPE_AT + 0.1;
export const DIVE_END = LOOP_S - 0.3;
export const replayAt = (t: number): Pose | null => (wrap(t) >= DIVE_AT ? deepPose(wrap(t) - LOOP_S) : null);

/** Swallow time for the swallower (t) and for the replay at the end (t - LOOP_S). */
export const swallowTime = (t: number, replay: boolean): number => (replay ? wrap(t) - LOOP_S : wrap(t));

// ---------------------------------------------------------------- the camera

/** World px shown at the screen's centre, and the zoom. */
export const CENTRE = { x: 540, y: 800 } as const;

const AT_SURFACE = { x: 445, y: SURF + 350, zoom: 0.8 } as const;
const XRAY = { x: FLOAT.x + 140, y: FLOAT.y - 130, zoom: 1.45 } as const;
/** Frame 1: close on the swallow, the snout a little right of the middle. */
const OPENING = { x: 459, y: 776, zoom: 1.32 } as const;

interface Shot {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

const SHOTS: readonly Shot[] = [
  { t: 0, ...OPENING },
  { t: FOUR_AT - 0.25, ...OPENING },
  // Back and down a little, so the size comparison fits above it.
  { t: FOUR_AT + 0.45, x: 400, y: 680, zoom: 1 },
  { t: GULP_AT + 0.6, x: 344, y: 880, zoom: 0.95 },
  { t: KILOMETRES_AT - 0.6, x: 344, y: 880, zoom: 0.95 },
  { t: DOWN_AT + 0.3, x: 344, y: 880 + SINK, zoom: 0.95 },
  { t: SEVEN_AT - 0.1, x: 400, y: DEEP.y + SINK + 40, zoom: 0.9 },
  { t: CAYMAN_AT + 0.35, ...AT_SURFACE },
  { t: WITH_AT, ...AT_SURFACE },
  { t: EIGHTY_AT + 0.35, ...XRAY },
  { t: INSIDE_AT - 0.1, ...XRAY, zoom: XRAY.zoom + 0.05 },
  { t: TOO_AT + 0.45, ...AT_SURFACE, zoom: 0.82 },
  { t: EYES_AT - 0.25, ...AT_SURFACE, zoom: 0.84 },
  { t: EYES_AT + 0.35, x: FLOAT.x + 90, y: FLOAT.y - 120, zoom: 1.05 },
  { t: DIVE_AT, x: FLOAT.x + 90, y: FLOAT.y - 120, zoom: 1.05 },
  { t: DIVE_END, ...OPENING },
  { t: LOOP_S, ...OPENING },
];

/** Every shot holds still at its key; the zoom also pulls back mid-dive. */
const keysOf = (k: 'x' | 'y' | 'zoom'): Key[] => SHOTS.map((s) => ({ t: s.t, at: s[k], rate: 0 }));
const CAM_X = keysOf('x');
const CAM_Y = keysOf('y');
const CAM_ZOOM = keysOf('zoom');
const DIVE_ZOOM = 0.72;

export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  /** How fast it is moving up or down, world px a second (streaks the snow). */
  readonly vy: number;
}

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  const y = curveAt(CAM_Y, u);
  // A kick in on "inside!".
  const kick = 0.06 * Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (u - INSIDE_AT) / 0.35))));
  const dive = Math.sin(Math.PI * Math.min(1, Math.max(0, (u - DIVE_AT) / (DIVE_END - DIVE_AT))));
  return { x: curveAt(CAM_X, u).at, y: y.at, zoom: curveAt(CAM_ZOOM, u).at + kick - (1 - DIVE_ZOOM) * dive * dive, vy: y.rate };
}

export const toScreen = (cam: Camera, p: { readonly x: number; readonly y: number }): { x: number; y: number } => ({
  x: (p.x - cam.x) * cam.zoom + CENTRE.x,
  y: (p.y - cam.y) * cam.zoom + CENTRE.y,
});

/** A jolt of the picture on the big heaves and the gulp, px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = wrap(t);
  let x = 0;
  let y = 0;
  for (const j of [{ at: FOUR_AT + 0.05, amp: 8 }, { at: TIMES_AT + 0.13, amp: 7 }, { at: ITS_AT + 0.1, amp: 7 }, { at: GULP_AT, amp: 14 }, { at: INSIDE_AT, amp: 6 }]) {
    const s = u - j.at;
    if (s < 0 || s > 0.3) continue;
    const amp = j.amp * (1 - s / 0.3) ** 2;
    x += amp * Math.sin(s * 110);
    y += amp * 0.7 * Math.cos(s * 140);
  }
  return { x, y };
}

/** How much of the surface's light reaches the camera: 0 in the deep .. 1 just under the surface. */
export const lightAt = (cam: Camera): number => ramp(-cam.y, -DEEP.y + 300, -(SURF + 650));

// ---------------------------------------------------------------- notes

/** The size comparison on "FOUR times its length": a mackerel at the top, and four swallowers under it, one a word. */
export const POPS = [FOUR_AT, TIMES_AT, ITS_AT, LENGTH_AT] as const;
export const compareAt = (t: number): number => window01(wrap(t), FOUR_AT - 0.1, BLACK_AT - 0.1, 0.25);
export const popAt = (t: number, i: number): number => {
  const s = wrap(t) - POPS[i]!;
  if (s < 0) return 0;
  return s < 0.12 ? 1.25 * (s / 0.12) : 1 + 0.25 * Math.max(0, 1 - (s - 0.12) / 0.08);
};

/** "black swallower", with a line to it. */
export const nameAt = (t: number): number => window01(wrap(t), BLACK_AT - 0.1, FROM_AT + 0.25, 0.3);

/** The depth readout, ticking to 2,000 m on "from two kilometres down" as it sinks with us. */
export const readoutAt = (t: number): number => window01(wrap(t), FROM_AT - 0.2, IN_AT + 0.1, 0.25);
export const metresAt = (t: number): number => lerp(0, 2000, ramp(wrap(t), FROM_AT, DOWN_AT + 0.25));

/** "2007" on "two thousand seven", until "Cayman Islands, 2007" takes over by the island. */
export const yearAt = (t: number): number => window01(wrap(t), TWO_AT - 0.05, CAYMAN_AT + 0.15, 0.25);
export const placeAt = (t: number): number => window01(wrap(t), CAYMAN_AT - 0.05, EIGHTY_AT - 0.1, 0.3);

/** The x-ray: the stomach lit through, from "eighty-six centimetre fish" to "Too big". */
export const xrayAt = (t: number): number => window01(wrap(t), EIGHTY_AT - 0.3, TOO_AT + 0.3, 0.4);
export const cmAt = (t: number): number => window01(wrap(t), EIGHTY_AT, TOO_AT, 0.25);
/** The tracer running round the coil on "coiled": how much is drawn, and how strongly. */
export const coilTrace = (t: number): { readonly drawn: number; readonly alpha: number } => ({
  drawn: ramp(wrap(t), COILED_AT - 0.1, INSIDE_AT + 0.15),
  alpha: window01(wrap(t), COILED_AT - 0.15, TOO_AT, 0.25),
});

/** Soft shafts of light from the surface, strongest for "Too big to digest. It never swam again." */
export const raysAt = (t: number): number => 0.35 + 0.65 * window01(wrap(t), TOO_AT - 0.2, EYES_AT, 0.6);

/** The rings on "Eyes" and "stomach?": how much is drawn, and how strongly (gone on "Nope."). */
export const eyeRing = (t: number): { readonly drawn: number; readonly alpha: number } => ({
  drawn: ramp(wrap(t), EYES_AT - 0.05, EYES_AT + 0.3),
  alpha: window01(wrap(t), EYES_AT - 0.1, NOPE_AT + 0.35, 0.2),
});
export const stomachRing = (t: number): { readonly drawn: number; readonly alpha: number } => ({
  drawn: ramp(wrap(t), STOMACH_AT - 0.05, STOMACH_AT + 0.4),
  alpha: window01(wrap(t), STOMACH_AT - 0.1, NOPE_AT + 0.35, 0.2),
});

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,:?!…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    from: g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (u >= w.start / TEMPO) word = i;
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

/** Quiet under the voice, one mood a beat: strain and gulps, a ding on "FOUR", a sink, a rise, a bright x-ray, a soft sad tone, a sly blip, the dive. */
export const SOUNDS: readonly SoundCue[] = [
  // The swallow: a slurp at each heave, the ding on "FOUR", the gulp.
  { id: 'suck', t: 0.05, pitch: 0.55, gain: 0.22, pan: 0.15 },
  { id: 'rustle', t: 0.5, pitch: 0.8, gain: 0.14, pan: 0.35 },
  { id: 'suck', t: FISH2_AT - 0.15, pitch: 0.6, gain: 0.2, pan: 0.15 },
  { id: 'free', t: FOUR_AT, pitch: 1.5, gain: 0.32, pan: 0 },
  { id: 'suck', t: FOUR_AT + 0.02, pitch: 0.7, gain: 0.26, pan: 0.15 },
  { id: 'click', t: TIMES_AT, pitch: 1.2, gain: 0.22, pan: -0.2 },
  { id: 'suck', t: TIMES_AT + 0.08, pitch: 0.75, gain: 0.24, pan: 0.15 },
  { id: 'click', t: ITS_AT, pitch: 1.35, gain: 0.22, pan: 0 },
  { id: 'suck', t: ITS_AT + 0.05, pitch: 0.8, gain: 0.24, pan: 0.15 },
  { id: 'click', t: LENGTH_AT, pitch: 1.5, gain: 0.22, pan: 0.2 },
  { id: 'eatBig', t: GULP_AT, pitch: 0.7, gain: 0.42, pan: 0.1 },
  { id: 'drop', t: GULP_AT + 0.03, pitch: 0.5, gain: 0.2, pan: 0 },
  // Its name, and the sink.
  { id: 'click', t: BLACK_AT, pitch: 0.95, gain: 0.25, pan: 0.2 },
  { id: 'dash', t: FROM_AT, pitch: 0.45, gain: 0.12, pan: 0 },
  { id: 'drop', t: DOWN_AT + 0.2, pitch: 0.55, gain: 0.14, pan: 0 },
  // Rolling over and floating up to the island.
  { id: 'rustle', t: IN_AT, pitch: 0.6, gain: 0.12, pan: -0.2 },
  { id: 'grow', t: FLOATED_AT - 0.1, pitch: 0.6, gain: 0.14, pan: 0 },
  { id: 'splash', t: CAYMAN_AT + 0.1, pitch: 0.7, gain: 0.12, pan: 0.3 },
  // The x-ray: bright and excited.
  { id: 'free', t: EIGHTY_AT, pitch: 1.2, gain: 0.24, pan: 0 },
  { id: 'rustle', t: COILED_AT, pitch: 1.1, gain: 0.12, pan: -0.2 },
  { id: 'powerup', t: INSIDE_AT, pitch: 1, gain: 0.16, pan: 0 },
  // A soft, sad tone, and nothing else.
  { id: 'lose', t: NEVER_AT, pitch: 0.8, gain: 0.1, pan: 0 },
  // The sarcastic aside: two rings, a sly blip.
  { id: 'click', t: EYES_AT, pitch: 1.6, gain: 0.22, pan: -0.1 },
  { id: 'click', t: STOMACH_AT, pitch: 0.7, gain: 0.26, pan: 0.1 },
  { id: 'spotted', t: STOMACH_AT + 0.3, pitch: 1.1, gain: 0.12, pan: 0 },
  // "Nope." and the dive back down.
  { id: 'dash', t: DIVE_AT, pitch: 0.55, gain: 0.2, pan: 0 },
  { id: 'lunge', t: BECAUSE_AT, pitch: 0.5, gain: 0.18, pan: 0 },
  { id: 'suck', t: LOOP_S - 0.75, pitch: 0.5, gain: 0.18, pan: 0.15 },
];
