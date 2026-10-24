import type { Rng } from '../../logic/rng';
import { closed, makeDraw, oval, pt, TAU, type Draw } from '../kit';
import { type Pt, withScratch } from '../pen';
import { blob, crisp, dab, flat, LIGHT, mix, paint, rgba, SHADOW, soft } from '../sites/paintKit';

/**
 * Parts for painting the townscape's ground (ground.ts): smooth curves and
 * the ribbons of roads, broken pen lines, heaps of round puffs (clouds,
 * woods) with the pen along their crowns, grass tufts, and the trees and
 * bushes at the edges of the view, lit from the upper left like the rest.
 */
export const GRASS_DEEP = '#243a1a';
export const LEAF = '#3d5a28';
export const LEAF_DARK = '#18261a';
/** The far country's blue-grey haze. */
export const FAR = '#5a6479';
export const WOOD = '#283c2a';
export const GRASS_FAR = '#4a5e2c';
export const GRASS_NEAR = '#2f4520';
export const EARTH = '#6e5234';
export const ROCK = '#665e51';
/** Bark: dark walnut. */
export const BARK = '#4a2f1c';
/** The warmest lit accents (a stone's arris, a glint): warm ivory, never white. */
export const IVORY = '#e9dfc6';
/** A lit edge on `color`: its own colour warmed by the light. */
export const litEdge = (color: string, k = 0.5): string => mix(color, LIGHT, k);

/**
 * Many soft washes laid at once: painted crisp on a spare layer, then the
 * layer laid over with a single blur of `r` units, so dozens of blooms
 * cost one soft edge rather than one each (it respects the current clip).
 */
export function softWashes(d: Draw, r: number, paint: (layer: Draw) => void): void {
  const ctx = d.pen.ctx;
  const m = ctx.getTransform();
  withScratch(ctx.canvas.width, ctx.canvas.height, (lctx, canvas) => {
    lctx.setTransform(m);
    paint(makeDraw(lctx, 0, 0, 0, d.ink));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    soft(ctx, r * (Math.hypot(m.a, m.b) || 1), () => ctx.drawImage(canvas, 0, 0));
    ctx.restore();
  });
}

/** Smooth curve through points (Catmull-Rom), resampled about every `step` units. */
export function curve(pts: readonly Pt[], step = 6): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const n = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(pt(
        0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      ));
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** A ribbon of width w(u) along a spine, flattened by the view's foreshortening: a road or a lane. */
export function strip(spine: readonly Pt[], w: (u: number) => number): { left: Pt[]; right: Pt[]; shape: Pt[] } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  spine.forEach((p, i) => {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(spine.length - 1, i + 1)]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / l;
    const ny = (b.x - a.x) / l;
    const hw = w(i / (spine.length - 1)) / 2;
    left.push(pt(p.x + nx * hw, p.y + ny * hw * 0.55));
    right.push(pt(p.x - nx * hw, p.y - ny * hw * 0.55));
  });
  return { left, right, shape: [...left, ...[...right].reverse()] };
}

export const centroid = (s: readonly Pt[]): Pt => s.reduce((a, p) => pt(a.x + p.x / s.length, a.y + p.y / s.length), pt(0, 0));

/** Splits a polyline into runs, leaving gaps: a contour the pen only finds in places. */
export function broken(d: Draw, rng: Rng, line: readonly Pt[], w: number, color: string, alpha: number, keep = 0.7): void {
  let i = 0;
  while (i < line.length - 1) {
    const n = 3 + Math.floor(rng() * 8);
    if (rng() < keep) d.pen.hair(line.slice(i, i + n + 1), w, color, alpha);
    i += n;
  }
}

export interface Puff {
  readonly c: Pt;
  readonly r: number;
}

export function puffPath(ctx: CanvasRenderingContext2D, puffs: readonly Puff[], o: (p: Puff) => { dx: number; dy: number; k: number }): void {
  ctx.beginPath();
  for (const p of puffs) {
    const { dx, dy, k } = o(p);
    ctx.moveTo(p.c.x + dx + p.r * k, p.c.y + dy);
    ctx.arc(p.c.x + dx, p.c.y + dy, p.r * k, 0, TAU);
  }
}

/** The pen along the top of a heap of puffs (a cloud, a wood), in places, wherever no other puff covers it. */
export function crownLine(d: Draw, rng: Rng, puffs: readonly Puff[], base: number, w: number, alpha: number): void {
  for (const p of puffs) {
    const arc: Pt[] = [];
    const flush = (): void => {
      if (arc.length > 2) broken(d, rng, arc, w, d.ink, alpha, 0.75);
      arc.length = 0;
    };
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * 0.95 + (i / 20) * Math.PI * 1.1;
      const q = pt(p.c.x + Math.cos(a) * p.r, p.c.y + Math.sin(a) * p.r);
      const hidden = q.y > base || puffs.some((o) => o !== p && Math.hypot(q.x - o.c.x, q.y - o.c.y) < o.r * 0.98);
      if (hidden) flush();
      else arc.push(q);
    }
    flush();
  }
}

/** Where a left-to-right polyline crosses x (its y there). */
export function yAt(line: readonly Pt[], x: number): number {
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if ((x >= a.x && x <= b.x) || (x <= a.x && x >= b.x)) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
  }
  return x < line[0]!.x ? line[0]!.y : line[line.length - 1]!.y;
}

/** A jagged line from a to b: a crack or a fracture in rock. */
export function jag(rng: Rng, a: Pt, b: Pt, n: number, amp: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const k = i === 0 || i === n ? 0 : (rng() - 0.5) * 2 * amp;
    return pt(a.x + (b.x - a.x) * t + k, a.y + (b.y - a.y) * t + k * 0.3);
  });
}

/** A tuft of grass: a few blades fanning up from a point. */
export function tuft(d: Draw, rng: Rng, p: Pt, s: number, alpha: number): void {
  const n = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.35 + (rng() - 0.5) * 0.3;
    const l = s * (0.7 + rng() * 0.6);
    d.pen.hair([p, pt(p.x + Math.cos(a) * l * 0.5 + 0.3, p.y + Math.sin(a) * l * 0.5), pt(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l)], 0.42, mix(GRASS_DEEP, SHADOW, 0.35), alpha);
  }
}

/** A little tree far off: a dab of green, lit on its left. */
export function farTree(d: Draw, rng: Rng, x: number, y: number, s: number, tint: string, ink = 0.45): void {
  const crown = blob(pt(x, y - s), s * 0.8, s, rng, 0.15, 12);
  d.pen.fill(crown, tint, 0.9);
  d.pen.fill(blob(pt(x - s * 0.3, y - s * 1.3), s * 0.42, s * 0.45, rng, 0.2, 10), mix(tint, LIGHT, 0.45), 0.6);
  d.pen.hair([pt(x + s * 0.75, y - s * 1.3), pt(x + s * 0.65, y - s * 0.3), pt(x, y + 0.2)], 0.45, d.ink, ink);
}

/** Lit foliage: the green warmed and brightened, never greyed (the sun on leaves is gold-green, not white). */
export const LEAF_LIT = '#6f8236';

/**
 * One mass of leaves, painted rather than tinted: a dark body, the sunlit
 * upper left laid in warm gold-green, clusters of leaves catching the
 * light, a deep core shadow on the lower right with the shade hatched, a
 * fine pen line.
 */
export function foliage(d: Draw, rng: Rng, m: readonly Pt[], green: string, depth: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const c = centroid(m);
  const xs = m.map((p) => p.x);
  const ys = m.map((p) => p.y);
  const rx = (Math.max(...xs) - Math.min(...xs)) / 2;
  const ry = (Math.max(...ys) - Math.min(...ys)) / 2;
  const body = mix(green, LEAF_DARK, depth);
  pen.fill(m, body, 1);
  pen.clipped(m, () => {
    soft(ctx, Math.max(0.8, ry * 0.3), () => pen.fill(blob(pt(c.x - rx * 0.3, c.y - ry * 0.35), rx * 0.75, ry * 0.6, rng, 0.25, 12), mix(LEAF_LIT, body, 0.15 + depth * 0.6), 0.6));
    soft(ctx, Math.max(0.8, ry * 0.25), () => pen.fill(blob(pt(c.x + rx * 0.45, c.y + ry * 0.5), rx * 0.85, ry * 0.65, rng, 0.25, 12), mix(LEAF_DARK, SHADOW, 0.3), 0.7));
    for (let k = 0; k < 6; k++) {
      const q = pt(c.x - rx * 0.6 + rng() * rx * 1.1, c.y - ry * 0.7 + rng() * ry * 0.9);
      const lit = (q.x - c.x) / rx + (q.y - c.y) / ry < 0.2;
      if (!lit) continue;
      pen.hair([q, pt(q.x + rx * 0.14, q.y - ry * 0.1), pt(q.x + rx * 0.28, q.y + ry * 0.02)], 0.45, mix(LEAF_LIT, LIGHT, 0.3), 0.55);
    }
  });
  pen.crescent(m, { x: TO_LIGHT_X * rx * 0.6, y: TO_LIGHT_Y * ry * 0.6 }, () => pen.hatch(m, 1.4, 0.9, 0.32, { color: d.ink, alpha: 0.22 }));
  pen.stroke(closed(m), 0.42, d.ink, 0.6);
}

const TO_LIGHT_X = -0.55;
const TO_LIGHT_Y = -0.84;

/** A broadleaf tree: a trunk and boughs under a crown of leafy masses, each lit from the upper left, the shade side deep and hatched. */
export function tree(d: Draw, rng: Rng, foot: Pt, s: number, hue = 0.5): void {
  dab(d, oval(foot.x + 16 * s, foot.y + 2, 28 * s, 5 * s, 18), SHADOW, 0.4, 2);
  const lean = (rng() - 0.5) * 6 * s;
  const trunk = [pt(foot.x - 4.5 * s, foot.y + 1), pt(foot.x - 2.6 * s + lean * 0.5, foot.y - 26 * s), pt(foot.x - 7 * s + lean, foot.y - 42 * s), pt(foot.x + lean, foot.y - 34 * s), pt(foot.x + 7 * s + lean, foot.y - 44 * s), pt(foot.x + 2.8 * s + lean * 0.5, foot.y - 24 * s), pt(foot.x + 5 * s, foot.y + 1)];
  paint(d, trunk, BARK, { shadow: 0.75, hatch: 0.3, line: 0.5 });
  const green = mix(LEAF, '#45602a', hue);
  const top = pt(foot.x + lean, foot.y - 60 * s);
  const masses: Pt[][] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + rng() * 0.6;
    masses.push(blob(pt(top.x + Math.cos(a) * 19 * s, top.y + Math.sin(a) * 14 * s + 4 * s), (12 + rng() * 6) * s, (9 + rng() * 4) * s, rng, 0.22, 16));
  }
  masses.push(blob(top, 20 * s, 16 * s, rng, 0.18, 18));
  masses.push(blob(pt(top.x - 6 * s, top.y - 12 * s), 12 * s, 9 * s, rng, 0.2, 16));
  // Back masses first; those on the far side and low down sink into shade.
  masses.sort((a, b) => centroid(a).y - centroid(b).y);
  for (const m of masses) {
    const c = centroid(m);
    const tone = (c.x - top.x) / (40 * s) + (c.y - top.y) / (36 * s);
    foliage(d, rng, m, green, Math.max(0.1, Math.min(0.75, 0.3 + tone * 0.45)));
  }
}

/** A cypress: a tall dark flame of a tree, lit down its left. */
export function cypress(d: Draw, rng: Rng, foot: Pt, h: number): void {
  dab(d, oval(foot.x + h * 0.15, foot.y + 1, h * 0.25, h * 0.04, 14), SHADOW, 0.35, 1.5);
  const w = h * 0.13;
  const shape = [
    ...curve([pt(foot.x - w * 0.5, foot.y), pt(foot.x - w, foot.y - h * 0.35), pt(foot.x - w * 0.6, foot.y - h * 0.8), pt(foot.x + (rng() - 0.5) * 2, foot.y - h)], 3),
    ...curve([pt(foot.x + w * 0.7, foot.y - h * 0.8), pt(foot.x + w, foot.y - h * 0.35), pt(foot.x + w * 0.5, foot.y)], 3),
  ];
  const ctx = d.pen.ctx;
  d.pen.fill(shape, mix(LEAF_DARK, LEAF, 0.3), 1);
  d.pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(foot.x - w, 0, foot.x + w, 0);
    g.addColorStop(0, rgba(mix(LEAF_LIT, LEAF, 0.5), 0.75));
    g.addColorStop(0.45, rgba(LEAF, 0.2));
    g.addColorStop(1, rgba(SHADOW, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(foot.x - w - 2, foot.y - h - 2, w * 2 + 4, h + 4);
    for (let k = 0; k < 12; k++) {
      const y = foot.y - h * (0.1 + rng() * 0.8);
      d.pen.hair([pt(foot.x - w * 0.6, y), pt(foot.x - w * 0.1, y - 3), pt(foot.x + w * 0.2, y - 1)], 0.45, mix(LEAF_LIT, LIGHT, 0.25), 0.5);
    }
    d.pen.hatch(shape.map((p) => pt(p.x + w * 0.5, p.y)), 1.4, 1.1, 0.3, { color: d.ink, alpha: 0.25 });
  });
  d.pen.stroke(closed(shape), 0.45, d.ink, 0.7);
}

/** A low bush: leafy masses huddled together. */
export function bush(d: Draw, rng: Rng, foot: Pt, s: number): void {
  dab(d, oval(foot.x + 6 * s, foot.y + 1, 15 * s, 3 * s, 14), SHADOW, 0.38, 1.4);
  const green = mix(LEAF, '#4f6e2c', rng());
  for (const [dx, dy, r] of [[-9, -6, 8], [9, -6, 8], [0, -11, 10]] as const) {
    const m = blob(pt(foot.x + dx * s, foot.y + dy * s), r * s, r * 0.75 * s, rng, 0.22, 14);
    foliage(d, rng, m, green, dx > 0 ? 0.55 : 0.3);
  }
}

/** Brush marks: short dabs of related greens laid side by side, the tooth of a loaded brush dragged over rough paper. */
export function texture(d: Draw, rng: Rng, shape: readonly Pt[], count: number, scale = 1, tints: readonly string[] = [GRASS_DEEP, '#6f6a32', mix(GRASS_NEAR, LIGHT, 0.3)]): void {
  const ctx = d.pen.ctx;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  ctx.save();
  for (let i = 0; i < count; i++) {
    const y = y0 + rng() * (y1 - y0);
    const near = scale * (0.6 + 0.8 * Math.max(0, (y - 240) / 230));
    ctx.globalAlpha = 0.06 + rng() * 0.12;
    ctx.fillStyle = tints[Math.floor(rng() * tints.length)]!;
    ctx.beginPath();
    ctx.ellipse(x0 + rng() * (x1 - x0), y, (2.5 + rng() * 5) * near, (0.7 + rng() * 0.9) * near, (rng() - 0.5) * 0.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * A wood: crowns heaped into one mass, lit on their tops, dark at their
 * feet; `size` scales the crowns (1 far off, 3 or so a field away, where
 * the trunks show under the crowns and the mass stands on its own shadow).
 */
export function wood(d: Draw, rng: Rng, x0: number, x1: number, y: number, h: number, tint: string, size = 1): void {
  const ctx = d.pen.ctx;
  const near = size > 1.5;
  const puffs: Puff[] = [];
  for (let x = x0; x < x1; x += (2.5 + rng() * 3) * size) {
    const k = Math.sin(((x - x0) / (x1 - x0)) * Math.PI);
    const r = (3 + rng() * 2.4 + k * 1.6) * size;
    puffs.push({ c: pt(x, y - r * 0.5 - k * h + rng() * 2 * size), r });
    if (rng() < 0.5) puffs.push({ c: pt(x + rng() * 3 * size, y - r * 1.3 - k * h), r: r * 0.8 });
    // Near to, the understorey: lower, smaller crowns, so the wood's foot is ragged rather than ruled.
    if (near) puffs.push({ c: pt(x + rng() * 2 * size, y - r * 0.15 - rng() * size * 2), r: r * (0.45 + rng() * 0.25) });
  }
  const none = (): { dx: number; dy: number; k: number } => ({ dx: 0, dy: 0, k: 1 });
  if (near) {
    dab(d, oval((x0 + x1) / 2 + 4 * size, y + 2 * size, (x1 - x0) * 0.55, 3 * size, 24), SHADOW, 0.3, 2 * size);
    for (let x = x0 + rng() * 6 * size; x < x1; x += (5 + rng() * 6) * size) {
      d.pen.stroke([pt(x, y + 1.5 * size + rng() * size), pt(x + (rng() - 0.5) * size, y - 6 * size)], 0.9 + rng() * 0.6 * size, mix(BARK, SHADOW, 0.35), 0.85, false);
    }
  }
  ctx.save();
  puffPath(ctx, puffs, none);
  if (!near) ctx.rect(x0, y - 2 * size, x1 - x0, 4 * size);
  ctx.fillStyle = tint;
  ctx.fill();
  ctx.clip();
  puffPath(ctx, puffs, (p) => ({ dx: -p.r * 0.3, dy: -p.r * 0.35, k: 0.55 }));
  ctx.fillStyle = rgba(mix(tint, LIGHT, 0.38), 0.55);
  ctx.fill();
  if (near) {
    // Leaves caught by the light on each crown, and the shade under them hatched.
    for (const p of puffs) {
      for (let k = 0; k < 3; k++) {
        const q = pt(p.c.x - p.r * 0.5 + rng() * p.r * 0.7, p.c.y - p.r * 0.6 + rng() * p.r * 0.6);
        d.pen.hair([q, pt(q.x + 0.25 * p.r, q.y - 0.12 * p.r), pt(q.x + 0.45 * p.r, q.y + 0.04 * p.r)], 0.45, mix(tint, LIGHT, 0.6), 0.55);
      }
    }
    d.pen.hatch([pt(x0 - 10, y - 4 * size), pt(x1 + 10, y - 4 * size), pt(x1 + 10, y + 4), pt(x0 - 10, y + 4)], 2.2, 1.1, 0.35, { color: d.ink, alpha: 0.18 });
  }
  const g = ctx.createLinearGradient(0, y - h - 4 * size, 0, y + 2 * size);
  g.addColorStop(0, rgba(SHADOW, 0));
  g.addColorStop(1, rgba(SHADOW, 0.42));
  ctx.fillStyle = g;
  ctx.fillRect(x0 - 6 * size, y - h - 8 * size, x1 - x0 + 12 * size, h + 12 * size);
  ctx.restore();
  crownLine(d, rng, puffs, y, size > 1.5 ? 0.45 : 0.4, size > 1.5 ? 0.4 : 0.22);
}

/**
 * A rock face between a top line and a foot line: upright masses of uneven
 * width, each broken into blocks at uneven heights, every block turned into
 * shade on its right along a crack, lit ledges where the fractures run.
 */
export function rockFace(d: Draw, rng: Rng, x0: number, x1: number, topAt: (x: number) => number, footAt: (x: number) => number): void {
  const ctx = d.pen.ctx;
  for (let x = x0; x < x1;) {
    const w = 14 + rng() * 32;
    const top = topAt(x + w / 2) + rng() * 4;
    const bottom = footAt(x + w / 2) + 4;
    const cuts = [top];
    for (let y = top + 12 + rng() * 22; y < bottom - 10; y += 14 + rng() * 24) cuts.push(y);
    cuts.push(bottom);
    for (let k = 0; k + 1 < cuts.length; k++) {
      const ya = cuts[k]!;
      const yb = cuts[k + 1]!;
      const xm = x + w * (0.5 + rng() * 0.3);
      const crack = jag(rng, pt(xm, ya), pt(xm + (rng() - 0.4) * 6, yb), 4, 1.8);
      const side = [...crack, pt(x + w + 2, yb), pt(x + w + 2, ya + 3)];
      soft(ctx, 0.8, () => d.pen.fill(side, mix(ROCK, SHADOW, 0.62), 0.4 + rng() * 0.25));
      d.pen.hatch(side, 1.7, 1.15, 0.34, { color: d.ink, alpha: 0.3 });
      d.pen.hair(crack, 0.5, d.ink, 0.6);
      if (k > 0) {
        const f = jag(rng, pt(x - 1, ya + (rng() - 0.5) * 3), pt(xm + 1, ya + (rng() - 0.5) * 3), 4, 1);
        soft(ctx, 1, () => d.pen.fill([...f, ...f.slice().reverse().map((p) => pt(p.x, p.y + 4))], mix(ROCK, SHADOW, 0.55), 0.3));
        d.pen.hair(f.map((p) => pt(p.x, p.y - 0.9)), 0.8, litEdge(ROCK, 0.45), 0.55);
        d.pen.hair(f, 0.5, d.ink, 0.55);
      }
      if (rng() < 0.35) d.pen.hair(jag(rng, pt(x + w * 0.15, ya + 4), pt(x + w * 0.4, ya + (yb - ya) * 0.7), 3, 1), 0.4, d.ink, 0.35);
    }
    x += w;
  }
}

/** A loose stone: angular, its top lit, its right face in shade, a crisp contour and grass at its foot. */
export function rock(d: Draw, rng: Rng, c: Pt, rx: number, ry: number): void {
  const n = 6 + Math.floor(rng() * 2);
  const outline = Array.from({ length: n }, (_, i) => {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const k = 0.75 + rng() * 0.35;
    return pt(c.x + Math.cos(a) * rx * k, c.y + Math.sin(a) * ry * 1.15 * k);
  });
  const shape = crisp([...outline, pt(c.x + rx * 0.9, c.y + ry * 0.35), pt(c.x - rx * 0.9, c.y + ry * 0.35)], 2);
  dab(d, oval(c.x + rx * 0.5, c.y + ry * 0.4, rx * 1.2, ry * 0.5, 14), SHADOW, 0.25, 1.2);
  flat(d, shape, ROCK, { tone: -0.05, line: 0 });
  const peak = outline[Math.floor(n / 2)]!;
  const side = [peak, ...outline.slice(Math.floor(n / 2) + 1), pt(c.x + rx * 0.9, c.y + ry * 0.35), pt(peak.x + rx * 0.1, c.y + ry * 0.35)];
  d.pen.fill(side, mix(ROCK, SHADOW, 0.55), 0.55);
  d.pen.hatch(side, 1.4, 1.2, 0.32, { color: d.ink, alpha: 0.3 });
  d.pen.hair([peak, pt(peak.x + rx * 0.1, c.y + ry * 0.35)], 0.45, d.ink, 0.6);
  d.pen.stroke(closed(shape), 0.5, d.ink, 0.8);
  tuft(d, rng, pt(c.x - rx * 0.85, c.y + ry * 0.4), 3, 0.65);
  if (rng() < 0.5) tuft(d, rng, pt(c.x + rx * 0.9, c.y + ry * 0.4), 2.6, 0.6);
}

/** Packed earth, softly edged, a lighter crown, pebbles and (on the roads) cart ruts; grass creeping over the verges. */
export function road(d: Draw, rng: Rng, spine: readonly Pt[], w: (u: number) => number, ruts: boolean): void {
  const s = strip(spine, w);
  const ctx = d.pen.ctx;
  soft(ctx, 1, () => d.pen.fill(s.shape, EARTH, 0.9));
  const crown = strip(spine, (u) => w(u) * 0.55);
  soft(ctx, 3, () => d.pen.fill(crown.shape, mix(EARTH, LIGHT, 0.3), 0.4));
  d.pen.clipped(s.shape, () => {
    soft(ctx, 2.5, () => {
      for (let i = 0; i < spine.length; i += 2) {
        const p = spine[i]!;
        if (rng() < 0.5) d.pen.fill(blob(pt(p.x + (rng() - 0.5) * w(0.5) * 0.6, p.y), 3 + rng() * 5, 1.5 + rng(), rng, 0.3, 10), mix(EARTH, SHADOW, 0.35), 0.25);
      }
    });
    if (ruts) {
      for (const k of [-0.25, 0.25]) {
        const rut = spine.map((p, i) => pt(p.x + (s.left[i]!.x - p.x) * k * 2, p.y + (s.left[i]!.y - p.y) * k * 2));
        d.pen.hair(rut, 0.7, mix(EARTH, SHADOW, 0.55), 0.55);
        d.pen.hair(rut.map((p) => pt(p.x - 0.9, p.y - 0.7)), 0.5, litEdge(EARTH, 0.45), 0.35);
      }
    }
  });
  for (let i = 0; i < spine.length; i++) {
    if (rng() > 0.35) continue;
    const p = spine[i]!;
    const q = pt(p.x + (rng() - 0.5) * w(i / spine.length) * 0.8, p.y + (rng() - 0.5) * 3);
    d.pen.dot(q.x, q.y, 0.6 + rng() * 0.6, mix(ROCK, LIGHT, 0.3), 0.9);
    d.pen.hair([pt(q.x - 0.6, q.y + 0.7), pt(q.x + 0.8, q.y + 0.5)], 0.35, d.ink, 0.5);
  }
  // The verges: the near one a little sunk, the pen catching it in places; grass over both.
  broken(d, rng, s.right, 0.55, d.ink, 0.45, 0.6);
  broken(d, rng, s.left, 0.5, d.ink, 0.3, 0.4);
  for (const edge of [s.left, s.right]) for (const p of edge) if (rng() < 0.45) tuft(d, rng, pt(p.x, p.y + 1), 2.6, 0.55);
}

/** A grassy bank falling from `front` (a terrace's lip) to `foot`, in shade and hatched. */
export function bank(d: Draw, front: readonly Pt[], foot: readonly Pt[]): void {
  const ctx = d.pen.ctx;
  const shape = [...front, ...foot.slice(1)];
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  d.pen.clipped(shape, () => {
    ctx.fillStyle = rgba(mix(GRASS_NEAR, SHADOW, 0.3), 0.32);
    ctx.fillRect(Math.min(...xs) - 5, Math.min(...ys) - 5, Math.max(...xs) - Math.min(...xs) + 10, Math.max(...ys) - Math.min(...ys) + 10);
    d.pen.hatch(shape, 2.8, 1.15, 0.38, { color: d.ink, alpha: 0.14 });
  });
}

/** A low dry-stone revetment along a terrace's lip: two rough courses, lit on the coping, damp at the foot. */
export function revetment(d: Draw, rng: Rng, front: readonly Pt[]): void {
  const ctx = d.pen.ctx;
  const wallFace = [...front, ...front.slice().reverse().map((p) => pt(p.x, p.y + 7))];
  flat(d, wallFace, ROCK, { tone: 0.1, line: 0 });
  d.pen.clipped(wallFace, () => {
    for (const v of [0, 3.5]) {
      for (let i = 0; i < front.length - 1; i++) {
        const p = front[i]!;
        for (let x = p.x + rng() * 3; x < front[i + 1]!.x; x += 4 + rng() * 4) {
          const y = yAt(front, x) + v;
          d.pen.fill(blob(pt(x + 2.5, y + 1.8), 2.4, 1.5, rng, 0.25, 8), rng() < 0.5 ? mix(ROCK, LIGHT, 0.4) : mix(ROCK, SHADOW, 0.25), 0.8);
          d.pen.hair([pt(x, y + 0.3), pt(x + 0.3, y + 3.2)], 0.4, d.ink, 0.5);
        }
      }
      d.pen.hair(front.map((p) => pt(p.x, p.y + v + 3.5)), 0.4, d.ink, 0.45);
    }
    soft(ctx, 1.5, () => d.pen.fill(front.map((p) => pt(p.x, p.y + 5)).concat(front.slice().reverse().map((p) => pt(p.x, p.y + 9))), SHADOW, 0.25));
  });
  d.pen.hair(front.map((p) => pt(p.x, p.y - 0.6)), 0.8, litEdge(ROCK, 0.45), 0.55);
  d.pen.stroke(front.map((p) => pt(p.x, p.y + 7)), 0.8, d.ink, 0.7, false);
  for (const p of front) if (rng() < 0.4) tuft(d, rng, pt(p.x, p.y + 8), 3, 0.6);
  broken(d, rng, front, 0.6, d.ink, 0.5, 0.8);
}
