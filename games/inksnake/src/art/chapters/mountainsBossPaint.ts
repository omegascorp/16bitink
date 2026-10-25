import { createRng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { ellipseAt, glaze } from '../critters/preyKit';
import { tube } from '../critters/tomcatParts';
import { clumps, grizzle, type Leg, paintFur, type Pelt } from './barrensCrittersBeast';
import type { Boar } from './mountainsBossParts';

/**
 * The Wild Boar's paint: a coarse, bristly coat of dark grizzled brown-black
 * (pale-tipped bristles, rusty in places), a mane of long black bristles
 * down the spine that stands up when it's angry, a paler grizzled face, the
 * pinkish-grey snout disc, ivory tusks, small mean eyes, black trotters.
 */
export const BOAR = {
  base: '#4b4037',
  deep: '#1d1814',
  dark: '#2a231e',
  light: '#7e6e5f',
  pale: '#b09d86',
  warm: '#6d5039',
  face: '#5f5246',
  disc: '#b49891',
  discDeep: '#6f5652',
  tusk: '#efe7d3',
  tuskShade: '#b3a487',
  hoof: '#221c18',
  hoofLit: '#6a615b',
  eye: '#2a170c',
  mouth: '#5a2b2b',
} as const;

const PELT: Pelt = { base: BOAR.base, deep: BOAR.deep, light: BOAR.light, hair: (_p, r) => grizzle(BOAR.deep, BOAR.base, BOAR.pale, BOAR.warm, 0.26)(r) };
const LEG_PELT: Pelt = { base: BOAR.dark, deep: BOAR.deep, light: BOAR.base, hair: (_p, r) => grizzle(BOAR.deep, BOAR.dark, BOAR.light, BOAR.warm, 0.14)(r) };
const FACE_PELT: Pelt = { base: BOAR.face, deep: BOAR.deep, light: BOAR.pale, hair: (_p, r) => grizzle(BOAR.dark, BOAR.face, BOAR.pale, BOAR.warm, 0.34)(r) };

/** A point in the head's own frame (x along the muzzle from the crown's centre, y across), turned as the head is. */
export function headPt(b: Boar, x: number, y: number): Pt {
  const c = Math.cos(b.turn);
  const s = Math.sin(b.turn);
  return pt(b.headC.x + x * c - y * s, b.headC.y + x * s + y * c);
}

/** The trunk: coarse bristles combed back and down the flanks, darker along the spine, the shoulders and hams rounding under the coat. */
export function paintBody(d: Draw, b: Boar): void {
  const { body, sx, sy } = b;
  const lie = (p: Pt): number => Math.PI + Math.sign(p.y) * Math.min(0.85, Math.abs(p.y) / 24);
  paintFur(d, PELT, {
    shape: body,
    dir: lie,
    wet: () => {
      glaze(d, -6 * sx, 0, 34 * sx, 9 * sy, 0, BOAR.deep, 0.55);
      for (const side of [-1, 1]) {
        glaze(d, 10 * sx - 1, side * 12 * sy - 1.5, 11, 7, side * 0.3, BOAR.light, side < 0 ? 0.35 : 0.15);
        glaze(d, -24 * sx - 1, side * 11 * sy - 1.2, 9, 6, side * 0.3, BOAR.light, side < 0 ? 0.3 : 0.12);
        glaze(d, -4 * sx, side * 18 * sy, 20, 4, 0, BOAR.warm, 0.35);
      }
    },
    hair: (p, r) => {
      const v = Math.max(0, 1 - Math.abs(p.y) / (12 * sy));
      const dark = 0.12 + 0.5 * v;
      const pale = (0.1 + 0.26 * (1 - v)) * (p.y < 0 ? 1.2 : 0.85);
      return r < dark ? BOAR.deep : r < dark + pale ? BOAR.pale : r < 0.9 ? BOAR.base : BOAR.warm;
    },
    over: () => clumps(d, body, lie, 260, 8103, 5, BOAR.deep, BOAR.pale, (p) => 0.45 + 0.45 * Math.max(0, 1 - Math.abs(p.y) / (10 * sy))),
    n: 1700, len: 4.6, seed: 8102, tuft: 2.2, line: 0.9,
  });
}

/**
 * The mane: long black bristles down the spine from the nape to the
 * middle of the back, each pale-tipped, leaning back and splaying to the
 * sides; raised (angry), they stand up into a spiky crest.
 */
export function mane(d: Draw, b: Boar): void {
  const { pen } = d;
  const rng = createRng(8110);
  const up = b.bristle;
  const x0 = b.headC.x - 3;
  const x1 = -12 * b.sx;
  const n = Math.round(90 + up * 70);
  // A dark band under the mane, soft at its edges.
  pen.clipped(b.body, () => glaze(d, (x0 + x1) / 2, 0, (x0 - x1) / 2 + 4, 5 + up * 3, 0, BOAR.deep, 0.75));
  pen.clipped(b.head, () => glaze(d, x0 - 2, b.headC.y, 8, 5 + up * 2, b.turn, BOAR.deep, 0.6));
  for (let i = 0; i < n; i++) {
    const t = rng();
    const x = x0 + (x1 - x0) * t;
    const side = rng() < 0.5 ? -1 : 1;
    const y = (rng() - 0.5) * (3 + up * 3) * (1 - t * 0.5);
    const len = (5 + rng() * 4) * (1 + up * 0.5) * (1 - t * 0.35);
    // Bristles lie back along the spine; standing up, they splay out sideways and look shorter but spikier.
    const lean = side * (0.25 + up * 0.75 + rng() * 0.3);
    const ang = Math.PI + lean;
    const tip = pt(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    const mid = pt((x + tip.x) / 2 + side * 0.4, (y + tip.y) / 2);
    pen.hair([pt(x, y), mid, tip], 0.55 + up * 0.15, BOAR.deep, 0.85);
    if (rng() < 0.45) pen.hair([mid, tip], 0.35, BOAR.pale, 0.6);
  }
}

/** The tail: thin, dark, ending in a tuft of long bristles. */
export function paintTail(d: Draw, b: Boar): void {
  const { pen } = d;
  const spine = b.tail;
  const shape = tube(spine, (u) => 3 - u * 1.6);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, BOAR.dark, 0.95);
  pen.clipped(shape, () => pen.hair(spine.map((p) => pt(p.x - 0.3, p.y - 0.5)), 0.6, BOAR.light, 0.5));
  pen.stroke(closed(shape), 0.6, d.ink, 0.9, false);
  const end = spine[spine.length - 1]!;
  const prev = spine[spine.length - 3]!;
  const a = Math.atan2(end.y - prev.y, end.x - prev.x);
  for (let i = 0; i < 9; i++) {
    const s = a + (i / 8 - 0.5) * 0.9;
    pen.hair([end, pt(end.x + Math.cos(s) * (4 + (i % 3)), end.y + Math.sin(s) * (4 + (i % 3)))], 0.5, i % 3 === 0 ? BOAR.pale : BOAR.deep, 0.85);
  }
}

/** A cloven trotter: two black hoof-toes side by side, glossy, the dewclaws behind. */
function trotter(d: Draw, l: Leg): void {
  const { pen } = d;
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const v = pt(-u.y, u.x);
  for (const s of [-1, 1]) {
    const c = pt(l.c.x + u.x * 1.8 + v.x * s * 1.25, l.c.y + u.y * 1.8 + v.y * s * 1.25);
    const toe = ellipseAt(c.x, c.y, 2.4, 1.3, l.ang + s * 0.08, 12);
    pen.fill(toe, BOAR.hoof, 1);
    pen.dot(c.x - u.x * 0.5 - 0.3, c.y - u.y * 0.5 - 0.4, 0.5, BOAR.hoofLit, 0.8);
    pen.stroke(closed(toe), 0.4, d.ink, 0.9, false);
    const dew = pt(l.c.x - u.x * 1.6 + v.x * s * 2.4, l.c.y - u.y * 1.6 + v.y * s * 2.4);
    pen.dot(dew.x, dew.y, 0.7, BOAR.hoof, 0.9);
  }
}

export function paintLeg(d: Draw, l: Leg, k: number): void {
  paintFur(d, LEG_PELT, { shape: l.limb, dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x), n: 160, len: 2.6, seed: 8120 + k, tuft: 1.2, line: 0.7 });
  trotter(d, l);
}

/** An ear: dark and bristly, its edge fringed with long hairs, a paler inside showing when it's cocked forward. */
export function paintEar(d: Draw, e: Boar['ears'][number], k: number): void {
  paintFur(d, PELT, {
    shape: e.shape,
    dir: (p) => Math.atan2(e.tip.y - p.y, e.tip.x - p.x),
    wet: () => glaze(d, e.tip.x, e.tip.y, 3, 3, 0, BOAR.deep, 0.6),
    n: 70, len: 2.4, seed: 8130 + k, tuft: 1.6, line: 0.7,
  });
  d.pen.hair([e.tip, pt(e.tip.x + (e.tip.x > 0 ? -0.8 : 0.8), e.tip.y + e.side * 2.2)], 0.45, BOAR.deep, 0.8);
}

/** The tusks: ivory crescents curling out of the snout's sides and back, shaded, inked. */
function tusks(d: Draw, b: Boar): void {
  const { pen } = d;
  const L = 12.5 + b.snout;
  for (const s of [-1, 1]) {
    const root = headPt(b, L * 0.74, s * 5.2);
    const bend = headPt(b, L * 0.78 + 1, s * 10.4);
    const tip = headPt(b, L * 0.58, s * 12.6);
    const outer = bezier(root, bend, tip, 8);
    const inner = bezier(headPt(b, L * 0.66, s * 5.6), headPt(b, L * 0.69, s * 9), tip, 8);
    const shape = [...outer, ...[...inner].reverse().slice(1)];
    pen.fill(shape, BOAR.tusk, 1);
    pen.clipped(shape, () => pen.fill(inner.map((p) => pt(p.x + 0.8, p.y + 1)), BOAR.tuskShade, 0.7));
    pen.stroke(closed(shape), 0.55, d.ink, 1, false);
  }
}

/** The face: grizzled paler fur running down the long snout, the disc at its tip, tusks, eyes deep under bristly brows. */
export function paintHead(d: Draw, b: Boar): void {
  const { pen } = d;
  const L = 12.5 + b.snout;
  const along = Math.PI + b.turn;
  paintFur(d, FACE_PELT, {
    shape: b.head,
    dir: () => along,
    wet: () => {
      const crown = headPt(b, -2, 0);
      glaze(d, crown.x, crown.y, 12, 9, b.turn, BOAR.deep, 0.5);
      const m = headPt(b, L * 0.6, 0);
      glaze(d, m.x, m.y, L * 0.35, 4, b.turn, BOAR.light, 0.35);
      // The ridge of the snout catching the light.
      pen.hair([headPt(b, 6, -1), headPt(b, L * 0.5, -0.8), headPt(b, L * 0.9, -0.5)], 2.2, BOAR.pale, 0.35);
    },
    over: () => clumps(d, b.head, () => along, 90, 8141, 3.4, BOAR.deep, BOAR.pale, (p) => (Math.hypot(p.x - b.headC.x, p.y - b.headC.y) < 11 ? 0.75 : 0.35)),
    n: 520, len: 3, seed: 8140, tuft: 1.4, line: 0.9,
  });
  if (b.squeal) {
    // The jaw dropped: the dark gape showing at both sides of the snout, lips drawn back.
    for (const s of [-1, 1]) {
      const gape = [headPt(b, L * 0.45, s * 5.2), headPt(b, L * 0.8, s * 4.4), headPt(b, L * 0.98, s * 3.6), headPt(b, L * 0.75, s * 6.2)];
      pen.fill(gape, BOAR.mouth, 0.95);
      pen.stroke(closed(gape), 0.45, d.ink, 0.9, false);
    }
  }
  // The snout disc: flat and pinkish-grey, seen edge-on at the tip, two nostrils in it.
  const disc = ellipseAt(headPt(b, L - 1.2, 0).x, headPt(b, L - 1.2, 0).y, 2.2, 4.4, b.turn, 16);
  pen.fill(disc, BOAR.disc, 1);
  pen.clipped(disc, () => pen.fill(disc.map((p) => pt(p.x + 0.8, p.y + 1)), BOAR.discDeep, 0.5));
  for (const s of [-1, 1]) {
    const n = headPt(b, L - 0.6, s * 1.7);
    pen.fill(ellipseAt(n.x, n.y, 0.7, 0.95, b.turn, 8), BOAR.deep, 0.95);
  }
  pen.stroke(closed(disc), 0.55, d.ink, 1, false);
  tusks(d, b);
  eyes(d, b);
}

/** Small deep-set eyes at the head's sides under bristly brows: calm, mean (narrowed), dizzy (rolled spirals), wide (a fright). */
function eyes(d: Draw, b: Boar): void {
  const { pen } = d;
  for (const s of [-1, 1]) {
    const e = headPt(b, 7, s * 10.4);
    if (b.eyes === 'dizzy') {
      const sp = Array.from({ length: 14 }, (_, i) => {
        const a = (i / 13) * Math.PI * 3.2 * s;
        const r = 0.3 + (i / 13) * 1.9;
        return pt(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r);
      });
      pen.fill(ellipseAt(e.x, e.y, 2.4, 2, b.turn, 12), mix(BOAR.pale, PAPER_FILL, 0.4), 0.9);
      pen.hair(sp, 0.45, d.ink, 0.95);
      continue;
    }
    const wide = b.eyes === 'wide';
    if (wide) pen.fill(ellipseAt(e.x, e.y, 2.3, 1.9, b.turn, 12), PAPER_FILL, 0.95);
    pen.fill(ellipseAt(e.x, e.y, wide ? 1.3 : 1.5, b.eyes === 'mean' ? 0.9 : 1.2, b.turn, 12), BOAR.eye, 1);
    pen.dot(e.x - 0.4, e.y - 0.4, 0.4, PAPER_FILL, 0.9);
    // The brow: a ridge of bristles over the eye, angled down to the snout when it means business.
    const tilt = b.eyes === 'mean' ? 1.4 : wide ? -0.8 : 0;
    pen.stroke(cub(headPt(b, 3.5, s * (9.2 - tilt * 0.3)), headPt(b, 6, s * 8.6), headPt(b, 8.5, s * (8.6 + tilt * 0.4)), headPt(b, 10, s * (9 + tilt * 0.8)), 8), 1.1, BOAR.deep, 0.85, false);
  }
}
