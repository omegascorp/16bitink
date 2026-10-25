import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This tiny shark bites holes in SUBMARINES!": the cookiecutter shark
 * (Isistius brasiliensis), 42–56 cm long, seals onto its victim with suction
 * lips, anchors with its upper teeth and twists, so its lower teeth cut out a
 * round plug. In the 1970s US Navy submarines came home with round bites in
 * the rubber boots of their sonar domes, and a secret weapon was suspected at
 * first. Told by a narrator (words.ts), every beat timed to the words, a
 * function of time in seconds over a loop of LOOP_S. One mood a sentence; the
 * colour, the camera and the shark's face change with it:
 *
 *   0     "This tiny shark bites holes in SUBMARINES!" (surprised): the little
 *         shark sealed onto a submarine's huge black rubber bow, belly faintly
 *         glowing, two round holes beside it; on "bites" it spins, on "holes"
 *         it pops off with a plug, leaving a fresh hole; on "SUBMARINES!" the
 *         camera pulls back: the whole bow and the sail, the shark a speck
 *   2.8   "It's just twenty inches long, with a belly that GLOWS." (curious):
 *         the shark alone in blue water, "20 in (50 cm)"; on "GLOWS" the
 *         lights go down and its belly glows green-blue
 *   5.84  "It latches on with suction lips… then SPINS, cutting out a perfect
 *         circle." (dramatic): it dives onto the rubber, the camera closes on
 *         the lips sealing, pulls back, it spins with motion lines and pulls
 *         a plug out; a gold ring round the perfect hole and a cookie cutter
 *         in dough beside it
 *  10.37  "In the seventies, Navy submarines came home BITTEN!" (nervous): a
 *         grey naval harbour, a submarine surfaces bow up, "US Navy, 1970s";
 *         on "BITTEN!" we punch in on the holes in its dome, sailors pointing
 *  13.33  "They suspected a secret weapon…" (tension): a red alarm light, a
 *         shadowy blueprint of a mystery weapon, "?", a "SECRET" stamp
 *  15.30  "Nope. Just this little guy." (chuckles): the blueprint whips away,
 *         the shark pops up with a smug grin, and winks on "little guy"
 *  17.02  "So yes," back on the hull: it swims in and seals on, frame 1.
 */

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

export const TINY_AT = said('tiny');
export const BITES_AT = said('bites');
export const HOLES_AT = said('holes');
export const SUBS_AT = said('SUBMARINES!');
export const ITS_AT = said("It's");
export const TWENTY_AT = said('twenty');
export const BELLY_AT = said('belly');
export const GLOWS_AT = said('GLOWS.');
export const IT_AT = said('It');
export const LATCHES_AT = said('latches');
export const SUCTION_AT = said('suction');
export const LIPS_AT = said('lips…');
export const THEN_AT = said('then');
export const SPINS_AT = said('SPINS,');
export const CUTTING_AT = said('cutting');
export const PERFECT_AT = said('perfect');
export const CIRCLE_AT = said('circle.');
export const IN_AT = said('In');
export const SEVENTIES_AT = said('seventies,');
export const NAVY_AT = said('Navy');
export const SUBMARINES_AT = said('submarines');
export const CAME_AT = said('came');
export const BITTEN_AT = said('BITTEN!');
export const THEY_AT = said('They');
export const SUSPECTED_AT = said('suspected');
export const SECRET_AT = said('secret');
export const WEAPON_AT = said('weapon…');
export const NOPE_AT = said('Nope.');
export const JUST_AT = said('Just');
export const LITTLE_AT = said('little');
export const GUY_AT = said('guy.');
export const SO_AT = said('So');

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

export interface Pt {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------- the scenes

/** Where the picture cuts: a beat or so before each sentence's first word. */
export const CUT = {
  alone: ITS_AT - 0.08,
  drill: IT_AT - 0.1,
  harbour: IN_AT - 0.1,
  blueprint: THEY_AT - 0.1,
  smug: NOPE_AT - 0.04,
  back: SO_AT - 0.12,
} as const;

export type SceneId = 'hull' | 'alone' | 'drill' | 'harbour' | 'blueprint' | 'smug';

export function sceneAt(t: number): SceneId {
  const u = wrap(t);
  if (u < CUT.alone) return 'hull';
  if (u < CUT.drill) return 'alone';
  if (u < CUT.harbour) return 'drill';
  if (u < CUT.blueprint) return 'harbour';
  if (u < CUT.smug) return 'blueprint';
  if (u < CUT.back) return 'smug';
  return 'hull';
}

/** `value` while t is in [from, to), else `rest`: keeps a beat's values to its own scene, so they come round with the loop. */
export const during = (t: number, from: number, to: number, value: number, rest = 0): number => {
  const u = wrap(t);
  return u >= from && u < to ? value : rest;
};

/** The new scene settling after a cut: a little zoom that eases off, 1 → 0. */
export function settleAt(t: number): number {
  const u = wrap(t);
  const cuts = [CUT.alone, CUT.drill, CUT.harbour, CUT.blueprint];
  for (const c of cuts) if (u >= c && u < c + 0.45) return 1 - ramp(u, c, c + 0.45);
  return 0;
}

/** The blueprint whipped off the screen on "Nope.", 0 (in place) → 1 (gone). */
export const whiskAt = (t: number): number => {
  const u = wrap(t);
  return u < CUT.back ? ramp(u, NOPE_AT - 0.04, NOPE_AT + 0.26) : 0;
};
/** The smug scene's water still showing over the hull on "So yes,": 1 → 0 (0 everywhere else). */
export const backAt = (t: number): number => {
  const u = wrap(t);
  return u >= CUT.back ? 1 - ramp(u, CUT.back, SO_AT + 0.3) : 0;
};

// ---------------------------------------------------------------- the shark

export type EyeMood = 'open' | 'wide' | 'wink' | 'smug' | 'squint';

/** The shark on screen (or in the hull's world): its nose tip, heading, length and face. */
export interface SharkPose {
  readonly nose: Pt;
  /** The way its nose points, radians (y down). */
  readonly angle: number;
  readonly len: number;
  /** Turned about its own long axis, radians (0: its left side to us, back up). */
  readonly roll: number;
  /** The suction lips: 0 shut .. 1 flared and sealed. */
  readonly lips: number;
  /** 0 .. 1 a toothy grin. */
  readonly grin: number;
  readonly eye: EyeMood;
  /** The belly's glow, 0 .. 1. */
  readonly glow: number;
  /** A round rubber plug held in its lips, 0 .. 1. */
  readonly plug: number;
  /** Tail beat phase (radians) and how hard it swims, 0 .. 1. */
  readonly beat: number;
  readonly effort: number;
  /** Motion lines round the spinning body, 0 .. 1. */
  readonly whirl: number;
}

const BASE: Omit<SharkPose, 'nose' | 'angle' | 'len'> = {
  roll: 0, lips: 0, grin: 0, eye: 'open', glow: 0.35, plug: 0, beat: 0, effort: 0.4, whirl: 0,
};

/** A spring settling from 0 to 1 over about `dur` s from `from` (overshooting a little). */
export function spring(u: number, from: number, dur: number): number {
  const s = (u - from) / dur;
  if (s <= 0) return 0;
  if (s >= 1.6) return 1;
  return 1 - Math.exp(-4.5 * s) * Math.cos(5.5 * s);
}

// ---------------------------------------------------------------- the hull (frame 1)

/**
 * The submarine's bow in profile, in the hull scene's world px (screen px at
 * frame 1's camera): its axis, radius, where the rubber dome's cap meets the
 * steel hull, the nose tip, and the sail far back along the top.
 */
export const SUB = { axisY: 900, radius: 300, capX: 600, capLen: 240, sailX: 650, sailW: 240, sailH: 290 } as const;

/** Where on the dome's rim it seals on: up and forward of the cap's centre (an angle round the cap). */
const RIM_A = (-150 * Math.PI) / 180;
/** The way out of the rubber there. */
const RIM = { x: SUB.capX + SUB.capLen * Math.cos(RIM_A), y: SUB.axisY + SUB.radius * Math.sin(RIM_A) };
const OUT = (() => {
  const n = { x: Math.cos(RIM_A) / SUB.capLen, y: Math.sin(RIM_A) / SUB.radius };
  const l = Math.hypot(n.x, n.y);
  return { x: n.x / l, y: n.y / l };
})();
/** Where the shark's nose sits in frame 1 (just off the rim, its lips clamped on), and the way its nose points: into the rubber, angled a little as it twists. */
export const LATCH: Pt = { x: RIM.x + 5 * OUT.x, y: RIM.y + 5 * OUT.y };
export const LATCH_ANGLE = Math.atan2(-OUT.y, -OUT.x) + 0.22;
export const HULL_LEN = 390;
/** The dimple its lips pull in the rubber. */
export const DIMPLE: Pt = { x: LATCH.x - 14 * OUT.x, y: LATCH.y - 14 * OUT.y };

/** The round holes already in the rubber in frame 1, right beside it (world px, radius). */
export const OLD_HOLES: readonly { readonly x: number; readonly y: number; readonly r: number }[] = [
  { x: 478, y: 800, r: 36 },
  { x: 540, y: 905, r: 33 },
  { x: 560, y: 712, r: 30 },
];
/** The fresh hole, where the lips were. */
export const FRESH_HOLE = { x: LATCH.x - 40 * OUT.x, y: LATCH.y - 40 * OUT.y, r: 34 } as const;

/** The fresh hole the shark leaves on "holes", 0 .. 1 (only in the hook). */
export const freshHoleAt = (t: number): number => {
  const u = wrap(t);
  return u >= HOLES_AT + 0.04 && u < CUT.alone ? 1 : 0;
};

/** The shark sealed on in frame 1: breathing against the rubber, its tail beating to hold on. */
export function latchedShark(t: number): SharkPose {
  return {
    ...BASE,
    nose: { x: LATCH.x + 2 * Math.sin(cycles(12, t)), y: LATCH.y + 2 * Math.sin(cycles(12, t) + 1) },
    angle: LATCH_ANGLE + 0.05 * Math.sin(cycles(9, t)),
    len: HULL_LEN,
    // Twisting against its grip.
    roll: 0.18 * Math.sin(cycles(6, t)),
    lips: 1,
    eye: 'open',
    glow: 0.5,
    beat: cycles(30, t),
    effort: 0.35,
  };
}

/** The hook's shark: sealed, spinning on "bites", popping off with a plug on "holes", hovering off. */
export function hookShark(t: number): SharkPose {
  const u = wrap(t);
  const held = latchedShark(t);
  if (u < BITES_AT - 0.04) return held;
  const spinEnd = HOLES_AT + 0.04;
  if (u < spinEnd) {
    const s = clamp01((u - BITES_AT + 0.04) / (spinEnd - BITES_AT + 0.04));
    return { ...held, roll: held.roll + 4 * Math.PI * (s * s * (3 - 2 * s)), eye: 'squint', whirl: Math.sin(Math.PI * s), effort: 1 };
  }
  // Popped off: backing away along the way it came, the plug in its lips.
  const back = 110 * spring(u, spinEnd, 0.5);
  const bob = 6 * Math.sin(cycles(10, t));
  return {
    ...held,
    nose: { x: LATCH.x + OUT.x * back, y: LATCH.y + OUT.y * back + bob },
    angle: LATCH_ANGLE - 0.08 * ramp(u, spinEnd, spinEnd + 0.4),
    lips: 0.35,
    plug: 1,
    eye: 'wide',
    effort: 0.7,
  };
}

/** The hull scene's camera: frame 1's close, tilted view (the hull running diagonally up to the sail), pulled right back on "SUBMARINES!". */
export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  /** Turned, radians: the world drawn rotated by this on screen. */
  readonly angle: number;
}

const rot = (p: Pt, a: number): Pt => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });

/** World px to screen px, and back. */
export const toScreen = (v: View, p: Pt): Pt => {
  const q = rot({ x: (p.x - v.x) * v.zoom, y: (p.y - v.y) * v.zoom }, v.angle);
  return { x: q.x + 540, y: q.y + 960 };
};
export const toWorld = (v: View, p: Pt): Pt => {
  const q = rot({ x: p.x - 540, y: p.y - 960 }, -v.angle);
  return { x: q.x / v.zoom + v.x, y: q.y / v.zoom + v.y };
};

const CAM0_ZOOM = 1.26;
const CAM0_ANGLE = -0.1;
/** Frame 1: the shark's lips a little above the middle of the screen. */
const LATCH_ON_SCREEN: Pt = { x: 505, y: 890 };
export const HULL_CAM0: View = (() => {
  const d = rot({ x: (LATCH_ON_SCREEN.x - 540) / CAM0_ZOOM, y: (LATCH_ON_SCREEN.y - 960) / CAM0_ZOOM }, -CAM0_ANGLE);
  return { x: LATCH.x - d.x, y: LATCH.y - d.y, zoom: CAM0_ZOOM, angle: CAM0_ANGLE };
})();
const HULL_CAM_WIDE: View = { x: 980, y: 760, zoom: 0.55, angle: -0.05 };

export function hullCamAt(t: number): View {
  const u = wrap(t);
  const e = u < CUT.alone ? ramp(u, SUBS_AT - 0.06, SUBS_AT + 0.6) : 0;
  // Zoom on a log scale, so the pull-back feels even.
  const z = Math.exp(lerp(Math.log(HULL_CAM0.zoom), Math.log(HULL_CAM_WIDE.zoom), e));
  const k = (1 / z - 1 / HULL_CAM0.zoom) / (1 / HULL_CAM_WIDE.zoom - 1 / HULL_CAM0.zoom);
  return { x: lerp(HULL_CAM0.x, HULL_CAM_WIDE.x, k), y: lerp(HULL_CAM0.y, HULL_CAM_WIDE.y, k), zoom: z, angle: lerp(HULL_CAM0.angle, HULL_CAM_WIDE.angle, e) };
}

// ---------------------------------------------------------------- alone (curious)

export const ALONE_LEN = 760;
const ALONE_NOSE: Pt = { x: 920, y: 760 };

export function aloneShark(t: number): SharkPose {
  const u = wrap(t);
  const swim = spring(u, CUT.alone, 0.55);
  return {
    ...BASE,
    nose: { x: lerp(330, ALONE_NOSE.x, swim), y: ALONE_NOSE.y + 10 * Math.sin(cycles(8, t)) },
    angle: 0.03 * Math.sin(cycles(7, t)),
    len: ALONE_LEN,
    eye: u > GLOWS_AT - 0.1 ? 'wide' : 'open',
    glow: lerp(0.2, 1, ramp(u, GLOWS_AT - 0.05, GLOWS_AT + 0.35)),
    beat: cycles(36, t),
    effort: lerp(1, 0.45, swim),
  };
}

/** The "20 in (50 cm)" bar, from "twenty" until the lights go down. */
export const sizeBarAt = (t: number): number => window01(wrap(t), TWENTY_AT - 0.06, GLOWS_AT + 0.25, 0.15);
/** The lights going down on "GLOWS", 0 .. 1. */
export const dimAt = (t: number): number => during(t, CUT.alone, CUT.drill, ramp(wrap(t), GLOWS_AT - 0.08, GLOWS_AT + 0.3));

// ---------------------------------------------------------------- the drill (dramatic)

/** Where the lips meet the rubber in the close-up (screen px), and the shark's length there. */
export const CONTACT: Pt = { x: 520, y: 1010 };
export const DRILL_LEN = 700;
const HOVER_Y = 600;
const PULLED_Y = 770;
const SPIN_FROM = SPINS_AT - 0.06;
const SPIN_TO = CUTTING_AT + 0.16;

export function drillShark(t: number): SharkPose {
  const u = wrap(t);
  const dive = ramp(u, LATCHES_AT - 0.05, LATCHES_AT + 0.32);
  const pull = spring(u, SPIN_TO, 0.5);
  const y = u < SPIN_TO ? lerp(HOVER_Y, CONTACT.y, dive * dive) : lerp(CONTACT.y, PULLED_Y, pull);
  const sealed = u >= LATCHES_AT + 0.3 && u < SPIN_TO;
  const s = clamp01((u - SPIN_FROM) / (SPIN_TO - SPIN_FROM));
  const spinning = u >= SPIN_FROM && u < SPIN_TO;
  return {
    ...BASE,
    nose: { x: CONTACT.x + (u < LATCHES_AT ? 8 * Math.sin(cycles(40, t)) : 0), y },
    angle: Math.PI / 2 + (sealed ? 0 : 0.04 * Math.sin(cycles(8, t))),
    len: DRILL_LEN,
    roll: spinning ? 6 * Math.PI * (s * s * (3 - 2 * s)) : 0,
    lips: sealed ? lerp(0.45, 1, ramp(u, SUCTION_AT - 0.1, LIPS_AT + 0.15)) : u >= SPIN_TO ? 0.3 : 0.1,
    eye: sealed || spinning ? 'squint' : u >= SPIN_TO ? 'open' : 'open',
    glow: 0.25,
    plug: u >= SPIN_TO ? 1 : 0,
    beat: cycles(40, t),
    effort: spinning ? 1 : 0.6,
    whirl: spinning ? Math.min(1, Math.sin(Math.PI * s) * 1.6) : 0,
  };
}

/** The camera in the close-up: closing on the lips for "suction lips…", back out for the spin. */
export function drillZoomAt(t: number): number {
  const u = wrap(t);
  return 1 + 0.85 * ramp(u, SUCTION_AT - 0.2, SUCTION_AT + 0.3) * (1 - ramp(u, THEN_AT - 0.05, SPINS_AT - 0.02));
}

/** Water streaming into the sealing lips, 0 .. 1. */
export const suctionAt = (t: number): number => window01(wrap(t), SUCTION_AT - 0.1, LIPS_AT + 0.4, 0.15);
/** The hole in the close-up's rubber, shown once the plug is out. */
export const drillHoleAt = (t: number): number => during(t, SPIN_TO, CUT.harbour, 1);
/** The gold ring drawn round the perfect hole, 0 .. 1 of the way round, and its fade. */
export const ringAt = (t: number): { readonly sweep: number; readonly alpha: number } => {
  const u = wrap(t);
  return { sweep: during(t, CUT.drill, CUT.harbour, ramp(u, PERFECT_AT - 0.05, CIRCLE_AT + 0.15)), alpha: window01(u, PERFECT_AT - 0.06, CUT.harbour, 0.12) };
};
/** The cookie-cutter inset: how far it's open, how far the cutter is pressed in (0 up .. 1 down), and whether the cookie is cut. */
export function insetAt(t: number): { readonly open: number; readonly press: number; readonly cut: number } {
  const u = wrap(t);
  const open = window01(u, CUTTING_AT - 0.15, CUT.harbour - 0.05, 0.18);
  const press = ramp(u, CUTTING_AT, CUTTING_AT + 0.22) * (1 - ramp(u, PERFECT_AT - 0.05, PERFECT_AT + 0.25));
  return { open, press, cut: u > CUTTING_AT + 0.2 ? 1 : 0 };
}
/** A shake while it spins. */
export function drillShakeAt(t: number): Pt {
  const u = wrap(t);
  const a = 5 * window01(u, SPIN_FROM, SPIN_TO, 0.1);
  return { x: a * Math.sin(u * 90), y: a * 0.6 * Math.cos(u * 110) };
}

// ---------------------------------------------------------------- the harbour (nervous)

/** The submarine at the harbour: its nose tip (screen px), and its tilt (radians, bow up). */
export interface SubPose {
  readonly nose: Pt;
  readonly tilt: number;
}

const SUB_KEYS = [
  { t: CUT.harbour, x: 820, y: 1090, tilt: 0.36 },
  { t: SEVENTIES_AT + 0.05, x: 760, y: 1010, tilt: 0.36 },
  { t: SEVENTIES_AT + 0.55, x: 560, y: 790, tilt: 0.3 },
  { t: CAME_AT, x: 430, y: 850, tilt: 0.12 },
  { t: CUT.blueprint, x: 400, y: 858, tilt: 0.1 },
] as const;
const track = (field: 'x' | 'y' | 'tilt'): readonly Key[] => SUB_KEYS.map((k) => ({ t: k.t, at: k[field], rate: 0 }));
const SUB_X = track('x');
const SUB_Y = track('y');
const SUB_TILT = track('tilt');

export function subAt(t: number): SubPose {
  const u = wrap(t);
  return {
    nose: { x: curveAt(SUB_X, u).at, y: curveAt(SUB_Y, u).at + 4 * Math.sin(cycles(9, t)) },
    tilt: curveAt(SUB_TILT, u).at + 0.01 * Math.sin(cycles(7, t)),
  };
}

/** Spray as the bow bursts out, 0 .. 1 over its life (or out of range). */
export const burstAt = (t: number): number => (wrap(t) - SEVENTIES_AT) / 1.1;
/** The punch in on "BITTEN!": the zoom, and the point it closes on. */
export function harbourCamAt(t: number): { readonly zoom: number; readonly focus: Pt } {
  const u = wrap(t);
  return { zoom: 1 + during(t, CUT.harbour, CUT.blueprint, 0.75 * ramp(u, BITTEN_AT - 0.1, BITTEN_AT + 0.16)), focus: { x: 330, y: 860 } };
}
export function harbourShakeAt(t: number): Pt {
  const s = wrap(t) - BITTEN_AT + 0.02;
  if (s < 0 || s > 0.4) return { x: 0, y: 0 };
  const a = 14 * (1 - s / 0.4) ** 2;
  return { x: a * Math.sin(s * 110), y: a * 0.7 * Math.cos(s * 140) };
}
/** "US Navy, 1970s" from "seventies" to the end of the beat. */
export const navyLabelAt = (t: number): number => window01(wrap(t), SEVENTIES_AT - 0.05, CUT.blueprint, 0.18);
/** The sailors' "!", popping on "BITTEN!". */
export const alarmMarksAt = (t: number): number => {
  const s = wrap(t) - BITTEN_AT;
  if (s < 0 || wrap(t) > CUT.blueprint) return 0;
  return s < 0.12 ? (s / 0.12) * 1.2 : 1 + 0.2 * Math.max(0, 1 - (s - 0.12) / 0.1);
};
/** How far the sailors' arms are up, pointing at the bow. */
export const pointAt = (t: number): number => during(t, CUT.harbour, CUT.blueprint, ramp(wrap(t), CAME_AT - 0.2, BITTEN_AT));

// ---------------------------------------------------------------- the blueprint (tension)

/** The red alarm light's pulse, 0 .. 1, about twice a second. */
export function alarmAt(t: number): number {
  const u = wrap(t);
  if (u < CUT.blueprint || u > CUT.back) return 0;
  return Math.max(0, Math.sin(2 * Math.PI * (u - CUT.blueprint) * 2.1 - 0.3)) ** 2;
}
/** The weapon drawing itself in, 0 .. 1. */
export const sketchAt = (t: number): number => during(t, CUT.blueprint, CUT.back, ramp(wrap(t), CUT.blueprint, SUSPECTED_AT + 0.5));
/** The "?" popping up. */
export const questionAt = (t: number): number => during(t, CUT.blueprint, CUT.back, spring(wrap(t), SUSPECTED_AT - 0.05, 0.4));
/** The "SECRET" stamp slamming down: its scale (big → 1) and alpha. */
export function stampAt(t: number): { readonly scale: number; readonly alpha: number } {
  const u = wrap(t);
  const s = (u - SECRET_AT + 0.02) / 0.13;
  // Only while the blueprint is up.
  if (s < 0 || u >= CUT.back) return { scale: 1, alpha: 0 };
  return { scale: s < 1 ? lerp(1.9, 1, s * s) : 1 + 0.05 * Math.exp(-(s - 1) * 4) * Math.sin((s - 1) * 9), alpha: clamp01(s * 1.5) };
}
/** A slow push in on the blueprint. */
export const blueprintZoomAt = (t: number): number => 1 + during(t, CUT.blueprint, CUT.back, 0.07 * ramp(wrap(t), CUT.blueprint, NOPE_AT));
export const stampShakeAt = (t: number): Pt => {
  const s = wrap(t) - SECRET_AT - 0.1;
  if (s < 0 || s > 0.25) return { x: 0, y: 0 };
  const a = 9 * (1 - s / 0.25) ** 2;
  return { x: a * Math.sin(s * 120), y: a * Math.cos(s * 150) };
};

// ---------------------------------------------------------------- smug (chuckles), and back to the hull

export const SMUG_LEN = 660;
const SMUG_NOSE: Pt = { x: 870, y: 800 };

export function smugShark(t: number): SharkPose {
  const u = wrap(t);
  const pop = spring(u, NOPE_AT + 0.02, 0.45);
  const winking = u >= LITTLE_AT - 0.03 && u < GUY_AT + 0.34;
  return {
    ...BASE,
    nose: { x: SMUG_NOSE.x, y: lerp(1750, SMUG_NOSE.y, pop) + 8 * Math.sin(cycles(8, t)) },
    angle: -0.1 + 0.04 * Math.sin(cycles(6, t)) - 0.25 * (1 - pop),
    len: SMUG_LEN,
    grin: ramp(u, NOPE_AT + 0.3, NOPE_AT + 0.55),
    eye: winking ? 'wink' : 'smug',
    glow: 0.4,
    beat: cycles(28, t),
    effort: 0.5,
  };
}

/** A sparkle by the winking eye, 0 .. 1 over its life (or out of range). */
export const sparkleAt = (t: number): number => (wrap(t) - LITTLE_AT + 0.02) / 0.5;

/** On "So yes,": from the smug pose back onto the hull, sealing on just before the loop comes round. */
const SEAL_AT = SO_AT + 0.55;
export function backShark(t: number): SharkPose {
  const u = wrap(t);
  const held = latchedShark(t);
  if (u >= SEAL_AT) return held;
  // The smug pose was on screen: into the hull's world, so the hand-over doesn't jump.
  const onScreen = smugShark(CUT.back);
  const from = { ...onScreen, nose: toWorld(HULL_CAM0, onScreen.nose), len: onScreen.len / HULL_CAM0.zoom, angle: onScreen.angle - HULL_CAM0.angle };
  const e = ramp(u, CUT.back, SEAL_AT);
  // A little arc on the way in.
  const lift = -70 * Math.sin(Math.PI * e);
  return {
    ...held,
    nose: { x: lerp(from.nose.x, held.nose.x, e), y: lerp(from.nose.y, held.nose.y, e) + lift },
    angle: lerp(from.angle, held.angle, e),
    len: lerp(from.len, held.len, e),
    lips: ramp(u, SEAL_AT - 0.2, SEAL_AT),
    eye: e < 0.5 ? 'smug' : 'open',
    grin: 1 - ramp(u, CUT.back, CUT.back + 0.3),
    glow: lerp(from.glow, held.glow, e),
    effort: 0.9,
  };
}

/** How hard its lips are pulling the rubber in the hull scene: sealed in frame 1 and through the spin, sealing again on "So yes,". */
export function sealedAt(t: number): number {
  const u = wrap(t);
  if (u < CUT.back) return 1 - ramp(u, HOLES_AT + 0.02, HOLES_AT + 0.16);
  return ramp(u, SEAL_AT - 0.2, SEAL_AT);
}
