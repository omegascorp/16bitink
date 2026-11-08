import { createRng } from '../../../../src/logic/rng';
import { bezier, closed, type Draw, pt } from '../../../../src/art/kit';
import { PAPER_FILL } from '../../../../src/art/palette';
import type { Pt } from '../../../../src/art/pen';
import { ellipseAt, glaze } from '../../../../src/art/critters/preyKit';
import { tube } from '../../../../src/art/critters/tomcatParts';
import { clumps, paintFur, type Pelt, softShadow, trunkShape } from '../../../../src/art/chapters/barrensCrittersBeast';
import { smoothLoop } from '../../../../src/art/chapters/floodedCrittersKit';

/**
 * A white-tailed deer from above facing +x, limp as a python swallows it
 * head first (see index.ts): stretched straight out, the head forward with
 * the eyes shut, the big ears laid flat back along the neck, the forelegs
 * folded back along the flanks, the hind legs stretched back past the rump
 * and the tail lying between them. Painted like the game's capybara: a
 * soft shadow, layered washes, hair by hair along the coat, darker down the
 * spine and paler to the flanks, a thin broken contour. The fawn and the
 * doe share it; each brings its coat and its build.
 */

export interface DeerCoat {
  readonly base: string;
  /** The dark of the spine and the shadow side. */
  readonly deep: string;
  readonly dark: string;
  readonly light: string;
  /** The belly's edge showing at the flanks. */
  readonly pale: string;
  readonly warm: string;
  readonly white: string;
  readonly face: string;
  readonly muzzle: string;
  readonly leg: string;
  readonly hoof: string;
  readonly nose: string;
  readonly ear: string;
  readonly earRim: string;
}

type Knots = readonly (readonly [number, number])[];

/** A limb's keys on the +y side (root, joint, hoof) and its full width at stops along it. */
export interface Limb {
  readonly root: Pt;
  readonly joint: Pt;
  readonly hoof: Pt;
  readonly widths: readonly (readonly [number, number])[];
}

export interface DeerBuild {
  /** The poll (the back of the skull) and the head's half-width keys forward of it. */
  readonly poll: number;
  readonly face: Knots;
  /** Half widths from the neck's front back to the rump. */
  readonly trunk: Knots;
  readonly ear: { readonly len: number; readonly w: number };
  readonly eye: { readonly x: number; readonly y: number; readonly r: number };
  readonly fore: Limb;
  readonly hind: Limb;
  readonly hoof: number;
  readonly tail: { readonly from: number; readonly len: number; readonly w: number };
  readonly hair: number;
  readonly hairs: number;
  /** The fawn's white spots. */
  readonly spots: boolean;
  /** The doe's white throat patch, showing past the jaw. */
  readonly throat: boolean;
  readonly seed: number;
}

/** A smooth limb from root through joint to hoof, `widths` across at stops along it (u 0..1). */
function limbShape(l: Limb, side: 1 | -1): { shape: Pt[]; spine: Pt[] } {
  const [a, j, c] = [l.root, l.joint, l.hoof].map((p) => pt(p.x, p.y * side)) as [Pt, Pt, Pt];
  const ctl = pt(2 * j.x - (a.x + c.x) / 2, 2 * j.y - (a.y + c.y) / 2);
  const spine = bezier(a, ctl, c, 20);
  const w = (u: number): number => {
    const ws = l.widths;
    for (let i = 1; i < ws.length; i++) {
      const [u1, w1] = ws[i]!;
      const [u0, w0] = ws[i - 1]!;
      if (u <= u1) return w0 + ((w1 - w0) * (1 - Math.cos((Math.PI * (u - u0)) / (u1 - u0)))) / 2;
    }
    return ws[ws.length - 1]![1];
  };
  return { shape: tube(spine, w), spine };
}

/** The cloven hoof at the end of a limb: two slim black toes side by side, pointing on along it, dewclaws behind. */
function hoof(d: Draw, spine: readonly Pt[], size: number, C: DeerCoat): Pt[] {
  const { pen } = d;
  const end = spine[spine.length - 1]!;
  const prev = spine[spine.length - 3]!;
  const ang = Math.atan2(end.y - prev.y, end.x - prev.x);
  const u = pt(Math.cos(ang), Math.sin(ang));
  const v = pt(-u.y, u.x);
  const toes = [-1, 1].map((s) => ellipseAt(end.x + u.x * size * 0.9 + v.x * s * size * 0.36, end.y + u.y * size * 0.9 + v.y * s * size * 0.36, size * 1.05, size * 0.42, ang + s * 0.06, 14));
  for (const t of toes) {
    pen.fill(t.map((p) => pt(p.x + 0.5, p.y + 0.8)), d.ink, 0.22);
    pen.fill(t, C.hoof, 1);
    pen.clipped(t, () => glaze(d, end.x + u.x * size * 0.7 - v.x * size * 0.1, end.y + u.y * size * 0.7, size * 0.8, size * 0.22, ang, PAPER_FILL, 0.35));
    pen.stroke(closed(t), 0.4, d.ink, 0.95, false);
  }
  for (const s of [-1, 1]) pen.dot(end.x - u.x * size * 0.9 + v.x * s * size * 0.55, end.y - u.y * size * 0.9 + v.y * s * size * 0.55, size * 0.22, C.hoof, 0.9);
  return toes.flat();
}

function paintLimb(d: Draw, B: DeerBuild, C: DeerCoat, l: Limb, side: 1 | -1, seed: number, hind: boolean): void {
  const { shape, spine } = limbShape(l, side);
  const end = spine[spine.length - 1]!;
  const pelt: Pelt = { base: C.leg, deep: C.deep, light: C.light, hair: (_p, r) => (r < 0.22 ? C.deep : r < 0.8 ? C.leg : C.light) };
  paintFur(d, pelt, {
    shape,
    dir: (p) => Math.atan2(end.y - p.y, end.x - p.x),
    wet: () => {
      // The pale inside of the leg along its edge towards the midline, the darker front of the shank.
      const mid = spine[Math.floor(spine.length * 0.45)]!;
      glaze(d, mid.x, mid.y - side * 1.6, 20, 1.6, Math.atan2(end.y - spine[0]!.y, end.x - spine[0]!.x), C.white, hind ? 0.55 : 0.35);
      if (hind) glaze(d, spine[2]!.x + 2, spine[2]!.y - side * 2.2, 7, 2.6, 0, C.white, 0.7);
      const low = spine[Math.floor(spine.length * 0.8)]!;
      glaze(d, low.x, low.y, 5, 1.4, 0, C.deep, 0.35);
      // The lit top of the leg and its darker outer edge, so it rounds.
      const ang = Math.atan2(end.y - spine[0]!.y, end.x - spine[0]!.x);
      for (const [i, k, a] of [[0.25, -0.9, 0.4], [0.6, -0.5, 0.35], [0.3, 1, 0.3]] as const) {
        const q = spine[Math.floor(spine.length * i)]!;
        glaze(d, q.x, q.y + k * side * (hind ? 2 : 0.8), hind ? 12 : 8, hind ? 2.2 : 1, ang, k < 0 ? C.light : C.deep, a);
      }
    },
    n: hind ? 760 : 380, len: B.hair * 0.6, seed, tuft: 0.35, line: 0.6,
  });
  // A knob of joint (hock or knee) inked in lightly.
  const j = spine[hind ? 9 : 10]!;
  d.pen.hair([pt(j.x + 1.2, j.y + side * 1.2), pt(j.x - 0.6, j.y + side * 1.6), pt(j.x - 2, j.y + side * 1.1)], 0.35, d.ink, 0.45);
  hoof(d, spine, B.hoof, C);
}

/** The head's outline from its half-width keys forward of the poll. */
export function headShape(B: DeerBuild): Pt[] {
  const half = B.face.map(([x, y]) => pt(B.poll + x, y));
  const other = [...B.face].reverse().slice(1, -1).map(([x, y]) => pt(B.poll + x, -y));
  return smoothLoop([...half, ...other], 4);
}

/** The ear's width along it: a narrow root, broad in the middle, a pointed tip. */
const earW = (w: number, u: number): number => 2 * w * Math.sin(Math.PI * (0.08 + 0.9 * u) ** 1.25) ** 0.8 + 0.25;

function earShape(B: DeerBuild, side: 1 | -1): { shape: Pt[]; spine: Pt[] } {
  const { len, w } = B.ear;
  const root = pt(B.poll + 1, side * 2.6);
  const tip = pt(B.poll + 1 - len, side * (2.4 + w * 0.45));
  const spine = bezier(root, pt(B.poll + 1 - len * 0.45, side * (2.6 + w * 1.05)), tip, 18);
  return { shape: tube(spine, (u) => earW(w, u)), spine };
}

/** An ear laid flat back along the neck: its furred back, the dark rim towards the tip, white hair along the inner edge. */
function paintEar(d: Draw, B: DeerBuild, C: DeerCoat, side: 1 | -1): void {
  const { pen } = d;
  const { shape, spine } = earShape(B, side);
  pen.fill(shape.map((p) => pt(p.x + 0.9, p.y + 1.3)), d.ink, 0.22);
  const tip = spine[spine.length - 1]!;
  const pelt: Pelt = { base: C.ear, deep: C.deep, light: C.light, hair: (_p, r) => (r < 0.3 ? C.deep : r < 0.85 ? C.ear : C.light) };
  paintFur(d, pelt, {
    shape,
    dir: (p) => Math.atan2(tip.y - p.y, tip.x - p.x),
    wet: () => {
      glaze(d, spine[7]!.x, spine[7]!.y, B.ear.len * 0.35, B.ear.w * 0.7, 0, C.light, 0.4);
      glaze(d, tip.x + 1.5, tip.y, B.ear.len * 0.22, B.ear.w * 1.2, 0, C.earRim, 0.75);
      for (let i = 3; i < 13; i += 2) {
        const p = spine[i]!;
        glaze(d, p.x, p.y - side * (earW(B.ear.w, i / (spine.length - 1)) / 2 - 0.3), 1.6, 0.7, 0, C.white, 0.75);
      }
      // The ear's middle ridge and the rim's shadow.
      pen.hair(spine.slice(2, 13).map((p) => pt(p.x, p.y - side * 0.2)), 0.4, C.deep, 0.4);
    },
    n: 160, len: B.hair * 0.55, seed: B.seed + (side > 0 ? 61 : 67), tuft: 0.25, line: 0.42,
  });
  // White hairs fringing the inner edge.
  const rng = createRng(B.seed + 70 + side);
  for (let k = 0; k < 16; k++) {
    const u = 0.12 + rng() * 0.6;
    const p = spine[Math.round(u * (spine.length - 1))]!;
    const e = pt(p.x, p.y - side * (earW(B.ear.w, u) / 2 - 0.2));
    const a = Math.PI - side * (0.3 + rng() * 0.5);
    const l = 0.9 + rng() * 1.1;
    pen.hair([e, pt(e.x + Math.cos(a) * l, e.y + Math.sin(a) * l)], 0.26, C.white, 0.6 + rng() * 0.3);
  }
  // The dark rim along the outer edge towards the tip.
  pen.hair(spine.slice(9).map((p, i) => pt(p.x, p.y + side * (earW(B.ear.w, (i + 9) / (spine.length - 1)) / 2 - 0.25))), 0.5, C.earRim, 0.7);
}

/** The face: the long wedge of the head, a darker brow, the white eye ring and muzzle band, the black nose, the eyes shut. */
function paintHead(d: Draw, B: DeerBuild, C: DeerCoat): void {
  const { pen } = d;
  const shape = headShape(B);
  const noseX = B.poll + B.face[B.face.length - 1]![0];
  const nose = pt(noseX, 0);
  const headPelt: Pelt = { base: C.face, deep: C.deep, light: C.light, hair: (_p, r) => (r < 0.22 ? C.dark : r < 0.75 ? C.face : r < 0.9 ? C.warm : C.light) };
  const E = B.eye;
  paintFur(d, headPelt, {
    shape,
    dir: (p) => Math.atan2(p.y - nose.y, p.x - nose.x + 3),
    wet: () => {
      glaze(d, B.poll + 9, 0, 9, 2.6, 0, C.deep, 0.5);
      glaze(d, B.poll - 1, 0, 4, 3.5, 0, C.deep, 0.45);
      glaze(d, noseX - 6, 0, 6, 2.6, 0, C.muzzle, 0.6);
      for (const s of [-1, 1]) {
        glaze(d, B.poll + E.x - 1, s * (E.y - 1.4), 6, 2.2, 0, C.light, 0.45);
        // The white ring round the eye and the white band behind the nose.
        glaze(d, B.poll + E.x, s * E.y, E.r * 2.2, E.r * 1.4, 0, C.white, 0.8);
        glaze(d, noseX - 3.6, s * 1.9, 1.5, 1.6, 0, C.white, 0.85);
      }
    },
    n: 620, len: B.hair * 0.6, seed: B.seed + 40, tuft: 0.35, line: 0.05,
  });
  // The contour round the face only: behind, the head runs into the neck's coat.
  const front = shape.filter((p) => p.x > B.poll + 0.5).sort((a, b) => Math.atan2(a.y, a.x - B.poll - 4) - Math.atan2(b.y, b.x - B.poll - 4));
  pen.stroke(front, 0.75, d.ink, 0.9);
  // Neck hairs running over the back of the head, so the head grows out of the neck with no seam.
  const rng = createRng(B.seed + 44);
  const back = B.poll + B.face[0]![0];
  for (let i = 0; i < 90; i++) {
    const y = (rng() - 0.5) * 2 * B.face[2]![1] * 0.95;
    const x = back - 1.5 + rng() * 5.5;
    pen.hair([pt(x + 1.6 + rng(), y * 0.97), pt(x - 1.4 - rng(), y)], 0.32, rng() < 0.3 ? C.dark : rng() < 0.7 ? C.face : C.light, 0.8);
  }
  // The black nose, moist and glinting, and its nostrils.
  const pad = ellipseAt(noseX - 0.9, 0, 1.4, 2.1, 0, 18);
  pen.clipped(shape, () => {
    pen.fill(pad, C.nose, 1);
    pen.hair([pt(noseX - 2, -1.2), pt(noseX - 1.1, -1.5), pt(noseX - 0.4, -0.9)], 0.45, PAPER_FILL, 0.6);
  });
  for (const s of [-1, 1]) pen.hair([pt(noseX - 0.4, s * 0.5), pt(noseX - 0.9, s * 1.6), pt(noseX - 1.9, s * 2.1)], 0.45, d.ink, 0.9);
  pen.hair([pt(noseX - 0.3, -0.8), pt(noseX, 0), pt(noseX - 0.3, 0.8)], 0.4, PAPER_FILL, 0.5);
  for (const s of [-1, 1] as const) {
    const e = pt(B.poll + E.x, s * E.y);
    // The gland in front of the eye, a dark streak.
    pen.hair([pt(e.x + E.r * 1.3, e.y - s * 0.3), pt(e.x + E.r * 2.6, e.y - s * 0.7)], 0.55, C.dark, 0.6);
    // The eye shut: a soft lid and a gentle closed line, a few lashes.
    const ball = ellipseAt(e.x, e.y, E.r * 1.3, E.r * 0.75, s * 0.12, 16);
    pen.fill(ball, C.deep, 0.55);
    pen.clipped(ball, () => glaze(d, e.x - E.r * 0.4, e.y - s * E.r * 0.3, E.r, E.r * 0.5, 0, C.light, 0.5));
    const lid = bezier(pt(e.x - E.r * 1.25, e.y), pt(e.x, e.y + s * E.r * 0.55), pt(e.x + E.r * 1.25, e.y - s * 0.15), 10);
    pen.stroke(lid, 0.7, d.ink, 0.95, false);
    for (let i = 2; i <= 8; i += 2) {
      const p = lid[i]!;
      pen.hair([p, pt(p.x - 0.55, p.y + s * 0.7)], 0.3, d.ink, 0.75);
    }
  }
}

function paintTail(d: Draw, B: DeerBuild, C: DeerCoat): Pt[] {
  const { pen } = d;
  const T = B.tail;
  const spine = bezier(pt(T.from, 0), pt(T.from - T.len * 0.5, -0.6), pt(T.from - T.len, 0.4), 14);
  const shape = tube(spine, (u) => T.w * (0.75 + 0.35 * Math.sin(Math.PI * u)) * (1 - 0.35 * u * u));
  const tip = spine[spine.length - 1]!;
  // The white of the underside, fringing out past the brown top.
  const rng = createRng(B.seed + 90);
  for (let i = 1; i < spine.length; i++) {
    const p = spine[i]!;
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const a = Math.PI + s * (0.5 + rng() * 0.6);
      const l = T.w * (0.5 + rng() * 0.5);
      pen.hair([pt(p.x, p.y + s * T.w * 0.3), pt(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l)], 0.4, C.white, 0.9);
    }
  }
  const pelt: Pelt = { base: C.base, deep: C.deep, light: C.light, hair: (_p, r) => (r < 0.35 ? C.dark : r < 0.8 ? C.base : C.white) };
  paintFur(d, pelt, {
    shape,
    dir: (p) => Math.atan2(tip.y - p.y, tip.x - p.x),
    wet: () => {
      for (const s of [-1, 1]) glaze(d, T.from - T.len * 0.5, s * T.w * 0.42, T.len * 0.55, T.w * 0.18, 0, C.white, 0.7);
      glaze(d, T.from - T.len * 0.5, 0, T.len * 0.5, T.w * 0.2, 0, C.dark, 0.5);
    },
    n: 160, len: B.hair * 0.8, seed: B.seed + 91, tuft: 0.6, line: 0.55,
  });
  return shape;
}

const lie = (p: Pt): number => Math.PI + Math.sign(p.y) * Math.min(0.75, Math.abs(p.y) / 18);

/** The fawn's spots: rows of white dabs either side of the dark spine stripe, scattering lower on the flanks. */
function spots(d: Draw, B: DeerBuild, C: DeerCoat): void {
  const rng = createRng(B.seed + 30);
  const rows: readonly (readonly [number, number, number, number])[] = [[2.7, 13, -43, 3.4], [5.6, 10, -42, 4.6], [8.2, 4, -38, 5.6]];
  for (const [y, x0, x1, step] of rows) {
    for (const s of [-1, 1]) {
      for (let x = x0 - rng() * step; x > x1; x -= step * (0.75 + rng() * 0.55)) {
        if (y > 5 && rng() < 0.35) continue;
        const cy = s * (y + (rng() - 0.5) * (y > 5 ? 2.2 : 0.7));
        const r = (y > 5 ? 0.62 : 0.85) * (0.75 + rng() * 0.45);
        glaze(d, x, cy, r * 1.8, r * 1.2, 0, C.white, 0.35);
        d.pen.fill(ellipseAt(x, cy, r * 1.2, r * 0.8, (rng() - 0.5) * 0.5, 12), C.white, 0.8);
        for (let k = 0; k < 3; k++) d.pen.hair([pt(x + r, cy + (rng() - 0.5) * r), pt(x - r * 0.6, cy + (rng() - 0.5) * r * 1.4)], 0.28, C.base, 0.55);
      }
    }
  }
}

/** The neck and trunk as one coat: hair lying back, the spine darker, the flanks paler, the belly's edge pale. */
function paintBody(d: Draw, B: DeerBuild, C: DeerCoat, shape: readonly Pt[]): void {
  const front = B.trunk[0]![0];
  const back = B.trunk[B.trunk.length - 1]![0];
  const mid = (front + back) / 2;
  const halfAt = (x: number): number => {
    let best = B.trunk[0]!;
    for (const k of B.trunk) if (Math.abs(k[0] - x) < Math.abs(best[0] - x)) best = k;
    return best[1];
  };
  const pelt: Pelt = { base: C.base, deep: C.deep, light: C.light, hair: (_p, r) => (r < 0.18 ? C.dark : r < 0.32 ? C.deep : r < 0.78 ? C.base : r < 0.92 ? C.warm : C.light) };
  paintFur(d, pelt, {
    shape,
    dir: lie,
    wet: () => {
      // Countershading: dark down the spine, light on the upper flanks, the pale belly at the edges.
      glaze(d, mid, 0, (front - back) * 0.55, 5.4, 0, C.deep, 0.65);
      glaze(d, mid + 4, -6.5, (front - back) * 0.38, 4, 0, C.light, 0.6);
      glaze(d, mid + 4, 6, (front - back) * 0.35, 4, 0, C.light, 0.3);
      for (const s of [-1, 1]) glaze(d, mid - 2, s * 9, (front - back) * 0.4, 2.6, 0, C.warm, 0.4);
      for (let x = front - 8; x > back + 4; x -= 3) for (const s of [-1, 1]) glaze(d, x, s * (halfAt(x) - 0.6), 3.4, 1.5, 0, C.pale, 0.6);
      if (B.throat) for (const s of [-1, 1]) glaze(d, front - 2, s * (halfAt(front) - 0.2), 4, 1.6, 0, C.white, 0.9);
      // Shoulders and haunches rounding under the coat.
      for (const s of [-1, 1]) {
        glaze(d, 8, s * 6 - 1.2, 7, 4.5, s * 0.3, C.light, s < 0 ? 0.4 : 0.15);
        glaze(d, back + 12, s * 6.5 - 1.2, 8, 5, s * 0.3, C.light, s < 0 ? 0.45 : 0.18);
      }
    },
    hair: (p, r) => {
      const v = Math.max(0, 1 - Math.abs(p.y) / 6);
      const edge = Math.abs(p.y) > halfAt(p.x) - 1.6;
      return edge && r > 0.45 ? C.pale : r < 0.08 + 0.42 * v ? C.dark : pelt.hair(p, r);
    },
    over: () => {
      clumps(d, shape, lie, 260, B.seed + 3, B.hair * 1.6, C.dark, C.light, (p) => 0.35 + 0.5 * Math.max(0, 1 - Math.abs(p.y) / 7));
      if (B.spots) spots(d, B, C);
      // The shoulder blade and the hip, a hint of ink under the coat.
      for (const s of [-1, 1]) {
        d.pen.hair(bezier(pt(13, s * 3.5), pt(8, s * 7.8), pt(1, s * 8.6), 6), 0.35, d.ink, 0.3);
        d.pen.hair(bezier(pt(back + 16, s * 7.5), pt(back + 9, s * 8.5), pt(back + 5, s * 5.5), 6), 0.35, d.ink, 0.3);
      }
    },
    n: B.hairs, len: B.hair, seed: B.seed + 2, tuft: 0.7, line: 0.85,
  });
  // The dark line of the spine.
  d.pen.hair([pt(front - 4, 0), pt(mid, 0.2), pt(back + 3, 0)], 0.9, C.dark, 0.35);
}

/** The white throat patch, peeking out past the jaw on both sides. */
function throat(d: Draw, B: DeerBuild, C: DeerCoat): void {
  const rng = createRng(B.seed + 80);
  for (const s of [-1, 1]) {
    const c = pt(B.poll + 2.4, s * (B.trunk[0]![1] + 0.9));
    const patch = ellipseAt(c.x, c.y, 3, 1.3, -s * 0.15, 18);
    d.pen.fill(patch, C.white, 0.95);
    for (let k = 0; k < 26; k++) {
      const p = pt(c.x + (rng() - 0.5) * 6, c.y + (rng() - 0.3) * s * 1.6);
      d.pen.hair([p, pt(p.x - 1 - rng(), p.y + s * (0.3 + rng() * 0.6))], 0.28, k % 4 ? C.white : C.light, 0.9);
    }
    d.pen.hair(patch.slice(s > 0 ? 2 : 11, s > 0 ? 8 : 17), 0.35, d.ink, 0.45);
  }
}

/** Paints the whole deer, limp. */
export function paintDeer(d: Draw, B: DeerBuild, C: DeerCoat): void {
  const body = trunkShape(B.trunk, 0, 0.45);
  const head = headShape(B);
  const ears = ([1, -1] as const).map((s) => earShape(B, s).shape);
  const limbs = ([1, -1] as const).flatMap((s) => [limbShape(B.hind, s).shape, limbShape(B.fore, s).shape]);
  softShadow(d, [body, head, ...ears, ...limbs], pt(2.4, 3.6), 0.2, 1.8);
  for (const s of [1, -1] as const) paintLimb(d, B, C, B.hind, s, B.seed + 10 + s, true);
  for (const s of [1, -1] as const) paintLimb(d, B, C, B.fore, s, B.seed + 20 + s, false);
  paintBody(d, B, C, body);
  paintTail(d, B, C);
  if (B.throat) throat(d, B, C);
  // The head's shadow on the neck.
  d.pen.clipped(body, () => d.pen.fill(head.map((q) => pt(q.x + 1.4, q.y + 2)), C.deep, 0.3));
  paintHead(d, B, C);
  for (const s of [1, -1] as const) paintEar(d, B, C, s);
}
