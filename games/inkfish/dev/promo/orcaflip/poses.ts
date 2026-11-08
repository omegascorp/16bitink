import type { DiverPose } from '../diver/story';
import { DIVER_SCALE } from '../diver/story';
import type { WhaleSharkDent } from '../foodchain/art/whaleShark';
import { lerp, ramp } from '../short';
import { CHECK_AT, HITS, IMPACT, KID_AT, LONG_AT, THEY_AT, pOf, shakeOf, SINKS_AT, STARTS, type SceneId, UNTIL_AT, WHY_AT, wrap } from './story';

/** Where everything is, a pure function of time. Lengths are snout to tail in px; angles in radians; y grows down. */

const decay = (age: number, rate: number): number => (age <= 0 ? 0 : Math.exp(-age * rate));
const onset = (age: number, rate: number): number => (age <= 0 ? 0 : 1 - Math.exp(-age * rate));

export interface SharkPose {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly a: number;
  /** Roll about its long axis as a scale in y: 1 back up, -1 belly up. */
  readonly s: number;
  readonly tail: number;
  readonly gape?: number;
  readonly dent?: WhaleSharkDent;
}
export interface OrcaPose { readonly x: number; readonly y: number; readonly len: number; readonly a: number; readonly flip: boolean; readonly tail: number; readonly alpha: number }

interface Pt { readonly x: number; readonly y: number }

/** Snout to tail in the shark sprite's own px (foodchain/art/whaleShark.ts). */
const SPRITE_LEN = 2400;

/** Where a point of the shark's sprite lands on screen: local px, the snout at x 0, the tail at -2400, the back at negative y. */
export function onShark(p: SharkPose, lx: number, ly: number): Pt {
  const k = p.len / SPRITE_LEN;
  const [u, v] = [(lx + SPRITE_LEN / 2) * k, ly * k * p.s];
  const [c, n] = [Math.cos(p.a), Math.sin(p.a)];
  return { x: p.x + u * c - v * n, y: p.y + u * n + v * c };
}
export const snoutOf = (p: SharkPose): Pt => onShark(p, 0, 0);

/** An orca whose snout is at (nx, ny) heading `a`. */
export function orcaAt(nx: number, ny: number, len: number, a: number, tail: number, alpha = 1): OrcaPose {
  return { x: nx - (Math.cos(a) * len) / 2, y: ny - (Math.sin(a) * len) / 2, len, a, flip: Math.cos(a) < 0, tail, alpha };
}

// ---------------------------------------------------------------- frame 1, and the viewfinder's push-in that ends on it

export const HOOK_PIVOT = { x: 540, y: 940 } as const;
/** The shark on a diagonal, its head up in the frame's top right and the tail cropped off at the left. */
const HOOK_TILT = -0.52;
const HOOK_SNOUT = { x: 985, y: 405 } as const;
/** The orca comes in from the lower right, square on to the shark's side. */
const HOOK_HEADING = -1.98;
const HOOK_DIR = { x: Math.cos(HOOK_HEADING), y: Math.sin(HOOK_HEADING) } as const;
export const SHARK1_LEN = 1600;
export const ORCA1_LEN = 1650;
/** Where it's struck (sprite px): the flank between the gills and the first dorsal, so the dorsal stays clear of the orca. */
const STRUCK_X = -640;
const STRUCK_BACK = -200;
const DENT_DEPTH = 120;
const DENT_WIDTH = 190;
/** How far past the skin the rostrum goes, and how long it stays pressed in before the orca falls away. */
const PRESS = 26;
const HOLD_S = 0.6;
export const HOOK_GAPE = 0.32;

/** The dent's depth `age` seconds after the slam: in at once, held, then springing out. */
const dentNow = (age: number): number => DENT_DEPTH * onset(age, 30) * (1 - ramp(age, HOLD_S, HOLD_S + 0.7));

function hookShark(p: number, age: number): SharkPose {
  const shove = 70 * onset(age, 8) + 12 * Math.max(0, age);
  const depth = dentNow(age);
  return {
    x: HOOK_SNOUT.x - (Math.cos(HOOK_TILT) * SHARK1_LEN) / 2 + HOOK_DIR.x * shove + 8 * Math.sin(p * 1.5),
    y: HOOK_SNOUT.y - (Math.sin(HOOK_TILT) * SHARK1_LEN) / 2 + HOOK_DIR.y * shove + 10 * Math.sin(p * 1.3),
    len: SHARK1_LEN,
    a: HOOK_TILT + 0.05 * Math.sin(16 * age) * decay(age, 3.5),
    s: -1,
    tail: 4.5 * p,
    gape: HOOK_GAPE,
    dent: depth > 0.5 ? { x: STRUCK_X, depth, width: DENT_WIDTH } : undefined,
  };
}

export interface HookState {
  /** The viewfinder's picture scale: wide at first, 1 at the loop point. */
  readonly zoom: number;
  readonly shark: SharkPose;
  readonly orca: OrcaPose;
  /** The orca's rostrum, on screen. */
  readonly nose: Pt;
  /** Seconds since the slam (negative before it). */
  readonly age: number;
  /** The struck skin, moving with the shark. */
  readonly contact: Pt;
  /** Where the slam happened: the bubbles burst from here. */
  readonly impact: Pt;
}

export function hookAt(t: number): HookState {
  const p = pOf(t);
  const age = p - IMPACT;
  const q = -age;
  const off = age < 0 ? -(1500 * Math.min(q, 0.4) + 560 * Math.max(0, q - 0.4)) : -(190 * onset(age - HOLD_S, 3.5) + 70 * Math.max(0, age - HOLD_S));
  const shark = hookShark(p, age);
  const contact = onShark(shark, STRUCK_X, STRUCK_BACK + dentNow(age));
  const nose = { x: contact.x + HOOK_DIR.x * (off + PRESS), y: contact.y + HOOK_DIR.y * (off + PRESS) };
  const heading = HOOK_HEADING + 0.1 * onset(age, 2);
  const impact = onShark(hookShark(IMPACT, 0), STRUCK_X, STRUCK_BACK + DENT_DEPTH);
  return { zoom: 0.5 + 0.5 * ramp(p, -1.5, -0.02), shark, orca: orcaAt(nose.x, nose.y, ORCA1_LEN, heading, 7 * p), nose, age, contact, impact };
}

// ---------------------------------------------------------------- the kid, the hits and the hang

/** The kid before the hits, and the shark in the next scene, are the same animal: this is where it is. */
/** The kid's length on screen: half the adult drawn behind it (6 m against 12 m). */
export const KID_LEN = 750;
export const ADULT_LEN = 1500;

export function baseShark(t: number): SharkPose {
  const enter = 1 - ramp(t, KID_AT - 0.9, KID_AT + 0.25);
  const grow = ramp(t, UNTIL_AT - 0.2, UNTIL_AT + 0.9);
  const pull = ramp(t, WHY_AT - 0.45, WHY_AT + 0.4);
  return {
    x: 540 - 1000 * enter,
    y: lerp(980 + 14 * Math.sin(t * 1.3), 930, grow),
    len: lerp(lerp(KID_LEN, 960, ramp(t, LONG_AT + 0.1, THEY_AT)), 1250, grow) * lerp(1, 0.68, pull),
    a: -0.03 + 0.03 * Math.sin(t * 0.9),
    s: 1,
    tail: 2.4 * t,
  };
}

/**
 * The roll. A sprite scaled in y by cos(roll) shrinks to a needle near a quarter
 * turn, so it never shows that: the scale stops at SIDE_FLOOR and snaps across
 * to the other side in one frame, on the second hit, under its burst and shake.
 * The first hit turns it most of the way there and it creeps on; the second is
 * the snap, a fast kick through the quarter turn; the third rolls it belly-up.
 */
const KICKS = [0.82, 1.3, Math.PI - 2.22] as const;
const ROLL_S = [0.45, 0.1, 0.45] as const;
const CREEP = 0.1;
/** The thinnest the shark is ever shown: it still reads as a whale shark at this. */
export const SIDE_FLOOR = 0.6;
/** How far round the shark has rolled: 0 belly down, pi belly up after the third hit. */
export const rollOf = (t: number): number =>
  HITS.reduce((sum, h, i) => sum + KICKS[i]! * ramp(t, h, h + ROLL_S[i]!), 0) + CREEP * ramp(t, HITS[0]! + ROLL_S[0], HITS[1]!);
export const sideOf = (roll: number): number => {
  const c = Math.cos(roll);
  return (c < 0 ? -1 : 1) * Math.max(Math.abs(c), SIDE_FLOOR);
};

/** Each hit also knocks its head round in the plane of the picture: a tumble, so the rolling body stays lively. */
const SWINGS = [-0.2, 0.34, -0.14] as const;
const swingOf = (t: number): number => HITS.reduce((sum, h, i) => sum + SWINGS[i]! * ramp(t, h, h + 0.35), 0);

/** Where each orca lands (sprite px, the back at negative y), its heading, and the dent it leaves. */
interface Strike { readonly lx: number; readonly ly: number; readonly a: number; readonly dent: number }
const STRIKES: readonly Strike[] = [
  { lx: -1560, ly: 130, a: -1.1, dent: -90 },
  { lx: -640, ly: -190, a: 2.1, dent: 100 },
  { lx: -760, ly: -215, a: -1.5, dent: 110 },
];
const STRIKE_DENT_WIDTH = 170;

function hitDent(t: number): WhaleSharkDent | undefined {
  const k = HITS.findIndex((h, i) => t >= h && t < h + 0.7 && (i === HITS.length - 1 || t < HITS[i + 1]!));
  if (k < 0) return undefined;
  const age = t - HITS[k]!;
  const depth = STRIKES[k]!.dent * onset(age, 30) * (1 - ramp(age, 0.1, 0.55));
  return Math.abs(depth) > 0.5 ? { x: STRIKES[k]!.lx, depth, width: STRIKE_DENT_WIDTH } : undefined;
}

export function sharkAt(t: number): SharkPose {
  const b = baseShark(t);
  let [dx, dy, da] = [0, 0, 0];
  HITS.forEach((h, i) => {
    const age = t - h;
    const k = 80 * onset(age, 10) * decay(age, 2.3) * (i === 1 ? -1 : 1);
    dx += i === 2 ? 0 : k;
    dy += i === 2 ? -Math.abs(k) : 0;
    da += 0.06 * Math.sin(age * 15) * decay(age, 3) * (i % 2 ? -1 : 1);
  });
  const hang = ramp(t, UNTIL_AT, UNTIL_AT + 0.7);
  return { ...b, x: b.x + dx, y: b.y + dy + 12 * hang * Math.sin(t * 0.8), a: b.a + da + swingOf(t) + 0.05 * hang * Math.sin(t * 0.6), s: sideOf(rollOf(t)), dent: hitDent(t) };
}

export const HIT_ORCA_LEN = 1280;

/** The skin an orca strikes, on the shark as it is at that moment. */
export function strikePoint(k: number): Pt {
  const s = STRIKES[k]!;
  return onShark(sharkAt(HITS[k]! - 1e-3), s.lx, s.ly);
}

/** One of the three orcas: in from its side at full speed, the strike at HITS[k], then falling back. */
export function strikeOrca(k: number, t: number): OrcaPose | null {
  const s = STRIKES[k]!;
  const age = t - HITS[k]!;
  if (age < -0.8 || age > 0.8) return null;
  const at = strikePoint(k);
  const off = age < 0 ? -(1500 * Math.min(-age, 0.42) + 300 * Math.max(0, -age - 0.42)) : -(110 * onset(age - 0.12, 4) + 70 * Math.max(0, age - 0.12));
  const alpha = Math.min(ramp(age, -0.7, -0.45), 1 - ramp(age, 0.35, 0.8));
  return orcaAt(at.x + Math.cos(s.a) * off, at.y + Math.sin(s.a) * off, HIT_ORCA_LEN, s.a, 8 * t, alpha);
}

/** Three orcas circling the belly-up shark on "Why?": which are behind it (drawn first) and which in front. */
export function circlers(t: number): readonly (OrcaPose & { readonly behind: boolean })[] {
  if (t < WHY_AT - 0.45) return [];
  const spread = 1 + 1.5 * (1 - ramp(t, WHY_AT - 0.45, WHY_AT + 0.4));
  const base = sharkAt(t);
  return [0, 1, 2].map((i) => {
    const phi = (i * Math.PI * 2) / 3 + 2.6 * (t - WHY_AT);
    const [rx, ry] = [520 * spread, 330 * spread];
    const head = Math.atan2(ry * Math.cos(phi), -rx * Math.sin(phi));
    const centre = { x: base.x + rx * Math.cos(phi), y: base.y + 60 + ry * Math.sin(phi) };
    // Each is a big male: a third longer than the shark, nose to tail.
    return { ...orcaAt(0, 0, base.len * (8 / 6), head, 9 * t, 1), ...centre, behind: Math.sin(phi) < 0 };
  });
}

// ---------------------------------------------------------------- the sinking

/** A diver (dev/promo/diver) and how much bigger than that short's he's drawn. */
export interface DiverShot { readonly pose: DiverPose; readonly scale: number }

/** A point of the diver's own frame (head up, facing +x, the hip at 0), on screen. */
export function onDiver(d: DiverShot, lx: number, ly: number): Pt {
  const k = DIVER_SCALE * d.scale;
  const [c, n] = [Math.cos(d.pose.rot), Math.sin(d.pose.rot)];
  return { x: d.pose.x + (lx * c - ly * n) * k, y: d.pose.y + (lx * n + ly * c) * k };
}

/** "Scientists": the close shot, the diver floating in from the lower left with a slate, the belly-up shark behind. */
export function diverCutAt(t: number): { readonly diver: DiverShot; readonly shark: SharkPose } {
  const pop = 0.92 + 0.08 * ramp(t, STARTS.sci, STARTS.sci + 0.25);
  const pose: DiverPose = { x: 250, y: 1120, rot: 0.45 + 0.025 * Math.sin(t * 2.2), face: 'wide', arms: 'work', maskUp: false, kick: 0.4 * Math.sin(t * 3), inMouth: false, bag: false };
  return {
    diver: { pose, scale: 4.4 * pop },
    shark: { x: 620, y: 400 + 6 * Math.sin(t * 1.1), len: 1300, a: -0.14, s: -1, tail: 1.2 * t },
  };
}

export interface SinkState {
  readonly shark: SharkPose;
  /** How much of the deep's dark lies over the shark: it dims, but always shows. */
  readonly dark: number;
  readonly diver: DiverShot;
  /** The torch's lens, and where its beam gives out. */
  readonly lens: Pt;
  readonly beamEnd: Pt;
}

export const BEAM_LEN = 430;
/** The near hand, from the diver art's 'flail' arms: flung out past his head, with the torch in it. */
export const torchHand = (kick: number): Pt => {
  const s = Math.sin(kick * 1.4);
  return { x: 46 + 8 * s, y: -112 - 6 * s };
};

export function sinkAt(t: number): SinkState {
  const tau = Math.max(0, t - STARTS.sink);
  const shark: SharkPose = { x: 470 + 26 * Math.sin(tau * 1.4), y: 640 + 430 * tau + 40 * tau * tau, len: lerp(860, 640, ramp(tau, 0.2, 2)), a: 0.12 + 0.1 * tau, s: -1, tail: 1.2 * t };
  const kick = 14 * t;
  const face = t > CHECK_AT - 0.1 ? 'sad' : t > SINKS_AT ? 'nervous' : 'wide';
  const pose: DiverPose = { x: 640 + 14 * Math.sin(tau * 2), y: lerp(-220, 130, ramp(tau, 0, 0.4)) + 150 * tau, rot: 2.92 + 0.06 * Math.sin(tau * 3), face, arms: 'flail', maskUp: false, kick, inMouth: false, bag: false };
  const diver: DiverShot = { pose, scale: 1.2 };
  const hand = torchHand(kick);
  const lens = onDiver(diver, hand.x + 8, hand.y - 34);
  const head = Math.atan2(shark.y - lens.y, shark.x - lens.x);
  return { shark, dark: 0.55 * ramp(tau, 0.2, 1.6), diver, lens, beamEnd: { x: lens.x + Math.cos(head) * BEAM_LEN, y: lens.y + Math.sin(head) * BEAM_LEN } };
}

// ---------------------------------------------------------------- the camera: only shakes (the viewfinder's zoom is drawn in the scene)

export interface Camera { readonly dx: number; readonly dy: number }

export function cameraOf(id: SceneId, t: number): Camera {
  if (id === 'hook') return shakeOf(pOf(t) - IMPACT, 40);
  if (id !== 'spin') return { dx: 0, dy: 0 };
  const u = wrap(t);
  return HITS.reduce((c, h, i) => {
    const s = shakeOf(u - h, [46, 52, 58][i]!);
    return { dx: c.dx + s.dx, dy: c.dy + s.dy };
  }, { dx: 0, dy: 0 });
}
