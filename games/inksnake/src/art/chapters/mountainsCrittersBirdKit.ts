import type { Rng } from '../../logic/rng';
import { type Blade, boxOf, coat, glaze, model, rimLight } from '../critters/birdKit';
import { closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';

/**
 * The Mountains' small birds' shared paint (the crested lark, the warbler,
 * the desert finch, the Isabelline shrike): each is one songbird build with
 * its own proportions and plumage. Drawn in "bird units", the bird about 44
 * from bill tip to tail tip, then scaled to its size in the game. Seen from
 * above facing +x, light from the upper left.
 */

/** One species' plumage. */
export interface Plumage {
  /** The back's ground colour, a lit and a deep tone of it. */
  readonly base: string;
  readonly light: string;
  readonly deep: string;
  /** Dark streaks down the back and crown (a lark's), and how strong; 0 for a plain back. */
  readonly streak: string;
  readonly streaks: number;
  /** Small feathers' pale tips. */
  readonly fringe: string;
  /** Wing feathers: their ground, their dark centres, their pale edges. */
  readonly wing: string;
  readonly wingCentre: string;
  readonly wingEdge: string;
  /** The coverts' tone (a finch's rosy panel), if not the wing's. */
  readonly covert?: string;
  /** The primaries, if darker than the wing (a finch's black). */
  readonly primary?: string;
  readonly primaryEdge?: string;
  /** A pale patch at the base of the primaries (a shrike's). */
  readonly patch?: string;
  /** Tail: middle feathers, the outer ones, their edges. */
  readonly tail: string;
  readonly tailOuter: string;
  readonly tailEdge: string;
  /** The rump over the tail's root (a shrike's rufous). */
  readonly rump?: string;
  /** The crown, if not the back. */
  readonly crown?: string;
  /** A pale stripe over the eye. */
  readonly brow?: string;
  /** A dark mask through the eye (a shrike's). */
  readonly mask?: string;
  /** A face wash (a finch's pink cheeks). */
  readonly face?: string;
  readonly bill: string;
  readonly billLit: string;
  readonly foot: string;
  readonly eye: string;
}

/** One species' build, bird units. */
export interface Build {
  /** Body: half length and half width, an egg centred at x = 0. */
  readonly rx: number;
  readonly ry: number;
  /** Head centre x and radii. */
  readonly hx: number;
  readonly hr: readonly [number, number];
  /** Bill length, its width at the base, and its shape. */
  readonly bill: readonly [number, number];
  readonly billShape: 'fine' | 'cone' | 'hook' | 'lark';
  /** Tail: its length beyond the root, its half width at the tip, its tip (a notch, or rounded). */
  readonly tail: readonly [number, number];
  readonly tailTip: 'notch' | 'round' | 'square';
  /** How far back past the body the folded primaries reach. */
  readonly primaries: number;
  /** A crest of pointed feathers off the crown (a lark's): its length. */
  readonly crest?: number;
}

export interface Bird {
  readonly p: Plumage;
  readonly b: Build;
}

/** The body: an egg, fullest at the shoulders, narrowing to the tail. */
export function egg(cx: number, rx: number, ry: number, n = 36): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.3 * Math.max(0, -c) ** 1.5) * (1 + 0.06 * Math.max(0, c)));
  });
}

/** A blade narrowed about its shaft by k (its dark centre, or a fringe's inner edge). */
export function inner(f: Blade, w: number, k: number, from = 0.08, to = 0.96): Pt[] {
  const ts = Array.from({ length: 9 }, (_, i) => from + ((to - from) * i) / 8);
  const half = (t: number): number => w * 0.5 * k * Math.sin(Math.PI * Math.min(1, (t - from) / (to - from) * 0.95 + 0.05));
  return [...ts.map((t) => f.at(t, half(t))), ...[...ts].reverse().map((t) => f.at(t, -half(t)))];
}

/**
 * A songbird's feather, as an illustrator paints one: its ground wash, a
 * dark centre along the shaft, the pale edge round its tip and outer vane,
 * the shaft, a crescent of shade and a fine contour.
 */
export function songFeather(d: Draw, f: Blade, w: number, o: { base: string; centre: string; edge: string; centreK?: number; edgeW?: number; line?: number; alpha?: number }): void {
  const { pen } = d;
  pen.fill(f.shape, PAPER_FILL, 1);
  pen.fill(f.shape, o.base, o.alpha ?? 0.92);
  pen.clipped(f.shape, () => {
    pen.fill(inner(f, w, o.centreK ?? 0.55), o.centre, 0.75);
    pen.hair(f.shape.slice(Math.floor(f.shape.length * 0.22), Math.ceil(f.shape.length * 0.78)), o.edgeW ?? Math.max(0.5, w * 0.32), o.edge, 0.8);
    pen.crescent(f.shape, pt(-0.5, -0.7), () => pen.fill(f.shape, mix(o.centre, '#000000', 0.3), 0.3));
  });
  pen.hair([f.at(0.04, 0), f.at(0.5, 0), f.at(0.86, 0)], Math.max(0.22, w * 0.07), mix(o.centre, '#000000', 0.25), 0.55);
  pen.stroke(closed(f.shape), o.line ?? 0.32, d.ink, 0.75, false);
}

/**
 * Body plumage over a shape: ground wash, soft glazes, a coat of small
 * overlapping feathers (pale-tipped, dark-streaked if `streak`), the form
 * modelled and a contour. `ruffle` throws the coat askew (fluffed up).
 */
export function plumage(d: Draw, shape: readonly Pt[], rng: Rng, p: Plumage, o: { n: number; size: number; streak?: number; tone?: string; ruffle?: number; line?: number; dir?: (q: Pt) => number }): void {
  const { pen } = d;
  const tone = o.tone ?? p.base;
  const b = boxOf(shape);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, tone, 0.9);
  pen.clipped(shape, () => {
    glaze(d, b.cx + b.rx * 0.2, b.cy - b.ry * 0.25, b.rx * 0.7, b.ry * 0.55, 0, mix(tone, p.light, 0.6), 0.45);
    glaze(d, b.cx - b.rx * 0.3, b.cy + b.ry * 0.3, b.rx * 0.6, b.ry * 0.6, 0, p.deep, 0.22);
  });
  const streak = o.streak ?? 0;
  coat(d, shape, rng, {
    dir: o.dir ?? (() => Math.PI),
    n: o.n,
    size: o.size,
    ruffle: o.ruffle,
    paint: ({ f, s, r }) => {
      const t = r < 0.3 ? mix(tone, p.light, 0.35) : r < 0.75 ? tone : mix(tone, p.deep, 0.3);
      pen.fill(f.shape, t, 0.5);
      if (streak > 0 && r < 0.2 + streak * 0.5) pen.fill(inner(f, s * 0.8, 0.42, 0.15, 0.8), p.streak, 0.55 + streak * 0.25);
      pen.hair(f.shape.slice(4, 8), Math.max(0.3, s * 0.12), p.fringe, 0.45);
      pen.hair(f.shape.slice(3, 9), 0.22, p.deep, 0.35);
    },
  });
  model(d, shape, Math.max(1.6, Math.min(b.rx, b.ry) * 0.42), p.deep, { shade: 0.32, hatch: 0.18, lit: 0.12, line: 0 });
  rimLight(d, shape, p.light, 0.6, 0.45);
  if ((o.line ?? 0.6) > 0) pen.stroke(closed(shape), o.line ?? 0.6, d.ink, 0.95);
}

/** Where the tail's tip edge is, u from -1 to 1, the tail rooted at x0. */
function tipAt(x0: number, len: number, half: number, kind: Build['tailTip'], n: number, u: number): Pt {
  const lobe = Math.abs(Math.sin(((u + 1) / 2) * n * Math.PI)) * 0.35;
  const bow = kind === 'notch' ? -0.12 + 0.2 * u * u : kind === 'round' ? 0.16 * u * u : 0.04 * u * u;
  return pt(x0 - len * (1 - bow) - lobe, half * u);
}

/** The tail: a fan of feathers from under the rump, `half` its half-width at the tip; middle and outer feathers in their own tones. */
export function tail(d: Draw, bird: Bird, x0: number, len: number, half: number): Pt[] {
  const { pen } = d;
  const { p, b } = bird;
  const n = 8;
  const at = (u: number, k: number): Pt => {
    const tip = tipAt(x0, len, half, b.tailTip, n, u);
    const root = pt(x0 + 1, u * 2);
    return pt(root.x + (tip.x - root.x) * k, root.y + (tip.y - root.y) * k);
  };
  const us = Array.from({ length: 33 }, (_, i) => -1 + i / 16);
  const shape = [pt(x0 + 1, 2.2), ...us.map((u) => tipAt(x0, len, half, b.tailTip, n, u)).reverse(), pt(x0 + 1, -2.2)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, p.tail, 0.92);
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const u0 = -1 + (2 * i) / n;
      const u1 = u0 + 2 / n;
      const um = (u0 + u1) / 2;
      const outer = i === 0 || i === n - 1;
      const feather = [at(u0, 0), at(u0, 1.1), at(u1, 1.1), at(u1, 0)];
      if (outer) pen.fill(feather, p.tailOuter, 0.9);
      pen.fill([at(um + 0.25 / n, 0.1), at(um + 0.2 / n, 1.05), at(u1, 1.05), at(u1, 0.1)], mix(outer ? p.tailOuter : p.tail, '#000000', 0.35), 0.3);
      pen.hair([at(u0 + 0.25 / n, 0.2), at(u0 + 0.25 / n, 0.98)], 0.4, p.tailEdge, 0.45);
      pen.hair([at(um, 0.05), at(um, 0.9)], 0.22, mix(p.tail, '#000000', 0.4), 0.4);
      if (i > 0 && i % 2 === 0) pen.hair([at(u0, 0.05), at(u0, 1)], 0.25, d.ink, 0.4);
    }
    pen.stroke(Array.from({ length: 17 }, (_, i) => at(-1.05 + i * 0.13, 0.99)), 0.6, p.tailEdge, 0.5, false);
  });
  pen.crescent(shape, pt(-0.8, -1.2), () => pen.fill(shape, mix(p.tail, '#000000', 0.4), 0.25));
  pen.stroke(closed(shape), 0.45, d.ink, 0.95);
  return shape;
}

/** The bill's outline, from its base at x0 along +x. */
export function billShape(b: Build, x0: number, k = 1): Pt[] {
  const [len0, w] = b.bill;
  const len = len0 * k;
  const half = w / 2;
  // How the bill narrows to its tip: a finch's stout cone, a warbler's needle, a lark's long taper, a shrike's hook.
  const taper = b.billShape === 'cone' ? 0.55 : b.billShape === 'fine' ? 1.6 : b.billShape === 'hook' ? 0.8 : 1.1;
  const n = 10;
  const side = (s: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return pt(x0 - 0.6 + (len + 0.6) * t, s * half * (1 - t ** (1 / taper)) ** 0.8 * (b.billShape === 'hook' && t > 0.8 ? 0.8 : 1));
  });
  return [...side(-1), ...side(1).reverse().slice(1, -1)];
}

/** The bill: horn or black, its ridge lit, nostrils, a hooked shrike's dark tip. */
export function bill(d: Draw, bird: Bird, x0: number, k = 1): void {
  const { pen } = d;
  const { p, b } = bird;
  const shape = billShape(b, x0, k);
  const len = b.bill[0] * k;
  pen.fill(shape, p.bill, 1);
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-0.3, -0.5), () => pen.fill(shape, '#000000', 0.35));
    pen.hair([pt(x0, -b.bill[1] * 0.08), pt(x0 + len * 0.55, -b.bill[1] * 0.06), pt(x0 + len * 0.9, 0)], Math.max(0.3, b.bill[1] * 0.18), p.billLit, 0.75);
    if (b.billShape === 'hook') pen.fill(shape.filter((q) => q.x > x0 + len * 0.7), '#120f10', 0.6);
  });
  for (const s of [-1, 1]) pen.dot(x0 + len * 0.18, s * b.bill[1] * 0.22, 0.28, d.ink, 0.8);
  pen.stroke(closed(shape), 0.45, d.ink, 1, false);
}

/** An eye at the side of the head: a glossy bead, or shut (asleep) as a dark curved lid. */
export function eye(d: Draw, e: Pt, r: number, s: number, colour: string, shut: boolean): void {
  const { pen } = d;
  if (shut) {
    pen.hair([pt(e.x - r, e.y - s * r * 0.1), pt(e.x, e.y + s * r * 0.35), pt(e.x + r, e.y - s * r * 0.1)], 0.45, d.ink, 0.95);
    return;
  }
  pen.dot(e.x, e.y, r * 1.18, d.ink, 0.9);
  pen.dot(e.x, e.y, r, colour, 1);
  pen.dot(e.x - r * 0.35, e.y - r * 0.4, r * 0.32, PAPER_FILL, 0.95);
}

/** The toes peeping out beside the chest when it stands. */
export function feet(d: Draw, bird: Bird, x: number, y: number): void {
  for (const s of [-1, 1]) {
    const base = pt(x, s * y);
    for (const a of [-0.25, 0.2, 0.65]) {
      const ang = a * s;
      const tip = pt(base.x + Math.cos(ang) * 3.2, base.y + Math.sin(ang) * 3.2);
      d.pen.stroke([base, tip], 0.9, bird.p.foot, 1, false);
      d.pen.hair([base, tip], 0.25, d.ink, 0.7);
      d.pen.dot(tip.x, tip.y, 0.3, d.ink, 0.9);
    }
  }
}
