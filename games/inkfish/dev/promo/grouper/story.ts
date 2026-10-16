import type { Pt } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, lerp, ramp, window01 } from '../short';
import { EXIT, HOLE, mid, SPOT } from './place';
import { TEMPO, WORDS } from './words';

/**
 * "Fish can POINT": a grouper that has chased prey into the coral swims to
 * a giant moray and shakes its head to recruit it (Bshary et al., PLoS
 * Biology 2006), then does a headstand over the hiding spot, a referential
 * gesture like a hunting dog's point (Vail, Manica & Bshary, Nature
 * Communications 2013). Told by a narrator (words.ts) on a reef, every beat
 * timed to the words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     the hook: the grouper stands on its head over a crack in the
 *         coral, a red arrow down from its nose, "pointing"; the moray lies
 *         beside it, then backs into its hole
 *   1.4   "When prey hides in the coral": a chromis darts into the crack
 *   3.2   "a grouper swims up to a moray eel": the grouper turns and swims
 *         to the moray's hole; "shakes its head": a shimmy, shake lines;
 *         "let's hunt" in a bubble
 *   7.2   "Then it does a HEADSTAND over the hiding spot, pointing": it
 *         leads the way back, the moray follows, and it tips nose down over
 *         the crack: the spot ringed, the arrow; "like a hunting dog": an
 *         inset of a pointer on point
 *   11.1  "The eel slides into the crack": the grouper moves over the far
 *         opening, the moray slides in, the chromis bolts out the other end
 *         and on "lunch" the grouper sucks it in
 *   15.1  "So don't let anyone tell you fish are dumb. Some…": grouper and
 *         moray side by side, "dumb?" struck through, and the grouper tips
 *         back into the headstand the loop opens on.
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

export const POINT_AT = said('POINT.');
export const PREY_AT = said('prey');
export const CORAL_AT = said('coral,');
export const GROUPER_AT = said('grouper');
export const MORAY_AT = said('moray');
export const SHAKES_AT = said('shakes');
export const HEAD_AT = said('head:');
export const LETS_AT = said("let's");
export const HUNT_AT = said('hunt.');
export const THEN_AT = said('Then');
export const HEADSTAND_AT = said('HEADSTAND');
export const HIDING_AT = said('hiding');
export const SPOT_AT = said('spot,');
export const POINTING_AT = said('pointing,');
export const DOG_AT = said('dog.');
export const SLIDES_AT = said('slides');
export const CRACK_AT = said('crack,');
export const AND_AT = said('and', 2);
export const LUNCH_AT = said('lunch.');
export const SO_AT = said('So');
export const ANYONE_AT = said('anyone');
export const DUMB_AT = said('dumb.');

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

/** A value keyed over one stretch of the loop (held at its ends). */
const keyed = (keys: readonly Key[]) => (t: number): number => curveAt(keys, t).at;

/** One fish on screen. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  /** -1 (left) .. 1 (right): passes through 0 as it turns. */
  readonly face: number;
  /** Nose up, radians. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  readonly jaw: number;
  /** A swallowed meal's swelling, 0 .. 1. */
  readonly lump: number;
}

/** Mouth distance from the body's centre, in body lengths (as chain.ts's NOSE). */
const NOSE = 0.46;

/** Where a fish facing right must be to have its nose at `nose`, tilted `tilt`. */
const centreFor = (nose: Pt, tilt: number, len: number): Pt => ({ x: nose.x - Math.cos(tilt) * NOSE * len, y: nose.y + Math.sin(tilt) * NOSE * len });

// ---------------------------------------------------------------- the grouper

export const GROUPER_LEN = 360;
/** The headstand: nose down over the hiding spot, as the loop opens. */
export const STAND_TILT = -1.3;
export const STAND_NOSE: Pt = { x: SPOT.x - 16, y: 866 };
export const STAND = centreFor(STAND_NOSE, STAND_TILT, GROUPER_LEN);
/** Nose down over the crack's far opening, waiting for what comes out. */
const EXIT_TILT = -1.22;
export const EXIT_NOSE: Pt = { x: mid(EXIT).x - 4, y: 902 };
const AT_EXIT = centreFor(EXIT_NOSE, EXIT_TILT, GROUPER_LEN);

/** It shakes its head on "shakes its head:", a shimmy SHAKE_HZ times a second. */
export const SHAKE_FROM = SHAKES_AT - 0.05;
export const SHAKE_TO = HEAD_AT + 0.4;
const SHAKE_HZ = 7;
/** Its turns: away to the moray, back to lead it, away again after lunch, and back into the headstand. */
/** The gulp, on "lunch", and how long the chromis takes to be sucked in. */
export const GULP_AT = LUNCH_AT + 0.03;
export const SUCK_S = 0.3;
/** A moment between the gulp (u = 0) and "So" (u = 1), for the swim away after lunch. */
const afterLunch = (u: number): number => lerp(GULP_AT, SO_AT, u);
/** The headstand is back as "Some…" is said, so the loop opens on it. */
const BACK_IN_STAND = said('Some…');
export const TURNS: readonly (readonly [number, number])[] = [
  [CORAL_AT - 0.05, GROUPER_AT - 0.35],
  [HUNT_AT + 0.45, HUNT_AT + 0.9],
  [afterLunch(0.54), afterLunch(0.99)],
  [ANYONE_AT + 0.2, DUMB_AT - 0.36],
];

/** Its path, keyed to the words: up off the spot after "POINT", over to the moray, back to the spot, to the crack's far end, and home. */
const LEAVE_STAND = POINT_AT + 0.4;
const RISE = CORAL_AT - 0.28;
const AT_MORAY = MORAY_AT + 0.2;
const LEAD_OFF = HUNT_AT + 0.6;
const OVER_SPOT = HEADSTAND_AT - 0.05;
const IN_STAND = HEADSTAND_AT + 0.6;
const TO_EXIT = SLIDES_AT - 0.45;
const AT_EXIT_AT = CRACK_AT - 0.15;
const BESIDE = ANYONE_AT + 0.05;
const SETTLED = DUMB_AT - 0.36;
const grouperX = looped([
  { t: 0, at: STAND.x },
  { t: LEAVE_STAND, at: STAND.x },
  { t: RISE, at: 940 },
  { t: GROUPER_AT - 0.05, at: 925 },
  { t: AT_MORAY, at: 610 },
  { t: LEAD_OFF, at: 596 },
  { t: OVER_SPOT, at: 760 },
  { t: IN_STAND, at: STAND.x },
  { t: TO_EXIT, at: STAND.x },
  { t: AT_EXIT_AT, at: AT_EXIT.x },
  { t: afterLunch(0.3), at: AT_EXIT.x },
  { t: afterLunch(0.54), at: 930 },
  { t: afterLunch(0.99), at: 925 },
  { t: BESIDE, at: 722 },
  { t: SETTLED, at: 698 },
  { t: BACK_IN_STAND, at: STAND.x },
]);
const grouperY = looped([
  { t: 0, at: STAND.y },
  { t: LEAVE_STAND, at: STAND.y },
  { t: RISE, at: 560 },
  { t: GROUPER_AT - 0.05, at: 580 },
  { t: AT_MORAY, at: 765 },
  { t: LEAD_OFF, at: 765 },
  { t: OVER_SPOT, at: 700 },
  { t: IN_STAND, at: STAND.y },
  { t: TO_EXIT, at: STAND.y },
  { t: SLIDES_AT, at: STAND.y - 26 },
  { t: AT_EXIT_AT, at: AT_EXIT.y },
  { t: afterLunch(0.3), at: AT_EXIT.y },
  { t: afterLunch(0.54), at: 712 },
  { t: BESIDE, at: 690 },
  { t: SETTLED, at: 694 },
  { t: BACK_IN_STAND, at: STAND.y },
]);
const grouperTilt = looped([
  { t: 0, at: STAND_TILT },
  { t: LEAVE_STAND, at: STAND_TILT },
  { t: PREY_AT + 0.15, at: -0.04 },
  { t: GROUPER_AT - 0.05, at: 0 },
  { t: AT_MORAY, at: -0.08 },
  { t: LEAD_OFF, at: 0 },
  { t: OVER_SPOT, at: -0.1 },
  { t: IN_STAND, at: STAND_TILT },
  { t: TO_EXIT, at: STAND_TILT },
  { t: SLIDES_AT, at: -0.95 },
  { t: AT_EXIT_AT, at: EXIT_TILT },
  { t: GULP_AT, at: EXIT_TILT },
  { t: afterLunch(0.35), at: -0.9 },
  { t: afterLunch(0.59), at: 0 },
  { t: BESIDE, at: 0.05 },
  { t: SETTLED, at: 0 },
  { t: BACK_IN_STAND, at: STAND_TILT },
]);

/** How far it has been turned, -1 .. 1. */
const faceAt = (t: number): number => TURNS.reduce((face, [from, to], i) => face + (i % 2 ? 2 : -2) * ramp(t, from, to), 1);

/** The head shake, -1 .. 1, and 0 outside it. */
export const shakeAt = (t: number): number => window01(t, SHAKE_FROM, SHAKE_TO, 0.12) * Math.sin(2 * Math.PI * SHAKE_HZ * (t - SHAKE_FROM));

export function grouperAt(t: number): Fish {
  const shake = shakeAt(t);
  const jaw = t < GULP_AT ? ramp(t, GULP_AT - SUCK_S - 0.2, GULP_AT - SUCK_S) : 1 - ramp(t, GULP_AT, GULP_AT + 0.06);
  const busy = TURNS.reduce((m, [from, to]) => Math.max(m, window01(t, from - 0.2, to + 0.6, 0.2)), 0);
  return {
    x: grouperX(t) + 7 * shake,
    y: grouperY(t) + 6 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S),
    len: GROUPER_LEN,
    face: faceAt(t),
    tilt: grouperTilt(t) + 0.17 * shake,
    beat: (2 * Math.PI * 24 * t) / LOOP_S,
    effort: 0.3 + 0.5 * busy + 0.3 * Math.abs(shake),
    jaw,
    lump: t >= GULP_AT ? 0.6 * ramp(t, GULP_AT, GULP_AT + 0.3) * (1 - ramp(t, SO_AT + 0.24, DUMB_AT + 0.09)) : 0,
  };
}

/** Its mouth, for a fish facing right. */
export const noseOf = (f: Fish): Pt => ({ x: f.x + Math.sign(f.face) * Math.cos(f.tilt) * NOSE * f.len, y: f.y - Math.sin(f.tilt) * NOSE * f.len });

// ---------------------------------------------------------------- the moray

export const MORAY_LEN = 480;
/** Its nose at home in its hole, waiting by the coral, and deep in the crack's left arm. */
export const HOME_NOSE: Pt = { x: HOLE.x + 105, y: HOLE.y };
export const WAIT_NOSE: Pt = { x: 651, y: 872 };
export const IN_NOSE: Pt = { x: 752, y: 1022 };
const IN_TILT = -0.84;
const LIP_NOSE: Pt = { x: 684, y: 940 };
const LIP_TILT = -0.55;

/** It backs into its hole after the hook; out again to follow the grouper; into the crack on "slides into the crack", and out after lunch. */
export const HOMEWARD = { from: 0.35, to: 2.5 } as const;
export const FOLLOW = { from: HUNT_AT + 0.6, to: HUNT_AT + 2.7 } as const;
export const SLIDE = { from: SLIDES_AT - 0.3, lip: SLIDES_AT + 0.25, in: CRACK_AT + 0.3 } as const;
export const BACK_OUT = { from: GULP_AT + 0.1, lip: GULP_AT + 0.65, to: GULP_AT + 1.35 } as const;

const morayNoseX = looped([
  { t: 0, at: WAIT_NOSE.x },
  { t: HOMEWARD.from, at: WAIT_NOSE.x },
  { t: HOMEWARD.to, at: HOME_NOSE.x },
  { t: FOLLOW.from, at: HOME_NOSE.x },
  { t: FOLLOW.to, at: WAIT_NOSE.x },
  { t: SLIDE.from, at: WAIT_NOSE.x },
  { t: SLIDE.lip, at: LIP_NOSE.x },
  { t: SLIDE.in, at: IN_NOSE.x },
  { t: BACK_OUT.from, at: IN_NOSE.x },
  { t: BACK_OUT.lip, at: LIP_NOSE.x },
  { t: BACK_OUT.to, at: WAIT_NOSE.x },
]);
const morayNoseY = looped([
  { t: 0, at: WAIT_NOSE.y },
  { t: HOMEWARD.from, at: WAIT_NOSE.y },
  { t: HOMEWARD.to, at: HOME_NOSE.y },
  { t: FOLLOW.from, at: HOME_NOSE.y },
  { t: FOLLOW.to, at: WAIT_NOSE.y },
  { t: SLIDE.from, at: WAIT_NOSE.y },
  { t: SLIDE.lip, at: LIP_NOSE.y },
  { t: SLIDE.in, at: IN_NOSE.y },
  { t: BACK_OUT.from, at: IN_NOSE.y },
  { t: BACK_OUT.lip, at: LIP_NOSE.y },
  { t: BACK_OUT.to, at: WAIT_NOSE.y },
]);
const morayTilt = looped([
  { t: 0, at: 0 },
  { t: SLIDE.from, at: 0 },
  { t: SLIDE.lip, at: LIP_TILT },
  { t: SLIDE.in, at: IN_TILT },
  { t: BACK_OUT.from, at: IN_TILT },
  { t: BACK_OUT.lip, at: LIP_TILT },
  { t: BACK_OUT.to, at: 0 },
]);

/** The moray, always facing right: it backs in and out tail first. */
export function morayAt(t: number): Fish {
  const tilt = morayTilt(t);
  const nose = { x: morayNoseX(t), y: morayNoseY(t) + 4 * Math.sin((2 * Math.PI * 4 * t) / LOOP_S) };
  const c = centreFor(nose, tilt, MORAY_LEN);
  const moving = Math.max(window01(t, HOMEWARD.from, HOMEWARD.to, 0.4), window01(t, FOLLOW.from, FOLLOW.to, 0.4), window01(t, SLIDE.from, SLIDE.in, 0.3), window01(t, BACK_OUT.from, BACK_OUT.to, 0.3));
  return { x: c.x, y: c.y, len: MORAY_LEN, face: 1, tilt, beat: (2 * Math.PI * 12 * t) / LOOP_S, effort: 0.25 + 0.6 * moving, jaw: 0, lump: 0 };
}

// ---------------------------------------------------------------- the chromis

export const CHROMIS_LEN = 100;
/** In from the right on "When prey hides…", down the crack's far opening to the spot; it bolts out of there as the eel comes in. */
const HIDE_FROM = PREY_AT - 0.32;
const HIDDEN_AT = CORAL_AT + 0.35;
export const BOLT_FROM = AND_AT - 0.08;
const BOLT_TURN = 0.3;
const OUT_AT = GULP_AT - SUCK_S;

const hideX = keyed([{ t: HIDE_FROM, at: 1150 }, { t: HIDE_FROM + 0.5, at: 1000 }, { t: HIDE_FROM + 0.85, at: 972 }, { t: HIDDEN_AT, at: SPOT.x }]);
const hideY = keyed([{ t: HIDE_FROM, at: 760 }, { t: HIDE_FROM + 0.5, at: 880 }, { t: HIDE_FROM + 0.85, at: 978 }, { t: HIDDEN_AT, at: SPOT.y }]);
const hideTilt = keyed([{ t: HIDE_FROM, at: -0.45 }, { t: HIDE_FROM + 0.5, at: -0.75 }, { t: HIDE_FROM + 0.85, at: -0.6 }, { t: HIDDEN_AT, at: 0 }]);
const boltX = keyed([{ t: BOLT_FROM, at: SPOT.x }, { t: BOLT_FROM + 0.3, at: 925 }, { t: OUT_AT, at: EXIT_NOSE.x + 2 }]);
const boltY = keyed([{ t: BOLT_FROM, at: SPOT.y }, { t: BOLT_FROM + 0.3, at: 1040 }, { t: OUT_AT, at: 952 }]);
const boltTilt = keyed([{ t: BOLT_FROM, at: 0 }, { t: BOLT_FROM + 0.3, at: 0.6 }, { t: OUT_AT, at: 1.25 }]);

export function chromisAt(t: number): Fish | null {
  if (t < HIDE_FROM || t >= GULP_AT) return null;
  const bolting = t >= BOLT_FROM;
  // Turned round in the crack as the eel comes in, ready to bolt out the far end.
  const face = -1 + 2 * ramp(t, BOLT_FROM - BOLT_TURN - 0.1, BOLT_FROM - 0.1);
  const panic = ramp(t, SLIDE.lip, SLIDE.lip + 0.1);
  return {
    x: bolting ? boltX(t) : hideX(t),
    y: (bolting ? boltY(t) : hideY(t)) + 3 * Math.sin(t * 5.1) * (1 - ramp(t, BOLT_FROM - 0.1, BOLT_FROM)),
    len: CHROMIS_LEN,
    face,
    tilt: bolting ? boltTilt(t) : hideTilt(t),
    beat: t * 13 + 18 * panic * (t - SLIDE.lip),
    effort: 0.35 + 0.6 * Math.max(panic, 1 - ramp(t, HIDDEN_AT - 0.2, HIDDEN_AT + 0.3)),
    jaw: 0,
    lump: 0,
  };
}

/** How far the chromis has been dragged into the grouper's mouth, 0 .. 1 (null when it isn't). */
export function eatenAt(t: number): number | null {
  const u = (t - OUT_AT) / SUCK_S;
  return u >= 0 && u < 1 ? u : null;
}

/** Water rushing into the grouper's open mouth, and the ink burst of the gulp (0 .. 1 over its life). */
export const suctionAt = (t: number): number => Math.min(ramp(t, OUT_AT - 0.35, OUT_AT - 0.15), 1 - ramp(t, GULP_AT - 0.02, GULP_AT + 0.02));
export const chompAt = (t: number): number => (t - GULP_AT) / 0.16;

/** The chromis's "!" as the eel's nose comes into the crack. */
export function alarmAt(t: number): number {
  const u = t - (SLIDE.lip - 0.05);
  const hold = BOLT_FROM - SLIDE.lip - 0.1;
  return u < 0 || u > hold ? 0 : Math.min(1.15 * ramp(u, 0, 0.12), 1 - ramp(u, hold - 0.12, hold));
}
