import { createRng } from '../../../../src/logic/rng';
import { bezier, closed, cub, type Draw, pt } from '../../../../src/art/kit';
import { PAPER_FILL } from '../../../../src/art/palette';
import type { Pt } from '../../../../src/art/pen';
import { mix } from '../../../../src/art/wash';
import { ellipseAt, glaze } from '../../../../src/art/critters/preyKit';
import { bilateralY } from '../../../../src/art/critters/tomcatKit';
import { tube, tufted } from '../../../../src/art/critters/tomcatParts';
import { along, type Leg, paintFur, type Pelt, resample } from '../../../../src/art/chapters/barrensCrittersBeast';

/**
 * The spotted hyena's parts, seen from above facing +x: its palette, the
 * soft-edged spots painted wet into the coat, the big blunt head (eyes
 * shut, round ears laid flat back), the paws and the short dark-tipped tail.
 */
export const HY = {
  base: '#b39d78',
  deep: '#4d3d2c',
  light: '#e2d4b4',
  grey: '#a2998a',
  tawny: '#c3965f',
  saddle: '#7a6550',
  cream: '#eee3c8',
  spot: '#4a3423',
  spotDeep: '#2f2117',
  dark: '#2a211b',
  face: '#a08766',
  muzzle: '#3e3129',
  nose: '#191513',
  ear: '#8f7a60',
  earRim: '#3a2c22',
  pad: '#3b302a',
} as const;

const K = HY;

/** One spot: a soft blob of two or three overlapping lobes. */
export interface Spot {
  readonly lobes: readonly { readonly c: Pt; readonly rx: number; readonly ry: number; readonly rot: number }[];
}

/**
 * Spots scattered over an area by rejection: `pick` proposes a centre and
 * its radius (or null to skip), and spots keep a gap from each other.
 * `squash` flattens a spot across the body near the flank, where the body
 * curves away from the eye.
 */
export function scatter(seed: number, tries: number, gap: number, pick: (rng: () => number) => { c: Pt; r: number; squash: number; rot: number } | null): Spot[] {
  const rng = createRng(seed);
  const placed: { c: Pt; r: number }[] = [];
  const spots: Spot[] = [];
  for (let i = 0; i < tries; i++) {
    const s = pick(rng);
    if (!s) continue;
    if (placed.some((q) => Math.hypot(q.c.x - s.c.x, q.c.y - s.c.y) < q.r + s.r + gap)) continue;
    placed.push({ c: s.c, r: s.r });
    const n = 1 + Math.floor(rng() * 3);
    const lobes = Array.from({ length: n }, (_, j) => {
      const a = rng() * Math.PI * 2;
      const o = j === 0 ? 0 : s.r * (0.35 + rng() * 0.3);
      const k = j === 0 ? 1 : 0.55 + rng() * 0.25;
      return { c: pt(s.c.x + Math.cos(a) * o, s.c.y + Math.sin(a) * o * s.squash), rx: s.r * k * (0.9 + rng() * 0.3), ry: s.r * k * s.squash * (0.75 + rng() * 0.3), rot: s.rot + (rng() - 0.5) * 0.8 };
    });
    spots.push({ lobes });
  }
  return spots;
}

/** How deep in a spot a point lies: 1 at its heart, 0 outside it. */
export function inSpot(spots: readonly Spot[], p: Pt): number {
  let best = 0;
  for (const s of spots) {
    for (const l of s.lobes) {
      const dx = p.x - l.c.x;
      const dy = p.y - l.c.y;
      if (Math.abs(dx) > l.rx + 1 || Math.abs(dy) > l.rx + 1) continue;
      const c = Math.cos(-l.rot);
      const sn = Math.sin(-l.rot);
      const u = (dx * c - dy * sn) / l.rx;
      const v = (dx * sn + dy * c) / l.ry;
      best = Math.max(best, 1 - Math.hypot(u, v));
    }
  }
  return best;
}

/** The spots laid in wet: each lobe a soft glaze, a darker heart, a lighter bleed round the edge. */
export function washSpots(d: Draw, spots: readonly Spot[], alpha = 1): void {
  for (const s of spots) {
    for (const l of s.lobes) glaze(d, l.c.x, l.c.y, l.rx * 1.35, l.ry * 1.35, l.rot, K.saddle, 0.3 * alpha);
    for (const l of s.lobes) glaze(d, l.c.x, l.c.y, l.rx, l.ry, l.rot, K.spot, 0.78 * alpha);
    const h = s.lobes[0]!;
    glaze(d, h.c.x + 0.2, h.c.y + 0.3, h.rx * 0.55, h.ry * 0.55, h.rot, K.spotDeep, 0.45 * alpha);
  }
}

/** A hair's colour in a spotted coat: dark in a spot, `coat` elsewhere. */
export function spotted(spots: readonly Spot[], coat: (p: Pt, r: number) => string): (p: Pt, r: number) => string {
  return (p, r) => {
    const s = inSpot(spots, p);
    if (s > 0.05 && r < 0.35 + s * 0.6) return r < 0.25 ? K.spotDeep : K.spot;
    return coat(p, r);
  };
}

/** Where the head sits and how far the muzzle runs out ahead of C. */
export interface HyenaHead {
  readonly C: Pt;
  readonly snout: number;
}

/** The head's outline round C: a broad, heavy-jawed crown running into a short, broad, blunt muzzle. */
export function hyenaHeadShape(h: HyenaHead): Pt[] {
  const { C, snout: s } = h;
  const half = [
    ...cub(pt(-10, 0), pt(-10, 5.4), pt(-7.5, 9.6), pt(-2.5, 10.6), 7),
    ...cub(pt(-2.5, 10.6), pt(1, 11.2), pt(4.5, 8.8), pt(7.5, 6.9), 6).slice(1),
    ...cub(pt(7.5, 6.9), pt(10, 5.8), pt(s - 4, 5.4), pt(s - 1.6, 4.3), 6).slice(1),
    ...cub(pt(s - 1.6, 4.4), pt(s - 0.2, 3.6), pt(s + 0.4, 1.8), pt(s + 0.4, 0), 5).slice(1),
  ];
  return resample(bilateralY(half).map((p) => pt(C.x + p.x, C.y + p.y)), 1.2);
}

/** A big round ear laid flat back along the neck: its furred back, a dark rim, a pale fringe at the edge. */
function ear(d: Draw, h: HyenaHead, side: 1 | -1): void {
  const { pen } = d;
  const c = pt(h.C.x - 11.6, h.C.y + side * 7.2);
  const rot = side * 0.3;
  const shape = ellipseAt(c.x, c.y, 5.6, 3.5, rot, 32);
  pen.fill(shape.map((p) => pt(p.x + 0.9, p.y + 1.4)), d.ink, 0.25);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(K.saddle, K.spot, 0.35), 0.95);
  pen.clipped(shape, () => {
    // Darker at the root, a dark rim round the rounded tip, lit on the light side.
    glaze(d, c.x + 3.5, c.y - side * 1.2, 3.5, 3, 0, K.spot, 0.6);
    pen.crescent(shape, pt(1.4, side * -0.4), () => pen.fill(shape, K.earRim, 0.85));
    glaze(d, c.x - 0.8, c.y - side * 0.6, 3, 1.5, rot, K.ear, 0.45);
    // The ear's rolled outer edge, folded flat against the neck.
    const u = pt(Math.cos(rot), Math.sin(rot));
    pen.hair(bezier(pt(c.x + u.x * 4, c.y + u.y * 4 + side * 1.3), pt(c.x, c.y + side * 2.2), pt(c.x - u.x * 4.6, c.y - u.y * 4.6 + side * 0.6), 8), 0.4, d.ink, 0.45);
  });
  const rng = createRng(7302 + side);
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2;
    const r = rng() * 0.8;
    const p = pt(c.x + Math.cos(a) * 4 * r, c.y + Math.sin(a) * 2.9 * r);
    pen.hair([p, pt(p.x - 1.3, p.y + (p.y - c.y) * 0.2)], 0.28, rng() < 0.5 ? K.saddle : K.dark, 0.6);
  }
  // The pale hair fringing the ear's outer edge.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8 - 0.5) * 2.2;
    const p = pt(c.x + Math.cos(a + rot) * 4.5, c.y + Math.sin(a + rot) * 3.2);
    pen.hair([p, pt(p.x - 0.9, p.y + side * 0.4)], 0.3, K.cream, 0.6);
  }
  pen.stroke(closed(shape), 0.45, d.ink, 0.75);
}

/** A shut eye: the lid's gentle curve, its dark rim, the lashes' line, a soft shadow round it. */
function shutEye(d: Draw, e: Pt, side: 1 | -1): void {
  const { pen } = d;
  glaze(d, e.x, e.y, 3.6, 2.4, -side * 0.3, K.muzzle, 0.85);
  // The shut lid, bulging softly over the eyeball.
  const lidC = pt(e.x - 0.1, e.y + side * 0.15);
  glaze(d, lidC.x - 0.3, lidC.y - side * 0.3, 1.7, 1, -side * 0.3, K.grey, 0.55);
  const lid = bezier(pt(e.x - 2.2, e.y + side * 0.6), pt(e.x, e.y + side * 0.95), pt(e.x + 2.2, e.y - side * 0.35), 8);
  pen.stroke(lid, 0.75, K.nose, 0.95, false);
  pen.hair(lid.map((p) => pt(p.x - 0.1, p.y - side * 0.5)), 0.4, K.light, 0.6);
  pen.hair([pt(e.x + 1.9, e.y - side * 0.3), pt(e.x + 2.9, e.y - side * 0.8)], 0.4, K.dark, 0.6);
}

/** The crown's back edge melting into the neck: neck-coloured hair over the seam, the mane's first bristles at its middle. */
function nape(d: Draw, h: HyenaHead): void {
  const { pen } = d;
  const C = h.C;
  const rng = createRng(7341);
  for (let i = 0; i < 260; i++) {
    const y = (rng() * 2 - 1) * 10;
    const xe = C.x - 10 * Math.sqrt(Math.max(0, 1 - (y / 10.8) ** 2));
    const x = xe + 1 + rng() * 3;
    const l = 2.4 + rng() * 2.2;
    const a = Math.PI + (y / 10) * 0.45 + (rng() - 0.5) * 0.3;
    const mid = Math.abs(y) < 3.2;
    const r = rng();
    const color = mid ? (r < 0.6 ? K.dark : K.spot) : r < 0.25 ? K.saddle : r < 0.5 ? K.grey : r < 0.85 ? K.base : K.light;
    pen.hair([pt(x, C.y + y), pt(x + Math.cos(a) * l * 0.5, C.y + y + Math.sin(a) * l * 0.5 + 0.1), pt(x + Math.cos(a) * l, C.y + y + Math.sin(a) * l)], 0.35, color, 0.75);
  }
}

/** Paints the head round h.C: a grey-tawny crown, the dark face and broad black nose, eyes shut, ears flat back. */
export function paintHyenaHead(d: Draw, h: HyenaHead, shape: readonly Pt[]): void {
  const { pen } = d;
  const C = h.C;
  const N = pt(C.x + h.snout, C.y);
  const pelt: Pelt = { base: K.face, deep: K.deep, light: K.light, hair: (_p, r) => (r < 0.18 ? K.saddle : r < 0.45 ? K.grey : r < 0.85 ? K.face : K.light) };
  const dark = (p: Pt): number => Math.max(0, Math.min(1, (p.x - C.x + 1) / (h.snout - 3))) ** 0.75;
  const faint = scatter(7311, 90, 1.2, (rng) => {
    const x = C.x - 7 + rng() * 10;
    const y = (rng() - 0.5) * 16;
    return Math.abs(y) < 3 ? null : { c: pt(x, C.y + y), r: 0.7 + rng() * 0.6, squash: 0.8, rot: 0 };
  });
  for (const side of [-1, 1] as const) ear(d, h, side);
  paintFur(d, pelt, {
    shape,
    dir: (p) => Math.atan2(p.y - N.y, p.x - N.x),
    wet: () => {
      glaze(d, C.x - 3, C.y, 7, 6, 0, K.saddle, 0.35);
      for (const side of [-1, 1]) glaze(d, C.x - 2, C.y + side * 7.5, 5, 3, 0, K.tawny, 0.45);
      glaze(d, C.x - 1, C.y - 3, 6, 3.5, 0, K.light, 0.3);
      washSpots(d, faint, 0.4);
      // The dark face: the muzzle near-black at the nose, fading back past the eyes.
      glaze(d, N.x - 3.5, C.y, 7, 6, 0, K.muzzle, 0.95);
      glaze(d, N.x - 8.5, C.y, 7.5, 5.4, 0, K.muzzle, 0.6);
      glaze(d, C.x + 2, C.y, 4.5, 3, 0, K.saddle, 0.45);
      for (const side of [-1, 1]) glaze(d, C.x + 7, C.y + side * 6, 4, 2, 0, K.saddle, 0.4);
    },
    hair: (p, r) => {
      const t = dark(p);
      if (r < t * 0.85) return r < t * 0.4 ? K.dark : K.muzzle;
      return pelt.hair(p, r);
    },
    n: 1000, len: 1.9, seed: 7301, tuft: 1, line: 0.05,
  });
  nape(d, h);
  // The contour round the face only: behind, the head runs into the neck's fur.
  const front = shape.filter((p) => p.x > C.x - 4).sort((a, b) => Math.atan2(a.y - C.y, a.x - C.x - 3) - Math.atan2(b.y - C.y, b.x - C.x - 3));
  pen.stroke(front, 0.9, d.ink, 0.9);
  // The bridge of the nose, a little lighter on top.
  pen.hair(bezier(pt(C.x + 1, C.y - 0.6), pt(C.x + 7, C.y - 1), pt(N.x - 3, C.y - 0.5), 6), 0.9, K.grey, 0.35);
  for (const side of [-1, 1] as const) {
    shutEye(d, pt(C.x + 3.4, C.y + side * 4.8), side);
    // Whisker pits and a few short whiskers lying back along the muzzle.
    for (const [x, y] of [[h.snout - 4.5, 3.4], [h.snout - 5.8, 3.9], [h.snout - 3.6, 2.6]] as const) pen.dot(C.x + x, C.y + side * y, 0.25, K.dark, 0.6);
    for (const [tx, ty] of [[h.snout - 10, 7.4], [h.snout - 8, 8.2], [h.snout - 12, 6.6]] as const) {
      const root = pt(C.x + h.snout - 4.6, C.y + side * 3.6);
      pen.hair(bezier(root, pt(C.x + h.snout - 7, C.y + side * 5.6), pt(C.x + tx, C.y + side * ty), 6), 0.26, PAPER_FILL, 0.45);
    }
  }
  // The broad black nose, rounded at its front, nostrils at its corners.
  const nose = [pt(N.x - 3.2, C.y - 2.4), pt(N.x - 0.8, C.y - 2.6), pt(N.x + 0.5, C.y - 1.4), pt(N.x + 0.7, C.y), pt(N.x + 0.5, C.y + 1.4), pt(N.x - 0.8, C.y + 2.6), pt(N.x - 3.2, C.y + 2.4), pt(N.x - 3.8, C.y)];
  pen.fill(nose, K.nose, 1);
  pen.dot(N.x - 2.2, C.y - 1, 0.5, mix(K.grey, PAPER_FILL, 0.4), 0.55);
  for (const side of [-1, 1]) pen.hair(bezier(pt(N.x - 0.4, C.y + side * 1.9), pt(N.x + 0.4, C.y + side * 1.2), pt(N.x - 0.6, C.y + side * 0.7), 4), 0.35, '#000000', 0.8);
  pen.hair(closed(nose), 0.4, d.ink, 0.9);
}

/** A broad hyena paw seen from above: four thick toes, short blunt dark claws. */
export function paw(d: Draw, l: Leg, pelt: Pelt): void {
  const { pen } = d;
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const v = pt(-u.y, u.x);
  const c = pt(l.c.x + u.x * 1.4, l.c.y + u.y * 1.4);
  const p = ellipseAt(c.x, c.y, 4, 2.5, l.ang, 18);
  pen.fill(p, PAPER_FILL, 1);
  pen.fill(p, mix(K.saddle, K.spot, 0.45), 0.97);
  pen.clipped(p, () => {
    glaze(d, c.x - 0.7, c.y - 0.9, 2.4, 1.3, l.ang, mix(pelt.base, K.saddle, 0.4), 0.7);
    pen.crescent(p, pt(-0.6, -0.9), () => pen.fill(p, K.deep, 0.5));
  });
  for (const o of [-1.4, -0.48, 0.48, 1.4]) {
    const b = pt(c.x + u.x * 1.8 + v.x * o, c.y + u.y * 1.8 + v.y * o);
    pen.hair([pt(b.x - u.x * 1.8, b.y - u.y * 1.8), b], 0.32, K.dark, 0.75);
    pen.hair([b, pt(b.x + u.x * 1.1, b.y + u.y * 1.1)], 0.5, K.nose, 0.95);
  }
  pen.stroke(closed(p), 0.55, d.ink, 0.9, false);
}

/** The short bushy tail: coat-coloured at the root, then the long black brush at its tip; returns its outline. */
export function paintTail(d: Draw, spine: readonly Pt[], pelt: Pelt): Pt[] {
  const n = spine.length - 1;
  const w = (u: number): number => 4.2 + 3.6 * Math.sin(Math.PI * Math.min(1, 0.1 + u * 0.75)) ** 0.8;
  const shape = tufted(resample(tube(spine, w), 1.3), 0.45, 3);
  const u = (p: Pt): number => along(spine, p).i / n;
  paintFur(d, pelt, {
    shape,
    dir: (p) => along(spine, p).ang + Math.PI,
    wet: () => {
      for (let i = 2; i < n * 0.5; i += 2) glaze(d, spine[i]!.x, spine[i]!.y, 2.6, 1.8, 0, K.saddle, 0.45);
      for (let i = Math.round(n * 0.45); i <= n; i++) glaze(d, spine[i]!.x, spine[i]!.y, 3.4, 4, 0, K.dark, 0.5);
    },
    hair: (p, r) => {
      const t = u(p);
      if (t > 0.5) return r < 0.85 ? K.dark : K.spot;
      if (t > 0.38) return r < 0.5 ? K.spot : K.saddle;
      return pelt.hair(p, r);
    },
    n: 420, len: 3, seed: 7331, tuft: 1.8, line: 0.75,
  });
  return shape;
}
