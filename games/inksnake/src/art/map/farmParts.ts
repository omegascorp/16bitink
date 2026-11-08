import type { Rng } from '../../logic/rng';
import { closed, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { blob, type Brush, frame, polar, scalloped, turnedBox } from './brush';
import { bush, rosette } from './plants';

/**
 * The farm's things as the map draws them, from above: the farmhouse's
 * tiled roof with its chimney, a gable roof for sheds, round bales, hens,
 * fields (wheat in drill rows, plough furrows, a mown hay meadow, a
 * vegetable plot), hedgerows and post-and-wire field fences.
 */
const TILE = '#b56a4c';
const SLATE = '#8b8478';

/** A gable roof from above, w × h centred on c and turned: ridge along its length, the slope towards the light lit, courses of tiles, its tall shadow. */
export function gableRoof(b: Brush, c: Pt, w: number, h: number, rot: number, rng: Rng, tone = TILE, tall = 34): Pt[] {
  const { pen } = b;
  const outer = turnedBox(c, w, h, rot, 10);
  const at = frame(c, w, h, rot);
  const shadow = outer.map((p) => pt(p.x + tall * 0.55, p.y + tall * 0.84));
  b.smudge(pt(c.x + tall * 0.5, c.y + tall * 0.7), w * 0.55, h * 0.6, rng);
  if (!b.draft) pen.fill(shadow, b.d.ink, 0.16);
  else b.hatch(shadow, 4.4, 0.9, 0.2);
  const lit = [at(-0.5, -0.5), at(0.5, -0.5), at(0.5, 0), at(-0.5, 0)];
  const shady = [at(-0.5, 0), at(0.5, 0), at(0.5, 0.5), at(-0.5, 0.5)];
  b.body(outer, tone, 0.68);
  b.tint(lit, PAPER_FILL, 0.28);
  b.tint(shady, b.deep(tone, 0.4), 0.42);
  if (b.draft) b.hatch(shady, 3.6, 0.9, 0.3);
  // Courses of tiles, their joints staggered.
  for (let v = -0.42; v < 0.5; v += 0.085) {
    if (Math.abs(v) < 0.04) continue;
    b.line([at(-0.49, v), at(0.49, v)], 0.6, b.draft ? 0.25 : 0.55);
    if (!b.draft) for (let u = -0.48 + (Math.round(v * 100) % 2 ? 0.02 : 0); u < 0.48; u += 0.035 + rng() * 0.012) b.line([at(u, v), at(u, v + 0.075)], 0.45, 0.45);
  }
  // Ridge tiles along the top, and barge boards at the gable ends.
  b.stroke([at(-0.5, 0), at(0.5, 0)], 4, 0.9, b.deep(tone, 0.35));
  if (!b.draft) b.pen.hair([at(-0.49, -0.015), at(0.49, -0.015)], 1.2, PAPER_FILL, 0.5);
  for (const u of [-0.5, 0.5]) b.stroke([at(u, -0.5), at(u, 0.5)], 2.2, 0.85, b.deep(tone, 0.5));
  if (!b.draft) for (let i = 0; i < 8; i++) b.tint(blob(at(-0.4 + rng() * 0.8, 0.1 + rng() * 0.35), 6 + rng() * 8, 3 + rng() * 3, rng, 0.3, 12), '#8a9a52', 0.35);
  b.edge(outer, 1.5, 0.9);
  return outer;
}

/** A chimney stack on a roof: a brick box with two pots, its shadow over the tiles. */
export function chimney(b: Brush, c: Pt, rot: number): void {
  const stack = turnedBox(c, 26, 16, rot, 5);
  b.cast(stack, 16, 0.2);
  b.body(stack, '#a9614a', 0.7);
  b.shade(stack, 5, '#5a3022', 0.4);
  b.edge(stack, 1, 0.9);
  for (const k of [-0.22, 0.22]) {
    const p = frame(c, 26, 16, rot)(k, 0);
    const pot = oval(p.x, p.y, 4.2, 4.2, 12);
    b.body(pot, '#c0703f', 0.8);
    b.dot(p.x, p.y, 2, '#2a1a14', 0.8);
    b.edge(pot, 0.6, 0.9);
  }
}

/** The farmhouse from above: its main roof and a wing, a chimney, a porch. */
export function farmhouse(b: Brush, c: Pt, rng: Rng): void {
  const rot = -0.06;
  const at = frame(c, 300, 130, rot);
  gableRoof(b, pt(at(0.32, 0.62).x, at(0.32, 0.62).y + 30), 98, 150, rot + Math.PI / 2, rng, TILE, 26);
  gableRoof(b, c, 300, 130, rot, rng, TILE, 38);
  chimney(b, at(-0.3, -0.04), rot);
  chimney(b, at(0.42, 0.02), rot);
  // A lean-to over the back door, in slate.
  const porch = turnedBox(at(-0.22, 0.6), 64, 24, rot, 8);
  b.cast(porch, 12, 0.15);
  b.body(porch, SLATE, 0.7);
  for (let u = -0.4; u < 0.5; u += 0.12) b.line([frame(at(-0.22, 0.6), 64, 24, rot)(u, -0.5), frame(at(-0.22, 0.6), 64, 24, rot)(u, 0.5)], 0.45, 0.5);
  b.shade(porch, 6, b.deep(SLATE, 0.4), 0.35);
  b.edge(porch, 1, 0.9);
}

/** A round bale standing on its end: a straw drum seen from above, wound in a spiral, twine round it. */
export function roundBale(b: Brush, c: Pt, r: number, rng: Rng): void {
  const top = oval(c.x, c.y, r, r, 30);
  b.cast(top, r * 0.7, 0.2);
  b.body(top, '#d9b862', 0.75);
  const spiral = Array.from({ length: 60 }, (_, k) => polar(c, k * 0.42, r * (k / 66)));
  b.line(spiral, 0.5, 0.55, '#a5823a');
  b.shade(top, r * 0.35, '#a5823a', 0.4);
  for (let i = 0; i < 14; i++) {
    const a = rng() * TAU;
    const p = polar(c, a, r * (0.95 + rng() * 0.1));
    b.line([p, polar(p, a + 1.4, 3 + rng() * 3)], 0.45, 0.7, '#a5823a');
  }
  b.glint(closed(oval(c.x - 1, c.y - 1, r * 0.9, r * 0.9, 24)).slice(13, 19), 1.2, 0.6);
  b.edge(top, 1, 0.85);
}

/** A hen from above, pecking about: a plump oval body, wing lines, a red comb, a short tail. */
export function hen(b: Brush, c: Pt, rng: Rng): void {
  const a = rng() * TAU;
  const brown = rng() < 0.4;
  const body = oval(0, 0, 6.5, 4.6, 14).map((p) => pt(c.x + p.x * Math.cos(a) - p.y * Math.sin(a), c.y + p.x * Math.sin(a) + p.y * Math.cos(a)));
  b.cast(body, 3, 0.18);
  b.body(body, brown ? '#b0703a' : '#f4efe2', brown ? 0.75 : 0.9);
  const head = polar(c, a, 6.5);
  b.dot(head.x, head.y, 2.4, brown ? '#9a5a2a' : '#f7f2e6', 1);
  b.dot(polar(head, a, 1.6).x, polar(head, a, 1.6).y, 1.2, '#c8322a', 1);
  b.line([polar(c, a + Math.PI, 5), polar(c, a + Math.PI, 9)], 0.9, 0.7);
  b.line([polar(c, a + 2.6, 2), polar(c, a + 3.4, 4)], 0.4, 0.5);
  b.edge(body, 0.6, 0.8);
}

/** A field's crop washed into `shape`, its rows drawn at `angle`. */
export type FieldKind = 'wheat' | 'plough' | 'mown' | 'veg';

/** Ruled rows across a shape (drill rows, furrows, swathes): plain canvas strokes, clipped, each wavering a little. */
function rows(b: Brush, shape: readonly Pt[], spacing: number, angle: number, width: number, colour: string, alpha: number, offset = 0): void {
  const { ctx } = b.pen;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const span = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + 10;
  const d = pt(Math.cos(angle), Math.sin(angle));
  const n = pt(-d.y, d.x);
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let o = -span + offset; o < span; o += spacing) {
    for (let t = -span; t < span; t += 40) {
      const w0 = Math.sin((o + t) * 0.05) * 0.8;
      const w1 = Math.sin((o + t + 40) * 0.05) * 0.8;
      ctx.moveTo(cx + n.x * (o + w0) + d.x * t, cy + n.y * (o + w0) + d.y * t);
      ctx.lineTo(cx + n.x * (o + w1) + d.x * (t + 40), cy + n.y * (o + w1) + d.y * (t + 40));
    }
  }
  ctx.stroke();
  ctx.restore();
}

export function field(b: Brush, shape: readonly Pt[], kind: FieldKind, angle: number, rng: Rng): void {
  const { pen } = b;
  const tone = { wheat: '#e2c46c', plough: '#9c7a58', mown: '#d2d08a', veg: '#7a5a3e' }[kind];
  b.body(shape, tone, kind === 'mown' ? 0.42 : 0.5);
  if (!b.draft) {
    const xs = shape.map((p) => p.x);
    const ys = shape.map((p) => p.y);
    const c = pt((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
    pen.clipped(shape, () => {
      for (let i = 0; i < 6; i++) pen.fill(blob(polar(c, rng() * TAU, 120 * rng()), 60 + rng() * 70, 30 + rng() * 40, rng, 0.3, 16, rng()), rng() < 0.5 ? b.deep(tone, 0.25) : PAPER_FILL, 0.08);
    });
  }
  const ink = (c: string): string => (b.draft ? b.ink : c);
  if (kind === 'wheat') {
    rows(b, shape, b.draft ? 9 : 5, angle, b.draft ? 0.5 : 0.9, ink('#a07a2a'), b.draft ? 0.3 : 0.45);
    if (!b.draft) rows(b, shape, 5, angle, 1.2, '#f8ecb8', 0.4, 2.5);
    // Tramlines: the tractor's pairs of wheel marks through the crop.
    if (!b.draft) for (const o of [0, 12]) rows(b, shape, 110, angle, 2.2, b.deep(tone, 0.3), 0.3, o);
  } else if (kind === 'plough') {
    rows(b, shape, b.draft ? 10 : 7, angle, b.draft ? 0.5 : 2.2, ink('#5a3e28'), b.draft ? 0.3 : 0.45);
    if (!b.draft) rows(b, shape, 7, angle, 1.4, '#e8d0a8', 0.45, 3.2);
  } else if (kind === 'mown') {
    if (!b.draft) rows(b, shape, 52, angle, 24, '#f2eab8', 0.3);
    rows(b, shape, b.draft ? 26 : 13, angle + 0.04, 0.5, ink('#8a9a4a'), b.draft ? 0.25 : 0.4);
  } else {
    rows(b, shape, 26, angle, b.draft ? 0.5 : 1.4, ink('#3e2b20'), b.draft ? 0.3 : 0.35);
  }
  b.shade(shape, 6, b.deep(tone, 0.3), 0.18);
  b.edge(shape, 1, 0.7);
  if (kind === 'wheat' && !b.draft) {
    const xs = shape.map((p) => p.x);
    const ys = shape.map((p) => p.y);
    // Poppies in the headland, thick along the field's edges, a few straying in.
    pen.clipped(shape, () => {
      for (let i = 0; i < 90; i++) {
        const edge = shape[Math.floor(rng() * shape.length)]!;
        const k = rng() < 0.85 ? rng() * 0.08 : rng() * 0.5;
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        pen.dot(edge.x + (cx - edge.x) * k, edge.y + (cy - edge.y) * k, 1.5 + rng(), '#c8322a', 0.85);
      }
    });
  }
}

/** A scarecrow from above: a cross of sticks in an old coat, a straw hat, its shadow long on the crop. */
export function scarecrow(b: Brush, c: Pt, rng: Rng): void {
  const a = (rng() - 0.5) * 0.4;
  const arm = [polar(c, a, -22), polar(c, a, 22)];
  b.line(arm.map((p) => pt(p.x + 26, p.y + 38)), 3, 0.15);
  b.line([pt(c.x + 2, c.y + 4), pt(c.x + 34, c.y + 52)], 2, 0.15);
  b.stroke(arm, 2.6, 0.9, '#6a4a30');
  const coat = turnedBox(c, 22, 14, a, 4);
  b.body(coat, '#4a6a8a', 0.8);
  b.edge(coat, 0.8, 0.85);
  const hat = oval(c.x - 1, c.y - 1, 9, 9, 16);
  b.cast(hat, 6, 0.2);
  b.body(hat, '#d9b862', 0.85);
  b.line(closed(oval(c.x - 1, c.y - 1, 4.5, 4.5, 12)), 0.5, 0.7);
  b.edge(hat, 0.8, 0.9);
  for (const p of arm) for (let k = 0; k < 4; k++) b.line([p, polar(p, rng() * TAU, 4)], 0.5, 0.8, '#a5823a');
}

/** Rows of vegetables over a plot: cabbages, then feathery carrot tops, then a bean wigwam. */
export function vegRows(b: Brush, x0: number, y0: number, x1: number, y1: number, rng: Rng): void {
  let row = 0;
  for (let y = y0 + 18; y < y1 - 10; y += 26, row++) {
    const kind = row % 3;
    for (let x = x0 + 16 + (row % 2) * 8; x < x1 - 12; x += kind === 0 ? 22 : 14) {
      if (kind === 0) rosette(b, pt(x, y), 8 + rng() * 2, rng);
      else if (kind === 1) for (let k = 0; k < 5; k++) b.line([pt(x, y + 3), polar(pt(x, y + 3), -Math.PI / 2 + (k - 2) * 0.4, 7)], 0.5, 0.75, '#4f7a3a');
      else bush(b, pt(x, y), 5.5, rng, '#5f8f4e', rng() < 0.4 ? '#f2efe6' : null);
    }
  }
}

/** A hedgerow along a polyline: a chain of overlapping bushes, now and then a tree standing out of it. */
export function hedgerow(b: Brush, pts: readonly Pt[], rng: Rng, r = 13): void {
  const spots: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const z = pts[i + 1]!;
    const n = Math.max(1, Math.round(Math.hypot(z.x - a.x, z.y - a.y) / (r * 1.3)));
    for (let k = 0; k < n; k++) spots.push(pt(a.x + ((z.x - a.x) * k) / n + (rng() - 0.5) * 4, a.y + ((z.y - a.y) * k) / n + (rng() - 0.5) * 4));
  }
  const shapes = spots.map((p) => scalloped(p, r * (0.8 + rng() * 0.4), 6, rng, 0.2));
  for (const s of shapes) b.cast(s, r * 0.7, 0.1);
  for (const s of shapes) b.body(s, mix('#5f8f4e', '#3f6b3a', rng() * 0.5), 0.62);
  for (const s of shapes) {
    b.shade(s, r * 0.5, '#2f4f2f', 0.3);
    b.line(closed(s).slice(0, 18), 0.55, 0.55);
  }
  for (let i = 0; i < spots.length; i += 3) b.dot(spots[i]!.x + (rng() - 0.5) * r, spots[i]!.y + (rng() - 0.5) * r, 1.6, rng() < 0.5 ? '#f2efe6' : '#c8322a', 0.8);
}

/** A post-and-wire field fence from above: posts every ~38 px with their shadows, two strands of wire. */
export function wireFence(b: Brush, pts: readonly Pt[]): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const z = pts[i + 1]!;
    b.line([a, z], 0.6, 0.6);
    b.line([pt(a.x + 1.5, a.y + 1.5), pt(z.x + 1.5, z.y + 1.5)], 0.4, 0.35);
    const n = Math.max(1, Math.round(Math.hypot(z.x - a.x, z.y - a.y) / 38));
    for (let k = 0; k <= n; k++) {
      const p = pt(a.x + ((z.x - a.x) * k) / n, a.y + ((z.y - a.y) * k) / n);
      const top = oval(p.x, p.y, 2.8, 2.8, 8);
      b.cast(top, 8, 0.15);
      b.body(top, '#8a6440', 0.85);
      b.edge(top, 0.6, 0.9);
    }
  }
}
