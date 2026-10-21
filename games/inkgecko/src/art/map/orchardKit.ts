import type { Rng } from '../../logic/rng';
import { bezier, closed, type Draw, oval, pt, TAU } from '../kit';
import { LEAF, MOSS, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxPts, turnedBox } from './band';
import { castShadow, scalloped } from './flora';

/**
 * The orchard's trees and things as the map paints them, in world px:
 * apple, pear and plum crowns from above with their fruit, a ladder
 * leaning into one, wicker baskets and a crate of picked fruit, and a
 * white beehive (only the box: no bees are drawn).
 */
export type FruitKind = 'apple' | 'pear' | 'plum';

interface Species {
  readonly leaf: string;
  /** Crown's height over its width: pears grow taller, plums rounder and smaller. */
  readonly tall: number;
  readonly fruit: readonly string[];
}

const SPECIES: Readonly<Record<FruitKind, Species>> = {
  apple: { leaf: mix(LEAF, MOSS, 0.35), tall: 1, fruit: ['#c8392f', '#d65a3a', '#b8302c', '#e0a43a'] },
  pear: { leaf: mix(LEAF, '#2f5a33', 0.3), tall: 1.14, fruit: ['#c7c457', '#b9b84a', '#d6c25a'] },
  plum: { leaf: mix(LEAF, '#4f6f5a', 0.4), tall: 0.95, fruit: ['#5b3f7a', '#6a4686', '#7a3f6a'] },
};
const DEEP_LEAF = '#3f6b3a';
const WICKER = '#c09a5c';
const WOOD = '#b98f5c';
const HIVE = '#f1ede2';

const squash = (shape: readonly Pt[], c: Pt, k: number): Pt[] => shape.map((p) => pt(p.x, c.y + (p.y - c.y) * k));

/** One fruit from above: an apple's round with its blush, a pear's teardrop, a plum's oval with its bloom. */
export function fruit(d: Draw, c: Pt, kind: FruitKind, colour: string, s: number, ang: number): void {
  const { pen } = d;
  let shape: Pt[];
  if (kind === 'pear') {
    const dir = pt(Math.cos(ang), Math.sin(ang));
    const at = (a: number, b: number): Pt => pt(c.x + dir.x * a * s - dir.y * b * s, c.y + dir.y * a * s + dir.x * b * s);
    shape = [...bezier(at(-0.9, 0), at(-0.9, 1.2), at(0.9, 0.5), 8), ...bezier(at(0.9, 0.5), at(1.3, 0), at(0.9, -0.5), 4).slice(1), ...bezier(at(0.9, -0.5), at(-0.9, -1.2), at(-0.9, 0), 8).slice(1)];
  } else shape = oval(c.x, c.y, s * (kind === 'plum' ? 1.15 : 1), s * (kind === 'plum' ? 0.88 : 1), 12).map((p) => rotAbout(p, c, ang));
  pen.fill(shape.map((p) => pt(p.x + s * 0.4, p.y + s * 0.6)), d.ink, 0.14);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, colour, 0.88);
  pen.crescent(shape, pt(-s * 0.3, -s * 0.45), () => pen.fill(shape, d.ink, 0.22));
  if (kind === 'apple') pen.dot(c.x + s * 0.25, c.y - s * 0.1, s * 0.4, '#e8c050', 0.35);
  pen.dot(c.x - s * 0.35, c.y - s * 0.4, Math.max(0.6, s * 0.22), PAPER_FILL, kind === 'plum' ? 0.5 : 0.8);
  pen.hair(closed(shape), 0.45, d.ink, 0.65);
}

function rotAbout(p: Pt, c: Pt, a: number): Pt {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return pt(c.x + dx * Math.cos(a) - dy * Math.sin(a), c.y + dx * Math.sin(a) + dy * Math.cos(a));
}

/** A fruit tree's crown from above: lobed foliage lit at the upper left, its shadow pooled on the grass, fruit among the leaves. */
export function fruitTree(d: Draw, c: Pt, r: number, kind: FruitKind, rng: Rng): void {
  const { pen } = d;
  const sp = SPECIES[kind];
  const crown = squash(scalloped(c, r, 10, rng, 0.12), c, sp.tall);
  const shadow = crown.map((p) => pt(p.x + r * 0.26, p.y + r * 0.4));
  pen.fill(shadow, DEEP_LEAF, 0.14);
  pen.fill(shadow, d.ink, 0.06);
  pen.fill(crown, PAPER_FILL, 1);
  pen.fill(crown, sp.leaf, 0.6);
  const lobes = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * TAU + rng();
    const k = r * (0.32 + rng() * 0.25);
    return { p: pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k * sp.tall), r: r * (0.36 + rng() * 0.14) };
  });
  for (const l of lobes) {
    const s = scalloped(l.p, l.r, 7, rng, 0.14);
    pen.fill(s, mix(sp.leaf, MOSS, rng() * 0.5), 0.26);
    pen.crescent(s, pt(-l.r * 0.35, -l.r * 0.5), () => pen.fill(s, DEEP_LEAF, 0.28));
    pen.hair(closed(s).slice(4, 22), 0.5, d.ink, 0.32);
  }
  for (const l of lobes) pen.fill(scalloped(pt(l.p.x - l.r * 0.25, l.p.y - l.r * 0.35), l.r * 0.42, 5, rng, 0.2), mix(MOSS, '#ffffff', 0.35), 0.32);
  pen.crescent(crown, pt(-r * 0.25, -r * 0.38), () => pen.hatch(crown, 4.2, 0.9, 0.5, { color: d.ink, alpha: 0.2 }));
  // Leaf ticks, then the fruit, more of it on the sunny side.
  for (let i = 0; i < Math.round(r / 3); i++) {
    const a = rng() * TAU;
    const k = r * Math.sqrt(rng()) * 0.88;
    const p = pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k * sp.tall);
    const b = rng() * TAU;
    pen.hair([pt(p.x + Math.cos(b) * 3.5, p.y + Math.sin(b) * 3.5), p, pt(p.x + Math.cos(b + 1.1) * 3.5, p.y + Math.sin(b + 1.1) * 3.5)], 0.4, d.ink, 0.38);
  }
  const n = Math.round(r / (kind === 'plum' ? 3.4 : 4.4));
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU;
    const k = r * (0.2 + Math.sqrt(rng()) * 0.68);
    const p = pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k * sp.tall);
    const s = kind === 'plum' ? 3.2 + rng() * 0.8 : 3.8 + rng() * 1.3;
    fruit(d, p, kind, sp.fruit[Math.floor(rng() * sp.fruit.length)]!, s, rng() * TAU);
  }
  pen.stroke(closed(crown), 1.15, d.ink, 0.75);
}

/** A wooden picking ladder from above, its foot on the grass and its top lost in a crown: two rails, flat rungs, its shadow. */
export function ladder(d: Draw, foot: Pt, top: Pt): void {
  const { pen } = d;
  const len = Math.hypot(top.x - foot.x, top.y - foot.y) || 1;
  const u = pt((top.x - foot.x) / len, (top.y - foot.y) / len);
  const n = pt(-u.y, u.x);
  const at = (t: number, w: number): Pt => pt(foot.x + u.x * len * t + n.x * w, foot.y + u.y * len * t + n.y * w);
  const half = (t: number): number => 17 - 6 * t;
  const outline = [at(0, -half(0) - 3), at(1, -half(1) - 3), at(1, half(1) + 3), at(0, half(0) + 3)];
  pen.fill(outline.map((p) => pt(p.x + 18, p.y + 26)), d.ink, 0.1);
  const pale = mix(WOOD, '#ffffff', 0.25);
  for (let t = 0.07; t < 0.97; t += 0.12) {
    const rung = [at(t - 0.018, -half(t)), at(t + 0.018, -half(t)), at(t + 0.018, half(t)), at(t - 0.018, half(t))];
    pen.fill(rung, PAPER_FILL, 1);
    pen.fill(rung, pale, 0.9);
    pen.hair(closed(rung), 0.5, d.ink, 0.75);
  }
  for (const side of [-1, 1]) {
    const rail = [at(0, side * (half(0) - 2.5)), at(1, side * (half(1) - 2.5)), at(1, side * (half(1) + 2.5)), at(0, side * (half(0) + 2.5))];
    pen.fill(rail, PAPER_FILL, 1);
    pen.fill(rail, WOOD, 0.85);
    pen.crescent(rail, pt(-1.5, -2), () => pen.fill(rail, d.ink, 0.25));
    pen.stroke(closed(rail), 0.8, d.ink, 0.85, false);
  }
}

/** A round wicker basket heaped with fresh fruit, its handle arched over. */
export function basket(d: Draw, c: Pt, r: number, kind: FruitKind, rng: Rng): void {
  const { pen } = d;
  const rim = oval(c.x, c.y, r, r * 0.92, 26);
  castShadow(d, rim, r * 0.5, 0.15);
  pen.fill(rim, PAPER_FILL, 1);
  pen.fill(rim, WICKER, 0.7);
  pen.clipped(rim, () => {
    for (let k = 0; k < 26; k++) {
      const a = (k / 26) * TAU;
      pen.hair([pt(c.x + Math.cos(a) * r * 0.8, c.y + Math.sin(a) * r * 0.74), pt(c.x + Math.cos(a + 0.12) * r, c.y + Math.sin(a + 0.12) * r * 0.92)], 0.5, mix(WICKER, d.ink, 0.5), 0.55);
    }
  });
  const inner = oval(c.x, c.y, r * 0.8, r * 0.74, 22);
  pen.fill(inner, mix(WICKER, d.ink, 0.35), 0.5);
  const sp = SPECIES[kind];
  const s = kind === 'plum' ? 3.6 : 4.6;
  for (let ring = 0; ring < 3; ring++) {
    const rr = r * 0.62 * (1 - ring / 3);
    const m = ring === 2 ? 1 : Math.max(3, Math.floor((TAU * rr) / (s * 2.1)));
    for (let k = 0; k < m; k++) {
      const a = (k / m) * TAU + ring * 0.4;
      fruit(d, pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.92), kind, sp.fruit[Math.floor(rng() * sp.fruit.length)]!, s, rng() * TAU);
    }
  }
  pen.stroke(closed(rim), 1, d.ink, 0.85);
  const handle = bezier(pt(c.x - r * 0.95, c.y + r * 0.1), pt(c.x - r * 0.2, c.y - r * 0.7), pt(c.x + r * 0.95, c.y - r * 0.1), 12);
  pen.stroke(handle.map((p) => pt(p.x + 5, p.y + 8)), 2.4, d.ink, 0.1, false);
  pen.stroke(handle, 3, WICKER, 0.95, false);
  pen.hair(handle, 0.7, d.ink, 0.8);
}

/** A slatted wooden crate of fruit. */
export function crate(d: Draw, c: Pt, rot: number, kind: FruitKind, rng: Rng): void {
  const { pen } = d;
  const w = 58;
  const h = 40;
  const box = turnedBox(c, w, h, rot, 8);
  castShadow(d, box, 9, 0.16);
  pen.fill(box, PAPER_FILL, 1);
  pen.fill(box, WOOD, 0.6);
  const inner = turnedBox(c, w - 8, h - 8, rot, 8);
  pen.fill(inner, mix(WOOD, d.ink, 0.4), 0.45);
  const sp = SPECIES[kind];
  const s = kind === 'plum' ? 3.6 : 4.4;
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 5; i++) {
      const u = (i - 2) * (w - 12) / 5;
      const v = (j - 1) * (h - 12) / 3;
      const p = pt(c.x + u * Math.cos(rot) - v * Math.sin(rot) + (rng() - 0.5) * 1.5, c.y + u * Math.sin(rot) + v * Math.cos(rot) + (rng() - 0.5) * 1.5);
      fruit(d, p, kind, sp.fruit[Math.floor(rng() * sp.fruit.length)]!, s, rng() * TAU);
    }
  }
  pen.stroke(closed(inner), 0.6, d.ink, 0.6, false);
  pen.stroke(closed(box), 1, d.ink, 0.85, false);
}

/** A white WBC beehive from above: its stepped lifts and gabled roof, a landing board at the front. Only the box. */
export function hive(d: Draw, c: Pt): void {
  const { pen } = d;
  const outer = boxPts(c.x - 26, c.y - 26, c.x + 26, c.y + 26, 8);
  castShadow(d, outer, 20, 0.16);
  const board = boxPts(c.x - 14, c.y + 26, c.x + 14, c.y + 34, 6);
  pen.fill(board, PAPER_FILL, 1);
  pen.fill(board, WOOD, 0.55);
  pen.hair(closed(board), 0.6, d.ink, 0.75);
  pen.fill(outer, PAPER_FILL, 1);
  pen.fill(outer, HIVE, 0.9);
  const roof = boxPts(c.x - 21, c.y - 21, c.x + 21, c.y + 21, 8);
  pen.fill([pt(c.x, c.y - 21), pt(c.x + 21, c.y - 21), pt(c.x + 21, c.y + 21), pt(c.x, c.y + 21)], '#8f8676', 0.32);
  pen.stroke(closed(roof), 0.8, d.ink, 0.7, false);
  pen.stroke([pt(c.x, c.y - 23), pt(c.x, c.y + 23)], 1, d.ink, 0.8, false);
  pen.stroke(closed(outer), 1.1, d.ink, 0.85, false);
}

/**
 * A clipped hedge across x0..x1 at y, `deep` from front to back: dense
 * small leaves, lit along its top, its shadow on the grass below.
 */
export function hedge(d: Draw, x0: number, x1: number, y: number, deep: number, rng: Rng): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let x = x0; x <= x1; x += 8) {
    top.push(pt(x, y - deep / 2 + Math.sin(x / 9 + rng()) * 1.6));
    bot.push(pt(x, y + deep / 2 + Math.sin(x / 11 + rng()) * 1.8));
  }
  const body = [...top, ...[...bot].reverse()];
  pen.fill(body.map((p) => pt(p.x + 10, p.y + 15)), d.ink, 0.14);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(LEAF, '#2f5a33', 0.35), 0.66);
  // Leaf texture in two tones, batched.
  const lit = new Path2D();
  const dark = new Path2D();
  for (let x = x0 + 3; x < x1 - 2; x += 5) {
    for (let k = 0; k < 4; k++) {
      const yy = y - deep / 2 + 3 + rng() * (deep - 6);
      const r = 1.6 + rng() * 1.8;
      const p = (yy - (y - deep / 2)) / deep < 0.45 && rng() < 0.75 ? lit : dark;
      const px = x + (rng() - 0.5) * 4;
      p.moveTo(px + r, yy);
      p.ellipse(px, yy, r, r * 0.8, 0, 0, TAU);
    }
  }
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = mix(MOSS, '#ffffff', 0.25);
  ctx.fill(lit);
  ctx.fillStyle = '#2f4f2c';
  ctx.globalAlpha = 0.28;
  ctx.fill(dark);
  ctx.restore();
  pen.crescent(body, pt(0, -deep * 0.4), () => pen.fill(body, '#2f4f2c', 0.25));
  pen.stroke(top, 1, d.ink, 0.7, false);
  pen.stroke(bot, 1.2, d.ink, 0.8, false);
  for (const x of [x0, x1]) pen.stroke([pt(x, y - deep / 2), pt(x + (x === x0 ? -3 : 3), y), pt(x, y + deep / 2)], 1, d.ink, 0.8, false);
}
