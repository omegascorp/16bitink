import type { Rng } from '../../logic/rng';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { castShadow, scalloped } from './flora';
import { chamfer } from './paving';

/**
 * The rock garden's stones and alpines as the map paints them, in world
 * px: faceted boulders with lichen and moss, cushions of alpines in
 * flower, dwarf conifers, standing stones, and a dry-stone wall.
 */
export const ALPINE = ['#e59ab4', '#8e6cc0', '#f2efe6', '#e8c64a', '#3d63c9', '#d0607a'] as const;
const WARM = '#cbbfa6';
const COOL = '#b7bab2';
const LICHEN = ['#c9c78a', '#d9a05a', '#e3dfc4'] as const;
const DEEP_LEAF = '#3f6b3a';

/** An irregular rock outline: `n` corners round c, squashed a little top to bottom. */
export function rockShape(c: Pt, r: number, rng: Rng, n = 9, squash = 0.82): Pt[] {
  const ph = rng() * TAU;
  const corners = Array.from({ length: n }, (_, i) => {
    const a = ph + (i / n) * TAU + (rng() - 0.5) * 0.35;
    const k = r * (0.78 + rng() * 0.32);
    return pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k * squash);
  });
  return chamfer(corners, Math.max(2, r * 0.12));
}

/**
 * A boulder from above: a pale lit top facet towards the upper left,
 * shadowed facets falling away to the lower right, cracks, lichen and a
 * little moss at its foot, its shadow on the ground.
 */
export function boulder(d: Draw, c: Pt, r: number, rng: Rng, detail = 1): void {
  const { pen } = d;
  const shape = rockShape(c, r, rng);
  castShadow(d, shape, r * 0.55, 0.16);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(rng() < 0.5 ? WARM : COOL, STONE, rng() * 0.5), 0.74);
  // The lit top: a smaller facet nudged towards the light, its edges ridges.
  const top = shape.map((p) => pt(c.x - r * 0.12 + (p.x - c.x) * 0.55, c.y - r * 0.16 + (p.y - c.y) * 0.55));
  pen.fill(top, PAPER_FILL, 0.3);
  pen.crescent(shape, pt(-r * 0.28, -r * 0.4), () => pen.fill(shape, STONE_DARK, 0.42));
  if (r > 20 && detail > 0.5) pen.crescent(shape, pt(-r * 0.14, -r * 0.2), () => pen.hatch(shape, Math.max(2.6, r / 9), 0.9, 0.5, { color: d.ink, alpha: 0.26 }));
  const step = Math.max(1, Math.floor(top.length / 5));
  for (let i = 0; i < top.length; i += step) {
    const o = shape[i]!;
    if (rng() < 0.45) pen.hair([top[i]!, o], 0.5, d.ink, 0.42);
  }
  pen.hair(closed(top).slice(0, Math.floor(top.length * 0.7)), 0.5, d.ink, 0.38);
  if (rng() < 0.6) {
    const a = rng() * TAU;
    const p = pt(c.x + Math.cos(a) * r * 0.3, c.y + Math.sin(a) * r * 0.25);
    pen.hair([p, pt(p.x + r * 0.25, p.y + (rng() - 0.3) * r * 0.3), pt(p.x + r * 0.45, p.y + (rng() - 0.5) * r * 0.4)], 0.5, d.ink, 0.5);
  }
  if (detail > 0.5) {
    for (let i = 0; i < Math.round(r / 7); i++) {
      const a = rng() * TAU;
      const k = r * Math.sqrt(rng()) * 0.6;
      pen.dot(c.x - r * 0.1 + Math.cos(a) * k, c.y - r * 0.12 + Math.sin(a) * k * 0.8, 1 + rng() * r * 0.05, LICHEN[Math.floor(rng() * LICHEN.length)]!, 0.75);
    }
    for (let i = 0; i < 3; i++) {
      const a = 0.3 + rng() * 1.8;
      pen.dot(c.x + Math.cos(a) * r * 0.82, c.y + Math.sin(a) * r * 0.7, 2 + rng() * 2.5, rng() < 0.5 ? MOSS : LEAF, 0.55);
    }
  }
  pen.stroke(closed(shape), r > 26 ? 1.25 : 0.95, d.ink, 0.85);
}

/** A cushion of alpines: a tight low mound of tiny leaves, starred with flowers. */
export function cushion(d: Draw, c: Pt, r: number, colour: string, rng: Rng): void {
  const { pen } = d;
  const body = scalloped(c, r, Math.max(6, Math.round(r / 3.5)), rng, 0.1);
  castShadow(d, body, r * 0.35, 0.12);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(MOSS, '#6f8f6a', rng() * 0.6), 0.62);
  pen.crescent(body, pt(-r * 0.3, -r * 0.42), () => pen.fill(body, DEEP_LEAF, 0.3));
  const n = Math.round(r * r * 0.09);
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU;
    const k = r * Math.sqrt(rng()) * 0.85;
    const p = pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k);
    pen.dot(p.x, p.y, 1.1 + rng() * 0.8, colour, 0.92);
  }
  for (let i = 0; i < Math.round(n / 4); i++) {
    const a = rng() * TAU;
    const k = r * Math.sqrt(rng()) * 0.7;
    pen.dot(c.x - r * 0.15 + Math.cos(a) * k, c.y - r * 0.2 + Math.sin(a) * k, 0.6, PAPER_FILL, 0.8);
  }
  pen.hair(closed(body), 0.7, d.ink, 0.7);
}

/** A dwarf conifer from above: a dark round of needled sprays radiating from its tip. */
export function conifer(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const body = scalloped(c, r, 12, rng, 0.16);
  castShadow(d, body, r * 0.7, 0.16);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(DEEP_LEAF, '#4f6f5a', rng()), 0.7);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU + rng() * 0.2;
    pen.hair([pt(c.x - r * 0.1, c.y - r * 0.14), pt(c.x + Math.cos(a) * r * 0.9, c.y + Math.sin(a) * r * 0.9)], 0.5, k % 3 === 0 ? mix(MOSS, '#ffffff', 0.3) : d.ink, 0.45);
  }
  pen.crescent(body, pt(-r * 0.3, -r * 0.45), () => pen.fill(body, '#22381f', 0.3));
  pen.stroke(closed(body), 0.9, d.ink, 0.8);
}

/**
 * A standing stone, drawn a little from the front like the walls: an
 * upright slab tapering to a rounded crown, its right side in shadow,
 * lichen on its face, the long shadow its height throws down the slope.
 */
export function standingStone(d: Draw, base: Pt, w: number, h: number, rng: Rng): void {
  const { pen } = d;
  const lean = (rng() - 0.5) * 6;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let k = 0; k <= 8; k++) {
    const u = k / 8;
    const half = (w / 2) * (1 - 0.35 * u ** 1.5) * (1 + (rng() - 0.5) * 0.08);
    const y = base.y - h * u;
    const x = base.x + lean * u;
    left.push(pt(x - half, y));
    right.push(pt(x + half, y));
  }
  const crown = Array.from({ length: 7 }, (_, k) => {
    const a = Math.PI + (k / 6) * Math.PI;
    return pt(base.x + lean + Math.cos(a) * (w / 2) * 0.65, base.y - h + Math.sin(a) * w * 0.22);
  });
  const shape = [...left, ...crown, ...right.reverse()];
  pen.fill([pt(base.x - w / 2, base.y), pt(base.x + w / 2, base.y), pt(base.x + w / 2 + h * 0.55, base.y + h * 0.5), pt(base.x - w / 2 + h * 0.55, base.y + h * 0.55)], d.ink, 0.14);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(COOL, STONE, 0.4), 0.72);
  pen.crescent(shape, pt(-w * 0.35, 0), () => pen.fill(shape, STONE_DARK, 0.45));
  pen.crescent(shape, pt(-w * 0.2, 0), () => pen.hatch(shape, 2.8, 0.9, 0.45, { color: d.ink, alpha: 0.3 }));
  pen.fill(oval(base.x + lean - w * 0.08, base.y - h + w * 0.05, w * 0.28, w * 0.12, 12), PAPER_FILL, 0.5);
  for (let i = 0; i < 7; i++) pen.dot(base.x + (rng() - 0.6) * w * 0.6, base.y - h * (0.15 + rng() * 0.7), 1.2 + rng() * 2, LICHEN[i % LICHEN.length]!, 0.8);
  pen.hair([pt(base.x - w * 0.1, base.y - h * 0.55), pt(base.x + w * 0.05, base.y - h * 0.42), pt(base.x - w * 0.02, base.y - h * 0.3)], 0.5, d.ink, 0.5);
  for (let k = 0; k < 5; k++) pen.dot(base.x + (rng() - 0.5) * w * 1.1, base.y - 1 + rng() * 3, 2 + rng() * 2.5, rng() < 0.5 ? MOSS : LEAF, 0.6);
  pen.stroke(closed(shape), 1.3, d.ink, 0.9);
}

/**
 * A dry-stone wall across x0..x1 with its foot at y, drawn a little from
 * the front like the garden wall: a row of coping stones on edge along its
 * top, two courses of rough stones laid without mortar below, its shadow.
 */
export function dryStoneWall(d: Draw, x0: number, x1: number, y: number, rng: Rng): void {
  const { pen } = d;
  const FACE = 24;
  const COPE = 12;
  const top = y - FACE - COPE;
  pen.fill([pt(x0 + 4, y - 2), pt(x1 + 8, y - 2), pt(x1 + 8, y + 10), pt(x0 + 4, y + 10)], d.ink, 0.12);
  const body = [pt(x0, top + 3), pt(x1, top + 3), pt(x1, y), pt(x0, y)];
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(STONE_DARK, d.ink, 0.25), 0.55);
  for (let r = 0; r < 2; r++) {
    const ya = y - FACE + (r * FACE) / 2;
    const yb = ya + FACE / 2;
    for (let x = x0 - rng() * 14; x < x1 - 3; ) {
      const len = 16 + rng() * 22;
      const xa = Math.max(x0, x);
      const xb = Math.min(x1, x + len);
      if (xb - xa > 4) {
        const s = chamfer([pt(xa + 1, ya + 1 + rng()), pt(xb - 1, ya + 1 + rng()), pt(xb - 1, yb - 1), pt(xa + 1, yb - 1)], 3);
        pen.fill(s, mix(rng() < 0.5 ? WARM : COOL, STONE, rng() * 0.6), 0.85);
        pen.fill(s.map((p) => pt(p.x, Math.max(p.y, (ya + yb) / 2 + 1))), STONE_DARK, 0.25);
        pen.hair(closed(s), 0.5, d.ink, 0.6);
      }
      x += len;
    }
  }
  for (let x = x0 + 1; x < x1 - 3; x += 6 + rng() * 3) {
    const t = 3.4 + rng() * 2;
    const tilt = (rng() - 0.5) * 2;
    const s = [pt(x + tilt, top + rng() * 2), pt(x + t + tilt, top + rng() * 2), pt(x + t, y - FACE), pt(x, y - FACE)];
    pen.fill(s, PAPER_FILL, 1);
    pen.fill(s, mix(COOL, STONE, rng()), 0.8);
    pen.fill(s.map((p) => pt(p.x + t * 0.5, p.y)), STONE_DARK, 0.2);
    pen.hair(closed(s), 0.45, d.ink, 0.6);
  }
  for (let i = 0; i < 2; i++) {
    const cx = x0 + rng() * (x1 - x0);
    for (let k = 0; k < 8; k++) pen.dot(cx + (rng() - 0.5) * 34, y - rng() * (FACE + COPE), 1.8 + rng() * 2, rng() < 0.5 ? MOSS : LEAF, 0.65);
  }
  pen.stroke([pt(x0, top + 1), pt((x0 + x1) / 2, top + 0.5), pt(x1, top + 1)], 1, d.ink, 0.8, false);
  pen.stroke([pt(x0, y), pt((x0 + x1) / 2, y + 0.6), pt(x1, y)], 1.2, d.ink, 0.85, false);
  for (const x of [x0, x1]) pen.hair([pt(x, top), pt(x, y)], 0.9, d.ink, 0.85);
}

/** A tuft of the pool's marginal plants: a fan of narrow leaves. */
export function sedges(d: Draw, c: Pt, s: number, rng: Rng): void {
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i / 6 - 0.5) * 2.2 + (rng() - 0.5) * 0.3;
    const l = s * (0.7 + rng() * 0.5);
    d.pen.stroke([c, pt(c.x + Math.cos(a) * l * 0.5, c.y + Math.sin(a) * l * 0.5), pt(c.x + Math.cos(a) * l, c.y + Math.sin(a) * l)], 1.4, mix(LEAF, '#5e7a3a', 0.5), 0.8, false);
  }
  d.pen.dot(c.x + 2, c.y + 2, s * 0.25, DEEP_LEAF, 0.15);
}
