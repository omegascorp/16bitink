import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This turtle's mouth is a NIGHTMARE": the leatherback's mouth and throat
 * are lined with backward-pointing spines (papillae) that point towards the
 * stomach, so slippery jellyfish can't get back out while it squeezes the
 * seawater out. Told by a narrator (words.ts), every beat timed to the words,
 * a function of time in seconds over a loop of LOOP_S. One mood a sentence;
 * the colour, the camera and the turtle change with it:
 *
 *   0     "This turtle's mouth is a NIGHTMARE." (nervous): head-on into the
 *         leatherback's wide-open mouth, a tunnel of pale spines receding
 *         into the dark; dark water, a slow push in
 *   2.60  "Its throat is lined with spikes…" (curious): the camera slips past
 *         the beak and travels down the spiny throat
 *   4.45  "and they ALL point down!" (dramatic): the throat cut open, spines
 *         on both walls; they flare in sequence on "ALL", every one angled
 *         down, and a bold arrow sweeps down on "down!"
 *   6.52  "Once a jellyfish goes in, it's not coming out." (chuckles): a
 *         jellyfish slides in, tries to wriggle back up twice, the spines
 *         stop it, and it gives up and slides down
 *   9.34  "It's the biggest turtle alive, up to a thousand pounds…"
 *         (surprised): the cutaway shrinks into its neck as we pull out to the
 *         whole turtle beside a diver; "up to 1,000 lb (450 kg)"
 *  12.59  "and it eats around two hundred sixty jellyfish a DAY!" (excited):
 *         jellyfish vanish into its mouth one after another, a counter races
 *         to "≈ 260 / day"
 *  15.91  "Cute shell, though." (softly): gliding through sunlit water, the
 *         ridged shell glowing
 *  17.06  "But" (mischievous): it turns to camera and opens its mouth, and
 *         we push in to frame 1.
 */

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(wrap(t) * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}
/** When a word of the voiceover ends. */
export function ends(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const NIGHTMARE_AT = said('NIGHTMARE.');
export const ITS_AT = said('Its');
export const THROAT_AT = said('throat');
export const SPIKES_AT = said('spikes…');
export const AND_AT = said('and');
export const ALL_AT = said('ALL');
export const POINT_AT = said('point');
export const DOWN_AT = said('down!');
export const ONCE_AT = said('Once');
export const JELLYFISH_AT = said('jellyfish');
export const IN_AT = said('in,');
export const ITS_NOT_AT = said("it's");
export const NOT_AT = said('not');
export const OUT_AT = said('out.');
export const BIGGEST_AT = said('biggest');
export const TURTLE_AT = said('turtle');
export const UP_AT = said('up');
export const THOUSAND_AT = said('thousand');
export const POUNDS_AT = said('pounds…');
export const AND2_AT = said('and', 2);
export const EATS_AT = said('eats');
export const TWO_AT = said('two');
export const SIXTY_AT = said('sixty');
export const JELLYFISH2_AT = said('jellyfish', 2);
export const DAY_AT = said('DAY!');
export const CUTE_AT = said('Cute');
export const SHELL_AT = said('shell,');
export const THOUGH_END = ends('though.');
export const BUT_AT = said('But');

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

export interface Pt {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------- which scene

/** Head-on into the mouth until the throat is cut open; head-on again from the turn at the end. */
export const SECTION_IN = { from: AND_AT - 0.1, to: AND_AT + 0.06 } as const;
/** The cutaway shrinks into the turtle's neck as the camera pulls out. */
export const PULL = { from: OUT_AT + 0.25, to: BIGGEST_AT + 0.05 } as const;
/** The turn to camera on "But": the side view narrows away, the front view widens in. */
export const TURN = { from: BUT_AT - 0.09, mid: BUT_AT + 0.1, to: BUT_AT + 0.28 } as const;

export type SceneId = 'front' | 'section' | 'side';

/** How much of each scene shows at video time t (they overlap only during the cuts). */
export function sceneAt(t: number): { readonly front: number; readonly section: number; readonly side: number } {
  const u = wrap(t);
  const frontA = 1 - ramp(u, SECTION_IN.from, SECTION_IN.to);
  const frontB = u >= TURN.mid ? 1 : 0;
  const section = u < SECTION_IN.from || u > PULL.to + 0.2 ? 0 : Math.min(ramp(u, SECTION_IN.from, SECTION_IN.to), 1 - ramp(u, PULL.from + 0.15, PULL.to));
  const side = u >= PULL.from - 0.01 && u < TURN.mid ? 1 : 0;
  return { front: Math.max(frontA, frontB), section, side };
}

// ---------------------------------------------------------------- head-on: the mouth and the throat

/**
 * The camera on the throat's axis, in throat depth units (the beak's lips at
 * 0, deeper positive; one unit is the mouth's radius-ish). Outside the mouth
 * it's negative: at -2.5 the head fills most of the frame (frame 1). It creeps in
 * through the hook, slips past the beak and down the throat on "Its throat…",
 * and on "But" pushes in from the whole turtle to frame 1.
 */
export const FOCAL = 2;
const CAM_IN: readonly Key[] = [
  { t: 0, at: -2.5, rate: 0.07 },
  { t: ITS_AT, at: -2.31, rate: 0.14 },
  { t: SPIKES_AT, at: -0.55, rate: 1.0 },
  { t: SECTION_IN.to, at: 0.9, rate: 1.8 },
];
const CAM_END: readonly Key[] = [
  { t: TURN.mid, at: -6.4, rate: 3 },
  { t: BUT_AT + 0.5, at: -2.76, rate: 0.8 },
  // The last fifth of a second creeps in at frame 1's pace, so the push flows straight on into the loop.
  { t: LOOP_S - 0.2, at: -2.5 - 0.07 * 0.2, rate: 0.07 },
  { t: LOOP_S, at: -2.5, rate: 0.07 },
];
export function camDepthAt(t: number): number {
  const u = wrap(t);
  return u < 10 ? curveAt(CAM_IN, u).at : curveAt(CAM_END, u).at;
}

/** The jaws: wide open the whole way head-on; shut as it turns on "But", opening as the camera pushes in. */
export function gapeAt(t: number): number {
  const u = wrap(t);
  if (u < 10) return 1 - 0.03 * Math.sin(cycles(4, u)) ** 2;
  return 0.12 + 0.88 * ramp(u, TURN.to - 0.05, BUT_AT + 0.6) - 0.03 * Math.sin(cycles(4, u)) ** 2;
}

/** The front view's screen point for the face's origin (the middle of the open mouth). */
export const FACE_AT: Pt = { x: 540, y: 700 };

/** The throat's spines glinting as they're named ("spikes…"), 0 .. 1. */
export const spikeGlintAt = (t: number): number => window01(wrap(t), SPIKES_AT - 0.05, SECTION_IN.to, 0.2);

/** The front view's horizontal squeeze as it turns in on "But" (1 = facing us). */
export const frontTurnAt = (t: number): number => {
  const u = wrap(t);
  return u < 10 ? 1 : ramp(u, TURN.mid, TURN.to);
};

// ---------------------------------------------------------------- the cutaway

/** The cutaway's camera: how far down the throat it has scrolled (px): drifting down, rushing on "down!", settling for the jellyfish. */
const SCROLL: readonly Key[] = [
  { t: SECTION_IN.from, at: 0, rate: 160 },
  { t: DOWN_AT - 0.05, at: 160, rate: 140 },
  { t: DOWN_AT + 0.35, at: 560, rate: 500 },
  { t: ONCE_AT, at: 760, rate: 0 },
  { t: LOOP_S, at: 760, rate: 0 },
];
export const sectionScrollAt = (t: number): number => curveAt(SCROLL, wrap(t)).at;

/** The spines flaring in a wave down the throat from "ALL" (screen y): 0 .. 1 for a spine whose base is at screen y. */
export function flareAt(t: number, y: number): number {
  const u = wrap(t);
  const front = ALL_AT - 0.05 + (y + 100) / 2400;
  return Math.max(0, Math.sin(Math.PI * clamp01((u - front) / 0.45)));
}
/** The flare's front reaching down the screen: for the stings. */
export const FLARE_STINGS: readonly number[] = [0, 1, 2, 3].map((i) => ALL_AT - 0.05 + (i * 520 + 100) / 2400 + 0.12);

/** The bold arrow down the middle of the throat on "down!", 0 .. 1 drawn, and fading. */
export const sweepAt = (t: number): number => ramp(wrap(t), DOWN_AT - 0.04, DOWN_AT + 0.3);
export const sweepFadeAt = (t: number): number => 1 - ramp(wrap(t), DOWN_AT + 0.6, ONCE_AT + 0.1);

export type JellyFace = 'calm' | 'look' | 'push' | 'squish' | 'worried' | 'droop';
export interface JellyPose {
  /** Screen centre of the bell's rim, size scale. */
  readonly x: number;
  readonly y: number;
  /** Bell squash: >1 wide and flat, <1 narrow and tall. */
  readonly squash: number;
  /** The bell's pulse, 0 .. 1. */
  readonly pulse: number;
  readonly tilt: number;
  readonly face: JellyFace;
  /** Tentacles trailing up (sliding down) -1 .. 1 trailing down (rising). */
  readonly trail: number;
}

/** The two tries to wriggle back up: when it starts pushing, and when it hits the spines. */
export const TRIES = [
  { push: IN_AT + 0.16, hit: IN_AT + 0.36 },
  { push: NOT_AT - 0.12, hit: NOT_AT + 0.1 },
] as const;
/** Where it sits in the throat (screen y of its rim), where it's stopped going up. */
const JELLY_SIT = 900;
const JELLY_STOP = 780;

/** The jellyfish in the cutaway, or null when it's not in the throat. */
export function jellyAt(t: number): JellyPose | null {
  const u = wrap(t);
  if (u < ONCE_AT - 0.1 || u > PULL.to + 0.3) return null;
  const keys: readonly Key[] = [
    { t: ONCE_AT - 0.1, at: -260, rate: 900 },
    { t: IN_AT, at: JELLY_SIT - 20, rate: 180 },
    { t: TRIES[0].push, at: JELLY_SIT, rate: 0 },
    { t: TRIES[0].hit, at: JELLY_STOP, rate: 0 },
    { t: TRIES[0].hit + 0.16, at: JELLY_SIT - 30, rate: 200 },
    { t: TRIES[1].push, at: JELLY_SIT, rate: 0 },
    { t: TRIES[1].hit, at: JELLY_STOP, rate: 0 },
    { t: TRIES[1].hit + 0.16, at: JELLY_SIT - 20, rate: 220 },
    { t: OUT_AT + 0.05, at: JELLY_SIT, rate: 0 },
    { t: OUT_AT + 0.7, at: 2300, rate: 3200 },
  ];
  const y = curveAt(keys, u).at;
  const rate = curveAt(keys, u).rate;
  const hit = Math.max(...TRIES.map((h) => (u >= h.hit && u < h.hit + 0.3 ? (1 - (u - h.hit) / 0.3) ** 2 : 0)));
  let face: JellyFace = 'calm';
  if (u >= IN_AT - 0.1) face = 'look';
  if (TRIES.some((h) => u >= h.push && u < h.hit)) face = 'push';
  if (TRIES.some((h) => u >= h.hit && u < h.hit + 0.28)) face = 'squish';
  if (u >= TRIES[0].hit + 0.28 && u < TRIES[1].push) face = 'worried';
  if (u >= TRIES[1].hit + 0.28) face = 'worried';
  if (u >= OUT_AT - 0.08) face = 'droop';
  const wriggle = TRIES.some((h) => u >= h.push - 0.05 && u < h.hit) ? 0.09 * Math.sin(u * 40) : 0;
  return {
    x: 540 + 10 * Math.sin(u * 3.1),
    y,
    squash: 1 + 0.32 * hit - (rate > 400 ? 0.12 : 0) + (face === 'droop' ? 0.08 : 0),
    pulse: 0.5 + 0.5 * Math.sin(u * (face === 'push' ? 22 : 7)),
    tilt: wriggle + 0.04 * Math.sin(u * 2.3),
    face,
    trail: clamp01(-rate / 700) - clamp01(rate / 700),
  };
}

/** The "!" over the jellyfish as it hits the spines, and the sweat drop as it gives up: 0 .. 1. */
export const jellyAlarmAt = (t: number): number => {
  const u = wrap(t);
  return Math.max(...TRIES.map((h) => window01(u, h.hit - 0.02, h.hit + 0.42, 0.06)));
};
/** The "!" over the jellyfish: how far above its rim, and its full size (px). */
export const ALARM = { dx: 150, above: 230, size: 150, pop: 1.1 } as const;
export const jellySweatAt = (t: number): number => window01(wrap(t), OUT_AT - 0.15, OUT_AT + 0.6, 0.1);

// ---------------------------------------------------------------- the side view

export interface TurtlePose {
  /** Screen position of the body's middle, its scale (1: 720 px nose to tail), and its pitch (radians, nose down positive). */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly tilt: number;
  /** The front flippers' stroke phase, radians, and how deep the stroke is. */
  readonly stroke: number;
  readonly sweep: number;
  /** Mouth 0 shut .. 1 open; its eye. */
  readonly mouth: number;
  readonly eye: 'open' | 'wide' | 'happy';
  /** The side view's horizontal squeeze while it turns to camera (1: side on). */
  readonly turn: number;
}

/** Where the side-view turtle sits and how big, by beat. */
const SIDE: readonly { readonly t: number; readonly x: number; readonly y: number; readonly scale: number }[] = [
  { t: PULL.from, x: 520, y: 700, scale: 0.86 },
  { t: AND2_AT - 0.05, x: 560, y: 650, scale: 0.86 },
  { t: AND2_AT + 0.45, x: 430, y: 760, scale: 1.0 },
  { t: DAY_AT + 0.4, x: 450, y: 760, scale: 1.0 },
  { t: CUTE_AT - 0.1, x: 540, y: 760, scale: 1.12 },
  { t: BUT_AT, x: 560, y: 740, scale: 1.18 },
  { t: TURN.mid, x: 540, y: 740, scale: 1.18 },
];
const SIDE_X = SIDE.map((k) => ({ t: k.t, at: k.x, rate: 0 }));
const SIDE_Y = SIDE.map((k) => ({ t: k.t, at: k.y, rate: 0 }));
const SIDE_S = SIDE.map((k) => ({ t: k.t, at: Math.log(k.scale), rate: 0 }));

/** The pull-out camera on the side view: zoomed in on the turtle's throat, out to the whole turtle. */
export function sideZoomAt(t: number): number {
  const u = wrap(t);
  return Math.exp(lerp(Math.log(5.5), 0, ramp(u, PULL.from, PULL.to + 0.35)));
}

/** The jellyfish it eats on "two hundred sixty jellyfish a DAY!": when each one reaches its mouth. */
export const GULPS: readonly number[] = (() => {
  const first = EATS_AT + 0.05;
  const last = DAY_AT + 0.18;
  const n = 13;
  // Quicker and quicker.
  return Array.from({ length: n }, (_, i) => first + (last - first) * (1 - (1 - i / (n - 1)) ** 1.0) ** 1.25);
})();

/** The mouth opening for each jellyfish as it arrives. */
export function sideMouthAt(t: number): number {
  const u = wrap(t);
  let m = 0;
  for (const g of GULPS) m = Math.max(m, window01(u, g - 0.16, g + 0.1, 0.1));
  return m;
}

export function turtleAt(t: number): TurtlePose {
  const u = wrap(t);
  const calm = ramp(u, CUTE_AT - 0.4, CUTE_AT);
  // Strokes: a steady beat, slower and graceful in the sunlit beat. Phase runs continuously.
  const phase = cycles(9, u) - 2.2 * ramp(u, CUTE_AT - 0.4, BUT_AT) ;
  return {
    x: curveAt(SIDE_X, u).at,
    y: curveAt(SIDE_Y, u).at + 10 * Math.sin(cycles(5, u)),
    scale: Math.exp(curveAt(SIDE_S, u).at),
    tilt: 0.04 * Math.sin(cycles(5, u) + 0.6) - 0.05 * calm,
    stroke: phase,
    sweep: lerp(1, 0.8, calm),
    mouth: sideMouthAt(u),
    eye: u >= CUTE_AT - 0.15 && u < BUT_AT ? 'happy' : u >= BIGGEST_AT && u < AND2_AT ? 'wide' : 'open',
    turn: 1 - ramp(u, TURN.from, TURN.mid),
  };
}

/** The diver beside it for scale: shown from the pull-out until "and it eats". */
export const diverAt = (t: number): number => window01(wrap(t), PULL.from + 0.2, AND2_AT + 0.35, 0.3);

/** The counter: shown, and its number. */
export const counterAt = (t: number): number => window01(wrap(t), EATS_AT - 0.1, CUTE_AT - 0.1, 0.18);
export const countAt = (t: number): number => Math.round(260 * (1 - (1 - clamp01((wrap(t) - (EATS_AT + 0.05)) / (JELLYFISH2_AT + 0.1 - EATS_AT))) ** 2.2));
/** "/ day" popping in on "DAY!". */
export const perDayAt = (t: number): number => Math.min(ramp(wrap(t), DAY_AT - 0.04, DAY_AT + 0.14), 1 - ramp(wrap(t), CUTE_AT - 0.28, CUTE_AT - 0.1));

/** The size label: "up to 1,000 lb (450 kg)" from "up" (a pop on "thousand"). */
export const sizeLabelAt = (t: number): number => window01(wrap(t), UP_AT - 0.05, AND2_AT + 0.2, 0.15);
export const sizePopAt = (t: number): number => {
  const d = wrap(t) - THOUSAND_AT;
  return d < 0 || d > 0.35 ? 0 : Math.sin(Math.PI * (d / 0.35));
};

// ---------------------------------------------------------------- the moods

export interface Grade {
  /** Cold, dark and drained (nervous); a hot red for the dramatic flare; a rosy lift for the chuckle; clear bright blue (surprise); a vivid pop (excited); warm sunlight (soft). */
  readonly cold: number;
  readonly hot: number;
  readonly rosy: number;
  readonly clear: number;
  readonly vivid: number;
  readonly sun: number;
}

/** The mood at video time t. */
export function gradeAt(t: number): Grade {
  const u = wrap(t);
  return {
    cold: Math.max(1 - ramp(u, ITS_AT - 0.1, ITS_AT + 0.4), ramp(u, BUT_AT - 0.1, BUT_AT + 0.5)),
    hot: window01(u, AND_AT, ONCE_AT + 0.1, 0.3),
    rosy: window01(u, ONCE_AT - 0.05, PULL.to, 0.3),
    clear: window01(u, PULL.from, AND2_AT + 0.2, 0.4),
    vivid: window01(u, AND2_AT, CUTE_AT, 0.35),
    sun: window01(u, CUTE_AT - 0.35, BUT_AT + 0.25, 0.4),
  };
}

/** A white flash as the spines flare on "ALL", and a softer one on "down!". */
export const flashAt = (t: number): number => {
  const u = wrap(t);
  return 0.32 * window01(u, ALL_AT - 0.02, ALL_AT + 0.25, 0.08) + 0.18 * window01(u, DOWN_AT - 0.02, DOWN_AT + 0.22, 0.06);
};

/** Shakes: on "NIGHTMARE", on "down!", on "thousand" (screen px). */
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  let x = 0;
  let y = 0;
  for (const j of [{ at: NIGHTMARE_AT + 0.05, amp: 9 }, { at: DOWN_AT, amp: 12 }, { at: THOUSAND_AT + 0.02, amp: 16 }]) {
    const d = u - j.at;
    if (d < 0 || d > 0.45) continue;
    const amp = j.amp * (1 - d / 0.45) ** 2;
    x += amp * Math.sin(d * 95);
    y += amp * 0.8 * Math.cos(d * 120);
  }
  return { x, y };
}
