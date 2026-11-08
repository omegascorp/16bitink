import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { GAPE_MAX, onWhale, type WhalePose } from '../kayak/story';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This diver spent about forty seconds inside a whale's MOUTH": Michael
 * Packard, a lobster diver off Provincetown, Cape Cod, 11 June 2021, about
 * 45 ft (14 m) down. A humpback feeding on sand lance scooped him into its
 * mouth by mistake (he was never swallowed: a humpback has baleen, no teeth,
 * and a throat too narrow), surfaced, shook its head and spat him out.
 * Told by a narrator (words.ts), each beat timed to the words, a function of
 * time over a loop of LOOP_S. One mood a sentence:
 *
 *   0     "…forty seconds… inside a whale's MOUTH." (nervous): the humpback's
 *         head in close-up, mouth nearly shut, the diver's legs and fins
 *         sticking out between the lips, bubbles streaming. A stopwatch pops in.
 *   4.5   "Cape Cod, twenty twenty-one." (dramatic): the lobster boat on the
 *         surface, the place tag; the diver sinks.
 *   6.5   "Forty-five feet down," : the camera follows him to the sand, depth tag.
 *   7.6   "everything went DARK!" (surprised): the humpback lunges in from the
 *         left, mouth wide, and shuts on him; black; his torch snaps on.
 *   9.5   "He thought, a shark got me… but, no teeth?" (nervous): inside, a
 *         shark in a thought bubble, then the torch finds baleen, and a "?".
 *  12.65  "A humpback had scooped him up by MISTAKE!" (excited): pull back to
 *         the humpback lunging through a cloud of sand lance, him in its mouth.
 *  15.0   "It surfaced, shook its head… and spat him out!" (chuckles): it
 *         bursts up beside the boat, shakes, and he flies out into a splash.
 *  18.05  "All he could think of was his family." (sad): him floating at the
 *         surface in warm light, a thought bubble of his wife and sons.
 *  19.95  "Which is how" : back under, the jaws closing round him: frame 1.
 */

/** The line boil steps at the game's 8 a second. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const FORTY_AT = said('forty');
export const SECONDS_AT = said('seconds…');
export const MOUTH_AT = said('MOUTH.');
export const CAPE_AT = said('Cape');
export const TWENTY_AT = said('twenty twenty-one.');
export const FORTY_FIVE_AT = said('Forty-five');
export const DOWN_AT = said('down,');
export const EVERYTHING_AT = said('everything');
export const DARK_AT = said('DARK!');
export const THOUGHT_AT = said('thought,');
export const SHARK_AT = said('shark');
export const NO_AT = said('no');
export const TEETH_AT = said('teeth?');
export const A_AT = said('A');
export const HUMPBACK_AT = said('humpback');
export const SCOOPED_AT = said('scooped');
export const MISTAKE_AT = said('MISTAKE!');
export const SURFACED_AT = said('surfaced,');
export const SHOOK_AT = said('shook');
export const SPAT_AT = said('spat');
export const OUT_AT = said('out!');
export const ALL_AT = said('All');
export const THINK_AT = said('think');
export const HIS_AT = said('his');
export const FAMILY_AT = said('family.');
export const WHICH_AT = said('Which');

export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

export interface Pt {
  readonly x: number;
  readonly y: number;
}
export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}
export const FOCUS = { x: 540, y: 800 } as const;
export const toScreen = (v: View, p: Pt): Pt => ({ x: (p.x - v.x) * v.zoom + FOCUS.x, y: (p.y - v.y) * v.zoom + FOCUS.y });

// ---------------------------------------------------------------- the scenes

/** Cut from the hook to the boat. */
export const CUT_B = CAPE_AT - 0.06;
/** The humpback lunges in, and the jaws shut. */
export const SCOOP_FROM = DOWN_AT + 0.1;
export const SHUT_AT = DARK_AT - 0.06;
/** Inside the mouth, in the dark. */
export const INSIDE = { from: DARK_AT + 0.12, to: A_AT - 0.05 } as const;
export const REVEAL_AT = A_AT - 0.05;
export const RISE_AT = MISTAKE_AT + 0.45;
export const LAND_AT = SPAT_AT + 0.62;
export const RETURN_AT = WHICH_AT - 0.12;

export type Scene = 'hook' | 'surface' | 'dive' | 'scoop' | 'inside' | 'reveal' | 'rise' | 'spit' | 'float' | 'return';

export function sceneAt(t: number): Scene {
  const u = wrap(t);
  if (u < CUT_B) return 'hook';
  if (u < FORTY_FIVE_AT - 0.25) return 'surface';
  if (u < SCOOP_FROM) return 'dive';
  if (u < INSIDE.from) return 'scoop';
  if (u < INSIDE.to) return 'inside';
  if (u < RISE_AT) return 'reveal';
  if (u < SPAT_AT) return 'rise';
  if (u < ALL_AT) return 'spit';
  if (u < RETURN_AT) return 'float';
  return 'return';
}

// ---------------------------------------------------------------- the world

/** World px per metre; the surface is y = 0, down positive. */
export const PX_PER_M = 100;
/** 45 ft (14 m) down: the sand. */
export const FLOOR_Y = 1380;
export const BOAT_X = 560;
export const DIVER_X = 430;
/** The diver's hip when he stands on the sand, and floating at the surface. */
export const STAND_Y = FLOOR_Y - 150;
export const LAND = { x: 170, y: 36 } as const;
export const DIVER_SCALE = 1.2;

const HOOK_CAM: View = { x: 322, y: 590, zoom: 2.55 };
const HOOK_WHALE = { x: 0, y: 700, tilt: 0.4, gape: 0.22 } as const;

/** A smooth 0 → 1 over [from, to]. */
const ease = (t: number, from: number, to: number): number => ramp(t, from, to);

/** The hook's camera: still but for a slow drift (a whole cycle a loop). */
const hookCam = (t: number): View => ({ x: HOOK_CAM.x + 7 * Math.sin(cycles(1, t)), y: HOOK_CAM.y + 5 * Math.cos(cycles(1, t)), zoom: HOOK_CAM.zoom });

const key = (t: number, v: View): readonly [Key, Key, Key] => [{ t, at: v.x, rate: 0 }, { t, at: v.y, rate: 0 }, { t, at: v.zoom, rate: 0 }];

/** A camera moving through views at times, easing to rest at each. */
function through(stops: readonly (readonly [number, View])[], t: number): View {
  const ks = stops.map(([s, v]) => key(s, v));
  return { x: curveAt(ks.map((k) => k[0]), t).at, y: curveAt(ks.map((k) => k[1]), t).at, zoom: curveAt(ks.map((k) => k[2]), t).at };
}

const SURFACE_CAM: View = { x: BOAT_X, y: -190, zoom: 1.0 };
const FLOOR_CAM: View = { x: BOAT_X - 80, y: 1150, zoom: 1.3 };
const SCOOP_CAM: View = { x: BOAT_X - 110, y: 1120, zoom: 1.15 };
const MOUTH_CAM: View = { x: 330, y: 720, zoom: 2.2 };
const WIDE_CAM: View = { x: 90, y: 640, zoom: 0.8 };
const BREACH_CAM: View = { x: 250, y: -150, zoom: 0.85 };
const FLOAT_CAM: View = { x: LAND.x + 20, y: -110, zoom: 2.3 };

export function cameraAt(t: number): View {
  const u = wrap(t);
  switch (sceneAt(u)) {
    case 'hook':
      return hookCam(u);
    case 'surface':
    case 'dive':
      return through([[CUT_B, SURFACE_CAM], [FORTY_FIVE_AT - 0.3, SURFACE_CAM], [DOWN_AT, FLOOR_CAM]], u);
    case 'scoop':
    case 'inside':
      return through([[SCOOP_FROM, FLOOR_CAM], [SHUT_AT, SCOOP_CAM]], u);
    case 'reveal':
      return through([[REVEAL_AT, MOUTH_CAM], [REVEAL_AT + 1.3, WIDE_CAM], [RISE_AT, WIDE_CAM]], u);
    case 'rise':
      return through([[RISE_AT, WIDE_CAM], [SURFACED_AT + 0.7, BREACH_CAM], [SPAT_AT, BREACH_CAM]], u);
    case 'spit':
    case 'float':
      return through([[SPAT_AT, BREACH_CAM], [LAND_AT + 0.1, BREACH_CAM], [ALL_AT + 0.9, FLOAT_CAM], [RETURN_AT, FLOAT_CAM]], u);
    case 'return': {
      const k = ease(u, RETURN_AT, LOOP_S);
      const end = hookCam(u);
      return { x: end.x, y: end.y, zoom: lerp(1.6, end.zoom, k) };
    }
  }
}

// ---------------------------------------------------------------- the whale

/** The whale's pose (null: not in the picture). It always faces right; the diver rides in its mouth. */
export function whaleAt(t: number): WhalePose | null {
  const u = wrap(t);
  const wob = Math.sin(cycles(14, t));
  const base = { balloon: 0.15 + 0.04 * wob, eye: 'wide' as const, fin: 0.12 * Math.sin(cycles(7, t)) };
  const hook = { ...base, x: HOOK_WHALE.x + 3 * wob, y: HOOK_WHALE.y + 4 * Math.sin(cycles(3, t)), tilt: HOOK_WHALE.tilt + 0.006 * wob, gape: HOOK_WHALE.gape + 0.01 * wob };
  if (u < CUT_B) return hook;
  if (u < SCOOP_FROM) return null;
  if (u < INSIDE.from) {
    const run = ease(u, SCOOP_FROM, SHUT_AT - 0.25);
    const open = ease(u, SCOOP_FROM, SCOOP_FROM + 0.45) * (1 - ease(u, SHUT_AT - 0.5, SHUT_AT));
    return { ...base, x: lerp(-900, 190, run), y: 1010, tilt: 0.05, gape: 0.25 + 0.55 * open, balloon: 0.5 * open, eye: 'wide' };
  }
  if (u < REVEAL_AT) return { ...base, x: 90, y: 760, tilt: 0.35, gape: 0.25 };
  if (u < RISE_AT) {
    // Lunging up and to the right through the sand lance, mouth wide, then closing.
    const k = ease(u, REVEAL_AT, RISE_AT);
    return { ...base, x: lerp(-120, 60, k), y: lerp(840, 700, k), tilt: 0.38, gape: lerp(0.8, 0.28, ease(u, MISTAKE_AT - 0.2, RISE_AT)), balloon: lerp(0.9, 0.4, k) };
  }
  if (u < SPAT_AT) {
    const climb = ease(u, RISE_AT, SURFACED_AT + 0.55);
    const shake = ease(u, SHOOK_AT - 0.1, SHOOK_AT + 0.25) * (1 - ease(u, SPAT_AT - 0.25, SPAT_AT));
    const wag = shake * 0.16 * Math.sin(((u - SHOOK_AT) / 0.34) * Math.PI * 2);
    return { ...base, x: lerp(-60, -250, climb), y: lerp(700, -40, climb), tilt: lerp(0.38, 0.75, climb) + wag, gape: 0.25 + 0.03 * shake, balloon: 0.3, eye: 'squint' };
  }
  if (u < ALL_AT + 0.4) {
    const open = window01(u, SPAT_AT - 0.02, SPAT_AT + 0.7, 0.18);
    const dive = ease(u, SPAT_AT + 0.35, ALL_AT + 0.4);
    return { ...base, x: -250 - 60 * dive, y: lerp(-40, 700, dive), tilt: lerp(0.75, 0.15, dive), gape: 0.25 + 0.6 * open, balloon: 0.1, eye: 'wide' };
  }
  if (u < RETURN_AT) return null;
  // Back under: the jaws close round him again, arriving at frame 1.
  const k = ease(u, RETURN_AT + 0.1, LOOP_S);
  return { ...hook, gape: lerp(0.8, hook.gape, k), balloon: lerp(0.5, hook.balloon, k) };
}

// ---------------------------------------------------------------- the diver

export type DiverFace = 'calm' | 'wide' | 'nervous' | 'sad';
export type DiverArms = 'work' | 'flail' | 'torch' | 'rest' | 'cling';

export interface DiverPose {
  /** The hip, world px, and the body's turn (0 upright, head up; radians, clockwise). */
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly face: DiverFace;
  readonly arms: DiverArms;
  readonly maskUp: boolean;
  /** Legs: 0 trailing, ±1 kicking. */
  readonly kick: number;
  /** In the whale's mouth (drawn between its back and front); false: drawn over everything. */
  readonly inMouth: boolean;
  readonly bag: boolean;
}

/** Where the diver rides in the open mouth (world), and how he lies. */
export function mouthSpot(w: WhalePose): { readonly at: Pt; readonly rot: number } {
  const a = w.gape * GAPE_MAX;
  const at = onWhale(w, { x: 335, y: (-13 + 335 * Math.sin(a)) / 2 + 2 });
  return { at, rot: -Math.PI / 2 + a / 2 - w.tilt };
}

export function diverAt(t: number): DiverPose | null {
  const u = wrap(t);
  const sway = Math.sin(cycles(14, t));
  const whale = whaleAt(t);
  const mouth = (face: DiverFace, arms: DiverArms, bag = false): DiverPose => {
    const m = mouthSpot(whale!);
    return { x: m.at.x, y: m.at.y, rot: m.rot + 0.03 * sway, face, arms, maskUp: false, kick: 0.5 * sway, inMouth: true, bag };
  };
  const scene = sceneAt(u);
  if (scene === 'hook' || scene === 'return') return mouth('wide', 'cling');
  if (scene === 'surface' || scene === 'dive') {
    const sink = ease(u, CUT_B + 0.15, DOWN_AT - 0.1);
    const y = lerp(40, STAND_Y, sink);
    return { x: DIVER_X + 6 * Math.sin(cycles(7, t)), y, rot: lerp(0.18, 0.28, sink) + 0.05 * sway, face: 'calm', arms: 'work', maskUp: false, kick: sway * (1 - sink * 0.8), inMouth: false, bag: true };
  }
  if (scene === 'scoop') {
    const m = mouthSpot(whale!);
    const grab = ease(u, SHUT_AT - 0.3, SHUT_AT);
    const floorPose = { x: DIVER_X, y: STAND_Y, rot: 0.28 };
    return {
      x: lerp(floorPose.x, m.at.x, grab), y: lerp(floorPose.y, m.at.y, grab), rot: lerp(floorPose.rot, m.rot, grab),
      face: 'wide', arms: grab > 0.2 ? 'flail' : 'work', maskUp: false, kick: sway, inMouth: grab > 0.3, bag: grab < 0.3,
    };
  }
  if (scene === 'inside' || scene === 'reveal' || scene === 'rise') return mouth(scene === 'inside' ? 'nervous' : 'wide', scene === 'inside' ? 'torch' : 'cling');
  if (u < LAND_AT) {
    // Thrown out of the mouth in an arc, tumbling, into the water by the boat.
    const w0 = whaleAt(SPAT_AT)!;
    const from = mouthSpot(w0);
    const k = (u - SPAT_AT) / (LAND_AT - SPAT_AT);
    const out = onWhale(w0, { x: 470, y: 10 });
    return {
      x: lerp(from.at.x, LAND.x, ease(k, 0, 1)), y: lerp(out.y, LAND.y, k * k) - 200 * Math.sin(Math.PI * k),
      rot: lerp(from.rot, 2.4 + 2 * Math.PI, k), face: 'wide', arms: 'flail', maskUp: false, kick: Math.sin(u * 22), inMouth: false, bag: false,
    };
  }
  // Floating at the surface, mask on his forehead.
  const settle = ease(u, LAND_AT, LAND_AT + 0.6);
  const bob = 7 * Math.sin(cycles(14, t)) + 5 * Math.sin(cycles(28, t));
  return {
    x: LAND.x, y: lerp(LAND.y + 30, LAND.y + 30 + bob, settle), rot: lerp(0.4, 0.03, settle), face: u > ALL_AT ? 'sad' : 'wide', arms: 'rest',
    maskUp: u > LAND_AT + 0.35, kick: 0.2 * sway, inMouth: false, bag: false,
  };
}

// ---------------------------------------------------------------- washes, clock

/** 0..1 black dipped over a hard cut (sharp in, quick out). */
export function dipAt(t: number): number {
  const u = wrap(t);
  const dip = (at: number, len: number): number => Math.max(0, 1 - Math.abs(u - at) / len);
  return Math.max(dip(CUT_B, 0.13), dip(RETURN_AT + 0.02, 0.16));
}

/** Black over the world as the jaws shut, until the torch comes on inside. */
export const blackoutAt = (t: number): number => (wrap(t) < REVEAL_AT ? ease(wrap(t), SHUT_AT - 0.05, INSIDE.from) : 0);

/** How much of the inside view shows. */
export const insideShowAt = (t: number): number => {
  const u = wrap(t);
  return u < INSIDE.from ? 0 : u < REVEAL_AT - 0.1 ? 1 : 1 - ease(u, REVEAL_AT - 0.1, REVEAL_AT + 0.25);
};

/** The torch: off in the first black beat, snapping on. */
export const torchAt = (t: number): number => (wrap(t) < REVEAL_AT + 0.3 ? ease(wrap(t), INSIDE.from + 0.25, INSIDE.from + 0.5) : 0);

/** The warm tender light for "his family". */
export const warmAt = (t: number): number => window01(wrap(t), ALL_AT - 0.4, RETURN_AT + 0.1, 0.5);
/** The cold, deep tint for the dive. */
export const coldAt = (t: number): number => window01(wrap(t), CUT_B, SCOOP_FROM + 0.6, 0.4);

/** The stopwatch: pops in on "seconds" at 0:00; counts up in the whale from the jaws shutting; stops at the spit. */
export const clockShownAt = (t: number): number => {
  const u = wrap(t);
  return Math.max(window01(u, SECONDS_AT - 0.05, CUT_B + 0.1, 0.18), window01(u, SHUT_AT, ALL_AT - 0.1, 0.2));
};
export const clockValueAt = (t: number): number => {
  const u = wrap(t);
  if (u < SHUT_AT || u > ALL_AT) return 0;
  return 40 * clamp01((u - INSIDE.from) / (SPAT_AT - INSIDE.from));
};

/** The place and depth tags. */
export const placeAt = (t: number): number => window01(wrap(t), CAPE_AT, FORTY_FIVE_AT + 0.05, 0.15);
export const yearAt = (t: number): number => window01(wrap(t), TWENTY_AT, FORTY_FIVE_AT + 0.05, 0.15);
export const depthAt = (t: number): number => window01(wrap(t), FORTY_FIVE_AT, SHUT_AT, 0.18);

/** The thought bubbles. */
export const sharkAt = (t: number): number => window01(wrap(t), SHARK_AT - 0.1, NO_AT - 0.05, 0.14);
export const questionAt = (t: number): number => window01(wrap(t), TEETH_AT - 0.05, REVEAL_AT, 0.12);
export const familyBubbleAt = (t: number): number => window01(wrap(t), THINK_AT, RETURN_AT, 0.25);
export const familyShownAt = (t: number): number => window01(wrap(t), HIS_AT, RETURN_AT, 0.3);
