import { BOIL_FPS } from '../../../src/art/textures';
import type { FishShape } from '../../../src/art/fishArt';
import { NOSE } from '../chain';
import { clamp01, curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { type FrogLook, GROUND_Y, lipsOf, MOUTH_HEADING, type Pt, ROD_LEN, ROD_ROOT, mapPt, TOTAL_LEN } from './shape';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };
export type { Pt };

/**
 * "This fish eats faster than you can BLINK!": the frogfish sits still on
 * the reef, disguised as a sponge, wiggles a lure (a fake bait on a rod on
 * its head), then opens its mouth so fast the cavity grows up to 12 times in
 * volume and the prey is sucked in faster than a blink; it can swallow fish
 * almost twice its own length. Told by a narrator (words.ts), every beat
 * timed to the words and a new mood on every sentence (the water's colour,
 * the camera, the frog's face and the sounds change with it). A function of
 * time in seconds over a loop of LOOP_S.
 *
 *   0     THRILL. "This fish eats faster than you can BLINK!": close on the
 *         frogfish's head, its mouth exploded open, a little fish half sucked
 *         in with water streaming in after it, in slow motion; on "BLINK!"
 *         the screen blinks shut, and when it opens the fish is gone and the
 *         frogfish looks innocent (a little whistle)
 *   2.4   SNEAKY. "The frogfish sits still, pretending to be a sponge…": we
 *         pull back: it sits among round orange sponges, the same lumpy
 *         colour, nearly invisible; a wrasse swims by over its head and only
 *         its eye moves, following it
 *   5.6   HUSHED. "and wiggles a little fake bait on its head.": dark, close on
 *         the head; the rod rises off its snout and the bait wiggles; the
 *         wrasse stops, turns round on "fake bait" and creeps up to it
 *   8.1   SHOCK. "Then its mouth grows TWELVE times bigger… gone!": a jolt and
 *         a flash, then slow motion: the mouth and throat balloon open (biggest
 *         on "TWELVE"), water and the wrasse pour in; "gone!": the jaws snap
 *         shut and it's gone; the frogfish looks innocent again
 *  11.4   LAUGH. "It even swallows fish almost TWICE its length.": blink, and
 *         a needlefish longer than the frogfish sticks out of its stretched
 *         mouth, its belly a balloon; gulp by gulp it goes in, boing on
 *         "TWICE", a last slurp and a burp on "length."
 *  14.3   DRAMATIC. "So watch closely, because": the light closes to a
 *         spotlight on its head; the bait wiggles as a little chromis creeps
 *         up to it; a slow push in, and at 16.2 the strike, into frame 1.
 */

/** The line boil steps at the game's 8 a second: 132 steps, 44 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const EATS_AT = said('eats');
export const BLINK_AT = said('BLINK!');
export const THE_AT = said('The');
export const FROGFISH_AT = said('frogfish');
export const SITS_AT = said('sits');
export const STILL_AT = said('still,');
export const PRETENDING_AT = said('pretending');
export const SPONGE_AT = said('sponge…');
export const AND_AT = said('and');
export const WIGGLES_AT = said('wiggles');
export const FAKE_AT = said('fake');
export const BAIT_AT = said('bait');
export const HEAD_AT = said('head.');
export const THEN_AT = said('Then');
export const MOUTH_AT = said('mouth');
export const GROWS_AT = said('grows');
export const TWELVE_AT = said('TWELVE');
export const BIGGER_AT = said('bigger…');
export const GONE_AT = said('gone!');
export const IT_AT = said('It');
export const SWALLOWS_AT = said('swallows');
export const FISH2_AT = said('fish', 2);
export const ALMOST_AT = said('almost');
export const TWICE_AT = said('TWICE');
export const LENGTH_AT = said('length.');
export const SO_AT = said('So');
export const WATCH_AT = said('watch');
export const CLOSELY_AT = said('closely,');
export const BECAUSE_AT = said('because');

// ---------------------------------------------------------------- the moods

export type Mood = 'thrill' | 'sneaky' | 'hush' | 'shock' | 'laugh' | 'drama';

/** The strike at the end of the loop, into frame 1. */
export const STRIKE_AT = 16.2;

/** A new mood on every sentence, from just before its first word; the strike at the end goes back to the opening's. */
export const MOOD_KEYS: readonly (readonly [number, Mood, number])[] = [
  [0, 'thrill', 0.45],
  [THE_AT - 0.1, 'sneaky', 0.45],
  [AND_AT - 0.1, 'hush', 0.45],
  [THEN_AT - 0.03, 'shock', 0.12],
  [IT_AT - 0.2, 'laugh', 0.2],
  [SO_AT - 0.05, 'drama', 0.3],
  [STRIKE_AT - 0.02, 'thrill', 0.15],
];

/** The mood now and the one it is fading from: `u` 0 (all `from`) .. 1 (all `to`). */
export function moodAt(t: number): { readonly from: Mood; readonly to: Mood; readonly u: number } {
  const v = wrap(t);
  let i = 0;
  while (i < MOOD_KEYS.length - 1 && v >= MOOD_KEYS[i + 1]![0]) i++;
  const [at, to, fade] = MOOD_KEYS[i]!;
  // The first key continues the last one round the loop.
  if (i === 0) return { from: MOOD_KEYS[MOOD_KEYS.length - 1]![1], to, u: 1 };
  const from = MOOD_KEYS[i - 1]![1];
  return { from, to, u: ramp(v, at, at + fade) };
}

/** How much of one mood is showing, 0 .. 1. */
export function moodWeight(t: number, mood: Mood): number {
  const m = moodAt(t);
  return (m.from === mood ? 1 - m.u : 0) + (m.to === mood ? m.u : 0);
}

// ---------------------------------------------------------------- the cuts: two blinks and a spotlight

/** The screen's eyelids, 0 open .. 1 shut: the hook's blink on "BLINK!", and a blink that cuts to the long fish. */
export const BLINKS: readonly { readonly at: number; readonly shut: number; readonly open: number }[] = [
  { at: BLINK_AT - 0.02, shut: 0.1, open: 0.2 },
  { at: IT_AT - 0.3, shut: 0.09, open: 0.16 },
];
const BLINK_HOLD = 0.08;
export const blinkSwap = (i: number): number => BLINKS[i]!.at + BLINKS[i]!.shut + BLINK_HOLD / 2;

export function lidsAt(t: number): number {
  const u = wrap(t);
  let shut = 0;
  for (const b of BLINKS) {
    const closed = b.at + b.shut;
    if (u < b.at || u > closed + BLINK_HOLD + b.open) continue;
    shut = Math.max(shut, u < closed ? smooth((u - b.at) / b.shut) ** 0.7 : u < closed + BLINK_HOLD ? 1 : 1 - smooth((u - closed - BLINK_HOLD) / b.open));
  }
  return shut;
}

/** The spotlight for "So watch closely": its radius as a share of the screen's height (big: no spotlight). */
export const IRIS = { close: SO_AT - 0.05, shut: SO_AT + 0.2, hold: SO_AT + 0.3, spot: SO_AT + 0.62, open: STRIKE_AT - 0.05 } as const;
export const IRIS_SWAP = (IRIS.shut + IRIS.hold) / 2;
export function irisAt(t: number): number {
  const u = wrap(t);
  if (u < IRIS.close || u > IRIS.open) return 1.2;
  if (u < IRIS.shut) return lerp(1.2, 0, smooth((u - IRIS.close) / (IRIS.shut - IRIS.close)));
  if (u < IRIS.hold) return 0;
  if (u < IRIS.spot) return lerp(0, 0.24, smooth((u - IRIS.hold) / (IRIS.spot - IRIS.hold)));
  // Widening slowly as we push in, gone by the strike.
  return lerp(0.24, 1.2, smooth((u - IRIS.spot) / (IRIS.open - IRIS.spot)) ** 2.2);
}

// ---------------------------------------------------------------- the world

/** World px per frog px, where the frog sits, and the seabed under its hands. */
export const K = 2.1;
export const FROG_HOME: Pt = { x: 520, y: 900 };
export const GROUND = FROG_HOME.y + GROUND_Y * K;
/** The frogfish's length, nose to tail tip, world px. */
export const FROG_LEN = TOTAL_LEN * K;

export interface Frog extends Pt {
  /** Radians, positive lifts the nose (it rears up on its back arms to strike). */
  readonly tilt: number;
}

/** It rears up around its back hand. */
const PIVOT: Pt = { x: -20, y: GROUND_Y };

/** A point of the frog's drawing (fp) in the world. */
export function onFrog(f: Frog, p: Pt): Pt {
  const dx = (p.x - PIVOT.x) * K;
  const dy = (p.y - PIVOT.y) * K;
  const c = Math.cos(f.tilt);
  const s = Math.sin(f.tilt);
  const px = f.x + PIVOT.x * K;
  const py = f.y + PIVOT.y * K;
  return { x: px + dx * c + dy * s, y: py - dx * s + dy * c };
}

/** The transform for drawing it: where its fp origin is, and its rotation (canvas radians). */
export function frogFrame(f: Frog): { readonly origin: Pt; readonly rotation: number } {
  return { origin: onFrog(f, { x: 0, y: 0 }), rotation: -f.tilt };
}

// ---------------------------------------------------------------- clocks

/**
 * The hook's own clock: video time from 13 s, run on past the loop point,
 * so the end's strike and the opening's slow motion are one continuous
 * moment (the chromis creeps up from 14.4, is struck at 16.2, and is still
 * going in at the loop point; it's gone in the blink).
 */
const HOOK_FROM = 13;
export const hookTime = (t: number): number => wrap(t - HOOK_FROM);
/** Hook-clock moments: the strike, the loop point, the blink's swap. */
const H_STRIKE = STRIKE_AT - HOOK_FROM;
const H_SEAM = LOOP_S - HOOK_FROM;
const H_SWAP = H_SEAM + blinkSwap(0);
const H_APPEAR = IRIS.hold - HOOK_FROM;

/** A curve over keys given as [time, value] (eased to rest at each, unless a rate is given). */
const keys = (k: readonly (readonly [number, number, number?])[]): Key[] => k.map(([t, at, rate]) => ({ t, at, rate: rate ?? 0 }));

// ---------------------------------------------------------------- the frog

/** Strike 1 (the shock beat): the jaw pops open on "Then", grows in slow motion to "bigger…", snaps shut on "gone!". */
export const SNAP_AT = GONE_AT + 0.02;
const JAW1 = keys([[THEN_AT - 0.02, 0], [THEN_AT + 0.08, 0.32, 0.4], [BIGGER_AT + 0.15, 1, 0.05], [SNAP_AT, 1, 0], [SNAP_AT + 0.07, 0]]);
const THROAT1 = keys([[THEN_AT - 0.02, 0], [THEN_AT + 0.12, 0.3, 0.6], [TWELVE_AT + 0.12, 1, 0.3], [TWELVE_AT + 0.35, 1.18], [BIGGER_AT, 1, 0.05], [SNAP_AT, 1, 0], [SNAP_AT + 0.08, 0.45], [IT_AT - 0.3, 0.12]]);
/** The hook's strike: fast. */
const JAW2 = keys([[H_STRIKE - 0.01, 0], [H_STRIKE + 0.07, 1, 2], [H_SEAM, 1, 0]]);
const THROAT2 = keys([[H_STRIKE, 0], [H_STRIKE + 0.12, 0.95, 2], [H_SEAM, 1, 0.08], [H_SWAP - 0.02, 1.08]]);

/** The long fish's beat: how far it has gone in, gulp by gulp (share of its length past the lips). */
export const LONG_IN: readonly Key[] = keys([
  [IT_AT - 0.3, 0.12],
  [SWALLOWS_AT, 0.14],
  [SWALLOWS_AT + 0.18, 0.26],
  [FISH2_AT + 0.1, 0.28],
  [ALMOST_AT + 0.05, 0.38],
  [TWICE_AT + 0.05, 0.4],
  [TWICE_AT + 0.25, 0.52],
  [LENGTH_AT, 0.55],
  [LENGTH_AT + 0.4, 1.08],
]);
export const SLURPED_AT = LENGTH_AT + 0.4;
const inLongBeat = (u: number): boolean => u >= blinkSwap(1) && u < IRIS_SWAP;

/** How much of the long beat's belly is there, 0 .. 1 (with a boing on "TWICE"). */
export function bellyAt(t: number): number {
  const u = wrap(t);
  if (!inLongBeat(u)) return 0;
  const fill = 0.4 + 0.6 * clamp01((curveAt(LONG_IN, u).at - 0.12) / 0.96);
  const d = u - (TWICE_AT + 0.1);
  const boing = d > 0 && d < 0.8 ? 0.16 * Math.sin(d * 18) * (1 - d / 0.8) ** 2 : 0;
  return fill + boing;
}

export function frogLookAt(t: number): FrogLook {
  const u = wrap(t);
  const h = hookTime(u);
  let jaw = 0;
  let throat = 0;
  if (h >= H_STRIKE - 0.05 && h < H_SWAP) {
    jaw = curveAt(JAW2, h).at;
    throat = curveAt(THROAT2, h).at;
  } else if (h >= H_SWAP && h < H_SWAP + 1) {
    // Just after the blink: cheeks full, settling.
    throat = 0.4 * (1 - smooth((h - H_SWAP) / 0.9));
  }
  if (u >= THEN_AT - 0.05 && u < blinkSwap(1)) {
    jaw = Math.max(jaw, curveAt(JAW1, u).at);
    throat = Math.max(throat, curveAt(THROAT1, u).at);
  }
  if (inLongBeat(u)) {
    // Stretched round the long fish, then shut when it's all in.
    const left = curveAt(LONG_IN, u).at;
    jaw = left < 1 ? 0.3 + 0.04 * Math.sin(u * 9) : Math.max(0, 0.3 * (1 - (u - SLURPED_AT) / 0.08));
    throat = 0.25 * (left < 1 ? 1 : 1 - ramp(u, SLURPED_AT, SLURPED_AT + 0.5));
  }
  return { jaw: Math.max(0, jaw), throat: Math.max(0, throat), belly: bellyAt(u) };
}

/** It rears up to strike (nose up), and lunges a little forwards. */
const TILT = keys([
  [0, 0.16, 0.012], [blinkSwap(0) - 0.04, 0.17], [blinkSwap(0) + 0.01, 0.03], [THE_AT, 0],
  [THEN_AT - 0.02, 0], [THEN_AT + 0.1, 0.12, 0.3], [BIGGER_AT, 0.18], [SNAP_AT, 0.18], [SNAP_AT + 0.2, 0.06], [blinkSwap(1) - 0.02, 0.03],
  [blinkSwap(1), 0.2], [SLURPED_AT, 0.2], [SLURPED_AT + 0.4, 0.04], [IRIS_SWAP, 0.02], [STRIKE_AT - 0.01, 0], [STRIKE_AT + 0.1, 0.15, 0.4], [LOOP_S, 0.16, 0.012],
]);
const LUNGE = keys([
  [0, 10], [blinkSwap(0) - 0.04, 10], [blinkSwap(0) + 0.01, 2], [THE_AT, 0],
  [THEN_AT - 0.02, 0], [THEN_AT + 0.1, 10, 20], [SNAP_AT, 16], [IT_AT, 0],
  [STRIKE_AT - 0.01, 0], [STRIKE_AT + 0.08, 9, 30], [LOOP_S, 10, 0],
]);

export function frogAt(t: number): Frog {
  const u = wrap(t);
  return {
    x: FROG_HOME.x + curveAt(LUNGE, u).at * K,
    y: FROG_HOME.y + 1.5 * Math.sin(cycles(4, u)),
    tilt: curveAt(TILT, u).at,
  };
}

/** The middle of the mouth's opening, in the world, and the way it faces (canvas radians). */
export function mouthAt(t: number): { readonly at: Pt; readonly heading: number; readonly height: number } {
  const look = frogLookAt(t);
  const f = frogAt(t);
  const lips = lipsOf(look);
  return { at: onFrog(f, lips.mid), heading: MOUTH_HEADING - f.tilt, height: lips.height * K };
}

// ---------------------------------------------------------------- the rod and the bait

/** The rod: folded back on the snout, raised to fish (hushed beat, and the end), wiggling. */
const FOLDED = -2.05;
const RAISED = -1.22;
export const raisedAt = (t: number): number => {
  const u = wrap(t);
  const h = hookTime(u);
  const fishing = window01(u, WIGGLES_AT - 0.25, THEN_AT + 0.35, 0.3);
  // At the end it's up from "watch", and folds back slowly after the strike (on the hook's clock, across the loop point).
  const end = h < H_APPEAR ? 0 : h < H_STRIKE + 0.1 ? ramp(h, WATCH_AT - HOOK_FROM - 0.2, WATCH_AT - HOOK_FROM + 0.3) : 1 - ramp(h, H_STRIKE + 0.1, H_SWAP + 0.6);
  return Math.max(fishing, end);
};

/** How hard the bait is being wiggled, 0 .. 1. */
export const wiggleAt = (t: number): number => {
  const u = wrap(t);
  return Math.max(window01(u, WIGGLES_AT - 0.05, THEN_AT, 0.2), window01(u, WATCH_AT - 0.1, STRIKE_AT - 0.02, 0.3));
};

export interface RodNow {
  readonly angle: number;
  readonly bend: number;
  readonly wiggle: number;
}

export function rodAt(t: number): RodNow {
  const u = wrap(t);
  const w = wiggleAt(u);
  return {
    angle: lerp(FOLDED, RAISED, raisedAt(u)) + 0.2 * w * Math.sin(cycles(26, u)),
    bend: 5 + 6 * w * Math.sin(cycles(26, u) - 0.9),
    wiggle: cycles(40, u),
  };
}

/** The bait (the rod's tip) in the world. */
export function baitWorld(t: number): Pt {
  const r = rodAt(t);
  const root = mapPt(frogLookAt(t), ROD_ROOT);
  return onFrog(frogAt(t), { x: root.x + Math.cos(r.angle) * ROD_LEN, y: root.y + Math.sin(r.angle) * ROD_LEN });
}

// ---------------------------------------------------------------- the frog's face

export interface Face {
  readonly lid: number;
  readonly look: Pt;
  readonly happy: number;
  readonly pupil: number;
}

/** Looking innocent: lids half down, eyes rolled up and away. */
export const innocentAt = (t: number): number => {
  const u = wrap(t);
  return Math.max(window01(u, blinkSwap(0), THE_AT + 0.25, 0.15), window01(u, SNAP_AT + 0.25, blinkSwap(1), 0.2));
};
export const happyAt = (t: number): number => window01(wrap(t), SLURPED_AT + 0.05, IRIS_SWAP, 0.05);

export function faceAt(t: number, prey: Pt | null): Face {
  const u = wrap(t);
  const f = frogAt(u);
  const eye = onFrog(f, { x: 62, y: -60 });
  // By default it looks at the nearest prey; otherwise ahead.
  let look: Pt = { x: 0.5, y: -0.1 };
  if (prey) {
    const d = Math.hypot(prey.x - eye.x, prey.y - eye.y) || 1;
    look = { x: (prey.x - eye.x) / d, y: (prey.y - eye.y) / d };
  }
  const inn = innocentAt(u);
  // "pretending to be a sponge…": it shuts its eye, peeking.
  const peek = window01(u, SPONGE_AT - 0.1, AND_AT + 0.1, 0.15);
  const wide = Math.max(moodWeight(u, 'shock') * (u < SNAP_AT + 0.2 ? 1 : 0), window01(hookTime(u), H_STRIKE, H_SWAP, 0.05));
  const sneaky = moodWeight(u, 'hush') + moodWeight(u, 'drama');
  const bulge = inLongBeat(u) && u < SLURPED_AT ? 1 : 0;
  return {
    lid: Math.min(0.9, Math.max(0, 0.12 + 0.3 * sneaky + 0.42 * inn - 0.12 * wide - 0.12 * bulge + 0.7 * peek)),
    look: { x: lerp(look.x, -0.55, inn), y: lerp(look.y, -0.75, inn) },
    happy: happyAt(u),
    pupil: 1 - 0.35 * wide - 0.3 * bulge,
  };
}

/** Its little innocent whistle: notes rising off its head, 0 .. 1 over their life, or null. */
export function whistleAt(t: number): number | null {
  const u = wrap(t);
  // Each ends before the next cut.
  for (const [at, end] of [[blinkSwap(0) + 0.15, THE_AT + 0.4], [SNAP_AT + 0.3, blinkSwap(1) - 0.12]] as const) {
    if (u >= at && u < end) return (u - at) / (end - at);
  }
  return null;
}

// ---------------------------------------------------------------- the prey

export interface Swimmer extends Pt {
  readonly shape: FishShape;
  /** Body length, world px. */
  readonly length: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  /** Squash and stretch (stretch near 0 mid-turn). */
  readonly squash: number;
  readonly stretch: number;
  /** Drawn only in front of the mouth (going in). */
  readonly inMouth: boolean;
}

export const CHROMIS_LEN = 0.42 * FROG_LEN;
export const WRASSE_LEN = 0.44 * FROG_LEN;
/** The needlefish: "almost TWICE its length". */
export const NEEDLE_LEN = 1.85 * FROG_LEN;

/** A fish `d` of its length into the mouth, nose first, along the mouth's axis. */
function intoMouth(t: number, shape: FishShape, length: number, d: number, beat: number): Swimmer {
  const m = mouthAt(t);
  // Into the mouth is against its heading.
  const hx = -Math.cos(m.heading);
  const hy = -Math.sin(m.heading);
  const back = (NOSE - d) * length;
  const facing: 1 | -1 = hx >= 0 ? 1 : -1;
  return {
    shape, length, x: m.at.x - hx * back, y: m.at.y - hy * back, facing, tilt: Math.atan2(-hy, Math.abs(hx)), beat, effort: 1,
    squash: 0.86, stretch: 1.06, inMouth: true,
  };
}

/** A free fish whose nose is at `nose`, facing so. */
function freeFish(shape: FishShape, length: number, nose: Pt, facing: 1 | -1, tilt: number, beat: number, effort: number): Swimmer {
  return {
    shape, length, x: nose.x - facing * Math.cos(tilt) * NOSE * length, y: nose.y + Math.sin(tilt) * NOSE * length, facing, tilt, beat, effort,
    squash: 1, stretch: 1, inMouth: false,
  };
}

/** Blends a free fish into one going into the mouth (`e` 0 .. 1). */
function pulled(from: Swimmer, to: Swimmer, e: number): Swimmer {
  const turn = Math.abs(from.facing - to.facing) > 0;
  return {
    ...to,
    x: lerp(from.x, to.x, e),
    y: lerp(from.y, to.y, e),
    facing: turn && e < 0.5 ? from.facing : to.facing,
    tilt: lerp(from.tilt, to.tilt, e),
    squash: lerp(1, to.squash, e),
    stretch: lerp(1, to.stretch, e) * (turn ? Math.max(0.3, Math.abs(1 - 2 * e)) : 1),
    inMouth: e > 0.25,
  };
}

/** Where a fish waits for the bait: its nose just short of it, a little below. */
const nearBait = (t: number, gap: number): Pt => {
  const b = baitWorld(t);
  return { x: b.x + gap, y: b.y + 12 };
};

/** The wrasse: swims by over the frog's head (sneaky), stops, turns on "fake bait", creeps up to it; struck on "Then". */
const W_PASS = keys([[SITS_AT + 0.1, -280, 500], [SPONGE_AT + 0.6, 1020, 260], [AND_AT + 0.6, 1130, 30], [FAKE_AT, 1145]]);
const W_TURN = [FAKE_AT - 0.05, BAIT_AT + 0.15] as const;
const W_APPROACH = [BAIT_AT + 0.15, THEN_AT + 0.05] as const;
const W_PULL = [THEN_AT + 0.15, TWELVE_AT + 0.05] as const;
const W_IN = keys([[TWELVE_AT + 0.05, 0, 0.25], [BIGGER_AT + 0.2, 0.42, 0.35], [SNAP_AT, 0.62, 0.4], [SNAP_AT + 0.06, 1.1]]);

export function wrasseAt(t: number): Swimmer | null {
  const u = wrap(t);
  if (u < SITS_AT - 0.2 || u >= SNAP_AT + 0.06) return null;
  const beat = cycles(30, u);
  if (u < W_TURN[0]) {
    const x = curveAt(W_PASS, u).at;
    const speed = Math.abs(curveAt(W_PASS, u).rate);
    // Over its head, a gentle arc.
    return freeFish('wrasse', WRASSE_LEN, { x, y: 615 - 30 * Math.sin(Math.PI * clamp01((x + 280) / 1400)) + 6 * Math.sin(cycles(9, u)) }, 1, 0.03 * Math.sin(cycles(9, u)), beat, Math.min(1, 0.3 + speed / 600));
  }
  const wait = { x: 1145, y: 660 + 6 * Math.sin(cycles(9, u)) };
  if (u < W_TURN[1]) {
    // Turning round to look: squeezed edge-on half way, then facing the other way.
    const e = smooth((u - W_TURN[0]) / (W_TURN[1] - W_TURN[0]));
    const f = freeFish('wrasse', WRASSE_LEN, wait, e < 0.5 ? 1 : -1, 0, beat, 0.5);
    return { ...f, x: wait.x - (e < 0.5 ? 1 : -1) * NOSE * WRASSE_LEN * Math.abs(1 - 2 * e), stretch: Math.max(0.12, Math.abs(1 - 2 * e)) };
  }
  const creep = (v: number): Swimmer => {
    const e = smooth(clamp01((v - W_APPROACH[0]) / (W_APPROACH[1] - W_APPROACH[0])));
    const to = nearBait(v, 18);
    // Creeping in fits and starts.
    const halting = e + 0.03 * Math.sin(e * Math.PI * 5);
    const p = { x: lerp(wait.x - NOSE * WRASSE_LEN, to.x, halting), y: lerp(wait.y, to.y, halting) };
    return freeFish('wrasse', WRASSE_LEN, p, -1, 0.05 * Math.sin(cycles(12, v)), beat, 0.25);
  };
  if (u < W_PULL[0]) return creep(u);
  const into = intoMouth(u, 'wrasse', WRASSE_LEN, u < W_PULL[1] ? 0 : curveAt(W_IN, u).at, 2 * Math.PI * 4 * slowClock(u));
  if (u < W_PULL[1]) return pulled(creep(W_PULL[0]), into, smooth((u - W_PULL[0]) / (W_PULL[1] - W_PULL[0])) ** 1.4);
  return into;
}

/** The chromis: creeps up to the bait as the spotlight opens, struck at the end, still going in at the loop point; gone in the blink. */
const C_APPROACH = keys([[H_APPEAR, 0], [WATCH_AT - HOOK_FROM + 0.4, 0.45], [CLOSELY_AT - HOOK_FROM + 0.55, 0.6], [BECAUSE_AT - HOOK_FROM + 0.3, 0.88], [H_STRIKE, 1]]);
const C_PULL = [H_STRIKE + 0.02, H_STRIKE + 0.16] as const;
/** How far in it is: quick, then slowing to a crawl at the loop point (the slow motion of frame 1). */
export const C_IN = keys([[C_PULL[1], 0, 3.2], [H_SEAM, 0.3, 0.16], [H_SWAP, 0.55, 0.12]]);

export function chromisAt(t: number): Swimmer | null {
  const u = wrap(t);
  const h = hookTime(u);
  if (h < H_APPEAR || h >= H_SWAP) return null;
  // Its tail beats on the slow clock, slowed with the picture.
  const beat = 2 * Math.PI * 3 * slowClock(u);
  const creep = (v: number): Swimmer => {
    const e = curveAt(C_APPROACH, v).at;
    const to = nearBait(v + HOOK_FROM, 14);
    const from = { x: 1420, y: to.y - 40 };
    return freeFish('chromis', CHROMIS_LEN, { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) + 5 * Math.sin(v * 5) }, -1, 0.04 * Math.sin(v * 4), beat, 0.4);
  };
  if (h < C_PULL[0]) return creep(h);
  const into = intoMouth(u, 'chromis', CHROMIS_LEN, h < C_PULL[1] ? 0 : curveAt(C_IN, h).at, beat * 1.6);
  if (h < C_PULL[1]) return pulled(creep(C_PULL[0]), into, smooth((h - C_PULL[0]) / (C_PULL[1] - C_PULL[0])));
  return into;
}

/** The needlefish in the long beat, its tail sticking out of the mouth. */
export function needleAt(t: number): Swimmer | null {
  const u = wrap(t);
  if (!inLongBeat(u)) return null;
  const d = curveAt(LONG_IN, u).at;
  if (d >= 1.02) return null;
  return intoMouth(u, 'needlefish', NEEDLE_LEN, d, cycles(34, u));
}

/** How hard water is rushing into the mouth, 0 .. 1. */
export function suctionAt(t: number): number {
  const u = wrap(t);
  const h = hookTime(u);
  const hook = h >= H_STRIKE && h < H_SWAP ? ramp(h, H_STRIKE, H_STRIKE + 0.08) : 0;
  const shock = u >= THEN_AT && u < SNAP_AT ? ramp(u, THEN_AT, THEN_AT + 0.2) : 0;
  const slurp = window01(u, LENGTH_AT + 0.05, SLURPED_AT + 0.05, 0.08);
  return Math.max(hook, shock, slurp);
}
/**
 * A clock for the streaks and the struck fish's fins, slowed in slow motion:
 * on the hook's clock, so it runs on smoothly through the loop point (and the
 * shock beat, after the hook's slow motion, is slow too).
 */
export function slowClock(t: number): number {
  const h = hookTime(t);
  if (h < H_STRIKE) return h;
  if (h < H_SEAM) return H_STRIKE + (h - H_STRIKE) * 0.8;
  return H_STRIKE + (H_SEAM - H_STRIKE) * 0.8 + (h - H_SEAM) * 0.14;
}

// ---------------------------------------------------------------- jolts, flashes, bubbles

/** A jolt of the picture: the strikes and the snap, px. */
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  let x = 0;
  let y = 0;
  const kick = (d: number, life: number, size: number): void => {
    if (d < 0 || d > life) return;
    const fade = (1 - d / life) ** 2;
    x += size * fade * Math.sin(d * 80);
    y += size * 0.7 * fade * Math.cos(d * 63);
  };
  kick(u - THEN_AT, 0.4, 16);
  kick(u - SNAP_AT, 0.5, 22);
  kick(u - (TWICE_AT + 0.1), 0.35, 7);
  kick(u - SLURPED_AT, 0.3, 8);
  kick(u - STRIKE_AT, 0.3, 14);
  return { x, y };
}

/** A white flash on the strikes, 0 .. 1. */
export function flashAt(t: number): number {
  const u = wrap(t);
  const f = (at: number, size: number): number => {
    const d = u - at;
    return d < 0 || d > 0.25 ? 0 : size * (1 - d / 0.25) ** 2;
  };
  return Math.max(f(THEN_AT, 0.5), f(STRIKE_AT, 0.35), f(SNAP_AT, 0.25));
}

/** The comic snap of the jaws on "gone!", 0 .. 1 over its life (out of range outside it). */
export const chompAt = (t: number): number => (wrap(t) - SNAP_AT) / 0.18;

export interface Bubble extends Pt {
  readonly r: number;
  readonly alpha: number;
}

const BURP_AT = SLURPED_AT + 0.25;
/** The burp after the long fish, and a few bubbles after each gulp, rising from the mouth. */
export function bubblesAt(t: number): Bubble[] {
  const u = wrap(t);
  const out: Bubble[] = [];
  // None left over in the spotlight.
  if (u > IRIS_SWAP) return out;
  for (const [at, count, size] of [[SNAP_AT + 0.1, 5, 9], [BURP_AT, 1, 30], [BURP_AT + 0.1, 4, 10]] as const) {
    for (let k = 0; k < count; k++) {
      const v = u - at - k * 0.07;
      if (v < 0 || v > 1.4) continue;
      const m = mouthAt(at).at;
      out.push({ x: m.x + 20 * Math.sin(k * 2.3) + 10 * Math.sin(v * 6 + k), y: m.y - 30 - v * 220 * (size > 20 ? 0.6 : 1), r: size * (0.7 + 0.25 * Math.sin(k * 1.9)) * (1 + 0.3 * v), alpha: 0.85 * (1 - v / 1.4) });
    }
  }
  return out;
}

// ---------------------------------------------------------------- the camera

/** World px shown at the screen's centre, and the zoom. */
export const CENTRE = { x: 540, y: 800 } as const;

export interface Camera extends Pt {
  readonly zoom: number;
}

interface Shot {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}
const HOOK: Shot = { zoom: 1.5, x: 660, y: 835 };
const HOOK_IN: Shot = { zoom: 1.56, x: 665, y: 832 };
const AFTER: Shot = { zoom: 1.3, x: 600, y: 860 };
const WIDE: Shot = { zoom: 0.92, x: 560, y: 870 };
const WIDE_DRIFT: Shot = { zoom: 0.97, x: 575, y: 870 };
const HUSH: Shot = { zoom: 1.75, x: 845, y: 705 };
const HUSH_IN: Shot = { zoom: 1.88, x: 835, y: 705 };
const SHOCK: Shot = { zoom: 1.22, x: 665, y: 815 };
const SHOCK_IN: Shot = { zoom: 1.4, x: 680, y: 815 };
const INNOCENT: Shot = { zoom: 1.25, x: 600, y: 860 };
const LAUGH: Shot = { zoom: 0.7, x: 840, y: 700 };
const LAUGH_IN: Shot = { zoom: 0.92, x: 640, y: 800 };
const DRAMA: Shot = { zoom: 1.05, x: 690, y: 840 };

/** Cuts happen inside the blinks and the spotlight's dark: the camera holds before and jumps while the screen is shut. */
const SHOTS: readonly (readonly [number, Shot])[] = [
  [0, HOOK],
  [BLINK_AT, HOOK_IN],
  [blinkSwap(0), HOOK_IN],
  [THE_AT - 0.1, AFTER],
  [STILL_AT + 0.2, WIDE],
  [SPONGE_AT + 0.3, WIDE_DRIFT],
  [WIGGLES_AT + 0.4, HUSH],
  [THEN_AT - 0.05, HUSH_IN],
  [THEN_AT + 0.22, SHOCK],
  [BIGGER_AT + 0.3, SHOCK_IN],
  [SNAP_AT + 0.4, INNOCENT],
  [blinkSwap(1) - 0.001, INNOCENT],
  [blinkSwap(1), LAUGH],
  [LENGTH_AT + 0.2, LAUGH_IN],
  [IRIS_SWAP - 0.001, LAUGH_IN],
  [IRIS_SWAP, DRAMA],
  [LOOP_S, HOOK],
];
const keysOf = (f: (s: Shot) => number): Key[] => SHOTS.map(([t, s]) => ({ t, at: f(s), rate: 0 }));
const ZOOM_KEYS = keysOf((s) => Math.log(s.zoom));
const X_KEYS = keysOf((s) => s.x);
const Y_KEYS = keysOf((s) => s.y);

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  const jolt = shakeAt(u);
  const zoom = Math.exp(curveAt(ZOOM_KEYS, u).at);
  return { zoom, x: curveAt(X_KEYS, u).at - jolt.x / zoom, y: curveAt(Y_KEYS, u).at - jolt.y / zoom };
}

export const toScreen = (cam: Camera, p: Pt): Pt => ({ x: (p.x - cam.x) * cam.zoom + CENTRE.x, y: (p.y - cam.y) * cam.zoom + CENTRE.y });

/** The moments the picture may jump: inside a blink or the spotlight's dark. */
export function hiddenAt(t: number): boolean {
  return lidsAt(t) > 0.99 || irisAt(t) < 0.01;
}
