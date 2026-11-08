import { BOIL_FPS } from '../../../src/art/textures';
import { lerp, ramp, window01 } from '../short';
import type { HeadPlace } from './art/orcaHead';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This orca ate THIRTEEN porpoises… and FOURTEEN seals!": in 1861 a Danish
 * naturalist (this short's scientist) counted the remains of 13 harbour
 * porpoises and 14 seals in one killer whale's stomach (the Eschricht report,
 * Denmark). Whether it was one meal nobody knows. Told by a narrator
 * (words.ts), every beat a function of time over a loop of LOOP_S. One mood a
 * sentence:
 *
 *   0     "This orca ate THIRTEEN porpoises… and FOURTEEN seals!" (shock): frame
 *         1, the close-up head huge in dark water, jaws at the full gape, a
 *         seal clinging on in terror; a porpoise and then a seal swap in, as said.
 *   3.7   "Denmark, 1861." (dramatic): a cold grey shore, the orca on the
 *         shingle, the scientist behind it, the place and the year.
 *   6.0   "A scientist opens one killer whale's stomach…" (surprise): the camera
 *         pushes in on the belly, a big pale x-ray window, outlines filling
 *         its rows one by one, two counters rising to 13 and 14.
 *   9.9   "Ten fingers weren't enough." (laugh): the scientist's two hands up,
 *         all ten fingers, a bemused face, the counters running on.
 *  12.1   "Was it all one meal? Nobody thinks so… but nobody knows how long it
 *         took, either." (nervous): the orca alone in dark water, a big "?",
 *         outlines drifting, the sun and the moon racing over the surface.
 *  16.9   "One thing's for sure: that orca never skipped lunch. So yes,"
 *         (cheeky): the same head swims at us, jaws shut, a smug half-lid, a
 *         tiny seal in view; on "lunch" it opens wide and lunges on to frame 1.
 */

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const THIRTEEN_AT = said('THIRTEEN');
export const PORPOISES_AT = said('porpoises…');
export const FOURTEEN_AT = said('FOURTEEN');
export const SEALS_AT = said('seals!');
export const DENMARK_AT = said('Denmark,');
export const YEAR_AT = said('1861.');
export const SCIENTIST_AT = said('scientist');
export const OPENS_AT = said('opens');
export const KILLER_AT = said('killer');
export const STOMACH_AT = said('stomach,');
export const COUNTING_AT = said('counting');
export const INSIDE_AT = said('inside.');
export const TEN_AT = said('Ten');
export const FINGERS_AT = said('fingers');
export const ENOUGH_AT = said('enough.');
export const WAS_AT = said('Was');
export const MEAL_AT = said('meal?');
export const NOBODY_AT = said('Nobody');
export const HOW_AT = said('how');
export const LONG_AT = said('long');
export const TOOK_AT = said('took,');
export const EITHER_AT = said('either.');
export const ONE_AT = said('One');
export const LUNCH_AT = said('lunch.');
export const SO_AT = said('So');
/** The words "but nobody knows how long it took, either": the voice is lifted across them (audio.ts). */
export const QUIET_FROM = said('but');
export const QUIET_TO = WORDS[WORDS.findIndex((w) => w.text === 'either.')]!.end / TEMPO;

// ---------------------------------------------------------------- the scenes

export type SceneId = 'hook' | 'shore' | 'fingers' | 'sea';
export const SCENE_IDS: readonly SceneId[] = ['hook', 'shore', 'fingers', 'sea'];

export const SHORE_FROM = DENMARK_AT - 0.1;
export const FINGERS_FROM = TEN_AT - 0.1;
export const SEA_FROM = WAS_AT - 0.1;
/** The hook returns (as the cheeky beat, which lands on frame 1). */
export const SMUG_FROM = ONE_AT - 0.1;
const FADE = 0.16;

const between = (t: number, a: number, b: number): number => ramp(t, a, a + FADE) * (1 - ramp(t, b, b + FADE));

/** How much of each scene is on screen. The hook is also the cheeky beat's frame, so the two meet without a seam. */
export function sceneAlpha(id: SceneId, t: number): number {
  switch (id) {
    case 'hook': return Math.max(1 - ramp(t, SHORE_FROM, SHORE_FROM + FADE), ramp(t, SMUG_FROM, SMUG_FROM + FADE));
    case 'shore': return between(t, SHORE_FROM, FINGERS_FROM);
    case 'fingers': return between(t, FINGERS_FROM, SEA_FROM);
    case 'sea': return between(t, SEA_FROM, SMUG_FROM);
  }
}

/** A blow that dies away over `len` seconds from `at`. */
const decay = (t: number, at: number, len: number): number => (t >= at && t < at + len ? 1 - (t - at) / len : 0);
const phase = (t: number): number => (2 * Math.PI * t) / LOOP_S;

// ---------------------------------------------------------------- frame 1 (and the cheeky beat): the orca at the camera

/** Frame 1: the close-up head filling the band the text lives in, jaws at the full gape. */
const HOOK = { x: 530, y: 696, size: 1040 } as const;
/** The cheeky beat's start: further off, jaws shut, swimming up at us. */
const SMUG = { x: 540, y: 770, size: 590 } as const;
/** How far the jaws are open at the hook (they breathe a little round this). */
const GAPE = 0.97;

export interface Mouthful {
  readonly kind: 'seal' | 'porpoise';
  /** In the head's own units (art/orcaHead.ts: the mouth's middle at 0,0, 1000 across): where the animal's middle is. */
  readonly x: number;
  readonly y: number;
  /** The seal: times its own size. The porpoise: its length. */
  readonly len: number;
  readonly rot: number;
  /** Fades into the dark of the throat as it goes down, 1 .. 0. */
  readonly fade: number;
}

/** Where the seal clings in frame 1: head just over the lower teeth, its body running back into the throat. */
const SEAL_HOME = { x: 44, y: 132 } as const;
const THROAT = { x: 44, y: 0 } as const;
const PORPOISE_LEN = 800;

export interface Hook {
  readonly orca: HeadPlace;
  readonly food: readonly Mouthful[];
  /** The water goes from dark (0) to bright (1) for the cheeky beat. */
  readonly bright: number;
  /** The seal's fear: 1 scared .. 0 cool. */
  readonly sweat: number;
}

const sealAt = (x: number, y: number, len: number, ph: number, fade = 1): Mouthful => ({ kind: 'seal', x, y: y + 5 * Math.sin(3 * ph), len, rot: 0.04 * Math.sin(4 * ph), fade });

/** The first seal, gulped back into the throat on "THIRTEEN". */
function firstSeal(t: number, ph: number, chew: number): Mouthful {
  const g = ramp(t, THIRTEEN_AT - 0.05, THIRTEEN_AT + 0.42);
  return sealAt(SEAL_HOME.x + chew, lerp(SEAL_HOME.y, THROAT.y, g), lerp(1, 0.26, g), ph, 1 - ramp(g, 0.6, 1));
}

/** The porpoise, across the open mouth as "porpoises…" is said, fully in view, then taken before "FOURTEEN". */
function porpoise(t: number, ph: number): Mouthful {
  const inn = ramp(t, THIRTEEN_AT - 0.05, PORPOISES_AT - 0.1);
  const taken = ramp(t, PORPOISES_AT + 0.5, FOURTEEN_AT - 0.12);
  return {
    kind: 'porpoise',
    x: lerp(lerp(1150, 10, inn), THROAT.x, taken),
    y: lerp(170, THROAT.y, taken) + 8 * Math.sin(3 * ph + 1),
    len: lerp(PORPOISE_LEN, 170, taken),
    rot: 0.16 + 0.05 * Math.sin(4 * ph + 1),
    fade: 1 - ramp(taken, 0.72, 1),
  };
}

/** What is in the orca's mouth: a seal, a porpoise as "porpoises" is said, a seal as "seals" is said; at the end the seal comes in for the seam. */
function mouthful(t: number): Mouthful[] {
  const ph = phase(t);
  const chew = 6 * Math.sin(5 * ph);
  if (t < SHORE_FROM + 0.5) {
    const out: Mouthful[] = [];
    if (t < THIRTEEN_AT + 0.42) out.push(firstSeal(t, ph, chew));
    if (t > THIRTEEN_AT - 0.05 && t < FOURTEEN_AT - 0.1) out.push(porpoise(t, ph));
    // The second seal bursts up from under the chin on "FOURTEEN", held to the cut.
    if (t > FOURTEEN_AT - 0.35) {
      const u = ramp(t, FOURTEEN_AT - 0.35, SEALS_AT - 0.2);
      out.push(sealAt(SEAL_HOME.x + chew, lerp(1040, SEAL_HOME.y, u), lerp(1.5, 1, u), ph));
    }
    return out;
  }
  // The cheeky beat: a tiny seal beside the shut jaws, drawn in on "lunch" and "So yes", to frame 1's bite.
  const e = ramp(t, LUNCH_AT - 0.1, SO_AT + 0.2);
  return [sealAt(lerp(590, SEAL_HOME.x, e) + chew * e, lerp(290, SEAL_HOME.y, e), lerp(0.62, 1, e), ph)];
}

/** The small snap of the jaws on each mouthful. */
const snap = (t: number): number => 0.14 * (Math.sin(Math.PI * ramp(t, THIRTEEN_AT, THIRTEEN_AT + 0.4)) + Math.sin(Math.PI * ramp(t, PORPOISES_AT + 0.45, FOURTEEN_AT - 0.1)));

/** The head: huge in frame 1, a smug swimmer in the cheeky beat that grows into frame 1 again. */
export function hookAt(t: number): Hook {
  const u = wrap(t);
  const ph = phase(u);
  const cheeky = u > SMUG_FROM - 0.5;
  // Swims in slowly, then lunges from "lunch" to the seam.
  const lunge = cheeky ? ramp(u, LUNCH_AT - 0.15, SO_AT + 0.2) : 1;
  const near = cheeky ? 0.14 * ramp(u, SMUG_FROM, LUNCH_AT) : 0;
  const grow = near + (1 - near) * lunge;
  const open = cheeky ? ramp(u, LUNCH_AT - 0.15, LUNCH_AT + 0.4) : 1;
  return {
    orca: {
      x: lerp(SMUG.x, HOOK.x, grow),
      y: lerp(SMUG.y, HOOK.y, grow) + 12 * Math.sin(3 * ph),
      size: lerp(SMUG.size, HOOK.size, grow),
      tilt: lerp(0.05, -0.035, grow) + 0.012 * Math.sin(2 * ph),
      jaw: open * (GAPE + 0.03 * Math.sin(7 * ph)) - (cheeky ? 0 : snap(u)),
      lid: cheeky ? 0.6 * (1 - ramp(u, LUNCH_AT + 0.2, SO_AT + 0.2)) : 0,
    },
    food: mouthful(u),
    bright: cheeky ? ramp(u, SMUG_FROM, SMUG_FROM + 0.4) * (1 - ramp(u, LUNCH_AT + 0.1, SO_AT + 0.5)) : 0,
    sweat: cheeky ? lerp(0.15, 0.7, ramp(u, LUNCH_AT - 0.3, SO_AT)) : 0.7,
  };
}

/** Bubbles and motes rising through the water (whole cycles a loop): `age` 0 .. 1 for each. */
export const riseAge = (t: number, i: number, cycles = 2): number => (((t / LOOP_S) * cycles + i * 0.173) % 1 + 1) % 1;

// ---------------------------------------------------------------- the shore: Denmark, 1861, the x-ray

export const placeAt = (t: number): number => window01(t, DENMARK_AT - 0.05, OPENS_AT - 0.1, 0.2);
export const yearAt = (t: number): number => window01(t, YEAR_AT - 0.05, OPENS_AT + 0.1, 0.2);
/** The scientist leans in as he is named, 0 .. 1. */
export const leanAt = (t: number): number => ramp(t, SCIENTIST_AT - 0.1, SCIENTIST_AT + 0.5);
/** The x-ray window opening on the belly as "opens" is said, 0 .. 1. */
export const windowAt = (t: number): number => ramp(t, OPENS_AT, STOMACH_AT + 0.1) * (1 - ramp(t, FINGERS_FROM, FINGERS_FROM + 0.3));
export const stomachLabelAt = (t: number): number => window01(t, STOMACH_AT - 0.05, STOMACH_AT + 0.52, 0.12);

/** The counting: first outline on "stomach", all 27 by "enough"; the tally reads 10 on "fingers". */
const COUNT_FROM = STOMACH_AT + 0.5;
const COUNT_TO = ENOUGH_AT;
export const TOTAL_PORPOISES = 13;
export const TOTAL_SEALS = 14;
export const TOTAL = TOTAL_PORPOISES + TOTAL_SEALS;
/** The count as it runs, 0 .. 27 (the fraction animates the outline being drawn). */
export const countAt = (t: number): number => TOTAL * Math.max(0, Math.min(1, (t - COUNT_FROM) / (COUNT_TO - COUNT_FROM)));
/** How many outlines are in the window, counting the one popping in, so the counters tick as it appears. */
export const shownAt = (t: number): number => Math.ceil(countAt(t));
/** Seals are the even outlines (14 of 27), porpoises the odd ones (13). */
export const sealsAt = (t: number): number => Math.ceil(shownAt(t) / 2);
export const porpoisesAt = (t: number): number => Math.floor(shownAt(t) / 2);
export const counterAt = (t: number): number => window01(t, STOMACH_AT + 0.2, SEA_FROM, 0.15);

export const SHORE_ORCA: OrcaPlace = { snout: { x: 1000, y: 1062 }, len: 1800, angle: 0, jaw: 0, tail: 0 };
/** Where the x-ray window sits on the screen, and its size: big, between the counters and the caption. */
export const WINDOW = { x: 540, y: 858, w: 1000, h: 530 } as const;
/** The point on the whale's belly the camera pushes in on, and where it brings it on screen. */
const BELLY = { x: 470, y: 1090 } as const;
const BELLY_ON_SCREEN = { x: 540, y: 880 } as const;
const PUSH = 1.62;

export interface ShoreCamera {
  readonly zoom: number;
  readonly dx: number;
  readonly dy: number;
}

/** A slow drift, then a push on to the belly as the stomach opens, the scientist going off to the side. */
export function shoreCameraAt(t: number): ShoreCamera {
  const push = ramp(t, OPENS_AT, STOMACH_AT + 0.1);
  const zoom = lerp(1 + 0.03 * ramp(t, SHORE_FROM, OPENS_AT), PUSH, push);
  // Unpushed, the drift is about the frame's middle; pushed, the belly point lands where the window is.
  const [idleX, idleY] = [540 * (1 - zoom), 1000 * (1 - zoom)];
  return { zoom, dx: lerp(idleX, BELLY_ON_SCREEN.x - BELLY.x * zoom, push), dy: lerp(idleY, BELLY_ON_SCREEN.y - BELLY.y * zoom, push) };
}

/** He steps aside as the camera pushes in on the belly, 0 .. 1. */
export const asideAt = (t: number): number => ramp(t, OPENS_AT, STOMACH_AT);

export interface OrcaPlace {
  /** The tip of the snout on screen. */
  readonly snout: { readonly x: number; readonly y: number };
  readonly len: number;
  /** Radians, positive: nose down. */
  readonly angle: number;
  readonly jaw: number;
  readonly tail: number;
}

export interface Scientist {
  readonly gaze: number;
  readonly lid: number;
  readonly tilt: number;
}

export function shoreScientistAt(t: number): Scientist {
  const u = t - SHORE_FROM;
  return { gaze: lerp(0.9, -0.2, leanAt(t)), lid: 0.12 * Math.sin(u * 1.1) ** 8, tilt: -0.04 * leanAt(t) + 0.01 * Math.sin(u * 1.3) };
}

// ---------------------------------------------------------------- ten fingers

/** Both hands up, ten fingers, as "Ten" is said. */
export const handsAt = (t: number): number => ramp(t, TEN_AT - 0.05, TEN_AT + 0.4) * (1 - ramp(t, SEA_FROM, SEA_FROM + FADE));
export const tenLabelAt = (t: number): number => window01(t, TEN_AT + 0.3, ENOUGH_AT + 0.4, 0.15);
export const bemusedAt = (t: number): number => ramp(t, FINGERS_AT + 0.3, FINGERS_AT + 0.9);
export const wiggleAt = (t: number): number => Math.sin((t - TEN_AT) * 9) * ramp(t, FINGERS_AT, FINGERS_AT + 0.4);

// ---------------------------------------------------------------- the dark sea

export const SEA_LINE_Y = 400;
export const SEA_ORCA: OrcaPlace = { snout: { x: 1000, y: 1010 }, len: 1700, angle: 0.04, jaw: 0, tail: 0 };
export const questionAt = (t: number): number => window01(t, WAS_AT - 0.05, HOW_AT - 0.1, 0.2);
export const questionWord = (t: number): string => (t < MEAL_AT ? '?' : t < NOBODY_AT + 0.3 ? '?!' : '?');

export function seaOrcaAt(t: number): OrcaPlace {
  const u = t - SEA_FROM;
  return { ...SEA_ORCA, snout: { x: SEA_ORCA.snout.x - 25 * ramp(t, SEA_FROM, SMUG_FROM) + 8 * Math.sin(u * 1.2), y: SEA_ORCA.snout.y + 14 * Math.sin(u * 0.9) }, tail: u * 3.2 };
}

/** The sun and the moon racing over the surface: x across the frame, 0 .. 1 in flight. */
export const sunAt = (t: number): number => (t - (HOW_AT - 0.05)) / 0.55;
export const moonAt = (t: number): number => (t - (LONG_AT + 0.15)) / 0.55;
/** Day (1) and night (0) in the sky strip. */
export function skyDayAt(t: number): number {
  return ramp(t, HOW_AT - 0.1, HOW_AT + 0.1) * (1 - ramp(t, TOOK_AT - 0.2, TOOK_AT + 0.1));
}
export const skyShownAt = (t: number): number => ramp(t, SEA_FROM, SEA_FROM + 0.3) * (1 - ramp(t, EITHER_AT + 0.2, EITHER_AT + 0.7));

/** An outline drifting up through the dark: its position (a function of t, whole cycles a loop), kind and size. */
export interface Drifter {
  readonly kind: 'seal' | 'porpoise';
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly len: number;
  readonly alpha: number;
}

export function driftersAt(t: number, count = 7): Drifter[] {
  return Array.from({ length: count }, (_, i) => {
    const age = riseAge(t, i, 1);
    return {
      kind: i % 2 ? 'porpoise' : 'seal',
      x: (140 + i * 150 + 70 * Math.sin(age * 5 + i)) % 1080,
      y: 1750 - 1300 * age,
      rot: 0.5 * Math.sin(age * 4 + i * 2),
      len: 150 + (i % 3) * 30,
      alpha: 0.5 * Math.min(1, 4 * age) * Math.min(1, 4 * (1 - age)),
    };
  });
}

// ---------------------------------------------------------------- the camera and flash

export interface Camera {
  readonly zoom: number;
  readonly rot: number;
  readonly dx: number;
  readonly dy: number;
}

const WHIP_FROM = SO_AT - 0.45;
const WHIP_TO = SO_AT + 0.25;

/** A push in and out all loop (whole cycles), jolts on the numbers and "lunch", a whip into frame 1 on "So". */
export function cameraAt(t: number): Camera {
  const ph = phase(t);
  const jolt = decay(t, THIRTEEN_AT, 0.4) + decay(t, FOURTEEN_AT, 0.4) + 0.8 * decay(t, STOMACH_AT, 0.5) + 0.8 * decay(t, LUNCH_AT, 0.5) + 0.5 * decay(t, TEN_AT, 0.4);
  const whip = Math.sin(Math.PI * ramp(t, WHIP_FROM, WHIP_TO)) ** 2;
  return {
    zoom: 1.03 + 0.02 * Math.sin(ph) + 0.15 * whip,
    rot: -0.03 * whip + 0.008 * Math.sin(3 * ph),
    dx: 6 * Math.sin(2 * ph) + 18 * jolt * Math.sin(t * 71) - 40 * whip,
    dy: 5 * Math.sin(3 * ph) + 14 * jolt * Math.sin(t * 83 + 1),
  };
}

/** A white flash on the cut to each scene and on the biggest beats. */
export function flashAt(t: number): number {
  return Math.max(0.3 * decay(t, SHORE_FROM, 0.18), 0.3 * decay(t, STOMACH_AT, 0.2), 0.25 * decay(t, FINGERS_FROM, 0.16), 0.2 * decay(t, SEA_FROM, 0.16), 0.3 * decay(t, SMUG_FROM, 0.18), 0.4 * decay(t, SO_AT - 0.2, 0.25));
}
