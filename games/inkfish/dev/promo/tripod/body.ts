import { C, heightAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';

/**
 * The tripodfish's body in screen space, as pure geometry (no drawing): points
 * along it, its three stilts (two pelvic rays and the lower tail ray) and its
 * front fins. The game's sprite draws short stilts into the picture; this
 * short draws the body alone (render.ts) and the rays here, so they can fold,
 * swing down and reach full length: the front pelvic ray longer than the body.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A fish on screen. `face` is -1 (left) or 1 (right). */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly face: number;
  /** Nose up, radians. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  /** Jaw opening, 0 .. 1. */
  readonly jaw: number;
}

/** The mud's surface. */
export const FLOOR_Y = 1110;
/** It stands in the middle, facing left into the current. */
export const TRIPOD = { x: 570, len: 480, face: -1 } as const;
/** A tail beat that leaves the tail straight: the stilts' roots stay put while it stands. */
export const REST_BEAT = 2.4;

const A = ANATOMY.tripodfish;

/** A point of the drawing (texture px, fish facing right) on screen, bent as drawSwimmer bends the tail, tilted and turned with the fish. */
export function texToScreen(f: Fish, tx: number, ty: number): Pt {
  const k = f.len / (2 * A.hl);
  const along = (C + A.hl - tx) / (2 * A.hl);
  const bend = Math.max(0, (along - 0.3) / 0.7);
  const dy = A.hh * (0.12 + 0.14 * f.effort) * bend * bend * Math.sin(f.beat - 2.4 * along);
  const lx = (tx - C) * k;
  const ly = (ty - C + dy) * k;
  const c = Math.cos(-f.tilt);
  const s = Math.sin(-f.tilt);
  return { x: f.x + f.face * (lx * c - ly * s), y: f.y + lx * s + ly * c };
}

/** A point on its body: `along` 0 nose .. 1 tail stalk, `side` -1 on its back .. 1 on its belly. */
export function bodyPoint(f: Fish, along: number, side: number): Pt {
  return texToScreen(f, C + A.hl - 2 * A.hl * along, C + side * heightAt(A, along));
}

/** Its lips. */
export const mouthOf = (f: Fish): Pt => bodyPoint(f, 0.02, 0.1);

// ---------------------------------------------------------------- stilts

/** One stilt: where it grows from, how long it is, and its angle standing and folded back (radians from pointing straight back, turning down and forwards). */
export interface Stilt {
  readonly root: (f: Fish) => Pt;
  readonly len: number;
  readonly stand: number;
  readonly fold: number;
}

const deg = (d: number): number => (d * Math.PI) / 180;
const FOLD = deg(-0.6);

/** The fish standing, at height 0, to measure its stilts from. */
const atZero: Fish = { x: 0, y: 0, len: TRIPOD.len, face: TRIPOD.face, tilt: 0, beat: REST_BEAT, effort: 0, jaw: 0 };

const nearRoot = (f: Fish): Pt => bodyPoint(f, 0.42, 0.95);
const farRoot = (f: Fish): Pt => bodyPoint(f, 0.45, 0.85);
/** The lower lobe of the tail fin, as the game's sprite roots its tail stilt. */
const tailRoot = (f: Fish): Pt => texToScreen(f, C - A.hl - 6, C + 6);

/** The front pelvic ray: 15% longer than the body (it is longer than the body in life). */
export const PELVIC_LEN = 1.15 * TRIPOD.len;
const NEAR_STAND = deg(112);
const FAR_STAND = deg(106);
const TAIL_STAND = deg(86);

/** The body's centre when it stands: the front ray's foot just on the mud. */
export const STAND_Y = FLOOR_Y - PELVIC_LEN * Math.sin(NEAR_STAND) - nearRoot(atZero).y;
/** Lying on the mud: its belly on it. */
export const LIE_Y = FLOOR_Y - nearRoot(atZero).y;

/** Long enough that, standing, its foot is on the mud. */
const reaching = (root: (f: Fish) => Pt, stand: number): number => (FLOOR_Y - STAND_Y - root(atZero).y) / Math.sin(stand);

/** Near pelvic ray, the far one (behind the body), and the tail ray. */
export const STILTS: readonly Stilt[] = [
  { root: nearRoot, len: PELVIC_LEN, stand: NEAR_STAND, fold: FOLD },
  { root: farRoot, len: reaching(farRoot, FAR_STAND), stand: FAR_STAND, fold: FOLD },
  { root: tailRoot, len: reaching(tailRoot, TAIL_STAND), stand: TAIL_STAND, fold: FOLD },
];

/** A stilt's root and foot with the rays `s` of the way from folded (0) to standing (1). */
export function stiltAt(stilt: Stilt, f: Fish, s: number): { readonly root: Pt; readonly foot: Pt } {
  const root = stilt.root(f);
  const a = stilt.fold + (stilt.stand - stilt.fold) * s;
  return { root, foot: { x: root.x - f.face * Math.cos(a) * stilt.len, y: root.y + Math.sin(a) * stilt.len } };
}

// ---------------------------------------------------------------- front fins

/** The pectoral rays: elevations above straight ahead, reaching forwards; folded, they lie back along its back. */
const FORWARD = [12, 22, 32, 42, 52].map(deg);
const BACK = FORWARD.map((_, i) => Math.PI - deg(6 + 3 * i));
export const PECTORAL_LEN = 0.52 * TRIPOD.len;
export const PECTORAL_RAYS = FORWARD.length;

const pectoralRoot = (f: Fish): Pt => bodyPoint(f, 0.24, -0.35);

/** Ray `i` of the front fin, `reach` 0 folded back .. 1 held forwards, nudged by `wiggle` radians. */
export function pectoralAt(f: Fish, i: number, reach: number, wiggle = 0): { readonly root: Pt; readonly tip: Pt } {
  const root = pectoralRoot(f);
  const e = BACK[i]! + (FORWARD[i]! - BACK[i]!) * reach + wiggle;
  return { root, tip: { x: root.x + f.face * Math.cos(e) * PECTORAL_LEN, y: root.y - Math.sin(e) * PECTORAL_LEN } };
}
