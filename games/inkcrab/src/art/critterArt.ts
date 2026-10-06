import type { SpeciesId } from '../logic/species';
import { bezier, capsule, closed, cub, type Draw, edge, eyeDot, mottle, oval, pt, shade, skin, TAU, tint } from './kit';
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
/** Frame units across each kind's body, for scaling the drawing to its box. */
export const CRITTER_SPAN: Readonly<Record<SpeciesId, number>> = { ghostcrab: 70, slater: 72, beetle: 66 };

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

function ghostCrab(d: Draw): void {
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

/** A sea slater: a flat, segmented grey body on many short legs, long antennae, two tail prongs. */
function slater(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 40, 3, 24), d.ink, 0.1);
  const bottom = d.g - 6;
  const top = d.g - 26;
  // Seven little legs a side, rippling front to back.
  for (let i = 0; i < 7; i++) {
    const x = -24 + i * 8;
    const ph = -d.f * (TAU / 3) + i * 0.9;
    const step = Math.cos(ph) * 2.5;
    pen.stroke([pt(x, bottom - 2), pt(x + 2 + step, d.g - Math.max(0, Math.sin(ph)) * 2)], 1, d.ink, 0.85, false);
  }
  const body = [...cub(pt(-34, bottom), pt(-36, top + 4), pt(28, top - 2), pt(36, bottom - 4), 18), pt(-34, bottom)];
  skin(d, body, '#8f8a7e', 0.7);
  mottle(d, body, 40, top, bottom, '#4a463e', 0.55);
  pen.clipped(body, () => {
    for (let i = 1; i < 8; i++) {
      const x = -30 + i * 8;
      pen.stroke(bezier(pt(x - 2, top - 2), pt(x + 1, (top + bottom) / 2), pt(x - 1, bottom + 2), 6), 0.8, d.ink, 0.6, false);
    }
  });
  shade(d, body, bottom - 6, 0.3);
  edge(d, body, 1.3);
  // Tail prongs (uropods) and long, kinked antennae.
  for (const dy of [-2, 2]) pen.stroke([pt(-33, bottom - 3 + dy), pt(-42, bottom - 5 + dy * 2)], 1.2, d.ink, 1, false);
  const sway = [0, 2, -1][d.f]!;
  pen.stroke([pt(34, bottom - 8), pt(44, top - 6 + sway), pt(54, top + 2 + sway)], 1, d.ink, 1, false);
  pen.stroke([pt(33, bottom - 6), pt(46, top + sway), pt(55, top + 9 + sway)], 0.8, d.ink, 0.8, false);
  eyeDot(d, 31, bottom - 9, 1.6);
}

/** A tiger beetle: spotted green wing cases high on long legs, big eyes and curved jaws. */
function beetle(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 36, 3, 24), d.ink, 0.1);
  const legs = (far: boolean): void => {
    [-14, 2, 14].forEach((hx, i) => {
      const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI : 0);
      const reach = (i - 1) * 16 + Math.cos(ph) * 4;
      const hip = pt(hx, d.g - 22);
      const knee = pt(hx + reach * 0.5, d.g - 30 - Math.max(0, Math.sin(ph)) * 3);
      const foot = pt(hx + reach, d.g - (far ? 2 : 0) - Math.max(0, Math.sin(ph)) * 3);
      pen.stroke([hip, knee, foot], far ? 1 : 1.3, d.ink, far ? 0.6 : 1, false);
    });
  };
  legs(true);
  const elytra = oval(-8, d.g - 26, 24, 10, 24);
  skin(d, elytra, '#5f8f6a', 0.8);
  pen.clipped(elytra, () => {
    for (const [x, y, r] of [[-20, -28, 3], [-8, -31, 2.6], [2, -27, 3], [-14, -22, 2.4]] as const) tint(d, oval(x, d.g + y, r, r * 0.8, 10), '#f3ecd0', 0.9);
  });
  shade(d, elytra, d.g - 22, 0.3);
  edge(d, elytra, 1.3);
  const thorax = oval(18, d.g - 27, 7, 6, 14);
  skin(d, thorax, '#4f7a5a', 0.8);
  edge(d, thorax, 1.1);
  const head = oval(28, d.g - 28, 7, 6.5, 14);
  skin(d, head, '#4f7a5a', 0.8);
  edge(d, head, 1.1);
  eyeDot(d, 30, d.g - 31, 2.6);
  // Sickle jaws and thread antennae.
  pen.stroke(bezier(pt(33, d.g - 25), pt(40, d.g - 26), pt(39, d.g - 20), 6), 1.4, d.ink, 1, false);
  pen.stroke(bezier(pt(32, d.g - 23), pt(38, d.g - 22), pt(36, d.g - 17), 6), 1.1, d.ink, 0.8, false);
  const sway = [0, 2, -1][d.f]!;
  pen.stroke(bezier(pt(31, d.g - 33), pt(40, d.g - 46 + sway), pt(50, d.g - 44 + sway), 8), 0.8, d.ink, 1, false);
  legs(false);
}

const DRAW: Readonly<Record<SpeciesId, (d: Draw) => void>> = { ghostcrab: ghostCrab, slater, beetle };

export function drawCritter(d: Draw, species: SpeciesId = 'ghostcrab'): void {
  DRAW[species](d);
}
