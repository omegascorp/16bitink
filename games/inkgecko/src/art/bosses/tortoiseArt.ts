import { capsule, closed, type Draw, pt, ribbon, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { castShadow, ellipseAt, glaze } from '../propsKit';
import { mix } from '../wash';
import { paintShell, shellRim, SHELL, TORT } from './tortoiseShell';
import type { BossArt } from './types';

/**
 * The Old Tortoise (chapter 5, the Rockery), seen from above plodding
 * towards +x: a high-domed, mossy, weathered shell about 60 long and 48
 * across, a wrinkled scaly head with beady eyes poking out in front, and
 * four stumpy clawed legs. 'walk0'/'walk1' swap the diagonal leg pairs and
 * bob the head; 'hurt' has it pulled into its shell, seeing stars.
 */
const SKIN = {
  base: '#9a8e68',
  light: '#cdbf92',
  deep: '#55492f',
  claw: '#2f2a22',
} as const;

/** A shape turned by `ang` about the origin and moved to c. */
const place = (ps: readonly Pt[], c: Pt, ang: number): Pt[] =>
  ps.map((p) => pt(c.x + p.x * Math.cos(ang) - p.y * Math.sin(ang), c.y + p.x * Math.sin(ang) + p.y * Math.cos(ang)));

/** Skin: paper, a grey-olive wash, its shadow side, then pebbly scales stippled in. */
function skinWash(d: Draw, shape: readonly Pt[], light: Pt, dots: number): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SKIN.base, 0.9);
  pen.clipped(shape, () => {
    glaze(d, light.x, light.y, 5, 3.6, 0, SKIN.light, 0.6);
    pen.crescent(shape, pt(-1.4, -1.8), () => pen.fill(shape, SKIN.deep, 0.42));
    pen.stipple(shape, dots, () => 0.6, 0.32, SKIN.deep);
  });
}

interface LegSpec {
  readonly root: Pt;
  readonly tip: Pt;
  /** Which way the toes point (radians). */
  readonly ang: number;
}

/** A stumpy elephantine leg: broad at the foot, big overlapping scales, four blunt claws. */
function leg(d: Draw, l: LegSpec): void {
  const { pen } = d;
  const limb = capsule(l.root, l.tip, 8.4, 10);
  const [ux, uy] = [Math.cos(l.ang), Math.sin(l.ang)];
  const along = (p: Pt, a: number, b: number): Pt => pt(p.x + ux * a - uy * b, p.y + uy * a + ux * b);
  skinWash(d, limb, along(l.tip, -1, -1.5), 36);
  pen.clipped(limb, () => {
    // Rows of big plate-like scales across the front of the leg, smaller towards the body.
    for (let r = 0; r < 4; r++) {
      const n = 4 - (r % 2);
      for (let k = 0; k < n; k++) {
        const c = along(l.tip, 1.4 - r * 2.2, (k - (n - 1) / 2) * 2.3);
        // A shingle: lit on its face, its free edge (towards the toes) inked.
        const rr = 1.35 - r * 0.15;
        const edgeArc = Array.from({ length: 7 }, (_, i) => along(c, Math.cos(-1.4 + (i / 6) * 2.8) * rr, Math.sin(-1.4 + (i / 6) * 2.8) * rr));
        pen.fill(ellipseAt(c.x, c.y, rr * 0.8, rr * 0.7, l.ang, 8), SKIN.light, 0.3);
        pen.hair(edgeArc, 0.42, SKIN.deep, 0.85);
      }
    }
  });
  pen.stroke(closed(limb), 0.8, d.ink, 0.9);
  for (const k of [-1.5, -0.5, 0.5, 1.5]) {
    // A blunt horn claw: a dark wedge with a lit edge.
    const base = along(l.tip, 4 - Math.abs(k) * 0.9, k * 2.3);
    const claw = [along(base, 0, -0.75), along(base, 2.6, k * 0.45), along(base, 0, 0.75)];
    pen.fill(claw, SKIN.claw, 0.92);
    pen.hair([along(base, 0.3, -0.45), along(base, 1.7, k * 0.3 - 0.2)], 0.35, PAPER_FILL, 0.6);
    pen.hair(closed(claw), 0.35, d.ink, 0.8);
  }
}

/** The legs for a walk step: diagonal pairs reach forward or push back together. */
function legs(step: 0 | 1): LegSpec[] {
  const fwd = (s: number, front: boolean): number => ((s < 0) === front) === (step === 0) ? 2.6 : -2.2;
  const out: LegSpec[] = [];
  for (const s of [-1, 1]) {
    const f = fwd(s, true);
    const b = fwd(s, false);
    out.push({ root: pt(10 + f * 0.4, s * 15), tip: pt(17 + f, s * 23.5), ang: s * (0.9 - f * 0.08) });
    out.push({ root: pt(-18 + b * 0.4, s * 13), tip: pt(-24.5 + b, s * 21.5), ang: s * (2.25 - b * 0.06) });
  }
  return out;
}

/** The head's outline in its own frame: a broad flat skull narrowing to a hooked beak at +x. */
function headShape(): Pt[] {
  return Array.from({ length: 34 }, (_, i) => {
    const a = (i / 34) * TAU;
    const c = Math.cos(a);
    const x = c * (c > 0 ? 7.6 : 5.4);
    const t = Math.max(0, x / 7.6);
    const half = 5.2 * (1 - 0.5 * t ** 1.6) * (1 - 0.08 * Math.max(0, -x / 5.4));
    return pt(x, Math.sin(a) * half);
  });
}

/** Neck and head poking out from under the shell, bobbed by (bx, by) and turned by ang. */
function head(d: Draw, bx: number, by: number, ang: number): void {
  const { pen } = d;
  const c = pt(34 + bx, by);
  const neckSpine = Array.from({ length: 8 }, (_, i) => pt(20 + ((c.x - 24) * i) / 7, (by * i) / 7));
  const neck = ribbon(neckSpine, (u) => 9.4 - u * 1.4).shape;
  const face = place(headShape(), c, ang);
  castShadow(d, [...neck, ...face], pt(2, 3), 0.15);
  skinWash(d, neck, pt(c.x - 9, by - 2), 40);
  pen.clipped(neck, () => {
    // Folds of loose old skin across the neck, and a pebbled band of scales between them.
    for (let k = 0; k < 4; k++) {
      const x = 22 + k * ((c.x - 26) / 3.6);
      const y = (by * (x - 20)) / (c.x - 20);
      pen.hair([pt(x + 1.4, y - 4.6), pt(x - 0.4, y - 1.6), pt(x - 0.6, y + 1.6), pt(x + 1.2, y + 4.6)], 0.42, SKIN.deep, 0.8);
      pen.hair([pt(x + 2.4, y - 3.4), pt(x + 1.6, y), pt(x + 2.3, y + 3.4)], 0.28, SKIN.deep, 0.45);
    }
  });
  pen.hair(closed(neck), 0.7, d.ink, 0.85);
  const at = (x: number, y: number): Pt => place([pt(x, y)], c, ang)[0]!;
  skinWash(d, face, at(0, -1.6), 44);
  pen.clipped(face, () => {
    // The big plates of the crown and the brow, the snout's lit ridge.
    pen.hair([at(-4, -3), at(-1.6, -2.4), at(1, -1.6), at(3.6, -1.2), at(6.2, -0.6)], 0.4, SKIN.deep, 0.8);
    pen.hair([at(-4, 3), at(-1.6, 2.4), at(1, 1.6), at(3.6, 1.2), at(6.2, 0.6)], 0.4, SKIN.deep, 0.8);
    for (const x of [-1.6, 1, 3.6]) pen.hair([at(x, -2.2), at(x + 0.3, 0), at(x, 2.2)], 0.36, SKIN.deep, 0.65);
    pen.hair([at(-4, -3), at(-5, 0), at(-4, 3)], 0.36, SKIN.deep, 0.55);
    pen.hair([at(-2.6, -0.4), at(5, -0.3)], 1.3, PAPER_FILL, 0.38);
    pen.crescent(face, at(-0.5, -0.4), () => pen.fill(face, mix(SKIN.deep, SKIN.base, 0.3), 0.25));
  });
  pen.stroke(closed(face), 0.85, d.ink, 0.92);
  for (const s of [-1, 1]) {
    // A heavy-lidded beady eye set in the side of the head, and a nostril at the beak.
    const e = at(0.8, s * 3.6);
    pen.fill(ellipseAt(e.x, e.y, 1.5, 1.1, ang, 10), SKIN.deep, 0.5);
    pen.dot(e.x, e.y, 0.95, SKIN.claw, 1);
    const g = at(0.5, s * 3.6 - 0.35);
    pen.dot(g.x, g.y, 0.33, PAPER_FILL, 0.95);
    pen.hair([at(-1, s * 2.8), at(0.8, s * 2.45), at(2.6, s * 2.9)], 0.65, d.ink, 0.85);
    const n = at(6.6, s * 0.6);
    pen.dot(n.x, n.y, 0.32, d.ink, 0.9);
  }
}

/** A short pointed tail peeping out at the back. */
function tail(d: Draw): void {
  const t = [pt(-31, -2.4), pt(-37.5, 0.6), pt(-31, 2.6)];
  skinWash(d, t, pt(-33, -0.5), 8);
  d.pen.hair(closed(t), 0.6, d.ink, 0.85);
}

function walk(d: Draw, step: 0 | 1): void {
  const rim = shellRim();
  const specs = legs(step);
  castShadow(d, rim, pt(2.6, 3.6), 0.2);
  for (const l of specs) castShadow(d, capsule(l.root, l.tip, 9.5, 8.6), pt(1.6, 2.4), 0.14);
  tail(d);
  for (const l of specs) leg(d, l);
  head(d, step === 0 ? 1.2 : -0.6, step === 0 ? -1 : 1, step === 0 ? -0.08 : 0.08);
  paintShell(d);
}

/** A small five-pointed star, washed pale gold and inked, for a dazed head. */
function star(d: Draw, x: number, y: number, r: number, rot: number): void {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = rot + (i / 10) * TAU;
    const k = i % 2 === 0 ? r : r * 0.45;
    return pt(x + Math.cos(a) * k, y + Math.sin(a) * k);
  });
  d.pen.fill(pts, PAPER_FILL, 1);
  d.pen.fill(pts, TORT.horn, 0.8);
  d.pen.hair(closed(pts), 0.55, d.ink, 0.95);
}

/** Stars and swirls of a dazed head, and shake marks either side of the shell. */
function dizzy(d: Draw): void {
  const { pen } = d;
  for (const [x, y, r, a] of [[31, -22, 3.4, 0.2], [38, 10, 2.6, 0.7], [20, 30, 2.8, 1.1]] as const) star(d, x, y, r, a);
  for (const [x, y] of [[41, -6], [-4, -33]] as const) {
    pen.hair(Array.from({ length: 22 }, (_, i) => pt(x + Math.cos(i * 0.5) * (0.3 + i * 0.16), y + Math.sin(i * 0.5) * (0.3 + i * 0.13))), 0.6, d.ink, 0.9);
  }
  for (const s of [-1, 1]) {
    for (const k of [0, 1]) pen.hair([pt(-14 + k * 4, s * (31 + k * 2.2)), pt(-2 + k * 4, s * (32.5 + k * 2.2))], 0.5, d.ink, 0.6);
  }
}

/** A tucked limb in an opening: a scaly skin pad with its claws, sunk in shadow. */
function tucked(d: Draw, c: Pt, rx: number, ry: number, rot: number, claws: boolean): void {
  const { pen } = d;
  const pad = ellipseAt(c.x, c.y, rx, ry, rot, 14);
  skinWash(d, pad, pt(c.x - 1, c.y - 1), 14);
  pen.clipped(pad, () => {
    for (let k = -1; k <= 1; k++) pen.hair(closed(ellipseAt(c.x + Math.cos(rot) * 0.6, c.y + Math.sin(rot) * 0.6 + k * 1.6, 0.9, 0.75, rot, 8)), 0.3, SKIN.deep, 0.7);
  });
  pen.hair(closed(pad), 0.55, d.ink, 0.85);
  if (!claws) return;
  for (const k of [-1, 0, 1]) {
    const b = pt(c.x + Math.cos(rot) * rx * 0.85 - Math.sin(rot) * k * 1.5, c.y + Math.sin(rot) * rx * 0.85 + Math.cos(rot) * k * 1.5);
    pen.stroke([b, pt(b.x + Math.cos(rot) * 1.6, b.y + Math.sin(rot) * 1.6)], 1.3, SKIN.claw, 0.95, false);
  }
}

/** Pulled in: scaly forearms barring the front opening, hind feet plugging the back, the shell knocked askew. */
function hurt(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const rim = shellRim();
  const front = SHELL.cx + SHELL.rx;
  ctx.save();
  ctx.rotate(-0.07);
  castShadow(d, rim, pt(2.6, 3.6), 0.2);
  pen.fill(ellipseAt(front, 0, 3.4, 8, 0, 18), TORT.deep, 0.9);
  for (const s of [-1, 1]) {
    pen.fill(ellipseAt(-22, s * 15.4, 2.4, 4.6, s * -0.95, 16), TORT.deep, 0.85);
    tucked(d, pt(-23.4, s * 16.6), 2.4, 3.2, s * 2.2, true);
    pen.fill(ellipseAt(11.5, s * 20, 1.8, 4.2, s * 0.95, 14), TORT.deep, 0.8);
    tucked(d, pt(front + 1.8, s * 3.2), 3, 3.1, s * 0.25, true);
  }
  // The tip of a nose just visible between the forearms.
  pen.dot(front + 2.6, 0, 0.8, TORT.deep, 0.95);
  paintShell(d);
  ctx.restore();
  dizzy(d);
}

function draw(d: Draw, pose: string): void {
  if (pose === 'hurt') hurt(d);
  else walk(d, pose === 'walk1' ? 1 : 0);
}

export const TORTOISE_ART: BossArt = { frame: 110, res: 3, poses: ['walk0', 'walk1', 'hurt'], draw };
