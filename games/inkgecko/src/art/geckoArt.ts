import { createRng } from '../logic/rng';
import { bezier, capsule, closed, cub, type Draw, edge, glint, oval, pt, ribbon, shade, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { erase, rgba } from './wash';

/** The gecko is drawn centred in a GECKO_FRAME square, seen from above, facing up (−y). */
export const GECKO_FRAME = 160;
/** Texture pixels per gecko frame unit. */
export const GECKO_RES = 3;

/** 'spit': jaws wide and the tongue flicked out, just after a shot. */
export type GeckoPose = 'idle' | 'spit';

/** Where the loaded marble's centre sits: at the tip of the snout, held in the mouth. */
export const GECKO_MOUTH: Pt = { x: 0, y: -62 };
/** Where the next marble's centre sits: cradled in the curl of the tail (a hollow of radius ~10). */
export const GECKO_TAIL: Pt = { x: 15, y: 50 };

/** The skin's shading greys: tinted by the marble colour in game, they become its deeper shades. */
const SHADOW = '#9a9a9a';
const SPOT = '#808080';
const MOUTH = '#c8586c';
const THROAT = '#6e2234';
const TONGUE = '#e7899a';

interface Toe {
  tube: Pt[];
  pad: Pt[];
  tip: Pt;
  ang: number;
}

interface Leg {
  limb: Pt[];
  spine: Pt[];
  palm: Pt[];
  toes: Toe[];
  elbow: Pt;
}

interface Body {
  /** Neck, trunk and tail as one smooth shape. */
  trunk: { shape: Pt[]; spine: Pt[]; top: Pt[]; bot: Pt[] };
  /** Index of the spine where the tail begins. */
  tailFrom: number;
  head: Pt[];
  /** The lower jaw, seen only when the mouth gapes. */
  jaw: Pt[] | null;
  eyes: Pt[][];
  legs: Leg[];
}

const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(-p.x, p.y));
/** A closed outline from its right half (traced from the back of the midline to the front of it). */
const bilateral = (right: readonly Pt[]): Pt[] => [...right, ...mirror(right).reverse().slice(1, -1)];

/** An oval of radii (along, across) turned to `ang`. */
function turnedOval(c: Pt, along: number, across: number, ang: number, n = 12): Pt[] {
  const [cs, sn] = [Math.cos(ang), Math.sin(ang)];
  return oval(0, 0, along, across, n).map((p) => pt(c.x + p.x * cs - p.y * sn, c.y + p.x * sn + p.y * cs));
}

/** A tapering tube along a spine with round ends (half-width w(u)). */
function roundTube(spine: readonly Pt[], w: (u: number) => number): Pt[] {
  const { top, bot } = ribbon(spine, w);
  const cap = (c: Pt, from: Pt, to: Pt): Pt[] => {
    const a0 = Math.atan2(from.y - c.y, from.x - c.x);
    let a1 = Math.atan2(to.y - c.y, to.x - c.x);
    const r = Math.hypot(from.x - c.x, from.y - c.y);
    while (a1 > a0) a1 -= TAU;
    return Array.from({ length: 7 }, (_, i) => {
      const a = a0 + ((a1 - a0) * (i + 1)) / 8;
      return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
    });
  };
  const n = spine.length - 1;
  return [...top, ...cap(spine[n]!, top[n]!, bot[n]!), ...[...bot].reverse(), ...cap(spine[0]!, bot[0]!, top[0]!)];
}

/** A leg: one tapering limb bent at the elbow, a palm, and five splayed toes ending in round pads. */
function leg(root: Pt, elbow: Pt, wrist: Pt, toeMid: number, fan: number, lens: readonly number[], thick: number, left: boolean): Leg {
  const ctl = pt(2 * elbow.x - (root.x + wrist.x) / 2, 2 * elbow.y - (root.y + wrist.y) / 2);
  const spine = bezier(root, ctl, wrist, 14);
  const limb = roundTube(spine, (u) => thick * (1 - 0.42 * u) + Math.sin(Math.PI * u) * 0.8);
  const toes = lens.map((len, i) => {
    const k = i / (lens.length - 1) - 0.5;
    const ang = left ? Math.PI - (toeMid + k * fan) : toeMid + k * fan;
    const base = pt(wrist.x + Math.cos(ang) * 1.5, wrist.y + Math.sin(ang) * 1.5);
    const tip = pt(wrist.x + Math.cos(ang) * len, wrist.y + Math.sin(ang) * len);
    return { tube: capsule(base, tip, 3.1, 2.5), pad: turnedOval(tip, 2.7, 2.4, ang), tip, ang };
  });
  return { limb, spine, palm: oval(wrist.x, wrist.y, 3.1, 3.1, 12), toes, elbow };
}

/** Smooth keyed widths along arc length. */
function keyed(keys: readonly [number, number][], s: number): number {
  const first = keys[0]!;
  if (s <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [s1, w1] = keys[i]!;
    const [s0, w0] = keys[i - 1]!;
    if (s <= s1) {
      const t = (s - s0) / (s1 - s0);
      return w0 + (w1 - w0) * t * t * (3 - 2 * t);
    }
  }
  return keys[keys.length - 1]![1];
}

/**
 * The gecko's geometry for a pose and boil frame: identical in both
 * layers, and identical across frames but for a small shift of the feet.
 */
function geometry(pose: GeckoPose, f: number): Body {
  const open = pose === 'spit';
  // Neck, trunk and tail along one spine: straight down the back, then the tail curls right into a cradle.
  const C = GECKO_TAIL;
  const back = Array.from({ length: 24 }, (_, i) => pt(0, -28 + i * 2));
  const drop = cub(pt(0, 18), pt(0, 30), pt(-1, 40), pt(-0.6, 47), 10).slice(1);
  const end = drop[drop.length - 1]!;
  const start = Math.atan2(end.y - C.y, end.x - C.x);
  const curl = Array.from({ length: 32 }, (_, i) => {
    const t = (i + 1) / 32;
    const ang = start - TAU * 0.76 * t;
    const r = 15.7 - 2.6 * t;
    return pt(C.x + Math.cos(ang) * r, C.y + Math.sin(ang) * r);
  });
  const spine = [...back, ...drop, ...curl];
  const arc = [0];
  for (let i = 1; i < spine.length; i++) arc.push(arc[i - 1]! + Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y));
  const total = arc[arc.length - 1]!;
  const keys: [number, number][] = [[0, 14], [6, 15], [14, 21], [28, 24], [38, 21], [46, 15], [52, 12], [total, 1.6]];
  const widths = arc.map((s) => (s > 52 ? 1.6 + 10.4 * (1 - (s - 52) / (total - 52)) ** 0.85 : keyed(keys, s)));
  const trunk = ribbon(spine, (u) => widths[Math.round(u * (spine.length - 1))]!);
  // The head: a broad rounded wedge, widest at the cheeks, the snout blunt.
  const head = bilateral([
    ...cub(pt(0, -21), pt(7, -21.5), pt(13, -24), pt(15.5, -29), 6),
    ...cub(pt(15.5, -29), pt(18.2, -33), pt(18.8, -38), pt(17.6, -43), 6).slice(1),
    ...cub(pt(17.6, -43), pt(16.2, -49), pt(13.5, -53.5), pt(9, -56), 6).slice(1),
    ...cub(pt(9, -56), pt(6, -57.6), pt(3, -58), pt(0, -58), 5).slice(1),
  ]);
  // Gaping, the lower jaw shows in front of the snout.
  const jaw = open
    ? bilateral([pt(0, -50), ...cub(pt(11.5, -50), pt(13, -57), pt(11, -64), pt(5.5, -66.5), 6), ...cub(pt(5.5, -66.5), pt(3, -67.4), pt(1.5, -67.6), pt(0, -67.6), 3).slice(1)])
    : null;
  const eyes = [oval(13.6, -38, 7.4, 7.6, 20), oval(-13.6, -38, 7.4, 7.6, 20)];
  // Legs: front feet reaching forward, hind feet back, each shifting a little per boil frame.
  const wig = (i: number, k: number): Pt => pt(Math.sin(f * 2.09 + i * 1.7) * k, Math.cos(f * 2.09 + i * 2.3) * k);
  const legs: Leg[] = [];
  for (const side of [1, -1] as const) {
    const left = side < 0;
    const fw = wig(left ? 0 : 1, 0.9);
    const fe = wig(left ? 4 : 5, 0.5);
    legs.push(leg(pt(6 * side, -15), pt(20 * side + fe.x * side, -10 + fe.y), pt(25.5 * side + fw.x * side, -24.5 + fw.y), -0.95 + fw.x * 0.05, 2.1, [8, 10.5, 11.5, 10.5, 8], 7.2, left));
    const hw = wig(left ? 2 : 3, 0.9);
    const he = wig(left ? 6 : 7, 0.5);
    legs.push(leg(pt(6 * side, 9), pt(21 * side + he.x * side, 5 + he.y), pt(27 * side + hw.x * side, 18 + hw.y), 0.95 + hw.y * 0.05, 2.3, [8, 11, 12.5, 11, 9], 8, left));
  }
  return { trunk: { ...trunk, spine }, tailFrom: back.length, head, jaw, eyes, legs };
}

/** Every closed shape of the silhouette, back to front. */
function silhouette(b: Body): Pt[][] {
  const out: Pt[][] = [];
  for (const l of b.legs) out.push(...l.toes.map((t) => t.tube), ...l.toes.map((t) => t.pad), l.palm, l.limb);
  out.push(b.trunk.shape);
  if (b.jaw) out.push(b.jaw);
  out.push(b.head, ...b.eyes);
  return out;
}

/** Soft spots in pairs down the back, bands across the tail: placed the same in every frame. */
function spots(b: Body): Pt[][] {
  const rng = createRng(9071);
  const out: Pt[][] = [];
  const { spine, top, bot } = b.trunk;
  for (let i = 5; i < b.tailFrom; i += 3) {
    const p = spine[i]!;
    const w = Math.hypot(top[i]!.x - bot[i]!.x, top[i]!.y - bot[i]!.y) / 2;
    for (const side of [-1, 1]) {
      const r = 1.6 + rng() * 1.3;
      out.push(oval(p.x + side * w * (0.3 + rng() * 0.3), p.y + (rng() - 0.5) * 2.5, r * 1.2, r, 10));
    }
  }
  for (let i = b.tailFrom + 2; i < spine.length - 4; i += 4) {
    const a = top[i]!;
    const z = bot[i]!;
    const c = spine[i]!;
    const across = Math.atan2(z.y - a.y, z.x - a.x);
    out.push(turnedOval(c, Math.hypot(a.x - z.x, a.y - z.y) * 0.36, 1.5, across, 12));
  }
  for (const [x, y, r] of [[0, -32, 2.6], [-6.5, -27, 1.7], [6.5, -27, 1.7], [0, -47, 1.8]] as const) out.push(oval(x, y, r * 1.2, r, 10));
  return out;
}

/**
 * The gecko's skin: its whole silhouette (head, body, legs, toes, tail)
 * filled pure white, with soft grey form shading, spots and scale grain.
 * In game this layer is tinted with the loaded marble's colour.
 */
export function drawGeckoSkin(d: Draw, pose: GeckoPose): void {
  const { pen } = d;
  const { ctx } = pen;
  const b = geometry(pose, d.f);
  for (const s of silhouette(b)) pen.fill(s, '#ffffff', 1);
  // Form: the side of each round part turned from the light, as a grey glaze.
  const glaze = (s: readonly Pt[], k: number, a: number): void => pen.crescent(s, pt(-k * 0.55, -k * 0.84), () => pen.fill(s, SHADOW, a));
  for (const l of b.legs) {
    glaze(l.limb, 3, 0.4);
    for (const t of l.toes) glaze(t.pad, 1.2, 0.3);
  }
  glaze(b.trunk.shape, 8, 0.3);
  glaze(b.trunk.shape, 3.5, 0.25);
  if (b.jaw) glaze(b.jaw, 3, 0.3);
  glaze(b.head, 8, 0.28);
  glaze(b.head, 3, 0.2);
  // The back rounds over: a soft shade down both flanks, the spine left bright.
  pen.clipped(b.trunk.shape, () => {
    const g = ctx.createLinearGradient(-13, 0, 13, 0);
    g.addColorStop(0, rgba(SHADOW, 0.32));
    g.addColorStop(0.38, rgba(SHADOW, 0));
    g.addColorStop(0.6, rgba(SHADOW, 0));
    g.addColorStop(1, rgba(SHADOW, 0.42));
    ctx.fillStyle = g;
    ctx.fillRect(-14, -30, 28, 52);
  });
  pen.clipped(b.head, () => {
    const g = ctx.createRadialGradient(-3, -42, 4, 0, -38, 22);
    g.addColorStop(0, rgba(SHADOW, 0));
    g.addColorStop(1, rgba(SHADOW, 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(-22, -60, 44, 42);
  });
  // Spots and a fine grain of scales.
  const marks = spots(b);
  for (const s of [b.trunk.shape, b.head]) pen.clipped(s, () => marks.forEach((m) => pen.fill(m, SPOT, 0.24)));
  for (const s of [b.trunk.shape, b.head]) pen.stipple(s, 160, () => 0.5, 0.4, '#a0a0a0');
  for (const e of b.eyes) glaze(e, 2.6, 0.38);
  // Holding a marble, its shadow falls on the snout just behind it.
  if (pose === 'idle') {
    const M = GECKO_MOUTH;
    const seat = oval(M.x + 1.8, M.y + 3.4, 16.5, 16.5, 32);
    pen.clipped(b.head, () => pen.crescent(seat, pt(-1.8, -3.4), () => pen.fill(seat, '#6a6a6a', 0.38)));
  }
}

/** Granular scales as tiny arcs scattered over a part. */
function scales(d: Draw, shape: readonly Pt[], n: number, seed: number, a = 0.3): void {
  const { pen } = d;
  const rng = createRng(seed);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0);
      pen.hair(bezier(pt(x - 1, y), pt(x, y + 0.9), pt(x + 1, y), 3), 0.38, d.ink, a);
    }
  });
}

/** One leg's lines: toes with their pads, then the limb over them. */
function legLines(d: Draw, l: Leg): void {
  const { pen } = d;
  const { ctx } = pen;
  for (const t of l.toes) {
    erase(ctx, t.tube);
    pen.stroke(closed(t.tube), 0.7, d.ink, 0.9, false);
  }
  for (const t of l.toes) {
    erase(ctx, t.pad);
    // A broad adhesive pad, ridged with lamellae.
    const n = pt(-Math.sin(t.ang), Math.cos(t.ang));
    for (const k of [-0.8, 0.5]) {
      const c = pt(t.tip.x + Math.cos(t.ang) * k, t.tip.y + Math.sin(t.ang) * k);
      pen.hair([pt(c.x - n.x * 1.5, c.y - n.y * 1.5), pt(c.x + n.x * 1.5, c.y + n.y * 1.5)], 0.3, d.ink, 0.5);
    }
    pen.stroke(closed(t.pad), 0.75, d.ink, 0.95, false);
  }
  erase(ctx, l.palm);
  pen.stroke(closed(l.palm), 0.8, d.ink, 0.9, false);
  erase(ctx, l.limb);
  shade(d, l.limb, 0.3);
  edge(d, l.limb, 1);
  // A crease at the elbow.
  const e = l.elbow;
  pen.hair(bezier(pt(e.x - 2, e.y - 1.4), pt(e.x, e.y + 0.4), pt(e.x + 2, e.y - 1.3), 4), 0.4, d.ink, 0.45);
}

/** An eye: a domed lid, a paper-white eyeball with an amber ring, a big pupil looking ahead, a glint. */
function eye(d: Draw, e: readonly Pt[], side: number): void {
  const { pen } = d;
  const c = pt(13.6 * side, -38);
  const ball = oval(c.x, c.y, 5.9, 6.1, 20);
  pen.fill(ball, PAPER_FILL, 1);
  pen.fill(oval(c.x - 0.3 * side, c.y - 1, 4.7, 4.8, 16), '#d9a441', 0.55);
  pen.fill(oval(c.x - 0.7 * side, c.y - 1.5, 3.4, 3.7, 16), d.ink, 1);
  pen.dot(c.x - 0.7 * side - 1.2, c.y - 2.9, 1.2, PAPER_FILL, 1);
  pen.dot(c.x - 0.7 * side + 1.1, c.y - 0.3, 0.5, PAPER_FILL, 0.8);
  pen.stroke(closed(ball), 0.8, d.ink, 0.9, false);
  edge(d, e, 1.25);
}

/** The gaping mouth: lower jaw, its pink inside, the tongue flicked out. */
function gape(d: Draw, jaw: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  erase(ctx, jaw);
  edge(d, jaw, 1.1);
  const inside = bilateral([pt(0, -52), ...cub(pt(9, -52), pt(10.2, -58), pt(8.6, -62.5), pt(4.5, -64.4), 6), pt(0, -65)]);
  pen.fill(inside, MOUTH, 0.95);
  pen.clipped(inside, () => pen.fill(oval(0, -55, 6.5, 4.5, 16), THROAT, 0.8));
  pen.hair(closed(inside), 0.6, d.ink, 0.7);
  const tongue = [...bezier(pt(-2.6, -54), pt(-3.4, -66), pt(-1.8, -74), 8), ...bezier(pt(-1.8, -74), pt(0.8, -78.4), pt(3.2, -74), 5).slice(1), ...bezier(pt(3.2, -74), pt(3.4, -64), pt(2.6, -54), 8).slice(1)];
  pen.fill(tongue, TONGUE, 1);
  pen.hair([pt(0.2, -58), pt(0.5, -73)], 0.45, '#a03a52', 0.7);
  pen.stroke(closed(tongue), 0.75, d.ink, 0.9);
}

/**
 * The gecko's pen layer, drawn over the tinted skin: contours, scale
 * marks, ink hatching on the shadow side, toe pads, eyes, nostrils and
 * (when spitting) the gaping mouth and tongue. Transparent elsewhere.
 */
export function drawGeckoLines(d: Draw, pose: GeckoPose): void {
  const { pen } = d;
  const { ctx } = pen;
  const b = geometry(pose, d.f);
  for (const l of b.legs) legLines(d, l);
  // Trunk and tail: granular scales, rings round the tail, beads down the spine, hatched flanks, gloss.
  const { shape, spine, top, bot } = b.trunk;
  erase(ctx, shape);
  scales(d, shape, 90, 311);
  pen.clipped(shape, () => {
    for (let i = b.tailFrom + 1; i < spine.length - 2; i += 2) pen.hair([top[i]!, bot[i]!], 0.35, d.ink, 0.25);
  });
  for (let i = 3; i < b.tailFrom; i += 2) pen.dot(spine[i]!.x + 0.2, spine[i]!.y, 0.55, d.ink, 0.35);
  shade(d, shape, 0.28);
  glint(d, [pt(-4.5, -20), pt(-5.6, -8), pt(-5, 4), pt(-3, 14), pt(-2.2, 24)], 1.4, 0.5);
  glint(d, spine.slice(b.tailFrom + 4, b.tailFrom + 24).map((p, i) => pt(p.x - 1.6 + i * 0.05, p.y - 1.2)), 0.9, 0.4);
  edge(d, shape, 1.4);
  if (b.jaw) gape(d, b.jaw);
  // Head: scales, an ear opening, nostrils, a glossy brow, contour.
  erase(ctx, b.head);
  scales(d, b.head, 46, 312, 0.25);
  shade(d, b.head, 0.22);
  glint(d, bezier(pt(-9, -25), pt(-5, -23), pt(-1, -23.4), 5), 1.2, 0.45);
  glint(d, bezier(pt(-6, -50), pt(-3.5, -53.5), pt(0, -54.5), 4), 1, 0.4);
  for (const s of [-1, 1]) {
    pen.hair(bezier(pt(s * 3.2, -55.2), pt(s * 4.3, -55.8), pt(s * 5, -54.6), 3), 0.7, d.ink, 0.85);
    pen.fill(oval(s * 13.4, -27, 1.1, 1.7, 8), d.ink, 0.4);
  }
  edge(d, b.head, 1.45);
  // The jaw line, a little smile back from where the marble is held.
  if (!b.jaw) for (const s of [-1, 1]) pen.hair(cub(pt(s * 9.5, -55), pt(s * 12.6, -52), pt(s * 13.6, -49), pt(s * 12.4, -46.6), 6), 0.75, d.ink, 0.85);
  // Eyes on top, never tinted.
  b.eyes.forEach((e, i) => {
    erase(ctx, e);
    eye(d, e, i === 0 ? 1 : -1);
  });
}
