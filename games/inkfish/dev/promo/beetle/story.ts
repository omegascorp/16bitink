import type { Pt } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, lerp, ramp, window01 } from '../short';
import { BEETLE_REST, type BeetlePose } from './art/beetle';
import { FROG_REST, type FrogPose, VENT } from './art/frog';
import { TEMPO, WORDS } from './words';

/**
 * "This beetle got swallowed ALIVE… and walked out": Regimbartia attenuata,
 * a water beetle, swallowed whole by a black-spotted pond frog, crawls the
 * frog's whole gut and walks out of its vent, often within hours and once in
 * six minutes (Sugiura 2020, Current Biology: 93% of 15 beetles escaped; the
 * same with four other frog species). Told by the narrator (words.ts), every
 * beat a pure function of time over LOOP_S:
 *
 *   0     "This beetle got swallowed ALIVE!" (excited): frame 1, close on the
 *         frog's open mouth, the glossy beetle half inside on its tongue, legs
 *         flailing.
 *   2.8   "Frogs don't even chew." (comic): the mouth snaps shut, a GULP down
 *         the throat, the eyes press down into the head to push it down.
 *   4.3   "Down the throat… into the stomach… total darkness." (nervous): looking
 *         down the gullet behind the beetle; it opens into the stomach; the
 *         light shrinks to nothing.
 *   8.3   "Then its tiny legs start KICKING!" (surprised): in the dark, the
 *         beetle's legs kick, a thump each time.
 *  10.4   "It crawls through the WHOLE frog… and walks out the back door!"
 *         (dramatic, then sly): the whole frog in X-ray, the gut path lit, the
 *         beetle crawling along it; back in colour it pops out of the vent and
 *         walks off shaking itself; the frog looks back, baffled.
 *  14.1   "Nine out of ten made it out, some in just six minutes!" (excited):
 *         ten beetles, nine light up and march out; a stopwatch at 6 min.
 *  17.0   "Four other kinds of frog? Same escape." (sarcastic): four frogs,
 *         a beetle trotting out behind each.
 *  19.2   "And somewhere, right now," (sly): back to the frog, the beetle
 *         walking by; the tongue shoots out and lands on frame 1.
 */

/** The loop: 14 × 1.5 s. */
export const LOOP_S = 21;
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const AT = {
  swallowed: said('swallowed'),
  alive: said('ALIVE!'),
  frogs: said('Frogs'),
  chew: said('chew.'),
  down: said('Down'),
  throat: said('throat…'),
  into: said('into'),
  stomach: said('stomach…'),
  total: said('total'),
  darkness: said('darkness.'),
  then: said('Then'),
  tiny: said('tiny'),
  legs: said('legs'),
  start: said('start'),
  kicking: said('KICKING!'),
  it: said('It'),
  crawls: said('crawls'),
  whole: said('WHOLE'),
  frog: said('frog…'),
  and: said('and'),
  walks: said('walks'),
  back: said('back'),
  door: said('door!'),
  nine: said('Nine'),
  ten: said('ten'),
  made: said('made'),
  six: said('six'),
  minutes: said('minutes!'),
  four: said('Four'),
  kinds: said('kinds'),
  frogQ: said('frog?'),
  same: said('Same'),
  escape: said('escape.'),
  and2: said('And'),
  somewhere: said('somewhere,'),
  right: said('right'),
  now: said('now,'),
} as const;

// ---------------------------------------------------------------- the scenes

export type SceneName = 'hook' | 'gullet' | 'kick' | 'xray' | 'odds' | 'four';

export const CUTS = {
  gullet: AT.down - 0.14,
  kick: AT.then - 0.12,
  xray: AT.it - 0.1,
  odds: AT.nine - 0.12,
  four: AT.four - 0.1,
  /** Back to the frog for the lunge that lands on frame 1. */
  hook: AT.and2 - 0.14,
} as const;

export interface Scene {
  readonly name: SceneName;
  /** Seconds into the scene; the hook runs across the loop point, from before it (negative) to after. */
  readonly s: number;
}

export function sceneAt(t: number): Scene {
  const u = wrap(t);
  if (u >= CUTS.hook) return { name: 'hook', s: u - LOOP_S };
  if (u < CUTS.gullet) return { name: 'hook', s: u };
  const order: readonly Exclude<SceneName, 'hook'>[] = ['gullet', 'kick', 'xray', 'odds', 'four'];
  let name: Exclude<SceneName, 'hook'> = 'gullet';
  for (const n of order) if (u >= CUTS[n]) name = n;
  return { name, s: u - CUTS[name] };
}

/** A pulse: up fast at `at`, gone over `decay` s. */
const pulse = (t: number, at: number, rise = 0.05, decay = 0.3): number =>
  t < at - rise || t > at + decay ? 0 : t < at ? ramp(t, at - rise, at) : 1 - ramp(t, at, at + decay);

// ---------------------------------------------------------------- the hook: the frog and the beetle on its tongue

/** The frog's own frame is the world in the hook (at 0,0, life size). */
export interface Cam {
  readonly cx: number;
  readonly cy: number;
  readonly zoom: number;
}

export const HOOK_CAM: Cam = { cx: 112, cy: -62, zoom: 5 };
const WIDE_CAM: Cam = { cx: 178, cy: -30, zoom: 3.1 };

/** Hook times, in s (negative: before the loop point). */
const H = {
  start: CUTS.hook - LOOP_S,
  open: -0.66,
  shoot: -0.6,
  stick: -0.5,
  atLip: -0.04,
  snap: AT.frogs + 0.06,
  shut: AT.frogs + 0.18,
} as const;

/** Where the beetle walks along the ground before the lunge, and where the tongue meets it. */
const GROUND_WALK = { from: 318, to: 262, y: -4 } as const;
/** The tongue's tip, holding the beetle half in the mouth (frame 1), and slowly drawn in. */
const LIP0: Pt = { x: 153, y: -96 };
const LIP1: Pt = { x: 146, y: -98 };
const INSIDE: Pt = { x: 118, y: -101 };

export function gapeAt(s: number): number {
  if (s < H.open) return 0;
  if (s < H.snap) return ramp(s, H.open, H.open + 0.1) * (0.96 + 0.04 * Math.sin(s * 5.1));
  return (1 - ramp(s, H.snap, H.shut)) * (0.96 + 0.04 * Math.sin(H.snap * 5.1));
}

/** The tongue's tip in the hook (null: in the mouth). */
export function tongueAt(s: number): Pt | null {
  if (s < H.shoot || s >= H.shut) return null;
  const target = { x: GROUND_WALK.to - lungeAt(s), y: GROUND_WALK.y };
  if (s < H.stick) {
    const u = ramp(s, H.shoot, H.stick);
    return { x: lerp(INSIDE.x, target.x, u), y: lerp(INSIDE.y, target.y, u) - 30 * Math.sin(Math.PI * u) };
  }
  if (s < H.atLip) {
    const u = ramp(s, H.stick, H.atLip);
    return { x: lerp(target.x, LIP0.x, u), y: lerp(target.y, LIP0.y, u) - 16 * Math.sin(Math.PI * u) };
  }
  if (s < H.snap) {
    // The beetle tugging against it: slowly drawn in, jerking.
    const u = clamp01((s - H.atLip) / (H.snap - H.atLip));
    const env = ramp(s, H.atLip, H.atLip + 0.3) * (1 - ramp(s, H.snap - 0.12, H.snap));
    const jerk = env * (1.6 * Math.sin(s * 9.3) + 0.8 * Math.sin(s * 15.7));
    return { x: lerp(LIP0.x, LIP1.x, u * u) + jerk, y: lerp(LIP0.y, LIP1.y, u) + env * 0.8 * Math.sin(s * 11.2) };
  }
  const u = ramp(s, H.snap, H.shut - 0.04);
  return { x: lerp(LIP1.x, INSIDE.x, u), y: lerp(LIP1.y, INSIDE.y, u) };
}

/** The frog's little lunge forward as its tongue shoots out (own units). */
export const lungeAt = (s: number): number => 10 * window01(s, H.shoot - 0.04, H.atLip, 0.12);

export function hookFrogAt(s: number): FrogPose {
  // Swallowing: a lump down the throat, then the eyes press down on "chew".
  const gulp = s > H.shut ? clamp01((s - H.shut) / 0.6) : 0;
  const press = window01(s, AT.chew - 0.22, AT.chew + 0.62, 0.16);
  const look = s < H.shoot ? 1 : 0.3;
  return { ...FROG_REST, x: lungeAt(s), y: 0, k: 1, face: 1, gape: gapeAt(s), tongue: tongueAt(s), press, look, gulp: gulp > 0 && gulp < 1 ? gulp : 0 };
}

export function hookBeetleAt(s: number, t: number): BeetlePose | null {
  if (s >= H.shut) return null;
  const tip = tongueAt(s);
  if (!tip || s < H.stick) {
    // Walking along the bank toward the frog (still walking as the tongue flies at it).
    const u = clamp01((s - H.start) / (H.shoot - H.start));
    const x = lerp(GROUND_WALK.from, GROUND_WALK.to, u);
    // In the frog's own units (it lunges forward under the beetle).
    return { ...BEETLE_REST, x: x - lungeAt(s), y: GROUND_WALK.y, k: 1.25, a: Math.PI, step: (GROUND_WALK.from - x) * 0.55, tilt: 0.55, t };
  }
  const held = ramp(s, H.stick, H.atLip);
  const wild = s >= H.stick ? 1 : 0.2;
  const a = lerp(Math.PI, 2 * Math.PI - 0.38, held) + ramp(s, H.atLip, H.atLip + 0.3) * 0.22 * Math.sin(s * 6.3);
  return { ...BEETLE_REST, x: tip.x + 3, y: tip.y - 4, k: 1.25, a, flail: wild, tilt: lerp(0.55, 0.85, held), t };
}

export function hookCamAt(s: number): Cam {
  const u = ramp(s, H.shoot, H.atLip);
  const base = s >= H.atLip ? HOOK_CAM : { cx: lerp(WIDE_CAM.cx, HOOK_CAM.cx, u), cy: lerp(WIDE_CAM.cy, HOOK_CAM.cy, u), zoom: lerp(WIDE_CAM.zoom, HOOK_CAM.zoom, u) };
  // A slow drift in on the wide shot, so it isn't static.
  const drift = 0.06 * (Math.min(s, H.shoot) - H.start) * (1 - u);
  return { ...base, zoom: base.zoom + (s < H.start ? 0 : drift) };
}

/** The screen's shake, px: the snap and the gulp, and each kick in the dark. */
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  const k = 16 * pulse(u, H.shut, 0.02, 0.35) + 8 * pulse(u, AT.chew + 0.05, 0.05, 0.3) + 10 * kickAt(u);
  return { x: k * Math.sin(u * 91), y: k * Math.cos(u * 77) };
}

// ---------------------------------------------------------------- the gullet and the stomach

/** How far the light has gone: 1 lit .. 0 total darkness. */
export const lightAt = (t: number): number => 1 - ramp(wrap(t), AT.total - 0.1, AT.darkness + 0.45);
/** 0 in the throat .. 1 in the stomach. */
export const stomachAt = (t: number): number => ramp(wrap(t), AT.into - 0.15, AT.stomach + 0.15);
/** The walls streaming past as it slides (a phase that only goes up), slowing as it lands. */
export const slideAt = (t: number): number => {
  const s = wrap(t) - CUTS.gullet;
  return curveAt([{ t: 0, at: 0, rate: 1.6 }, { t: AT.into - CUTS.gullet, at: 2.1, rate: 1.4 }, { t: AT.stomach + 0.3 - CUTS.gullet, at: 2.6, rate: 0 }], s).at;
};
export const throatLabelAt = (t: number): number => window01(wrap(t), AT.throat - 0.1, AT.into - 0.05, 0.12);
export const stomachLabelAt = (t: number): number => window01(wrap(t), AT.stomach - 0.1, AT.total + 0.2, 0.12);

export function gulletBeetleAt(t: number): BeetlePose {
  const u = wrap(t);
  const land = pulse(u, AT.stomach + 0.12, 0.08, 0.35);
  const sway = 0.18 * Math.sin(u * 2.3);
  return { ...BEETLE_REST, x: 540 + 14 * Math.sin(u * 1.7), y: 820 + 26 * land, k: 9.2 - 1.4 * stomachAt(t), a: -Math.PI / 2 + sway, flail: 0.35 + 0.3 * (1 - stomachAt(t)), t: u };
}

// ---------------------------------------------------------------- kicking in the dark

export const KICKS: readonly number[] = [AT.tiny, AT.legs, AT.start, AT.kicking, AT.kicking + 0.24, AT.kicking + 0.45, AT.kicking + 0.66];

export function kickAt(t: number): number {
  const u = wrap(t);
  if (u < CUTS.kick || u >= CUTS.xray) return 0;
  return Math.max(...KICKS.map((k) => pulse(u, k, 0.04, 0.24)));
}

/** The eyes getting used to the dark: the beetle's dim rim light. */
export const glimmerAt = (t: number): number => ramp(wrap(t), CUTS.kick, CUTS.kick + 0.45);

export function kickBeetleAt(t: number): BeetlePose {
  const u = wrap(t);
  const k = kickAt(u);
  return { ...BEETLE_REST, x: 540, y: 800 - 10 * k, k: 11.5, a: -Math.PI / 2 + 0.08 * Math.sin(u * 3), flail: 0.25, kick: k, wiggle: 0.05 * k * Math.sin(u * 60), t: u };
}

// ---------------------------------------------------------------- the X-ray and the back door

export const X_CAM: Cam = { cx: 8, cy: -14, zoom: 2.35 };

/** 1 X-ray .. 0 back in colour (from "and walks out"). */
export const xrayAt = (t: number): number => {
  const u = wrap(t);
  if (u < CUTS.xray || u >= CUTS.odds) return 0;
  return 1 - ramp(u, AT.and - 0.06, AT.and + 0.3);
};

/** How far along the gut the beetle is (0 the mouth .. 1 the vent). */
export function gutAt(t: number): number {
  const u = wrap(t);
  if (u < CUTS.xray) return 0;
  if (u >= AT.door) return 1;
  return curveAt([{ t: CUTS.xray, at: 0.02, rate: 0.2 }, { t: AT.whole, at: 0.4 }, { t: AT.and, at: 0.84 }, { t: AT.back, at: 0.97 }, { t: AT.door, at: 1, rate: 0.05 }], u).at;
}

/** The whole frog lit up on "WHOLE frog". */
export const wholeAt = (t: number): number => window01(wrap(t), AT.whole - 0.05, AT.and - 0.15, 0.15);

/** After the back door: the beetle on the ground, walking off left, shaking itself. */
export function outBeetleAt(t: number): BeetlePose | null {
  const u = wrap(t);
  if (u < AT.back - 0.05 || u >= CUTS.odds) return null;
  const pop = ramp(u, AT.back - 0.05, AT.door + 0.1);
  const drop = ramp(u, AT.door + 0.05, AT.door + 0.25);
  const walk = clamp01((u - (AT.door + 0.2)) / (CUTS.odds - AT.door - 0.2));
  const x = lerp(VENT.x + 30, VENT.x - 28, pop) - 95 * walk;
  const y = lerp(VENT.y + 2, -10, drop);
  const shake = window01(u, AT.door + 0.25, AT.door + 0.6, 0.06);
  return { ...BEETLE_REST, x, y, k: 2, a: Math.PI - 0.5 * (1 - drop), step: walk * 26, tilt: 0.6, wiggle: 0.35 * shake * Math.sin(u * 48), t: u };
}

export function xFrogAt(t: number): FrogPose {
  const u = wrap(t);
  const back = ramp(u, AT.door + 0.05, AT.door + 0.25);
  return { ...FROG_REST, x: 0, y: 0, k: 1, face: 1, look: lerp(0.3, -1, back), blink: pulse(u, AT.door + 0.55, 0.06, 0.12) };
}

/** The "?" over the baffled frog. */
export const huhAt = (t: number): { readonly alpha: number; readonly scale: number } => {
  const u = wrap(t);
  const a = window01(u, AT.door + 0.12, CUTS.odds, 0.08);
  return { alpha: a, scale: 0.6 + 0.4 * ramp(u, AT.door + 0.12, AT.door + 0.3) + 0.12 * pulse(u, AT.door + 0.3, 0.02, 0.2) };
};

export function xCamAt(t: number): Cam {
  const u = wrap(t);
  const v = clamp01((u - CUTS.xray) / (CUTS.odds - CUTS.xray));
  // A slow push, drifting toward the frog's rear for the back door.
  const rear = ramp(u, AT.and, AT.door);
  return { cx: X_CAM.cx - 24 * rear, cy: X_CAM.cy, zoom: X_CAM.zoom + 0.18 * v };
}

// ---------------------------------------------------------------- nine out of ten

/** The one that stays dim (bottom row, left), so the others march past it to the right. */
export const DIM_ONE = 5;
export const oddsSlot = (i: number): Pt => ({ x: 170 + (i % 5) * 185, y: i < 5 ? 760 : 990 });

export function oddsBeetleAt(i: number, t: number): BeetlePose | null {
  const u = wrap(t);
  if (u < CUTS.odds || u >= CUTS.four) return null;
  const appear = ramp(u, CUTS.odds + i * 0.025, CUTS.odds + i * 0.025 + 0.15);
  if (appear <= 0) return null;
  const order = i < DIM_ONE ? i : i - 1;
  const lit = i === DIM_ONE ? 0 : ramp(u, AT.nine + order * 0.05, AT.nine + order * 0.05 + 0.1);
  const go = i === DIM_ONE ? 0 : Math.max(0, u - (AT.made - 0.05 + (8 - order) * 0.03));
  const at = oddsSlot(i);
  const dx = 760 * go + 560 * go * go;
  // The one that stays dim fades away as the others leave: never a lone grey beetle.
  const alpha = i === DIM_ONE ? 1 - ramp(u, AT.made + 0.3, AT.made + 0.75) : 1;
  if (alpha <= 0) return null;
  return { ...BEETLE_REST, alpha, x: at.x + dx, y: at.y, k: 3.8 * (0.7 + 0.3 * appear), a: 0, step: dx * 0.09, dim: 1 - lit, glow: 0.5 * lit * (1 - clamp01(go * 3)), t: u };
}

export const ratioAt = (t: number): number => window01(wrap(t), AT.ten - 0.05, AT.six - 0.12, 0.1);
export const watchAt = (t: number): number => {
  const u = wrap(t);
  return u >= CUTS.four ? 0 : ramp(u, AT.six - 0.1, AT.six + 0.08);
};
/** The stopwatch's hand: minutes on its dial (0 .. 6, stopping on "six"). */
export const watchMinutesAt = (t: number): number => 6 * ramp(wrap(t), AT.six - 0.1, AT.minutes + 0.1);

// ---------------------------------------------------------------- four other kinds of frog

/** The four cells: frog's place and size. */
export const FOUR_SLOTS: readonly { readonly x: number; readonly y: number; readonly k: number }[] = [
  { x: 300, y: 700, k: 1.0 },
  { x: 810, y: 700, k: 1.12 },
  { x: 300, y: 1075, k: 1.06 },
  { x: 810, y: 1075, k: 1.12 },
];

export const fourFrogAt = (i: number, t: number): number => {
  const u = wrap(t);
  if (u < CUTS.four || u >= CUTS.hook) return 0;
  return ramp(u, AT.four + i * 0.14, AT.four + i * 0.14 + 0.16);
};

/** Every frog blinks at once, deadpan, after "escape". */
export const fourBlinkAt = (t: number): number => pulse(wrap(t), AT.escape + 0.42, 0.06, 0.14);

/** The beetle behind frog i, in the frog's own units (all four in step: the same escape). */
export function fourBeetleAt(t: number): BeetlePose | null {
  const u = wrap(t);
  if (u < AT.same - 0.05 || u >= CUTS.hook) return null;
  const pop = ramp(u, AT.same - 0.05, AT.same + 0.12);
  const walk = Math.max(0, u - (AT.same + 0.12));
  const x = lerp(VENT.x + 40, VENT.x - 60, pop) - 90 * walk;
  return { ...BEETLE_REST, x, y: lerp(VENT.y + 4, -18, pop), k: 3.4, a: Math.PI, step: walk * 30, tilt: 0.7, t: u };
}

/** The beat each frame of the loop belongs to, for checking. */
export const beatAt = (t: number): SceneName => sceneAt(t).name;
