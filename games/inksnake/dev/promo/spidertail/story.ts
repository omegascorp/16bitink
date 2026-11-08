import { curveAt, type Key, lerp, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This snake's tail is a FAKE spider!": the spider-tailed horned viper
 * (Pseudocerastes urarachnoides) of the Zagros, told by a narrator
 * (words.ts). Every beat is a pure function of time over a loop of LOOP_S.
 * Most of it happens at rock level, in the world of frame 1, whose units are
 * frame 1's pixels; the camera leaves it for the bird's-eye view, for the
 * other day's light and for the sad close-up.
 *
 *   hook   "This snake's tail is a FAKE spider!" (surprise): low and close:
 *          lure, tail, coil, horned head, the warbler bending to the lure
 *   dawn   "Western Iran." (calm): the camera tilts up to the ridges
 *   lands  "A little warbler stops on a bare rock…" (tender)
 *   top    "…and there, on the stone… a spider! Legs twitching." (nervous):
 *          the bird's eye, the snake lost in the stone
 *   hops   "It hops closer…" (tension): rock level again, the bird nearing
 *   peck   "Peck!" on the lure; "And the ROCK bites back!" (shock): the
 *          hidden head bursts up and its jaws close on this bird
 *   freeze "A fifth of a second." (dramatic): held on the catch, "0.2 s",
 *          the lure still whole on the tail
 *   other  "One bird pecked the whole spider clean OFF!" (laugh): another
 *          bird on another day snatches it and flies away
 *   sad    "Bad day for the snake." (sarcastic): the face and the bare stub
 *   regrow "So yes," the stub regrows, a quick cut lands on frame 1
 */

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Whole cycles a loop, as a phase in radians: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * wrap(t)) / LOOP_S;

/** When a word of the voiceover begins in the loop (`nth` for a word said more than once). */
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

export const HOOK_END = ends('spider!');
export const WESTERN_AT = said('Western');
export const WARBLER_AT = said('warbler');
export const STOPS_AT = said('stops');
export const MIGRATION_AT = said('migration…');
export const AND_AT = said('and');
export const THERE_AT = said('there,');
export const SPIDER2_AT = said('spider!', 2);
export const LEGS_AT = said('Legs');
export const IT_AT = said('It');
export const HOPS_AT = said('hops');
export const PECK_AT = said('Peck!');
export const ROCK_AT = said('ROCK');
export const BITES_AT = said('bites');
export const FIFTH_AT = said('fifth');
export const ONE_AT = said('One');
export const PECKED_AT = said('pecked');
export const CLEAN_AT = said('clean');
export const OFF_AT = said('OFF!');
export const BAD_AT = said('Bad');
export const SNAKE_AT = said('snake.');
export const SO_AT = said('So');
export const YES_AT = said('yes,');

/** The head bursts from the rock just before "ROCK" is heard, so the bang lands on the word. */
export const BURST_AT = ROCK_AT - 0.04;
/** The jaws slam shut on "bites". */
export const BITE_AT = BITES_AT - 0.02;
/** Hard cuts: to the bird's eye, back to rock level, to the other day, to the sad close-up, and back to frame 1 just after "yes,". */
export const CUT_TOP = AND_AT - 0.04;
export const CUT_LOW = IT_AT - 0.08;
export const CUT_OTHER = ONE_AT - 0.04;
export const CUT_SAD = BAD_AT - 0.04;
export const CUT_HOME = YES_AT + 0.2;
/** The other day's bird pulls the bulb free on "clean" and flies. */
export const FLY_AT = CLEAN_AT;
/** The lure regrows over this span. */
export const REGROW = [SO_AT - 0.1, CUT_HOME - 0.05] as const;

export const bell = (u: number, from: number, to: number): number => (u <= from || u >= to ? 0 : Math.sin(((u - from) / (to - from)) * Math.PI));
const seq = (keys: readonly Key[], u: number): number => curveAt(keys, u).at;
const k = (t: number, at: number, rate?: number): Key => (rate === undefined ? { t, at } : { t, at, rate });

export type Shot = 'hook' | 'lands' | 'top' | 'low' | 'other' | 'sad';

/** While the camera is up on the ridges the rock out of sight changes to the landing's. */
const CUT_LANDS = 3.2;

export function shotAt(t: number): Shot {
  const u = wrap(t);
  if (u < CUT_LANDS || u >= CUT_HOME) return 'hook';
  if (u < CUT_TOP) return 'lands';
  if (u < CUT_LOW) return 'top';
  if (u < CUT_OTHER) return 'low';
  return u < CUT_SAD ? 'other' : 'sad';
}

/** How frozen the picture is (0 live .. 1 held on the catch): drives the drifting specks. */
export const frozen = (t: number): number => window01(wrap(t), BITE_AT + 0.5, CUT_OTHER, 0.2);

// ---------------------------------------------------------------- the snake's head

export interface HeadPose {
  /** The jaw hinge in the world, the way the head faces (radians; PI left), its size. */
  readonly bx: number;
  readonly by: number;
  readonly theta: number;
  readonly size: number;
  /** Jaws open 0..1, eyelid 0 open .. 1 shut, sorrow 0..1, tongue 0..1, where the pupil looks (0..1). */
  readonly open: number;
  readonly lid: number;
  readonly sorrow: number;
  readonly tongue: number;
  readonly look: number;
}

export const HEAD_SIZE = 0.76;
/** How far the jaws stay apart with the bird between them. */
export const GRIP = 0.37;
const REST: HeadPose = { bx: 1004, by: 630, theta: Math.PI - 0.02, size: HEAD_SIZE, open: 0, lid: 0.1, sorrow: 0, tongue: 0, look: 0.5 };
const SAD: HeadPose = { ...REST, theta: Math.PI, lid: 0.55, sorrow: 1, look: 1 };

const ROSE = BURST_AT + 0.1;
const STRIKE_X = [k(BURST_AT, REST.bx, 0), k(ROSE, 920), k(BITE_AT - 0.03, 810), k(BITE_AT + 0.06, 745), k(BITE_AT + 0.7, 770, 0)];
const STRIKE_Y = [k(BURST_AT, REST.by, 0), k(ROSE, 590), k(BITE_AT - 0.03, 650), k(BITE_AT + 0.06, 690), k(BITE_AT + 0.7, 626, 0)];
const STRIKE_T = [k(BURST_AT, REST.theta, 0), k(ROSE, Math.PI - 0.1), k(BITE_AT - 0.03, Math.PI + 0.06), k(BITE_AT + 0.06, Math.PI), k(BITE_AT + 0.7, Math.PI + 0.1, 0)];
const STRIKE_O = [k(BURST_AT, 0, 0), k(ROSE, 1, 0), k(BITE_AT - 0.03, 1, 0), k(BITE_AT + 0.07, GRIP, 0)];
const STRIKE_S = [k(BURST_AT, HEAD_SIZE, 0), k(ROSE, 1, 0), k(BITE_AT + 0.7, 0.98, 0)];

/** A point of the head's own drawing in the world (+x forward along the jaw from the hinge, +y towards the belly). */
export function headPoint(h: HeadPose, lx: number, ly: number): { readonly x: number; readonly y: number } {
  const c = Math.cos(h.theta);
  const s = Math.sin(h.theta);
  return { x: h.bx + h.size * (lx * c + ly * s), y: h.by + h.size * (lx * s - ly * c) };
}

/** The head: resting in the stone, bursting up on the word, holding the bird, sad, and rested again for frame 1. */
export function headAt(t: number): HeadPose {
  const u = wrap(t);
  const breath = Math.sin(cycles(15, u));
  if (u >= CUT_SAD && u < CUT_HOME) {
    const brighten = ramp(u, REGROW[0], REGROW[1]);
    return { ...SAD, lid: lerp(SAD.lid, 0.25, brighten), sorrow: 1 - 0.7 * brighten, by: SAD.by + 2 * Math.sin(cycles(11, u)) };
  }
  if (u >= BURST_AT && u < CUT_OTHER) {
    const drift = 5 * ramp(u, BITE_AT + 0.7, CUT_OTHER);
    return { ...REST, bx: seq(STRIKE_X, u) - drift, by: seq(STRIKE_Y, u), theta: seq(STRIKE_T, u), size: seq(STRIKE_S, u), open: seq(STRIKE_O, u), lid: 0, look: 0.1 };
  }
  if (u >= CUT_OTHER && u < CUT_SAD) return { ...REST, lid: 0, look: 0.05 };
  return { ...REST, by: REST.by + 1.5 * breath, lid: 0.08 + 0.04 * breath, look: u < 2 || u >= CUT_HOME ? 0.1 : 0.5 };
}

// ---------------------------------------------------------------- the bird

export interface BirdPose {
  /** Feet on the rock (world), face -1 left / 1 right, size. */
  readonly x: number;
  readonly y: number;
  readonly face: -1 | 1;
  readonly size: number;
  /** Feet above the rock (hops), wings 0 folded .. 1 spread, wing-beat phase, head bowed 0..1, tilt, eye shut 0..1, beak open 0..1, ruffle 0..1. */
  readonly lift: number;
  readonly wing: number;
  readonly flap: number;
  readonly dip: number;
  readonly tilt: number;
  readonly eye: number;
  readonly beak: number;
  readonly ruffle: number;
  /** 0 alive .. 1 limp in the jaws. */
  readonly limp: number;
  /** The fake spider in its beak. */
  readonly carry: boolean;
  /** The other day's bird, a different one. */
  readonly other: boolean;
}

/** Where the bird stands to peck: its back to the head, the lure in front of it. */
export const HOME = { x: 500, y: 856 } as const;
const REST_POSE: BirdPose = { ...HOME, face: -1, size: 1, lift: 0, wing: 0, flap: 0, dip: 0.6, tilt: 0.06, eye: 0, beak: 0, ruffle: 0, limp: 0, carry: false, other: false };

/** Where it comes down on the bare rock, and how small it looks there. */
export const PERCH = { x: 590, y: 880, size: 0.78 } as const;

/** The hops: when each lands and where; the bird comes from the back of the rock, growing as it nears. */
export const HOPS: readonly { readonly land: number; readonly x: number; readonly y: number; readonly size: number }[] = [
  { land: 11.12, x: 700, y: 590, size: 0.46 }, { land: 11.34, x: 660, y: 625, size: 0.54 }, { land: 11.56, x: 620, y: 668, size: 0.64 },
  { land: 11.78, x: 580, y: 722, size: 0.77 }, { land: 12.02, x: HOME.x, y: HOME.y, size: 1 },
];
const HOP_S = 0.2;
const HOP_FROM = { x: 725, y: 560, size: 0.4 } as const;

function hopState(u: number): { readonly x: number; readonly y: number; readonly size: number; readonly lift: number } {
  let from: { readonly x: number; readonly y: number; readonly size: number } = HOP_FROM;
  for (const h of HOPS) {
    if (u < h.land - HOP_S) return { ...from, lift: 0 };
    if (u < h.land) {
      const p = (u - (h.land - HOP_S)) / HOP_S;
      return { x: lerp(from.x, h.x, p), y: lerp(from.y, h.y, p), size: lerp(from.size, h.size, p), lift: 70 * h.size * Math.sin(Math.PI * p) };
    }
    from = h;
  }
  return { ...from, lift: 0 };
}

const PECK_DIP = [k(PECK_AT - 0.1, 0.55, 0), k(PECK_AT + 0.06, 1), k(PECK_AT + 0.3, 0.45), k(BURST_AT - 0.2, 0.55), k(BURST_AT, 0.85, 0)];

/** Wing-beat phase: fast. */
const beat = (u: number, from: number): number => (u - from) * 38;

function hookBird(v: number, u: number): BirdPose {
  const bob = Math.sin(cycles(14, u));
  const quirk = bell(v, 1.35, 1.9);
  return { ...REST_POSE, dip: 0.82 + 0.03 * bob - 0.1 * quirk, tilt: 0.06 + 0.08 * quirk, eye: bell(v, 0.8, 0.9) };
}

/** Flying in, on real wings, from the top right; braking and landing on "stops". */
function landing(u: number): BirdPose {
  const p = ramp(u, 3.45, STOPS_AT + 0.2);
  return { ...REST_POSE, x: lerp(1500, PERCH.x, p), y: lerp(-1050, PERCH.y, p ** 1.4), size: PERCH.size, wing: 1 - ramp(u, STOPS_AT + 0.02, STOPS_AT + 0.25), flap: beat(u, 3.45), dip: 0.1, tilt: -0.3 * (1 - p), ruffle: 0.4 };
}

/** Held in the jaws: the body in the mouth, the face flopped out of it, eyes shut. No blood. */
function caught(u: number, head: HeadPose): BirdPose {
  const on = ramp(u, BITE_AT, BITE_AT + 0.09);
  const c = headPoint(head, 292, -8);
  const size = 0.96;
  return {
    ...REST_POSE, x: lerp(HOME.x, c.x, on), y: lerp(HOME.y, c.y + 150 * size, on), size: lerp(1, size, on), dip: lerp(0.85, 0.5, on),
    tilt: lerp(0.06, 0.24, on) + 0.01 * Math.sin(u * 2), eye: ramp(u, BITE_AT, BITE_AT + 0.04), ruffle: 0.9 * on, limp: on, wing: 0,
  };
}

/** The other day's bird, in from the left: pecks on "pecked", braces and pulls, the bulb comes free on "clean", away over the snake. */
const OTHER_AT = { x: 150, y: 880, size: 0.95 } as const;
function otherBird(u: number): BirdPose {
  const base: BirdPose = { ...REST_POSE, ...OTHER_AT, face: 1, other: true, dip: 1 };
  if (u < PECKED_AT) return { ...base, dip: 0.72 + 0.1 * Math.sin(u * 6) };
  if (u < FLY_AT) {
    const pull = ramp(u, PECKED_AT + 0.15, FLY_AT);
    return { ...base, x: base.x - 30 * pull, tilt: 0.06 - 0.1 * pull, wing: 0.9 * ramp(u, PECKED_AT + 0.1, PECKED_AT + 0.25), flap: beat(u, PECKED_AT), beak: 0 };
  }
  const p = ramp(u, FLY_AT, CUT_SAD + 0.05);
  return { ...base, x: lerp(base.x - 30, 620, p), y: lerp(base.y, 500, p), size: lerp(base.size, 0.8, p), lift: 0, wing: 1, flap: beat(u, FLY_AT), dip: 0.06, tilt: -0.3, carry: true };
}

/** The warbler's pose, or null while it is out of the picture. */
export function birdAt(t: number): BirdPose | null {
  const u = wrap(t);
  if (u >= CUT_SAD && u < CUT_HOME) return null;
  if (u >= CUT_OTHER && u < CUT_SAD) return otherBird(u);
  if (u < 2.8 || u >= CUT_HOME) return hookBird(u >= CUT_HOME ? u - LOOP_S : u, u);
  if (u < 3.45 || (u >= CUT_TOP && u < CUT_LOW)) return null;
  if (u < STOPS_AT + 0.25) return landing(u);
  if (u < CUT_TOP) {
    // Tired and ruffled on the bare rock: slow breathing, heavy lids.
    const breath = Math.sin(cycles(9, u));
    return { ...REST_POSE, ...PERCH, dip: 0.14 + 0.03 * breath, tilt: -0.05, eye: 0.42 + 0.5 * bell(u, 5.1, 5.6) + 0.5 * bell(u, 6.5, 6.9), ruffle: 0.85 };
  }
  if (u < PECK_AT - 0.1) {
    const h = hopState(u);
    return { ...REST_POSE, ...h, dip: lerp(0.2, 0.55, ramp(u, 10.9, 12)), tilt: 0.05 + 0.1 * (h.lift / 70), ruffle: 0.7 * (1 - ramp(u, 11, 11.9)) };
  }
  if (u < BITE_AT) return { ...REST_POSE, dip: seq(PECK_DIP, u), beak: bell(u, PECK_AT, PECK_AT + 0.18) * 0.5, tilt: 0.06 + 0.1 * bell(u, PECK_AT, PECK_AT + 0.3) };
  return caught(u, headAt(u));
}

// ---------------------------------------------------------------- the lure

export interface LurePose {
  /** 0 not there (a bare stub) .. 1 full size. */
  readonly grow: number;
  /** Leg-twitch strength, the jolt of a peck, how far the tail is pulled (world px). */
  readonly twitch: number;
  readonly jolt: number;
  readonly pull: number;
}

/** The bulb is gone only after the other day's bird has pulled it off: the bird the snake catches leaves it whole. */
export const bulbTaken = (t: number): boolean => wrap(t) >= FLY_AT && wrap(t) < REGROW[0];

export function lureAt(t: number): LurePose {
  const u = wrap(t);
  const regrow = ramp(u, REGROW[0], REGROW[1]);
  const regrowing = u >= REGROW[0] && u < CUT_HOME;
  const grow = bulbTaken(u) ? 0 : regrowing ? regrow * (1 + 0.08 * Math.sin(regrow * Math.PI)) : 1;
  const nervous = 0.26 + 0.74 * bell(u, LEGS_AT - 0.1, LEGS_AT + 0.9);
  const idle = u >= 3 && u < LEGS_AT - 0.1 ? 0.2 : nervous;
  const jolt = bell(u, PECK_AT, PECK_AT + 0.35) + bell(u, BURST_AT - 0.15, BURST_AT);
  const pull = u >= PECKED_AT && u < FLY_AT ? 34 * ramp(u, PECKED_AT + 0.15, FLY_AT) : 0;
  return { grow: Math.min(grow, 1.08), twitch: idle, jolt, pull };
}

// ---------------------------------------------------------------- the camera

export interface Camera {
  readonly cx: number;
  readonly cy: number;
  readonly k: number;
}

/** Where on the screen the camera's point sits. */
export const CAM_Y = 700;
export const SCREEN_W = 1080;

export const FRAME1: Camera = { cx: 590, cy: 742, k: 1.12 };
/** How far the camera tilts up from the rock to the ridges, in world y. */
export const TILT_Y = 1500;

/** How far up towards the ridges the camera has tilted, 0..1. */
export function tiltAt(t: number): number {
  const u = wrap(t);
  return ramp(u, HOOK_END - 0.02, 2.8) * (1 - ramp(u, 3.5, STOPS_AT + 0.12));
}

const keyed = (keys: readonly Camera[], times: readonly number[], u: number): Camera => {
  const track = (pick: (c: Camera) => number): number => curveAt(keys.map((c, i) => ({ t: times[i]!, at: pick(c), rate: 0 })), u).at;
  return { cx: track((c) => c.cx), cy: track((c) => c.cy), k: Math.exp(track((c) => Math.log(c.k))) };
};

const TOP_KEYS: readonly Camera[] = [{ cx: 540, cy: 790, k: 1 }, { cx: 500, cy: 800, k: 1.06 }, { cx: 470, cy: 800, k: 1.3 }, { cx: 470, cy: 800, k: 1.46 }];
const LOW_KEYS: readonly Camera[] = [{ cx: 540, cy: 690, k: 1 }, { cx: 470, cy: 720, k: 1.1 }, { cx: 450, cy: 730, k: 1.12 }];
const STRIKE_KEYS: readonly Camera[] = [{ cx: 450, cy: 730, k: 1.12 }, { cx: 620, cy: 640, k: 0.94 }, { cx: 610, cy: 640, k: 0.98 }, { cx: 570, cy: 580, k: 1.06 }, { cx: 570, cy: 570, k: 1.1 }];

/** Each shot's camera. */
export function cameraAt(t: number): Camera {
  const u = wrap(t);
  switch (shotAt(u)) {
    case 'hook': {
      const v = u >= CUT_HOME ? u - LOOP_S : u;
      return { ...FRAME1, cy: FRAME1.cy - TILT_Y * tiltAt(u), k: FRAME1.k + 0.03 * ramp(v, -0.4, 2.1) };
    }
    case 'lands':
      return { cx: 610, cy: 760 - TILT_Y * tiltAt(u), k: 1.16 + 0.08 * ramp(u, 4.5, CUT_TOP) };
    case 'top':
      return keyed(TOP_KEYS, [CUT_TOP, SPIDER2_AT - 0.1, SPIDER2_AT + 0.12, CUT_LOW], u);
    case 'low':
      if (u < BURST_AT) return keyed(LOW_KEYS, [CUT_LOW, 12.0, BURST_AT], u);
      return keyed(STRIKE_KEYS, [BURST_AT, BURST_AT + 0.14, BITE_AT, BITE_AT + 0.7, CUT_OTHER], u);
    case 'other':
      return { cx: 468, cy: 700, k: 0.98 + 0.025 * ramp(u, CUT_OTHER, CUT_SAD) };
    default:
      return { cx: 540, cy: 700, k: 1 + 0.035 * ramp(u, CUT_SAD, CUT_HOME) };
  }
}

/** A shake for the peck and a hard one for the bite. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = wrap(t);
  const hit = bell(u, BITE_AT, BITE_AT + 0.3);
  const a = 6 * bell(u, PECK_AT, PECK_AT + 0.25) + 34 * flash(u) * (1 - ramp(u, BURST_AT + 0.2, BURST_AT + 0.45)) + 26 * hit;
  return { x: a * Math.sin(u * 83), y: a * Math.cos(u * 71) };
}

/** The white flash of the bite (0..1). */
export function flash(t: number): number {
  const u = wrap(t) - BURST_AT;
  return u < 0 || u > 0.3 ? 0 : (1 - u / 0.3) ** 2;
}

/** The snake's colours against the rock: 1 lost in the stone (while the bird comes), 0 in full colour. */
export function camouflage(t: number): number {
  const u = wrap(t);
  return 0.82 * ramp(u, CUT_TOP - 0.01, CUT_TOP) * (1 - ramp(u, BURST_AT - 0.02, BURST_AT + 0.06));
}

/** The big "0.2 s" of the freeze, 0..1. */
export const stamp = (t: number): number => window01(wrap(t), FIFTH_AT - 0.3, CUT_OTHER + 0.2, 0.25) * (wrap(t) < CUT_OTHER ? 1 : 0);
