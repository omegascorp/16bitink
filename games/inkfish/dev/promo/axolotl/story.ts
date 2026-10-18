import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { TEMPO, WORDS } from './words';

/**
 * "This animal can grow back its own legs": the axolotl regrows a lost leg,
 * bones, muscle and toes and all, in a few weeks, and can mend parts of its
 * heart and brain, but in the wild it lives only in the canals of Mexico
 * City, and it's almost gone. Told by a narrator (words.ts), every beat timed
 * to the words, a function of time in seconds over a loop of LOOP_S. One mood
 * per sentence, and the picture's colour, camera and sound change with it:
 *
 *   0     "This animal can grow back its own LEGS!" (excited wonder): close on
 *         the axolotl on the canal bed, its front leg a small glowing bud
 *         sprouting with a sparkle; it twinkles brighter on "LEGS!"
 *   2.4   "Yes, the Minecraft one is real." (laugh): pull back, a blocky cube
 *         axolotl pops in beside it, and both wiggle; it pops away again
 *   5.1   "Lose a leg, and in a few weeks, a new one grows…" (curious): a
 *         dashed outline of the missing leg on "leg"; a time-lapse, the light
 *         flickering day, night, day with a sun and moon going round, the bud
 *         lengthening a step each day into the outline
 *   8.0   "bones, muscles, even TOES!" (delight): close on the leg, see-through,
 *         its bones forming, then its muscles; the four toes pop out one by one
 *         with a ding each
 *  10.4   "It can fix parts of its HEART and brain too!" (amazed): the water
 *         darkens and the whole axolotl turns see-through; a glowing heart and
 *         then brain inside it mend, their cracks zipping shut with sparkles
 *  13.0   "But in the wild, it lives in just one place, the canals of Mexico
 *         City… and it's almost gone." (sad): the colour drains as the camera
 *         pulls back out of the water: the canal of Xochimilco, trajinera boats
 *         on murky water, the city rising out of the haze on "Mexico City";
 *         the one small axolotl on the bed fades away
 *  18.9   "Honestly? It's cuter than any puppy." (cheeky): colour snaps back,
 *         the camera zips in and the axolotl pops back, grinning wider on
 *         "cuter"; a puppy floats in beside it in an air bubble and looks
 *         offended
 *  21.5   "And no matter what," (warm): the puppy floats off, the camera eases
 *         back into the opening shot, and the bud glows warm into frame 1.
 */
export const LOOP_S = 22.5;

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The line boil steps at the game's 8 a second: 180 steps, 60 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** A whole number of cycles a loop, so it is where it started at the seam. */
const cycles = (u: number, n: number, phase = 0): number => Math.sin((2 * Math.PI * n * u) / LOOP_S + phase);
/** Pops in from 0 over `dur` s, overshooting a little, then settles at 1. */
const pop = (d: number, dur: number, over = 0.18): number => {
  if (d <= 0) return 0;
  const s = d / dur;
  return s < 1 ? (1 + over) * smooth(s) : 1 + over - over * smooth((s - 1) / 0.8);
};

function word(text: string, nth: number): (typeof WORDS)[number] {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w;
}
/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export const said = (text: string, nth = 1): number => word(text, nth).start / TEMPO;
/** When it ends. */
export const saidEnd = (text: string, nth = 1): number => word(text, nth).end / TEMPO;

export const ANIMAL_AT = said('animal');
export const LEGS_AT = said('LEGS!');
export const YES_AT = said('Yes,');
export const MINECRAFT_AT = said('Minecraft');
export const REAL_AT = said('real.');
export const LOSE_AT = said('Lose');
export const LEG_AT = said('leg,');
export const FEW_AT = said('few');
export const WEEKS_AT = said('weeks,');
export const NEW_AT = said('new');
export const GROWS_AT = said('grows…');
export const BONES_AT = said('bones,');
export const MUSCLES_AT = said('muscles,');
export const TOES_AT = said('TOES!');
export const IT_AT = said('It');
export const FIX_AT = said('fix');
export const HEART_AT = said('HEART');
export const BRAIN_AT = said('brain');
export const BUT_AT = said('But');
export const WILD_AT = said('wild,');
export const PLACE_AT = said('place,');
export const CANALS_AT = said('canals');
export const MEXICO_AT = said('Mexico');
export const ALMOST_AT = said('almost');
export const GONE_AT = said('gone.');
export const GONE_END = saidEnd('gone.');
export const HONESTLY_AT = said('Honestly?');
export const CUTER_AT = said('cuter');
export const ANY_AT = said('any');
export const PUPPY_AT = said('puppy.');
export const AND_AT = said('And');
export const WHAT_AT = said('what,');

// ---------------------------------------------------------------- the leg

/** The regrowing front leg's length, 0 .. 1: a small bud in the opening frame. */
export const BUD = 0.6;
/** The time-lapse, "in a few weeks, a new one grows…": DAYS days, the leg growing a step each. */
export const LAPSE = [said('in') + 0.05, GROWS_AT + 0.45] as const;
export const DAYS = 3;
/** The axolotl is gone from the canal here (faded out), and the leg is a bud again when it pops back. */
export const RESET_AT = GONE_END + 0.25;
export const TOE_COUNT = 4;
const TOE_GAP = 0.12;

/** How far through the time-lapse, 0 .. 1. */
export const lapseAt = (t: number): number => Math.max(0, Math.min(1, (wrap(t) - LAPSE[0]) / (LAPSE[1] - LAPSE[0])));

export function legGrowAt(t: number): number {
  const u = wrap(t);
  if (u >= RESET_AT) return BUD;
  const days = lapseAt(u) * DAYS;
  // It grows in the daylight and rests at night: a step a day.
  const stepped = (Math.floor(days) + smooth(days - Math.floor(days))) / DAYS;
  return lerp(BUD, 1, Math.min(1, stepped));
}

/** When the i-th toe pops out. */
export const toeAt = (i: number): number => TOES_AT - 0.04 + i * TOE_GAP;
/** Each toe's pop-in scale, 0 .. ~1.2. */
export function toesAt(t: number): readonly number[] {
  const u = wrap(t);
  return Array.from({ length: TOE_COUNT }, (_, i) => (u >= RESET_AT ? 0 : pop(u - toeAt(i), 0.16, 0.3)));
}

/** The dashed outline of the whole leg to come: faint round the bud in the opening, bright from "leg" until the new one has filled it. */
export function ghostLegAt(t: number): number {
  const u = wrap(t);
  const faint = 0.6 * Math.max(1 - ramp(u, YES_AT - 0.2, YES_AT + 0.2), ramp(u, AND_AT - 0.2, WHAT_AT + 0.1));
  return Math.max(faint, window01(u, LEG_AT - 0.05, BONES_AT + 0.2, 0.25));
}

/** The leg's see-through look, its bones forming along it, and its muscles wrapping them. */
export const legXrayAt = (t: number): number => window01(wrap(t), BONES_AT - 0.3, FIX_AT + 0.2, 0.3);
export const bonesAt = (t: number): number => ramp(wrap(t), BONES_AT - 0.1, BONES_AT + 0.55) * (wrap(t) < RESET_AT ? 1 : 0);
export const musclesAt = (t: number): number => ramp(wrap(t), MUSCLES_AT - 0.1, MUSCLES_AT + 0.5) * (wrap(t) < RESET_AT ? 1 : 0);

/** The bud's glow, 0 .. ~1.3: warm in the opening, brighter on "LEGS!" and as the loop comes round, gone while it grows. */
export function budGlowAt(t: number): number {
  const u = wrap(t);
  const opening = 1 - ramp(u, LOSE_AT - 0.2, LAPSE[0] + 0.4);
  const legs = 0.35 * Math.exp(-(((u - LEGS_AT - 0.15) / 0.35) ** 2));
  const back = ramp(u, AND_AT - 0.2, WHAT_AT + 0.1);
  return (0.85 + 0.12 * cycles(u, 15)) * Math.max(opening, back) + legs;
}

/** A soft ring spreads out from the bud this often (a whole number a loop). */
export const PULSE_S = 0.75;
/** Sparkles twinkling round the bud: how strongly, 0 .. 1. */
export const sparkleAt = (t: number): number => Math.min(1, budGlowAt(t));

// ---------------------------------------------------------------- the heart and the brain

/** The whole body see-through, from "It can fix" until "But". */
export const xrayAt = (t: number): number => window01(wrap(t), IT_AT - 0.15, BUT_AT + 0.15, 0.35);

export interface Organ {
  /** How bright it glows, 0 .. 1. */
  readonly glow: number;
  /** Its crack zipping shut, 0 open .. 1 mended. */
  readonly mend: number;
  /** A sparkle burst as it mends, 0 .. 1 over its life, or null. */
  readonly burst: number | null;
}

function organ(t: number, at: number): Organ {
  const u = wrap(t);
  const d = u - at;
  return {
    glow: xrayAt(u) * (0.55 + 0.45 * ramp(u, at - 0.1, at + 0.3)),
    mend: ramp(u, at - 0.05, at + 0.45),
    burst: d >= 0.15 && d < 1.05 ? (d - 0.15) / 0.9 : null,
  };
}
export const heartAt = (t: number): Organ => organ(t, HEART_AT);
export const brainAt = (t: number): Organ => organ(t, BRAIN_AT);
/** The heart's beat: a quick double thump about once a second (a whole number a loop). */
const BEATS = 28;
export const beatAt = (t: number): number => {
  const raw = ((wrap(t) * BEATS) / LOOP_S) % 1;
  // Folded to -0.5 .. 0.5 so the thump just before a beat's start is round it too.
  const p = raw > 0.5 ? raw - 1 : raw;
  return Math.exp(-((p / 0.06) ** 2)) + 0.6 * Math.exp(-(((p - 0.2) / 0.06) ** 2));
};

// ---------------------------------------------------------------- the axolotl

/** World px per axolotl drawing unit. */
export const AXO_K = 2.4;
export const HOME = { x: 560, y: 820 } as const;

export interface Axolotl extends Pt {
  readonly tilt: number;
  readonly alpha: number;
  /** Pop-in scale as it comes back on "Honestly?". */
  readonly scale: number;
  /** How wide it smiles: 1 its usual smile, 0 flat (sad), up to ~1.8 a grin. */
  readonly smile: number;
  /** Eyes squeezed happy, 0 .. 1. */
  readonly squint: number;
  /** Eyes drooping sad, 0 .. 1. */
  readonly droop: number;
  /** A smug half-lidded look, 0 .. 1 ("Honestly?"). */
  readonly smug: number;
  /** The body's swimming wave: phase and size. */
  readonly wave: number;
  readonly wiggle: number;
  /** The gills' sway, radians. */
  readonly gills: number;
}

/** It fades away on "almost gone" and pops back on "Honestly?". */
export function axolotlAlphaAt(t: number): number {
  const u = wrap(t);
  if (u < HONESTLY_AT - 0.08) return 1 - ramp(u, ALMOST_AT - 0.1, GONE_END + 0.15);
  return ramp(u, HONESTLY_AT - 0.08, HONESTLY_AT + 0.12);
}

export function axolotlAt(t: number): Axolotl {
  const u = wrap(t);
  const laugh = window01(u, YES_AT, REAL_AT + 0.4, 0.25);
  const sad = window01(u, BUT_AT, HONESTLY_AT, 0.5);
  const grin = window01(u, CUTER_AT - 0.1, AND_AT + 0.35, 0.25);
  const cheeky = window01(u, HONESTLY_AT, AND_AT + 0.2, 0.25);
  const wonder = Math.exp(-(((u - LEGS_AT - 0.2) / 0.4) ** 2));
  const wiggle = 0.35 + 0.9 * laugh + 0.5 * cheeky - 0.25 * sad;
  return {
    x: HOME.x + 14 * cheeky * cycles(u, 30),
    y: HOME.y + 5 * cycles(u, 6) - 8 * wonder,
    tilt: -0.04 * wonder + 0.06 * laugh * cycles(u, 27) - 0.05 * cheeky + 0.03 * sad,
    alpha: axolotlAlphaAt(u),
    scale: u >= HONESTLY_AT - 0.08 ? pop(u - HONESTLY_AT + 0.08, 0.22, 0.14) : 1,
    smile: 1 + 0.35 * laugh + 0.3 * wonder - 1 * sad + 0.5 * grin + 0.25 * cheeky,
    squint: Math.max(laugh, grin),
    droop: sad,
    smug: window01(u, HONESTLY_AT - 0.05, CUTER_AT, 0.15),
    wave: (2 * Math.PI * 9 * u) / LOOP_S,
    wiggle,
    gills: 0.06 * cycles(u, 12) + 0.08 * laugh * cycles(u, 36),
  };
}

// ---------------------------------------------------------------- the blocky one

export interface Blocky extends Pt {
  readonly scale: number;
  readonly tilt: number;
  /** Little hop, world px. */
  readonly hop: number;
  /** Bursting into cubes as it goes, 0 .. 1. */
  readonly poof: number;
}

const BLOCKY_HOME = { x: 1010, y: 520 } as const;
export const BLOCKY_LEN = 560;
const BLOCKY_GONE = REAL_AT + 0.35;

/** The blocky cube axolotl: pops in on "Yes,", wiggles with the real one, bursts into cubes after "real.". */
export function blockyAt(t: number): Blocky | null {
  const u = wrap(t);
  if (u < YES_AT - 0.02 || u > BLOCKY_GONE + 0.4) return null;
  const d = u - YES_AT + 0.02;
  return {
    ...BLOCKY_HOME,
    scale: pop(d, 0.2, 0.25),
    tilt: 0.12 * Math.sin(2 * Math.PI * 2.4 * d),
    hop: -26 * Math.abs(Math.sin(2 * Math.PI * 1.2 * d)),
    poof: ramp(u, BLOCKY_GONE, BLOCKY_GONE + 0.4),
  };
}

// ---------------------------------------------------------------- the puppy

export interface Puppy extends Pt {
  readonly scale: number;
  /** Offended, 0 .. 1: brows down, pout, looking sideways at the axolotl. */
  readonly huff: number;
  readonly tilt: number;
}

const PUPPY_IN = ANY_AT - 0.32;
const PUPPY_HOME = { x: 990, y: 380 } as const;

/** The puppy in its air bubble: floats in on "than any", offended on "puppy.", floats off up on "And no matter what,". */
export function puppyAt(t: number): Puppy | null {
  const u = wrap(t);
  if (u < PUPPY_IN || u > WHAT_AT + 0.25) return null;
  const rise = ramp(u, AND_AT - 0.1, WHAT_AT + 0.25);
  return {
    x: PUPPY_HOME.x + 40 * rise,
    y: PUPPY_HOME.y + 14 * Math.sin(2 * Math.PI * 0.9 * (u - PUPPY_IN)) - 1100 * rise ** 1.6,
    scale: pop(u - PUPPY_IN, 0.24, 0.16),
    huff: ramp(u, PUPPY_AT + 0.05, PUPPY_AT + 0.3),
    tilt: 0.06 * Math.sin(2 * Math.PI * 0.7 * (u - PUPPY_IN)) - 0.1 * ramp(u, PUPPY_AT + 0.05, PUPPY_AT + 0.3),
  };
}
/** The puppy's "hmph" puff and cross mark, 0 .. 1. */
export const hmphAt = (t: number): number => window01(wrap(t), PUPPY_AT + 0.15, AND_AT + 0.1, 0.15);
/** Little hearts round the grinning axolotl on "cuter". */
export const heartsAt = (t: number): number => window01(wrap(t), CUTER_AT - 0.05, PUPPY_AT + 0.1, 0.2);

// ---------------------------------------------------------------- light and colour

/** Night in the time-lapse, 0 day .. 1 night: DAYS nights between the days. */
export const nightAt = (t: number): number => {
  const p = lapseAt(t);
  return p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * DAYS * p) ** 2;
};
/** The sun and moon going round over the time-lapse: their angle (0 the sun overhead), and how much they show. */
export const skyClockAt = (t: number): { readonly angle: number; readonly alpha: number } => ({
  angle: 2 * Math.PI * DAYS * lapseAt(t),
  alpha: window01(wrap(t), LAPSE[0] - 0.25, LAPSE[1] + 0.25, 0.25),
});

export interface Grade {
  /** The colour drained, 0 .. 1. */
  readonly drain: number;
  /** The water darkened, 0 .. 1 (night, and the see-through beat so the glows show). */
  readonly dark: number;
  /** A warm golden wash, 0 .. 1 (the wonder of the bud). */
  readonly warm: number;
  /** A rosy, bright wash, 0 .. 1 (the cheeky beat). */
  readonly rosy: number;
}

export function gradeAt(t: number): Grade {
  const u = wrap(t);
  const drain = u < HONESTLY_AT - 0.1 ? 0.78 * ramp(u, BUT_AT - 0.05, PLACE_AT) : 0.78 * (1 - ramp(u, HONESTLY_AT - 0.1, HONESTLY_AT + 0.2));
  return {
    drain,
    dark: Math.max(0.55 * nightAt(u), 0.5 * xrayAt(u)),
    warm: Math.max(1 - ramp(u, YES_AT - 0.2, YES_AT + 0.3), ramp(u, AND_AT - 0.2, WHAT_AT + 0.15)),
    rosy: window01(u, HONESTLY_AT - 0.05, AND_AT + 0.3, 0.3),
  };
}

/** How far the city has risen out of the haze: on "Mexico City". */
export const cityAt = (t: number): number => ramp(wrap(t), MEXICO_AT - 0.35, MEXICO_AT + 0.6) * (wrap(t) < HONESTLY_AT + 0.6 ? 1 : 0);
/** The trajineras drifting along the canal: world px moved. */
export const boatDriftAt = (t: number): number => 70 * (wrap(t) - BUT_AT);

// ---------------------------------------------------------------- the camera

/** World px shown at the screen's centre, and the zoom. */
export const CENTRE = { x: 540, y: 800 } as const;
/** The canal's surface and bed, world y. */
export const SURFACE_Y = -520;
export const BED_Y = 975;

interface Shot {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}
const OPEN: Shot = { zoom: 2.2, x: 735, y: 870 };
const MEET: Shot = { zoom: 0.72, x: 690, y: 740 };
const GROW: Shot = { zoom: 1.9, x: 700, y: 900 };
const LEG: Shot = { zoom: 3.3, x: 705, y: 925 };
const ORGANS: Shot = { zoom: 1.45, x: 720, y: 800 };
const WILD: Shot = { zoom: 0.33, x: 620, y: 275 };
const WILD_IN: Shot = { zoom: 0.37, x: 600, y: 300 };
const CHEEKY: Shot = { zoom: 0.95, x: 720, y: 700 };

const SHOTS: readonly (readonly [number, Shot])[] = [
  [0, OPEN],
  [LEGS_AT + 0.45, OPEN],
  [YES_AT + 0.5, MEET],
  [REAL_AT + 0.35, MEET],
  [LOSE_AT + 0.55, GROW],
  [GROWS_AT + 0.2, GROW],
  [BONES_AT + 0.45, LEG],
  [TOES_AT + 0.6, LEG],
  [FIX_AT + 0.3, ORGANS],
  [BUT_AT - 0.1, ORGANS],
  [WILD_AT + 0.75, WILD],
  [GONE_END, WILD_IN],
  [HONESTLY_AT - 0.05, WILD_IN],
  [HONESTLY_AT + 0.65, CHEEKY],
  [AND_AT, CHEEKY],
  [WHAT_AT + 0.15, OPEN],
  [LOOP_S, OPEN],
];
const keysOf = (f: (s: Shot) => number): Key[] => SHOTS.map(([t, s]) => ({ t, at: f(s), rate: 0 }));
// Zoom eases in log space, so a pull back feels even.
const ZOOM_KEYS = keysOf((s) => Math.log(s.zoom));
const X_KEYS = keysOf((s) => s.x);
const Y_KEYS = keysOf((s) => s.y);

export interface Camera extends Shot {}

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  return { zoom: Math.exp(curveAt(ZOOM_KEYS, u).at), x: curveAt(X_KEYS, u).at, y: curveAt(Y_KEYS, u).at };
}

export const toScreen = (cam: Camera, p: Pt): Pt => ({ x: (p.x - cam.x) * cam.zoom + CENTRE.x, y: (p.y - cam.y) * cam.zoom + CENTRE.y });
