import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { CLOSE, PALMS, type Camera, WIDE } from './stage';
import { TEMPO, WORDS } from './words';

/**
 * "White sand beaches are fish poop": parrotfish bite coral, grind it in
 * their throats and poop out sand. Told by a narrator (words.ts) over one
 * island, every beat timed to the words, a function of time in seconds
 * over a loop of LOOP_S.
 *
 *   0     a parrotfish swims by the beach, pooping a plume of white sand onto
 *         it; the sunbather above sits bolt upright, "!"
 *   2.4   "Parrotfish bite off chunks of coral": it dives on the coral head,
 *         crunch, crunch, two chunks bitten out
 *   4.4   "grind them up in their throats": an X-ray of its throat, coral
 *         going into the grinding teeth and sand coming out
 *   5.9   "and poop out fine white sand": the plume, piling up on the seabed
 *   7.9   "A big one…": it grows; "…hundreds of kilos a year": a counter races
 *         Jan to Dec up to 320 kg as the pile grows
 *   10.5  "One island in the Maldives…": the camera pulls back over the whole
 *         island, palms pop up, "Maldives"; "…mostly made of it": most of it
 *         is marked "fish poop"
 *   13.3  "So next time you lie on a tropical beach, remember:": back in on
 *         the beach, "you"; the fish swims back past and poops beside them,
 *         and the loop finishes the sentence.
 */
export const LOOP_S = 16.5;

/** The line boil steps at the game's 8 a second: 132 steps, 44 whole cycles a loop. */
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
const ended = (text: string, nth = 1): number => WORDS.filter((x) => x.text === text)[nth - 1]!.end / TEMPO;

export const POOP1_END = ended('poop.');
export const PARROTFISH_AT = said('Parrotfish');
export const BITE_AT = said('bite');
/** The two crunches: on "chunks" and on "coral". */
export const CRUNCHES: readonly number[] = [said('chunks') + 0.02, said('coral,') + 0.04];
export const GRIND_AT = said('grind');
export const THROATS_END = ended('throats,');
export const POOP_AT = said('poop');
export const SAND_END = ended('sand.');
export const BIG_AT = said('big');
export const HUNDREDS_AT = said('hundreds');
export const YEAR_AT = said('year.');
export const ONE_AT = said('One');
export const ISLAND_AT = said('island');
export const MALDIVES_AT = said('Maldives');
export const MOSTLY_AT = said('mostly');
export const SO_AT = said('So');
export const YOU_AT = said('you');
export const REMEMBER_AT = said('remember:');

// ---------------------------------------------------------------- the camera

const OUT = { from: ONE_AT - 0.1, to: MALDIVES_AT + 0.05 };
const IN = { from: SO_AT - 0.1, to: said('you') - 0.05 };

/** How far pulled back, 0 (the opening frame) .. 1 (the whole island). */
export const pullAt = (t: number): number => ramp(t, OUT.from, OUT.to) - ramp(t, IN.from, IN.to);

/** The camera: the view's width and centre move linearly between the two framings, which reads as one smooth pull. */
export function cameraAt(t: number): Camera {
  const u = pullAt(t);
  return { zoom: 1 / lerp(1 / CLOSE.zoom, 1 / WIDE.zoom, u), cx: lerp(CLOSE.cx, WIDE.cx, u), cy: lerp(CLOSE.cy, WIDE.cy, u) };
}

// ---------------------------------------------------------------- the parrotfish

export const FISH_LEN = 320;
/** "A big one": it grows on "big", and shrinks back while the camera is pulled back (too small to see). */
const GROWN = 1.2;
const BEATS = 22;
const BOBS = 5;

/**
 * Its path (body centre, world px). It swims slowly left past the beach,
 * dives on the coral, backs off to grind and poop over the seabed, hovers
 * over the pile, then (pulled back) swims off left, turns, and comes back to
 * the beach, turning again to swim past it pooping, as at the start.
 */
const X_KEYS: readonly Key[] = [
  { t: 0, at: 470, rate: -30 },
  { t: PARROTFISH_AT, at: 425 },
  { t: BITE_AT + 0.05, at: 390, rate: 0 },
  { t: CRUNCHES[1]! + 0.15, at: 392, rate: 0 },
  { t: GRIND_AT + 0.4, at: 408, rate: 0 },
  { t: THROATS_END, at: 412, rate: 0 },
  { t: SAND_END, at: 380, rate: 0 },
  { t: YEAR_AT + 0.3, at: 345, rate: 0 },
  { t: MALDIVES_AT + 0.4, at: 300 },
  { t: MOSTLY_AT + 0.3, at: 220, rate: 0 },
  { t: said('you'), at: 330, rate: 110 },
  { t: said('beach,'), at: 460, rate: 50 },
  { t: REMEMBER_AT, at: 480, rate: 0 },
  { t: LOOP_S, at: 470, rate: -30 },
];
const Y_KEYS: readonly Key[] = [
  { t: 0, at: 722, rate: 12 },
  { t: PARROTFISH_AT, at: 780 },
  { t: BITE_AT + 0.05, at: 942, rate: 0 },
  { t: CRUNCHES[1]! + 0.15, at: 940, rate: 0 },
  { t: GRIND_AT + 0.4, at: 915, rate: 0 },
  { t: THROATS_END, at: 908, rate: 0 },
  { t: SAND_END, at: 868, rate: 0 },
  { t: YEAR_AT + 0.3, at: 800, rate: 0 },
  { t: MALDIVES_AT + 0.4, at: 840 },
  { t: MOSTLY_AT + 0.3, at: 830, rate: 0 },
  { t: said('you'), at: 770 },
  { t: said('beach,'), at: 716 },
  { t: REMEMBER_AT, at: 708, rate: 0 },
  { t: LOOP_S, at: 722, rate: 12 },
];

/** Facing: left (-1) except from the turn out on the left (pulled back) to the turn by the beach. */
const TURNS = { out: { from: MALDIVES_AT + 0.6, to: MOSTLY_AT + 0.5 }, back: { from: said('beach,') + 0.05, to: REMEMBER_AT + 0.05 } };

/** How far into a crunch's lunge it is: forward into the coral, then back off. */
const lungeOf = (at: number, t: number): number => {
  const d = t - at;
  if (d < -0.22 || d > 0.4) return 0;
  return d < 0 ? ramp(d, -0.22, 0) : 1 - ramp(d, 0, 0.4);
};
const lungeAt = (t: number): number => CRUNCHES.reduce((sum, at) => sum + lungeOf(at, t), 0);
const LUNGE = 38;
/** The second bite goes in lower down the coral. */
const DIP = 20;

export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  /** -1 (left) .. 1 (right): passes through 0 as it turns. */
  readonly face: number;
  /** Nose up is positive. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  readonly jaw: number;
}

export function fishAt(time: number): Fish {
  const t = wrap(time);
  const x = curveAt(X_KEYS, t);
  const y = curveAt(Y_KEYS, t);
  const face = -1 + 2 * ramp(t, TURNS.out.from, TURNS.out.to) - 2 * ramp(t, TURNS.back.from, TURNS.back.to);
  const facing = face >= 0 ? 1 : -1;
  const len = FISH_LEN * lerp(1, GROWN, ramp(t, BIG_AT, BIG_AT + 0.45) - ramp(t, MALDIVES_AT + 0.4, MOSTLY_AT));
  const speed = Math.hypot(x.rate, y.rate);
  // Nose up when climbing as it swims forwards; level when backing off.
  const forwards = clamp01((x.rate * facing + 20) / 60);
  const tilt = Math.max(-0.25, Math.min(0.25, Math.atan2(-y.rate, Math.max(80, Math.abs(x.rate))) * 0.5)) * forwards;
  const jaw = CRUNCHES.reduce((open, at) => Math.max(open, ramp(t, at - 0.32, at - 0.12) * (1 - ramp(t, at - 0.02, at + 0.04))), 0);
  return {
    x: x.at + facing * LUNGE * lungeAt(t),
    y: y.at + 6 * Math.sin((2 * Math.PI * BOBS * t) / LOOP_S) + DIP * lungeOf(CRUNCHES[1]!, t),
    len,
    face,
    tilt,
    beat: (2 * Math.PI * BEATS * t) / LOOP_S,
    effort: 0.3 + 0.6 * clamp01(speed / 140) + 0.3 * lungeAt(t),
    jaw,
  };
}

/** A point on the fish, given in its own frame (facing right, x forward, y down, in body lengths). */
export function onFish(f: Fish, along: number, down: number): { readonly x: number; readonly y: number } {
  const lx = along * f.len;
  const ly = down * f.len;
  const c = Math.cos(f.tilt);
  const s = Math.sin(f.tilt);
  return { x: f.x + f.face * (lx * c + ly * s), y: f.y - lx * s + ly * c };
}
/** Its vent, and the middle of its throat (where the grinding teeth are). */
export const ventOf = (f: Fish): { readonly x: number; readonly y: number } => onFish(f, -0.1, 0.17);
export const throatOf = (f: Fish): { readonly x: number; readonly y: number } => onFish(f, 0.22, 0.06);
export const mouthAt = (f: Fish): { readonly x: number; readonly y: number } => onFish(f, 0.46, 0.01);

// ---------------------------------------------------------------- the coral

/** Where each crunch bites the coral: the mouth at that moment. */
export const BITES = CRUNCHES.map((at) => ({ at, ...mouthAt(fishAt(at)) }));
/** Each bite shows from its crunch, and heals while the camera is pulled back (too small to see). */
export const biteShown = (i: number, t: number): number => (t < BITES[i]!.at ? 0 : 1 - ramp(t, MALDIVES_AT + 0.3, MALDIVES_AT + 0.8));
/** The bitten-off chunk, 0 .. 1 from breaking off to swallowed. */
export const chunkAt = (i: number, t: number): number => (t - BITES[i]!.at) / 0.22;
/** The ink burst of each crunch, 0 .. 1 over its life. */
export const chompAt = (i: number, t: number): number => (t - BITES[i]!.at) / 0.16;

// ---------------------------------------------------------------- the throat X-ray

/** The X-ray of its throat, 0 (shut) .. 1 (open), from "grind" to the end of "throats". */
export const xrayAt = (t: number): number => window01(t, GRIND_AT - 0.05, THROATS_END + 0.15, 0.25);

// ---------------------------------------------------------------- the pile and the counter

/** The pile on the seabed: grows as it poops, most of all over "hundreds of kilos a year", then spreads flat while pulled back. */
export function pileAt(t: number): { readonly h: number; readonly w: number } {
  const grown = 30 * ramp(t, POOP_AT + 0.4, SAND_END) + 110 * ramp(t, HUNDREDS_AT - 0.3, YEAR_AT + 0.3);
  const spread = ramp(t, MALDIVES_AT + 0.3, MOSTLY_AT + 0.4);
  return { h: grown * (1 - spread), w: 95 + 40 * ramp(t, HUNDREDS_AT - 0.3, YEAR_AT + 0.3) + 120 * spread };
}

const COUNT_FROM = HUNDREDS_AT - 0.1;
const COUNT_TO = YEAR_AT + 0.15;
export const KG_A_YEAR = 320;
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** The readout: kg so far, the month, and how much it shows. */
export function counterAt(t: number): { readonly kg: number; readonly month: string; readonly alpha: number } {
  const u = clamp01((t - COUNT_FROM) / (COUNT_TO - COUNT_FROM));
  return {
    kg: Math.round(KG_A_YEAR * u),
    month: MONTHS[Math.min(11, Math.floor(u * 12))]!,
    alpha: window01(t, said('make') - 0.05, ONE_AT + 0.1, 0.2),
  };
}

// ---------------------------------------------------------------- the island

/** Each palm pops up as the narrator says "island", and goes again once off screen. */
export function palmAt(i: number, t: number): number {
  const at = ISLAND_AT + 0.05 + i * 0.16;
  const u = clamp01((t - at) / 0.4);
  // Springing up past full height and settling back.
  const pop = 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2;
  return pop * (1 - ramp(t, IN.to + 0.2, IN.to + 0.5)) * (i < PALMS.length ? 1 : 0);
}

/** "…mostly made of it": a white sweep over most of the island's sand, 0 .. 1 across (it stops short), and how much it shows. */
export const POOP_SHARE = 0.85;
export function sweepAt(t: number): { readonly across: number; readonly alpha: number } {
  return { across: POOP_SHARE * ramp(t, MOSTLY_AT - 0.05, said('it.') + 0.1), alpha: 1 - ramp(t, IN.from + 0.1, IN.from + 0.5) };
}

// ---------------------------------------------------------------- the sunbather

/** Sitting up, 0 (lying flat) .. 1 (bolt upright): on "remember:", until the fish's name. */
const SIT = { up: REMEMBER_AT + 0.4, down: PARROTFISH_AT + 0.3 };
export function sitAt(time: number): number {
  const t = wrap(time);
  if (t >= SIT.up) return ramp(t, SIT.up, SIT.up + 0.22);
  return 1 - ramp(t, SIT.down, SIT.down + 0.6);
}

const popHold = (u: number, hold: number): number => (u < 0 || u > hold ? 0 : Math.min(1.15 * ramp(u, 0, 0.12), 1 - ramp(u, hold - 0.2, hold)));
/** Their "!" as they sit up. */
export const alarmAt = (t: number): number => popHold(wrap(t - SIT.up - 0.05), wrap(SIT.down - SIT.up - 0.05));

// ---------------------------------------------------------------- labels

/** "you" over the sunbather from "you" until the fish is named; "parrotfish" over the fish until the X-ray. */
export function labelsAt(time: number): { readonly you: number; readonly parrotfish: number; readonly maldives: number; readonly poop: number } {
  const t = wrap(time);
  const you = t >= YOU_AT - 0.05 ? ramp(t, YOU_AT - 0.05, YOU_AT + 0.2) : 1 - ramp(t, PARROTFISH_AT, PARROTFISH_AT + 0.3);
  return {
    you,
    parrotfish: window01(t, PARROTFISH_AT - 0.05, GRIND_AT + 0.1, 0.2),
    maldives: window01(t, MALDIVES_AT - 0.05, IN.from + 0.4, 0.25),
    poop: window01(t, MOSTLY_AT + 0.3, IN.from + 0.4, 0.25),
  };
}

// ---------------------------------------------------------------- the poop

/** When it poops: past the beach (around the loop point), on "poop out fine white sand", and in puffs over the year. */
export const POOPING: readonly { readonly from: number; readonly to: number; readonly every: number; readonly size: number }[] = [
  { from: REMEMBER_AT + 0.1, to: LOOP_S + POOP1_END - 0.1, every: 0.09, size: 1 },
  { from: POOP_AT + 0.05, to: SAND_END, every: 0.09, size: 1 },
  { from: HUNDREDS_AT - 0.2, to: YEAR_AT + 0.4, every: 0.16, size: 0.7 },
];

/** A shake of the picture at each crunch, px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  for (const at of CRUNCHES) {
    const u = t - at;
    if (u < 0 || u > 0.25) continue;
    const fade = (1 - u / 0.25) ** 2;
    return { x: 9 * fade * Math.sin(u * 95), y: 6 * fade * Math.cos(u * 77) };
  }
  return { x: 0, y: 0 };
}

export { IN as ZOOM_IN, OUT as ZOOM_OUT };
