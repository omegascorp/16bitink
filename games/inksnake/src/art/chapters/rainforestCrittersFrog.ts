import { createRng } from '../../logic/rng';
import { capsule, closed, cub, type Draw, oval, pt, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { bilateral, castShadow, ellipseAt, glaze, skinWash } from '../critters/preyKit';
import { scatter } from './barrensCrittersKit';

/**
 * Wallace's flying frog, seen from above facing +x: a sleek tree frog about
 * 20 × 16, glossy leaf-green with fine pale flecks, yellow at the flanks,
 * big dark eyes set at the front corners of the head, and huge hands and
 * feet webbed right to the toe discs, the webs black streaked with yellow
 * (it parachutes from tree to tree on them).
 *  - 'sit': at rest, legs folded in beside it, feet tucked;
 *  - 'hop': a leap, hind legs stretched out behind, every web spread;
 *  - 'flat': pressed to the bark while a glide passes, legs tucked tight
 *    under it, eyes shut to slits, flattened low.
 */
const F = {
  back: '#5f9e48',
  deep: '#24451f',
  lit: '#a9d27a',
  fleck: '#e9f2cf',
  flank: '#e2c240',
  flankDeep: '#9a7a1c',
  web: '#1f1d1c',
  webStreak: '#d9b53a',
  disc: '#cbd88f',
  eye: '#1a1a1d',
  eyeRim: '#7fae58',
  belly: '#efe4b0',
} as const;

type Pose = 'sit' | 'hop' | 'flat';

/** How a pose holds the body: stretch along and across, a shift forward. */
const BODY: Readonly<Record<Pose, { sx: number; sy: number; dx: number }>> = {
  sit: { sx: 1, sy: 1, dx: 0 },
  hop: { sx: 1.1, sy: 0.86, dx: 3 },
  flat: { sx: 1.02, sy: 1.1, dx: 0 },
};

/** The sleek body: a rounded snout, a broad head, the waist narrowing a little, a neat rump. */
const BASE = bilateral([
  ...cub(pt(10.2, 0), pt(10.3, 2.3), pt(9.2, 4.6), pt(7, 5.9), 6),
  ...cub(pt(7, 5.9), pt(5, 7), pt(2.4, 6.8), pt(-1, 6.6), 6).slice(1),
  ...cub(pt(-1, 6.6), pt(-4.6, 6.6), pt(-8.6, 5.8), pt(-9.8, 3.2), 6).slice(1),
  ...cub(pt(-9.8, 3.2), pt(-10.3, 2), pt(-10.3, 1), pt(-10.3, 0), 3).slice(1),
]);

/** One limb's joints on the +y side for a pose: shoulder/hip, elbow/knee, wrist/ankle, the hand's angle and spread. */
interface Limb {
  readonly a: Pt;
  readonly b: Pt;
  readonly c: Pt;
  readonly ang: number;
  readonly spread: number;
  readonly toe: number;
}

const LIMBS: Readonly<Record<Pose, { fore: Limb; hind: Limb }>> = {
  sit: {
    fore: { a: pt(4.4, 5), b: pt(6.6, 8), c: pt(8.8, 8.6), ang: 0.5, spread: 1.5, toe: 3.4 },
    hind: { a: pt(-7.2, 4.4), b: pt(-1.6, 8.8), c: pt(-6.6, 9.6), ang: Math.PI - 0.6, spread: 2, toe: 5 },
  },
  hop: {
    fore: { a: pt(8.6, 4), b: pt(11.8, 6.4), c: pt(14.6, 6.2), ang: 0.15, spread: 1.6, toe: 3.4 },
    hind: { a: pt(-6.4, 3.4), b: pt(-11.4, 6.6), c: pt(-15.6, 6.8), ang: Math.PI - 0.35, spread: 2.1, toe: 4.6 },
  },
  flat: {
    fore: { a: pt(4.6, 5.4), b: pt(5.8, 7.6), c: pt(7.6, 7.6), ang: 0.7, spread: 1.1, toe: 2.6 },
    hind: { a: pt(-7, 5), b: pt(-2.4, 7.8), c: pt(-6.6, 8.2), ang: Math.PI - 0.4, spread: 1.2, toe: 3.2 },
  },
};

const mirror = (p: Pt, s: number): Pt => pt(p.x, p.y * s);

/** A webbed hand or foot: black webs streaked yellow, slim green fingers, a pale disc at each tip. */
function foot(d: Draw, base: Pt, ang: number, spread: number, len: number, n: number, web: number): void {
  const { pen } = d;
  const tips = Array.from({ length: n }, (_, i) => {
    const a = ang + (i / (n - 1) - 0.5) * spread;
    const l = len * (0.72 + 0.28 * Math.sin((Math.PI * (i + 0.5)) / n));
    return { a, end: pt(base.x + Math.cos(a) * l, base.y + Math.sin(a) * l) };
  });
  const rim = tips.flatMap((t, i) => {
    const next = tips[i + 1];
    if (!next) return [t.end];
    const mid = pt((t.end.x + next.end.x) / 2, (t.end.y + next.end.y) / 2);
    return [t.end, pt(base.x + (mid.x - base.x) * web, base.y + (mid.y - base.y) * web)];
  });
  const webShape = [base, ...rim];
  pen.fill(webShape, F.web, 0.85);
  pen.clipped(webShape, () => {
    for (const t of tips) pen.hair([base, pt(base.x + (t.end.x - base.x) * 0.8, base.y + (t.end.y - base.y) * 0.8)], 0.5, F.webStreak, 0.45);
  });
  pen.stroke(closed(webShape), 0.2, d.ink, 0.7, false);
  for (const t of tips) {
    const toe = capsule(base, t.end, 0.7, 0.45);
    skinWash(d, toe, F.back, F.deep);
    pen.stroke(closed(toe), 0.16, d.ink, 0.8, false);
    pen.dot(t.end.x, t.end.y, 0.62, F.deep, 0.6);
    pen.dot(t.end.x - 0.1, t.end.y - 0.12, 0.5, F.disc, 1);
  }
}

/** A limb segment, green above and yellow beneath where it shows, inked. */
function segment(d: Draw, a: Pt, b: Pt, w0: number, w1: number): void {
  const shape = capsule(a, b, w0, w1);
  skinWash(d, shape, F.back, F.deep, { at: pt((a.x + b.x) / 2 - 0.3, (a.y + b.y) / 2 - 0.4), r: Math.max(w0, w1) }, 0.4);
  d.pen.stroke(closed(shape), 0.3, d.ink, 0.9, false);
}

function legs(d: Draw, pose: Pose): void {
  const { fore, hind } = LIMBS[pose];
  const web = pose === 'hop' ? 0.82 : pose === 'flat' ? 0.55 : 0.68;
  for (const s of [-1, 1]) {
    foot(d, mirror(hind.c, s), s * hind.ang, hind.spread, hind.toe, 5, web);
    segment(d, mirror(hind.b, s), mirror(hind.c, s), 2.4, 1.5);
    segment(d, mirror(hind.a, s), mirror(hind.b, s), 3.8, 2.6);
    foot(d, mirror(fore.c, s), s * fore.ang, fore.spread, fore.toe, 4, web);
    segment(d, mirror(fore.a, s), mirror(fore.c, s), 2.2, 1.4);
  }
}

/** The glossy back: deep at the edges, a light bloom down the middle, pale flecks, the yellow flanks peeping out. */
function back(d: Draw, body: readonly Pt[], at: (p: Pt) => Pt, sy: number): void {
  const { pen } = d;
  skinWash(d, body, F.flank, F.flankDeep);
  const top = body.map((p) => { const c = at(pt(0, 0)); return pt(c.x + (p.x - c.x) * 0.97, c.y + (p.y - c.y) * 0.86); });
  skinWash(d, top, F.back, F.deep, { at: at(pt(-1, -2)), r: 7 }, 0.45);
  const rng = createRng(7411);
  pen.clipped(top, () => {
    const h = at(pt(6, 0));
    glaze(d, h.x, h.y, 4.5, 3.6 * sy, 0, F.lit, 0.35);
    for (const p of scatter(rng, top, 9, 4)) glaze(d, p.x, p.y, 2 + rng() * 1.6, 1.3 + rng(), rng() * 3, F.deep, 0.18 + rng() * 0.12);
    for (const p of scatter(rng, top, 18, 1.6)) pen.dot(p.x, p.y, 0.1 + rng() * 0.2, F.fleck, 0.35 + rng() * 0.45);
    // A faint ridge (the fold behind each eye) and the dark edge where back meets flank.
    for (const s of [-1, 1]) pen.hair([at(pt(4.6, s * 4.6)), at(pt(1, s * 5.6)), at(pt(-3, s * 5.6))], 0.25, F.deep, 0.35);
  });
  shade(d, top, 0.15);
  pen.stroke(closed(top), 0.2, F.deep, 0.5, false);
  pen.stroke(closed(body), 0.5, d.ink, 0.95);
  // The wet sheen of its skin.
  pen.clipped(top, () => {
    const g = at(pt(-3.5, -2.2));
    glaze(d, g.x, g.y, 3.4, 1.4, -0.3, PAPER_FILL, 0.4);
    const g2 = at(pt(6.5, -2));
    glaze(d, g2.x, g2.y, 1.6, 0.8, -0.2, PAPER_FILL, 0.35);
  });
}

/** A big dark eye on the front corner of the head: a green lid rim, a glossy black ball, a glint (or shut to a slit). */
function eye(d: Draw, c: Pt, r: number, shut: boolean): void {
  const { pen } = d;
  const lid = oval(c.x, c.y, r * 1.2, r * 1.1, 18);
  pen.fill(lid.map((p) => pt(p.x + 0.4, p.y + 0.6)), d.ink, 0.25);
  skinWash(d, lid, F.eyeRim, F.deep, { at: pt(c.x - r * 0.3, c.y - r * 0.4), r: r * 0.7 });
  pen.stroke(closed(lid), 0.35, d.ink, 0.95);
  if (shut) {
    pen.hair([pt(c.x - r * 0.8, c.y + r * 0.1), pt(c.x, c.y + r * 0.35), pt(c.x + r * 0.8, c.y + r * 0.1)], 0.3, d.ink, 0.9);
    return;
  }
  const ball = ellipseAt(c.x + r * 0.05, c.y, r * 0.88, r * 0.82, 0, 16);
  pen.fill(ball, F.eye, 1);
  pen.clipped(ball, () => glaze(d, c.x + r * 0.3, c.y + r * 0.3, r * 0.6, r * 0.4, 0, '#5a4a2a', 0.5));
  pen.dot(c.x - r * 0.3, c.y - r * 0.32, Math.max(0.3, r * 0.24), PAPER_FILL, 1);
  pen.dot(c.x + r * 0.36, c.y + r * 0.3, 0.22, PAPER_FILL, 0.6);
}

function draw(d: Draw, pose: Pose): void {
  const { pen } = d;
  const k = BODY[pose];
  const at = (p: Pt): Pt => pt(p.x * k.sx + k.dx, p.y * k.sy);
  const body = BASE.map((p, i) => at(pt(p.x * (1 + 0.01 * Math.sin(i * 1.7)), p.y)));
  const air = pose === 'hop';
  castShadow(d, body, air ? pt(2.4, 3.6) : pose === 'flat' ? pt(0.4, 0.6) : pt(0.9, 1.3), air ? 0.12 : 0.2);
  legs(d, pose);
  back(d, body, at, k.sy);
  // The mouth's line and nostrils at the snout.
  const rim = closed(body);
  pen.hair(rim.slice(1, 8), 0.22, d.ink, 0.5);
  pen.hair(rim.slice(-8, -1), 0.22, d.ink, 0.5);
  for (const s of [-1, 1]) {
    const n = at(pt(9.4, s * 1.3));
    pen.dot(n.x, n.y, 0.3, F.deep, 0.9);
  }
  for (const s of [-1, 1]) eye(d, at(pt(5.8, s * 4.4)), 2.1, pose === 'flat');
}

export const FLYING_FROG_ART: SpriteArt<Pose> = {
  frame: 44,
  res: 3,
  poses: ['sit', 'hop', 'flat'],
  draw,
};
