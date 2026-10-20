import type { Rng } from '../../logic/rng';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { PENCIL } from './common';
import { scalloped } from './flora';

/**
 * Pencil sketching for the chapters still being drawn: outlines traced
 * once firmly and partly again, left unfinished where the hand stopped,
 * light construction lines run past the corners, shadow sides hatched.
 * Each item takes its centre, a size and how finished it is (0..1).
 */
export type Sketch = (d: Draw, c: Pt, s: number, rng: Rng, done: number) => void;

/** A closed outline, pencilled: the first `done` of it firm, the rest a ghost, part of it traced again. */
export function outline(d: Draw, shape: readonly Pt[], done: number, alpha = 0.85): void {
  const ring = closed(shape);
  const cut = Math.max(2, Math.floor(ring.length * done));
  d.pen.stroke(ring.slice(0, cut + 1), 0.95, PENCIL, alpha);
  if (cut < ring.length - 1) d.pen.hair(ring.slice(cut), 0.4, PENCIL, alpha * 0.3);
  d.pen.hair(ring.slice(0, Math.floor(ring.length * 0.45)).map((p) => pt(p.x + 1.3, p.y - 0.9)), 0.45, PENCIL, alpha * 0.45);
}

/** Hatching on the side of a shape away from the light. */
export function pencilShade(d: Draw, shape: readonly Pt[], k: number, alpha = 0.42): void {
  d.pen.crescent(shape, pt(-0.55 * k, -0.84 * k), () => d.pen.hatch(shape, 3.4, 0.9, 0.4, { color: PENCIL, alpha }));
}

export function line(d: Draw, a: Pt, b: Pt, alpha = 0.65, w = 0.7): void {
  d.pen.hair([a, pt((a.x + b.x) / 2, (a.y + b.y) / 2), b], w, PENCIL, alpha);
}

/** A light ruled line run on past both ends, as when laying something out. */
export function construction(d: Draw, a: Pt, b: Pt, over = 30): void {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const u = pt((b.x - a.x) / l, (b.y - a.y) / l);
  line(d, pt(a.x - u.x * over, a.y - u.y * over), pt(b.x + u.x * over, b.y + u.y * over), 0.2, 0.45);
}

/** A soft rub of graphite where the shading has been blocked in with the side of the lead. */
export function smudge(d: Draw, c: Pt, rx: number, ry: number, rng: Rng): void {
  d.pen.fill(scalloped(c, 1, 7, rng, 0.25).map((p) => pt(c.x + (p.x - c.x) * rx, c.y + (p.y - c.y) * ry)), PENCIL, 0.07);
}

/** A dimension line with end ticks, as on a plan being laid out. */
export function dimension(d: Draw, a: Pt, b: Pt): void {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const n = pt((-(b.y - a.y) / l) * 5, ((b.x - a.x) / l) * 5);
  line(d, a, b, 0.35, 0.45);
  for (const p of [a, b]) line(d, pt(p.x - n.x, p.y - n.y), pt(p.x + n.x, p.y + n.y), 0.45, 0.5);
}

/** `item` repeated in a loose grid: an orchard's rows, an allotment's beds. */
export function grid(item: Sketch, cols: number, rowsN: number, gap: number, size: number): Sketch {
  return (d, c, _s, rng, done) => {
    let k = 0;
    for (let j = 0; j < rowsN; j++) {
      for (let i = 0; i < cols; i++, k++) {
        if (k / (cols * rowsN) > done + 0.2) return;
        const p = pt(c.x + (i - (cols - 1) / 2) * gap + (rng() - 0.5) * gap * 0.12, c.y + (j - (rowsN - 1) / 2) * gap + (rng() - 0.5) * gap * 0.12);
        item(d, p, size * (0.85 + rng() * 0.3), rng, k / (cols * rowsN) < done ? 1 : 0.5);
      }
    }
  };
}

/** A rectangle w × h turned by `rot`, as points every few px along its sides. */
export function rect(c: Pt, w: number, h: number, rot = 0): Pt[] {
  const corners = [pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2)];
  const out: Pt[] = [];
  corners.forEach((p, i) => {
    const q = corners[(i + 1) % 4]!;
    const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 10));
    for (let k = 0; k < n; k++) out.push(pt(p.x + ((q.x - p.x) * k) / n, p.y + ((q.y - p.y) * k) / n));
  });
  return out.map((p) => pt(c.x + p.x * Math.cos(rot) - p.y * Math.sin(rot), c.y + p.x * Math.sin(rot) + p.y * Math.cos(rot)));
}

/** A point in a rectangle's own frame (u, v in -0.5..0.5 of w and h), turned by `rot`. */
const local = (c: Pt, w: number, h: number, rot: number) => (u: number, v: number): Pt =>
  pt(c.x + u * w * Math.cos(rot) - v * h * Math.sin(rot), c.y + u * w * Math.sin(rot) + v * h * Math.cos(rot));

/** A building's roof from above: its outline, ridge, courses of tiles or planks, the shadow side hatched. */
export const roof: Sketch = (d, c, s, rng, done) => {
  const rot = (rng() - 0.5) * 0.3;
  const w = s * 2;
  const h = s * 1.2;
  const shape = rect(c, w, h, rot);
  const at = local(c, w, h, rot);
  smudge(d, pt(c.x + w * 0.12, c.y + h * 0.3), w * 0.55, h * 0.45, rng);
  dimension(d, at(-0.5, 0.5 + 22 / h), at(0.5, 0.5 + 22 / h));
  construction(d, at(-0.5, -0.5), at(0.5, -0.5));
  construction(d, at(-0.5, -0.5), at(-0.5, 0.5));
  outline(d, shape, done);
  line(d, at(-0.5, 0), at(0.5, 0), 0.6, 0.7);
  for (let u = -0.42; u < -0.5 + done; u += 0.08) line(d, at(u, -0.48), at(u, 0.48), 0.3, 0.45);
  pencilShade(d, rect(at(0, 0.25), w, h / 2, rot), h * 0.5, 0.28);
};

/** Glazing: a greenhouse from above, its ridge and the bars of its panes, a door at one end. */
export const glasshouse: Sketch = (d, c, s, rng, done) => {
  const rot = (rng() - 0.5) * 0.2;
  const w = s * 2.3;
  const h = s * 1.1;
  const at = local(c, w, h, rot);
  smudge(d, pt(c.x + w * 0.1, c.y + h * 0.3), w * 0.55, h * 0.5, rng);
  dimension(d, at(-0.5, -0.5 - 20 / h), at(0.5, -0.5 - 20 / h));
  construction(d, at(-0.5, -0.5), at(0.5, -0.5), 50);
  outline(d, rect(c, w, h, rot), done);
  line(d, at(-0.5, 0), at(0.5, 0), 0.6, 0.7);
  for (let u = -0.4; u < 0.5; u += 0.1) if (u < -0.5 + done + 0.1) line(d, at(u, -0.5), at(u, 0.5), 0.35, 0.45);
  outline(d, rect(at(0.5 + 6 / w, 0), 12, h * 0.3, rot), 1, 0.5);
  d.pen.hatch(rect(at(0.25, 0.25), w * 0.5, h * 0.5, rot), 6, -0.6, 0.35, { color: PENCIL, alpha: 0.18 });
};

/** A crown seen from above: a scalloped round, a trunk, its shadow hatched. */
export const crown: Sketch = (d, c, s, rng, done) => {
  const shape = scalloped(c, s, 9, rng, 0.14);
  smudge(d, pt(c.x + s * 0.3, c.y + s * 0.45), s * 0.9, s * 0.6, rng);
  outline(d, shape, done);
  pencilShade(d, shape, s * 0.5);
  d.pen.dot(c.x, c.y, 1.6, PENCIL, 0.6);
  for (let i = 0; i < 4; i++) {
    const p = pt(c.x + (rng() - 0.5) * s, c.y + (rng() - 0.5) * s);
    d.pen.hair(closed(scalloped(p, s * 0.25, 5, rng, 0.2)).slice(0, 18), 0.4, PENCIL, 0.3);
  }
};

/** A bush or cushion plant: a small scalloped round, lightly shaded. */
export const bush: Sketch = (d, c, s, rng, done) => {
  const shape = scalloped(c, s, 6, rng, 0.2);
  outline(d, shape, done, 0.55);
  pencilShade(d, shape, s * 0.4, 0.25);
};

/** A rock: a faceted lump, its far facets hatched. */
export const boulder: Sketch = (d, c, s, rng, done) => {
  const shape = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * TAU + rng() * 0.4;
    const r = s * (0.75 + rng() * 0.35);
    return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.8);
  });
  outline(d, shape, done);
  line(d, shape[1]!, pt(c.x + s * 0.1, c.y), 0.4);
  line(d, pt(c.x + s * 0.1, c.y), shape[5]!, 0.4);
  pencilShade(d, shape, s * 0.6, 0.38);
};

/** A ring with something inside: a pot, a water butt, a hay bale, a cart wheel. */
export function rounds(inner: 'pot' | 'spiral' | 'spokes' | 'lid'): Sketch {
  return (d, c, s, _rng, done) => {
    const shape = oval(c.x, c.y, s, s, 28);
    outline(d, shape, done);
    if (inner === 'pot') d.pen.hair(closed(oval(c.x, c.y, s * 0.75, s * 0.75, 22)), 0.45, PENCIL, 0.4);
    if (inner === 'lid') line(d, pt(c.x - s * 0.7, c.y - s * 0.2), pt(c.x + s * 0.7, c.y + s * 0.2), 0.4);
    if (inner === 'spiral') d.pen.hair(Array.from({ length: 40 }, (_, k) => pt(c.x + Math.cos(k * 0.5) * s * (k / 44), c.y + Math.sin(k * 0.5) * s * (k / 44))), 0.45, PENCIL, 0.4);
    if (inner === 'spokes') {
      for (let k = 0; k < 8; k++) line(d, c, pt(c.x + Math.cos((k / 8) * TAU) * s * 0.92, c.y + Math.sin((k / 8) * TAU) * s * 0.92), 0.4);
      d.pen.hair(closed(oval(c.x, c.y, s * 0.18, s * 0.18, 10)), 0.5, PENCIL, 0.5);
    }
    pencilShade(d, shape, s * 0.45, 0.25);
  };
}

/** A few of `item` scattered round c. */
export function cluster(item: Sketch, n: number, size: number): Sketch {
  return (d, c, s, rng, done) => {
    for (let i = 0; i < n; i++) item(d, pt(c.x + (rng() - 0.5) * s * 2, c.y + (rng() - 0.5) * s * 1.4), size * (0.7 + rng() * 0.5), rng, Math.min(1, done + rng() * 0.3));
  };
}

/** A planted bed: an oblong with rows of seedlings marked in. */
export const rows: Sketch = (d, c, s, rng, done) => {
  const rot = (rng() - 0.5) * 0.2;
  const w = s * 2;
  const h = s * 0.9;
  const at = local(c, w, h, rot);
  outline(d, rect(c, w, h, rot), done);
  for (let v = -0.3; v <= 0.31; v += 0.2) {
    for (let u = -0.42; u < -0.5 + done; u += 0.07) {
      const p = at(u, v);
      line(d, pt(p.x - 2, p.y - 2), pt(p.x + 2, p.y + 2), 0.45, 0.5);
      line(d, pt(p.x + 2, p.y - 2), pt(p.x - 2, p.y + 2), 0.45, 0.5);
    }
  }
};

/** A wigwam of bean poles from above: a ring of feet tied at the middle. */
export const wigwam: Sketch = (d, c, s, rng) => {
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + rng() * 0.2;
    const p = pt(c.x + Math.cos(a) * s, c.y + Math.sin(a) * s);
    line(d, p, c, 0.55, 0.6);
    d.pen.dot(p.x, p.y, 1.4, PENCIL, 0.6);
  }
};

/** A flower from above: a centre and a ring of petal loops. */
export function flower(petals: number): Sketch {
  return (d, c, s, rng, done) => {
    for (let k = 0; k < Math.ceil(petals * Math.max(0.5, done)); k++) {
      const a = (k / petals) * TAU + rng() * 0.2;
      const tip = pt(c.x + Math.cos(a) * s, c.y + Math.sin(a) * s);
      const n = pt(-Math.sin(a) * s * 0.3, Math.cos(a) * s * 0.3);
      d.pen.hair([c, pt((c.x + tip.x) / 2 + n.x, (c.y + tip.y) / 2 + n.y), tip, pt((c.x + tip.x) / 2 - n.x, (c.y + tip.y) / 2 - n.y), c], 0.45, PENCIL, 0.55);
    }
    d.pen.hair(closed(oval(c.x, c.y, s * 0.2, s * 0.2, 10)), 0.5, PENCIL, 0.6);
  };
}

/** Grass tufts: little fans of strokes. */
export const tufts: Sketch = (d, c, s, rng) => {
  for (let i = 0; i < 4; i++) {
    const p = pt(c.x + (rng() - 0.5) * s * 2, c.y + (rng() - 0.5) * s);
    for (let k = 0; k < 4; k++) {
      const a = -Math.PI / 2 + (k / 3 - 0.5) * 1.3;
      line(d, p, pt(p.x + Math.cos(a) * s * 0.4, p.y + Math.sin(a) * s * 0.4), 0.45, 0.5);
    }
  }
};

/** A broken wall: its two faces ruled, gaps where it has fallen, the blocks' joints marked here and there. */
export const ruinWall: Sketch = (d, c, s, rng, done) => {
  const rot = (rng() - 0.5) * 0.5;
  const at = local(c, s * 2.4, 18, rot);
  for (let u = -0.5; u < -0.5 + done; u += 0.18) {
    if (rng() < 0.25) continue;
    const u1 = Math.min(0.5, u + 0.14 + rng() * 0.04);
    line(d, at(u, -0.5), at(u1, -0.5), 0.6, 0.7);
    line(d, at(u, 0.5), at(u1, 0.5), 0.6, 0.7);
    line(d, at(u1, -0.5), at(u1, 0.5), 0.45);
    d.pen.hatch([at(u, 0.1), at(u1, 0.1), at(u1, 0.5), at(u, 0.5)], 3, 0.9, 0.4, { color: PENCIL, alpha: 0.25 });
  }
};

/** A lantern on a post: a little hexagon in rings of dashed glow. */
export const lantern: Sketch = (d, c, s) => {
  outline(d, Array.from({ length: 6 }, (_, k) => pt(c.x + Math.cos((k / 6) * TAU) * s * 0.35, c.y + Math.sin((k / 6) * TAU) * s * 0.35)), 1);
  for (const r of [0.7, 1]) {
    const ring = oval(c.x, c.y, s * r, s * r, 24);
    for (let k = 0; k < 24; k += 3) d.pen.hair([ring[k]!, ring[k + 1]!], 0.45, PENCIL, 0.35);
  }
};

/** A small star: crossed strokes. */
export const star: Sketch = (d, c, s) => {
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI + 0.2;
    line(d, pt(c.x - Math.cos(a) * s, c.y - Math.sin(a) * s), pt(c.x + Math.cos(a) * s, c.y + Math.sin(a) * s), 0.55, 0.5);
  }
};
