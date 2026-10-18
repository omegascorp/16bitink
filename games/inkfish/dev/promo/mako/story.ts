import type { SfxId } from '../../../src/audio/recipes';
import { createRng } from '../../../src/logic/rng';
import { curveAt, type Key, ramp, window01 } from '../short';
import {
  BOAT_AT, BOAT2_AT, CRASH_HOOK, CRASH_2013, CUT_AT, FASTEST_AT, HOOKED_AT, LEAP_AT, LOOP_S, NEW_AT, ONE_AT, SEA_AT, SHORTFIN_AT, SIX_AT, take, TRIP_END,
  TWENTY_AT, WATER_AT, wrap, YOUR_AT,
} from './beats';
import { boatAt, onBoat, type Pt } from './crew';
import { APEX_6M, BURST, EXIT_2013, EXIT_HOOK, FALLBACK, SHARK_LEN, type Shark, sharkAt, sharkVelocity, SIX_M_Y, SLIDE_1, SLIDE_2 } from './shark';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This shark can jump INTO your boat!": the shortfin mako, the fastest
 * shark, which can leap 6 m out of the water, and the one that landed on
 * anglers' boat off New Jersey in 2013. Told by a narrator (words.ts), every
 * beat timed to the words (beats.ts), each a function of time in seconds
 * over a loop of LOOP_S. One long take round the loop, cut once on "In":
 *
 *   0     "This shark can jump INTO your boat!": the opening frame, the mako
 *         hanging high over a little fishing boat at dusk, jaws wide, spray
 *         streaming off it; it drops, "your boat" points at the boat, and it
 *         crashes onto the bow on "boat!": spray, the boat rocks, the frame shakes
 *   2.2   "The shortfin mako is the fastest shark in the sea,": it slides off
 *         the bow, and we dive after it; "shortfin mako" rides with it as it
 *         streaks away under the sea, speed lines, and bursts on "fastest"
 *   4.6   "and it can leap up to SIX metres out of the water.": it bursts out on
 *         "leap", a chalk ruler climbing beside it to "6 m" on "SIX", and falls
 *         back on "water."
 *   7.7   cut. "In twenty thirteen, off New Jersey, anglers hooked one…": a
 *         fishing boat, two anglers, "New Jersey, 2013"; the rod bends on
 *         "hooked", the mako thrashing on the line below
 *  10.9   "and it landed right on their boat!": it leaps, "!", and lands on the
 *         bow on "boat!"; the rod snaps, the anglers scramble back to the cabin
 *  12.6   "Great fishing trip.": it flops on the foredeck, the anglers cling to
 *         the cabin, the broken rod dangling; a sad trombone
 *  13.6   "So remember:": it flips round, slides off the bow, U-turns under
 *         the splash and leaps again on "remember:", into the opening frame
 */
export { BOIL_STEPS, boilAt, LOOP_S, said, take, wrap } from './beats';

// ---------------------------------------------------------------- the camera

/** World px shown at the screen's centre, and the zoom. */
export const CENTRE = { x: 540, y: 760 } as const;

const END = CUT_AT + LOOP_S;
const FAST = FASTEST_AT + LOOP_S;

const ZOOM_KEYS: readonly Key[] = [
  { t: CUT_AT, at: 0.9, rate: 0.01 },
  { t: 10.8, at: 0.92 },
  { t: CRASH_2013, at: 0.95 },
  { t: 12.7, at: 1.1, rate: 0 },
  { t: SLIDE_1.turn, at: 1.1, rate: 0 },
  { t: 14.3, at: 0.98 },
  { t: LOOP_S, at: 1.0, rate: 0.02 },
  { t: CRASH_HOOK - 0.1, at: 1.03, rate: 0 },
  { t: CRASH_HOOK + 0.4, at: 1.02, rate: 0 },
  { t: 17.6, at: 1.0, rate: 0 },
  { t: 19.6, at: 0.95 },
  { t: BURST, at: 0.72 },
  { t: APEX_6M, at: 0.5, rate: 0 },
  { t: FALLBACK, at: 0.53 },
  { t: END, at: 0.54, rate: 0.01 },
];
const X_KEYS: readonly Key[] = [
  { t: CUT_AT, at: -120, rate: -4 },
  { t: 10.8, at: -130 },
  { t: 11.5, at: -150 },
  { t: CRASH_2013, at: -120 },
  { t: 12.7, at: -70, rate: 0 },
  { t: SLIDE_1.turn, at: -80, rate: 0 },
  { t: 14.3, at: -110, rate: 0 },
  { t: LOOP_S, at: -110, rate: 0 },
  { t: CRASH_HOOK - 0.1, at: -115, rate: 0 },
  { t: SLIDE_2.off, at: -200 },
  { t: 17.6, at: -650 },
  { t: 18.0, at: -800 },
  { t: FAST, at: -1000 },
  { t: FAST + 0.6, at: -1450 },
  { t: 19.6, at: -1830 },
  { t: BURST, at: -2030 },
  { t: APEX_6M, at: -2230 },
  { t: FALLBACK, at: -2330 },
  { t: END, at: -2380, rate: -60 },
];
const Y_KEYS: readonly Key[] = [
  { t: CUT_AT, at: -10, rate: 0 },
  { t: 10.8, at: -20, rate: 0 },
  { t: 11.5, at: -110 },
  { t: CRASH_2013, at: -100 },
  { t: 12.7, at: -150, rate: 0 },
  { t: SLIDE_1.turn, at: -150, rate: 0 },
  { t: 14.3, at: -295, rate: 0 },
  { t: LOOP_S, at: -300, rate: 0 },
  { t: CRASH_HOOK - 0.1, at: -290, rate: 0 },
  { t: SLIDE_2.off, at: -200 },
  { t: 17.6, at: 300, rate: 0 },
  { t: FAST, at: 330, rate: 0 },
  { t: 19.6, at: 300 },
  { t: BURST, at: -150 },
  { t: APEX_6M, at: -680, rate: 0 },
  { t: FALLBACK, at: -620 },
  { t: END, at: -590, rate: 50 },
];

export interface Camera {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}

export function cameraAt(t: number): Camera {
  const v = take(t);
  return { zoom: curveAt(ZOOM_KEYS, v).at, x: curveAt(X_KEYS, v).at, y: curveAt(Y_KEYS, v).at };
}

export const toScreen = (cam: Camera, p: Pt): Pt => ({ x: (p.x - cam.x) * cam.zoom + CENTRE.x, y: (p.y - cam.y) * cam.zoom + CENTRE.y });

/** The frame jolts as the mako slams onto the bow, px. */
export function shakeAt(t: number): Pt {
  for (const at of [BOAT_AT, BOAT2_AT]) {
    const u = wrap(t - at);
    if (u > 0.45) continue;
    const fade = (1 - u / 0.45) ** 2;
    return { x: 16 * fade * Math.sin(u * 90), y: 12 * fade * Math.cos(u * 73) };
  }
  return { x: 0, y: 0 };
}

// ---------------------------------------------------------------- the mako in the world

/** The mako's centre in the world, riding the boat while it lies on the deck. */
export function sharkWorld(t: number): Shark {
  const s = sharkAt(t);
  if (s.onDeck <= 0) return s;
  const b = boatAt(t);
  const p = onBoat(b, s);
  return { ...s, x: s.x + (p.x - s.x) * s.onDeck, y: s.y + (p.y - s.y) * s.onDeck, tilt: s.tilt + b.roll * s.onDeck };
}

/** A point along the mako's body, `along` -0.5 (tail) .. 0.5 (nose), world px. */
export function alongShark(s: Shark, along: number): Pt {
  return { x: s.x + s.turn * along * SHARK_LEN * Math.cos(s.tilt), y: s.y - along * SHARK_LEN * Math.sin(s.tilt) };
}

// ---------------------------------------------------------------- splashes

export interface Splash {
  /** Take time. */
  readonly at: number;
  readonly x: number;
  readonly size: number;
}

/** Where it breaks the surface, out or in. */
export const SPLASHES: readonly Splash[] = [
  { at: EXIT_2013, x: -490, size: 1 },
  { at: SLIDE_1.splash, x: -600, size: 1 },
  { at: EXIT_HOOK, x: -650, size: 1.15 },
  { at: SLIDE_2.splash, x: -600, size: 1 },
  { at: BURST, x: -2140, size: 1.5 },
  { at: FALLBACK, x: -2500, size: 1.8 },
];

/** Seconds since a splash, in take time (negative before it). */
export const sinceSplash = (t: number, sp: Splash): number => take(t) - sp.at;

/** The crashes on deck: when, take time. */
export const CRASHES = [CRASH_2013, CRASH_HOOK] as const;

// ---------------------------------------------------------------- spray off the mako

export interface Drop {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly vx: number;
  readonly vy: number;
  readonly alpha: number;
}

const GRAVITY = 1700;
const DROP_LIFE = 1.3;

interface Seed {
  /** Take time it leaves the mako. */
  readonly at: number;
  /** Where along the body, -0.5 tail .. 0.5 nose. */
  readonly along: number;
  readonly side: number;
  readonly kick: Pt;
  readonly r: number;
}

/** Water streaming off it while it flies: one drop every SPRAY_DT s from where it left the water. */
const SPRAY_DT = 0.03;
const SPRAY_WINDOWS: readonly (readonly [number, number])[] = [
  [EXIT_2013, EXIT_2013 + 0.75],
  [EXIT_HOOK, LOOP_S + 0.9],
  [BURST, APEX_6M + 0.25],
];
const SEEDS: readonly Seed[] = (() => {
  const rng = createRng(1313);
  return SPRAY_WINDOWS.flatMap(([from, to]) =>
    Array.from({ length: Math.floor((to - from) / SPRAY_DT) }, (_, i) => ({
      at: from + i * SPRAY_DT,
      along: -0.5 + rng() * 0.75,
      side: (rng() - 0.5) * 0.16,
      kick: { x: (rng() - 0.5) * 260, y: (rng() - 0.6) * 260 },
      // Heavier right after it leaves the water, a fine trail later.
      r: (2.5 + rng() * 5) * (i * SPRAY_DT < 0.35 ? 1.4 : 0.85),
    })),
  );
})();

export function sprayAt(t: number): Drop[] {
  const v = take(t);
  const out: Drop[] = [];
  for (const s of SEEDS) {
    const age = v - s.at;
    if (age < 0 || age > DROP_LIFE) continue;
    const shark = sharkWorld(s.at);
    const from = alongShark(shark, s.along);
    const vel = sharkVelocity(s.at);
    const vx = vel.x * 0.35 + s.kick.x;
    const vy0 = vel.y * 0.35 + s.kick.y;
    const y = from.y + s.side * SHARK_LEN + vy0 * age + 0.5 * GRAVITY * age * age;
    if (y > 0) continue;
    out.push({ x: from.x + vx * age, y, r: s.r, vx, vy: vy0 + GRAVITY * age, alpha: 1 - ramp(age, DROP_LIFE * 0.6, DROP_LIFE) });
  }
  return out;
}

/** Water flung up off the deck as it lands: `since` s after a crash, 0 .. 1 over its life (or null). */
export function deckSplashAt(t: number): { readonly since: number; readonly at: Pt } | null {
  const v = take(t);
  for (const c of CRASHES) {
    const since = v - c;
    if (since >= 0 && since < 1.1) {
      const s = sharkWorld(c);
      return { since, at: { x: s.x, y: s.y + 40 } };
    }
  }
  return null;
}

// ---------------------------------------------------------------- under the sea

/** How fast it streaks along (0 .. 1), for speed lines: flat out under the sea, a burst on "fastest". */
export function streakAt(t: number): number {
  const v = take(t);
  return window01(v, SLIDE_2.splash + 0.3, 19.75, 0.35) * (0.6 + 0.4 * window01(v, FAST - 0.05, FAST + 0.8, 0.2));
}

/** Bubbles rising where it went in, `since` s after. */
export const BUBBLE_SPLASHES = SPLASHES.filter((s) => s.at === SLIDE_1.splash || s.at === SLIDE_2.splash || s.at === FALLBACK);

// ---------------------------------------------------------------- notes

/** "your boat", pointing at the boat, from "your" until it slides off the bow. */
const YOUR_BOAT_GONE = 2.05;
export const yourBoatLabel = (t: number): number => window01(wrap(t), YOUR_AT - 0.05, YOUR_BOAT_GONE, 0.2);

/** "shortfin mako" rides with it under the sea, from "shortfin". */
export const makoLabel = (t: number): number => window01(wrap(t), SHORTFIN_AT - 0.05, SEA_AT + 0.3, 0.2);

/** The chalk ruler beside the 6 m leap: shown from the burst, drawn up to the mako's height, "6 m" on "SIX". */
export const RULER_X = -1940;
export function rulerAt(t: number): { readonly shown: number; readonly top: number; readonly label: number } {
  const v = take(t);
  const shown = window01(v, BURST - 0.1, END - 0.15, 0.2);
  const rise = ramp(v, BURST, SIX_AT + LOOP_S);
  return { shown, top: SIX_M_Y * rise, label: window01(v, SIX_AT + LOOP_S - 0.05, END - 0.15, 0.15) };
}

/** "2013" on "twenty", then "New Jersey, 2013" on "New"; gone as it leaps. */
export function placeLabel(t: number): { readonly text: string; readonly shown: number; readonly pop: number } | null {
  const u = wrap(t);
  if (u < TWENTY_AT - 0.05 || u > EXIT_2013) return null;
  const shown = window01(u, TWENTY_AT - 0.05, EXIT_2013, 0.2);
  const named = u >= NEW_AT - 0.05;
  const since = named ? u - (NEW_AT - 0.05) : u - (TWENTY_AT - 0.05);
  return { text: named ? 'New Jersey, 2013' : '2013', shown, pop: 1 + 0.18 * Math.exp(-since * 9) * Math.sin(Math.min(Math.PI, since * 14)) };
}

/** The line goes taut on "hooked": a chalk flash on the rod tip. */
export const hookFlash = (t: number): number => {
  const s = wrap(t) - HOOKED_AT;
  return s < 0 || s > 0.4 ? 0 : 1 - s / 0.4;
};

/** The thrash on "one…": nervous little marks round the mako. */
export const thrashMarks = (t: number): number => window01(wrap(t), ONE_AT - 0.1, 10.85, 0.15);

/** Comic motion marks round its tail as it flops on the deck ("Great fishing trip."). */
export const flopMarks = (t: number): number => window01(wrap(t), CRASH_2013 + 0.15, TRIP_END + 0.05, 0.15);

/** The 6 m leap's height, for tests. */
export { SIX_M_Y, APEX_6M, BURST, FALLBACK, EXIT_HOOK, EXIT_2013 };
export const LEAP_TIME = LEAP_AT;
export const WATER_TIME = WATER_AT;

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

const loopT = (v: number): number => wrap(v);

/** Quiet under the voice; whooshes and splashes for the leaps, a crash for each landing, a sad trombone for the joke. */
export const SOUNDS: readonly SoundCue[] = [
  // The opening drop and crash.
  { id: 'dash', t: 0.8, pitch: 0.6, gain: 0.14, pan: -0.2 },
  { id: 'smash', t: BOAT_AT, pitch: 0.8, gain: 0.32, pan: -0.1 },
  { id: 'boom', t: BOAT_AT, pitch: 0.9, gain: 0.22, pan: -0.1 },
  { id: 'splash', t: BOAT_AT + 0.02, pitch: 0.8, gain: 0.18, pan: -0.2 },
  { id: 'clang', t: BOAT_AT + 0.05, pitch: 0.7, gain: 0.08, pan: 0.1 },
  // Off the bow and away, flat out.
  { id: 'splash', t: loopT(SLIDE_2.splash), pitch: 0.75, gain: 0.2, pan: -0.3 },
  { id: 'dash', t: loopT(SLIDE_2.splash) + 0.35, pitch: 0.7, gain: 0.14, pan: -0.2 },
  { id: 'lunge', t: FASTEST_AT - 0.02, pitch: 0.8, gain: 0.2, pan: -0.2 },
  { id: 'dash', t: FASTEST_AT, pitch: 0.9, gain: 0.2, pan: -0.3 },
  // The 6 m leap.
  { id: 'lunge', t: LEAP_AT - 0.1, pitch: 0.7, gain: 0.2, pan: 0 },
  { id: 'splash', t: LEAP_AT, pitch: 0.65, gain: 0.26, pan: 0 },
  { id: 'click', t: SIX_AT, pitch: 1, gain: 0.3, pan: 0.2 },
  { id: 'spotted', t: SIX_AT + 0.02, pitch: 1.2, gain: 0.08, pan: 0.2 },
  { id: 'splash', t: loopT(FALLBACK), pitch: 0.55, gain: 0.3, pan: -0.1 },
  { id: 'boom', t: loopT(FALLBACK), pitch: 1.3, gain: 0.1, pan: -0.1 },
  // 2013: the labels, the strike, the thrash.
  { id: 'click', t: TWENTY_AT, pitch: 0.9, gain: 0.25, pan: 0 },
  { id: 'click', t: NEW_AT, pitch: 1.1, gain: 0.25, pan: 0 },
  { id: 'hooked', t: HOOKED_AT, pitch: 1, gain: 0.3, pan: 0.2 },
  { id: 'rustle', t: ONE_AT, pitch: 0.7, gain: 0.14, pan: -0.2 },
  // It leaps and lands on their boat.
  { id: 'splash', t: EXIT_2013, pitch: 0.75, gain: 0.24, pan: -0.3 },
  { id: 'lunge', t: EXIT_2013 - 0.05, pitch: 0.8, gain: 0.2, pan: -0.3 },
  { id: 'spotted', t: EXIT_2013 + 0.06, pitch: 1, gain: 0.1, pan: 0.3 },
  { id: 'smash', t: BOAT2_AT, pitch: 0.8, gain: 0.32, pan: -0.1 },
  { id: 'boom', t: BOAT2_AT, pitch: 0.9, gain: 0.22, pan: -0.1 },
  { id: 'clang', t: BOAT2_AT + 0.05, pitch: 0.7, gain: 0.08, pan: 0.2 },
  // "Great fishing trip.": wet flops on the deck, a boing, and a sad trombone.
  ...[0, 1, 2].flatMap((k): SoundCue[] => [
    { id: 'lash', t: CRASH_2013 + 0.38 + k * 0.4, pitch: 1.3, gain: 0.1, pan: -0.2 },
    { id: 'free', t: CRASH_2013 + 0.2 + k * 0.4, pitch: 0.55 + 0.08 * k, gain: 0.07, pan: -0.2 },
  ]),
  { id: 'lose', t: TRIP_END - 0.02, pitch: 0.9, gain: 0.12, pan: 0 },
  // "So remember:" off the bow and out again.
  { id: 'splash', t: SLIDE_1.splash, pitch: 0.8, gain: 0.2, pan: -0.3 },
  { id: 'splash', t: EXIT_HOOK, pitch: 0.7, gain: 0.22, pan: -0.3 },
  { id: 'dash', t: EXIT_HOOK + 0.02, pitch: 0.6, gain: 0.16, pan: -0.2 },
  { id: 'spotted', t: EXIT_HOOK + 0.13, pitch: 1.1, gain: 0.08, pan: 0.3 },
];
