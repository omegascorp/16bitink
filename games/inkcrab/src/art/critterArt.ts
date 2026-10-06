import { capsule, closed, cub, type Draw, edge, eyeDot, mottle, oval, pt, shade, skin, TAU } from './kit';
import type { Pt } from './pen';
import { PAPER_FILL } from './palette';

/**
 * The ghost crab, side-on and facing right: a pale, boxy carapace up on
 * long splayed legs, club eyes on stalks. Ink colour carries the meaning
 * (red when it can eat you), so the wash stays the same pale sand.
 */
export const CRITTER_FRAME = 128;
export const CRITTER_GROUND = 34;
/** Texture px per frame unit. */
export const CRITTER_RES = 1.5;
/** Frame units across the carapace, for scaling to a body box. */
export const CRITTER_SPAN = 70;

const SHELL = '#e6d6b2';
const LEG = '#d8c49a';
const SPECK = '#9a7e56';

/** One jointed leg from hip to foot, segments thinning out. */
function leg(d: Draw, hip: Pt, foot: Pt, lift: number, far: boolean): void {
  const knee = pt(hip.x + (foot.x - hip.x) * 0.45, Math.min(hip.y, foot.y) - 14 - lift);
  const joints = [hip, knee, foot];
  const widths = [5, 3.6, 1];
  for (let i = joints.length - 2; i >= 0; i--) {
    const seg = capsule(joints[i]!, joints[i + 1]!, widths[i]!, widths[i + 1]!);
    d.pen.fill(seg, PAPER_FILL, 1);
    d.pen.fill(seg, LEG, far ? 0.75 : 0.55);
    d.pen.stroke(closed(seg), far ? 0.7 : 1, d.ink, far ? 0.6 : 1, false);
  }
}

/** Four legs a side, splayed fore and aft, stepping in alternate pairs. */
function legs(d: Draw, far: boolean): void {
  const y = d.g - 22;
  const spread = [-46, -26, 22, 42];
  spread.forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 4;
    const lift = Math.max(0, Math.sin(ph)) * 5;
    const hip = pt(dx * 0.35 + (far ? -3 : 0), y + (far ? -2 : 2));
    leg(d, hip, pt(dx + step + (far ? -4 : 0), d.g - (far ? 2 : 0) - lift * 0.4), lift, far);
  });
}

function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const arm = capsule(pt(x, y), pt(x + 12 * s, y - 4 * s), 5 * s, 4 * s);
  const palm = oval(x + 18 * s, y - 6 * s, 8 * s, 6 * s, 16);
  const finger = capsule(pt(x + 22 * s, y - 9 * s), pt(x + 30 * s, y - 4 * s), 3.4 * s, 1.2 * s);
  for (const part of [arm, palm, finger]) {
    d.pen.fill(part, PAPER_FILL, 1);
    d.pen.fill(part, SHELL, far ? 0.8 : 0.6);
    d.pen.stroke(closed(part), far ? 0.7 : 1, d.ink, far ? 0.6 : 1, false);
  }
}

export function drawCritter(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 44, 3, 24), d.ink, 0.1);
  legs(d, true);
  claw(d, 18, d.g - 28, 0.8, true);
  // The carapace: a squarish box, a little wider at the front.
  const top = d.g - 46;
  const bottom = d.g - 20;
  const back = [...cub(pt(-34, bottom), pt(-38, bottom - 6), pt(-38, top + 6), pt(-30, top), 8)];
  const front = [...cub(pt(30, top), pt(38, top + 4), pt(38, bottom - 6), pt(32, bottom), 8)];
  const shape = [...back, ...front, pt(-34, bottom)];
  skin(d, shape, SHELL, 0.7);
  mottle(d, shape, 70, top, bottom, SPECK, 0.6);
  shade(d, shape, bottom - 8, 0.35);
  edge(d, shape, 1.4);
  // A groove across the back, as on the real thing.
  pen.stroke(cub(pt(-18, top + 2), pt(-10, top + 10), pt(10, top + 10), pt(18, top + 2), 10), 0.8, d.ink, 0.6, false);
  // Club eyes on short thick stalks at the front corner.
  for (const [x, lean] of [[18, -2], [26, 3]] as const) {
    pen.stroke([pt(x, top + 2), pt(x + lean, top - 10)], 2.8, d.ink, 1, false);
    const eye = oval(x + lean, top - 14, 3.4, 5.4, 12);
    pen.fill(eye, d.ink, 0.9);
    eyeDot(d, x + lean + 0.6, top - 15, 1.2);
  }
  legs(d, false);
  claw(d, 24, d.g - 26, 1, false);
}
