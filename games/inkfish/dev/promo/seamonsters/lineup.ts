import { smooth } from '../short';
import { heightRatio } from './cast';
import { type Monster, MONSTERS, SPECIES, YOU_FT } from './species';

/**
 * The row and the camera on it. World units are feet: the seabed is y = 0
 * (up is negative, like the screen), "you" stand with your feet at x = 0, and
 * each animal floats in its slot to the right of the last one, facing left,
 * towards you, its front end at `front`. The camera maps a window of the
 * world onto the 1920 x 1080 frame with the seabed on a fixed line, and moves
 * between shots by easing the window's left and right edges in log space,
 * so a zoom out from a 6 ft shark to a 100 ft whale feels steady.
 */

export const W = 1920;
export const H = 1080;
/** Where the seabed sits on screen. */
export const SEABED_Y = 880;

export interface Slot {
  /** Its front end (the snout, or the squid's mantle tip), feet from you. */
  readonly front: number;
  readonly tail: number;
  /** Its body's middle line, feet above the seabed (negative is up). */
  readonly y: number;
  readonly feet: number;
}

/** The gap before each animal, feet: a little air, more for the big ones. */
const gapBefore = (feet: number): number => Math.max(2.2, feet * 0.14);
/** How high each one floats: its belly a little off the sand, the big ones higher. */
const floatOf = (m: Monster): number => {
  const feet = SPECIES[m].feet;
  return -(heightRatio(m) * feet * 0.5 + 0.6 + feet * 0.05);
};

let slots: Readonly<Record<Monster, Slot>> | null = null;

/** Lays out the row (after the cast is measured: the float height depends on each drawing's height). */
export function layoutRow(): Readonly<Record<Monster, Slot>> {
  if (slots) return slots;
  let x = 1.2;
  const out = {} as Record<Monster, Slot>;
  for (const m of MONSTERS) {
    const feet = SPECIES[m].feet;
    const front = x + gapBefore(feet);
    out[m] = { front, tail: front + feet, y: floatOf(m), feet };
    x = front + feet;
  }
  slots = out;
  return out;
}

export function slotOf(m: Monster): Slot {
  return layoutRow()[m];
}

/** The row's right end (the blue whale's flukes), feet. */
export const rowEnd = (): number => slotOf('blue').tail;

/** What the camera shows: the world's x from `left` to `right` feet across the frame, with the seabed on screen line `bed` (px). */
export interface View {
  readonly left: number;
  readonly right: number;
  readonly bed: number;
}

export const zoomOf = (v: View): number => W / (v.right - v.left);

export function toScreen(v: View, x: number, y: number): { readonly x: number; readonly y: number } {
  const z = zoomOf(v);
  return { x: (x - v.left) * z, y: v.bed + y * z };
}

/** A view that frames the stretch [a, b] (feet) with `pad` of its width either side, the stretch's centre shifted by `shift` frames. */
export function frame(a: number, b: number, pad = 0.18, shift = 0): View {
  const width = (b - a) * (1 + 2 * pad);
  const centre = (a + b) / 2 + shift * width;
  return { left: centre - width / 2, right: centre + width / 2, bed: SEABED_Y };
}

/** The view `v` with its seabed lowered (if needed) so everything from world height `top` (feet, negative is up) down is in the frame below `margin` px. */
export function fitTop(v: View, top: number, margin = 150): View {
  const z = zoomOf(v);
  return { ...v, bed: Math.max(v.bed, margin - top * z) };
}

/** The view `v` moved up or down so world height `y` (feet) sits on screen line `at`. */
export function centreOn(v: View, y: number, at = 560): View {
  return { ...v, bed: at - y * zoomOf(v) };
}

/** The top of an animal in its slot, feet (negative is up). */
export function topOf(m: Monster): number {
  const s = slotOf(m);
  return s.y - (heightRatio(m) * s.feet) / 2;
}

/** The shot on an animal as it arrives: it fills about two-thirds of the frame, "you"'s side of the row just in view. */
export function closeOn(m: Monster): View {
  const s = slotOf(m);
  return fitTop(frame(s.front, s.tail, 0.22, -0.04), topOf(m));
}

/** The whole row so far, from you to the newest animal's tail. */
export function rowUpTo(m: Monster): View {
  const tallest = Math.min(...MONSTERS.slice(0, MONSTERS.indexOf(m) + 1).map(topOf), -YOU_FT);
  return fitTop(frame(-YOU_FT * 0.6, slotOf(m).tail, 0.06), tallest);
}

/** Between two views: the width eased in log space (a steady zoom), the centre eased with it. */
export function between(a: View, b: View, u: number): View {
  const k = smooth(Math.max(0, Math.min(1, u)));
  const wa = a.right - a.left;
  const wb = b.right - b.left;
  const width = Math.exp(Math.log(wa) + (Math.log(wb) - Math.log(wa)) * k);
  // The centre moves in step with the zoom, so whatever is shared by both shots slides smoothly.
  const ca = (a.left + a.right) / 2;
  const cb = (b.left + b.right) / 2;
  const kc = Math.abs(wb - wa) < 1e-6 ? k : (width - wa) / (wb - wa);
  const centre = ca + (cb - ca) * kc;
  return { left: centre - width / 2, right: centre + width / 2, bed: a.bed + (b.bed - a.bed) * k };
}

/** A camera path: shots held from `at`, each easing in over `ease` seconds. */
export interface Shot {
  readonly at: number;
  readonly view: View;
  readonly ease: number;
}

export function viewAt(shots: readonly Shot[], t: number): View {
  let v = shots[0]!.view;
  for (const s of shots) {
    if (t < s.at) break;
    v = between(v, s.view, (t - s.at) / s.ease);
  }
  return v;
}
