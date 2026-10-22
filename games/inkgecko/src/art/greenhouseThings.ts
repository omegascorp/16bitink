import type { Rng } from '../logic/rng';
import { arc, blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, oval, pt, shade, TAU } from './kit';
import { LEAF, PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix } from './wash';

/**
 * The greenhouse's furniture, seen from above: terracotta pots and what grows
 * in them, seed trays, trailing tomato vines, a watering can and a cast-iron
 * grating. Board coordinates; each takes the rng it draws its variety from.
 */
export const TERRACOTTA = '#c4704b';
const TERRA_DEEP = '#8c4430';
const SOIL = '#5e4636';
const SEEDLING = '#8fbd58';
const TOMATO_LEAF = '#5f8f45';
const TOMATO = '#d4462f';
const TOMATO_GREEN = '#9fb54e';
const GERANIUM = '#d9533f';
const ZINC = '#a3aea9';
const IRON = '#4b4e57';
const RUST = '#9b5b36';
const DARK = '#1d1f2b';

/** What grows in a pot. */
export type Planting = 'seedlings' | 'geranium' | 'tomato' | 'basil' | 'empty';

/** Soil seen in a pot or tray: dark, crumbly, a little lighter where it's dry. */
function soil(d: Draw, shape: readonly Pt[], rng: Rng): void {
  const { pen } = d;
  pen.fill(shape, SOIL, 0.82);
  pen.stipple(shape, 50, () => 0.7, 0.7, mix(SOIL, '#c9a77f', 0.5));
  pen.stipple(shape, 30, () => 0.6, 0.5, DARK);
  if (rng() < 0.5) pen.fill(shape.map((p, i) => pt(p.x + (i % 3) * 0.3, p.y)), '#7d6450', 0.15);
}

/** A pair of seed leaves (cotyledons) at c, opened along `a`. */
function cotyledons(d: Draw, c: Pt, s: number, a: number): void {
  const { pen } = d;
  for (const side of [0, Math.PI]) {
    const tip = polar(c, a + side, s);
    const leaf = [...arc(c, tip, s * 0.32, 5), ...arc(tip, c, s * 0.32, 5).slice(1)];
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, SEEDLING, 0.8);
    pen.hair(closed(leaf), 0.45, d.ink, 0.7);
  }
  pen.dot(c.x, c.y, 0.9, mix(SEEDLING, d.ink, 0.5), 0.8);
}

/** A rounded leaf with a midrib, from base along angle a. */
function leaf(d: Draw, base: Pt, a: number, len: number, wide: number, colour: string, rng: Rng, serrate = 0): void {
  const { pen } = d;
  const tip = polar(base, a, len);
  const side = (s: number): Pt[] => {
    const pts = arc(base, tip, s * wide * len * 0.5, 8);
    return serrate > 0 ? pts.map((p, i) => (i % 2 === 1 ? polar(p, a + (s * Math.PI) / 2, serrate) : p)) : pts;
  };
  const shape = [...side(1), ...side(-1).reverse().slice(1)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(colour, '#c3cf6a', rng() * 0.3), 0.75);
  pen.crescent(shape, pt(-SHADOW.x * wide * len * 0.2, -SHADOW.y * wide * len * 0.2), () => pen.fill(shape, mix(colour, d.ink, 0.45), 0.35));
  pen.hair([base, polar(base, a, len * 0.85)], 0.4, mix(colour, d.ink, 0.6), 0.6);
  pen.hair(closed(shape), 0.5, d.ink, 0.7);
}

/** A tomato, whole and glossy, with its green star of a calyx. */
export function tomato(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const ripe = rng();
  const colour = ripe < 0.65 ? TOMATO : mix(TOMATO_GREEN, TOMATO, ripe - 0.4);
  const shape = blob(c, r, r * 0.95, rng, 0.05, 18);
  castShadow(d, shape, r * 0.4, 0.15);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, colour, 0.85);
  pen.crescent(shape, pt(-SHADOW.x * r * 0.35, -SHADOW.y * r * 0.35), () => pen.fill(shape, mix(colour, d.ink, 0.5), 0.4));
  pen.fill(oval(c.x - r * 0.35, c.y - r * 0.35, r * 0.28, r * 0.2, 10), PAPER_FILL, 0.8);
  for (let k = 0; k < 5; k++) pen.hair([c, polar(c, (k / 5) * TAU + ripe, r * 0.45)], 0.8, '#4f7a34', 0.9);
  pen.hair(closed(shape), 0.6, d.ink, 0.8);
}

/** A tomato leaf: a midrib with paired serrated leaflets and one at the tip. */
function tomatoLeaf(d: Draw, base: Pt, a: number, len: number, rng: Rng): void {
  const tip = polar(base, a, len);
  for (const t of [0.35, 0.68]) {
    const at = pt(base.x + (tip.x - base.x) * t, base.y + (tip.y - base.y) * t);
    for (const s of [1, -1]) leaf(d, at, a + s * (0.9 + rng() * 0.3), len * 0.42, 0.45, TOMATO_LEAF, rng, 0.8);
  }
  d.pen.hair([base, tip], 0.6, mix(TOMATO_LEAF, d.ink, 0.5), 0.75);
  leaf(d, tip, a + (rng() - 0.5) * 0.4, len * 0.45, 0.45, TOMATO_LEAF, rng, 0.8);
}

/** A trailing tomato vine along `stem` (a polyline): leaves alternating, a truss or two of fruit. */
export function tomatoVine(d: Draw, stem: readonly Pt[], rng: Rng): void {
  const { pen } = d;
  pen.stroke(stem.map((p) => pt(p.x + 2, p.y + 3)), 3, d.ink, 0.1, false);
  pen.stroke(stem, 3.2, mix(TOMATO_LEAF, '#8a9a4a', 0.4), 0.9, false);
  pen.hair(stem, 0.6, d.ink, 0.7);
  for (let i = 2, k = 0; i < stem.length - 1; i += 2 + Math.floor(rng() * 2), k++) {
    const p = stem[i]!;
    const q = stem[i + 1]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x) + (k % 2 === 0 ? 1 : -1) * (0.8 + rng() * 0.5);
    tomatoLeaf(d, p, a, 30 + rng() * 14, rng);
    if (rng() < 0.35) {
      const c = polar(p, a + (k % 2 === 0 ? -1.4 : 1.4), 9);
      for (let f = 0; f < 3 + Math.floor(rng() * 2); f++) tomato(d, polar(c, f * 2.1 + rng(), 4 + f * 1.5), 4.5 + rng() * 1.8, rng);
    }
  }
}

/** A terracotta pot of radius r at c seen from above: rim, inner wall, soil and what grows in it. */
export function pot(d: Draw, c: Pt, r: number, rng: Rng, planting: Planting): void {
  const { pen } = d;
  const outer = blob(c, r, r, rng, 0.015, 36);
  castShadow(d, outer, r * 0.35, 0.18);
  body(d, outer, mix(TERRACOTTA, '#d79a6c', rng() * 0.4), 0.78);
  // White bloom of old salts on some.
  if (rng() < 0.5) pen.clipped(outer, () => pen.stipple(outer, 40, () => 0.5, 0.7, '#f1e6d2'));
  pen.crescent(outer, pt(SHADOW.x * r * 0.18, SHADOW.y * r * 0.18), () => pen.fill(outer, PAPER_FILL, 0.35));
  pen.crescent(outer, pt(-SHADOW.x * r * 0.2, -SHADOW.y * r * 0.2), () => pen.fill(outer, TERRA_DEEP, 0.35));
  shade(d, outer, 0.3);
  const inner = oval(c.x, c.y, r * 0.8, r * 0.8, 30);
  pen.fill(inner, mix(TERRACOTTA, TERRA_DEEP, 0.4), 0.75);
  // Inside, the wall nearer the light is the one in shade.
  pen.crescent(inner, pt(SHADOW.x * r * 0.25, SHADOW.y * r * 0.25), () => pen.fill(inner, DARK, 0.3));
  pen.hair(closed(inner), 0.7, d.ink, 0.75);
  if (planting === 'empty') {
    const floor = oval(c.x + r * 0.08, c.y + r * 0.1, r * 0.45, r * 0.45, 20);
    pen.fill(floor, mix(TERRACOTTA, DARK, 0.45), 0.6);
    pen.fill(oval(c.x + r * 0.08, c.y + r * 0.1, r * 0.1, r * 0.1, 10), DARK, 0.8);
  } else {
    const earth = oval(c.x, c.y, r * 0.68, r * 0.68, 26);
    soil(d, earth, rng);
    pen.crescent(earth, pt(SHADOW.x * r * 0.2, SHADOW.y * r * 0.2), () => pen.fill(earth, DARK, 0.3));
  }
  pen.stroke(closed(outer), 1.1, d.ink, 0.9);
  plant(d, c, r, rng, planting);
}

/** What grows in a pot of radius r at c. */
function plant(d: Draw, c: Pt, r: number, rng: Rng, planting: Planting): void {
  const { pen } = d;
  if (planting === 'seedlings') {
    for (let k = 0; k < 4 + Math.floor(rng() * 3); k++) cotyledons(d, polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.45), 3.5 + rng() * 2.5, rng() * TAU);
  } else if (planting === 'basil') {
    for (let k = 0; k < 7; k++) leaf(d, polar(c, k * 0.9, r * 0.12), k * 0.9 + rng() * 0.3, r * (0.55 + rng() * 0.25), 0.45, mix(LEAF, '#7fb34a', 0.6), rng);
  } else if (planting === 'geranium') {
    const leaves = Array.from({ length: 9 }, (_, k) => polar(c, k * 2.4 + rng(), r * (0.25 + rng() * 0.75)));
    for (const p of leaves) {
      const lr = r * (0.32 + rng() * 0.12);
      const shape = blob(p, lr, lr, rng, 0.06, 24).map((q, i) => (i % 2 ? polar(q, Math.atan2(q.y - p.y, q.x - p.x), -1.2) : q));
      castShadow(d, shape, 2.5, 0.12);
      pen.fill(shape, PAPER_FILL, 1);
      pen.fill(shape, mix(LEAF, '#6f9b3e', rng()), 0.75);
      pen.stroke(closed(oval(p.x, p.y, lr * 0.55, lr * 0.55, 16)), lr * 0.22, '#6b4a2a', 0.25, false);
      pen.crescent(shape, pt(-lr * 0.3, -lr * 0.4), () => pen.fill(shape, mix(LEAF, d.ink, 0.4), 0.3));
      pen.hair(closed(shape), 0.5, d.ink, 0.7);
    }
    for (let k = 0; k < 2; k++) {
      const head = polar(c, rng() * TAU, r * 0.4 * rng());
      for (let f = 0; f < 9; f++) {
        const fp = polar(head, rng() * TAU, Math.sqrt(rng()) * r * 0.32);
        pen.fill(oval(fp.x, fp.y, 2.6, 2.6, 8), PAPER_FILL, 1);
        pen.fill(oval(fp.x, fp.y, 2.6, 2.6, 8), GERANIUM, 0.9);
        pen.hair(closed(oval(fp.x, fp.y, 2.6, 2.6, 8)), 0.35, d.ink, 0.6);
      }
    }
  } else if (planting === 'tomato') {
    for (let k = 0; k < 5; k++) tomatoLeaf(d, polar(c, k * 1.26, r * 0.1), k * 1.26 + rng() * 0.4, r * (0.9 + rng() * 0.4), rng);
    pen.dot(c.x, c.y, 2.2, mix(TOMATO_LEAF, d.ink, 0.4), 0.9);
  }
}

/** A wooden seed tray: a w × h box (rotated by `turn`) of soil in cells, a seedling in most. */
export function seedTray(d: Draw, c: Pt, w: number, h: number, turn: number, rng: Rng): void {
  const { pen } = d;
  const u = pt(Math.cos(turn), Math.sin(turn));
  const at = (x: number, y: number): Pt => pt(c.x + u.x * x - u.y * y, c.y + u.y * x + u.x * y);
  const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)];
  const box = rect(-w / 2, -h / 2, w / 2, h / 2);
  castShadow(d, box, 6, 0.18);
  body(d, box, '#b8946a', 0.6);
  const bed = rect(-w / 2 + 4, -h / 2 + 4, w / 2 - 4, h / 2 - 4);
  soil(d, bed, rng);
  pen.crescent(bed, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(bed, DARK, 0.3));
  const cols = Math.max(2, Math.round((w - 8) / 15));
  const rows = Math.max(2, Math.round((h - 8) / 15));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (rng() < 0.15) continue;
      const p = at(-w / 2 + 4 + ((i + 0.5) * (w - 8)) / cols, -h / 2 + 4 + ((j + 0.5) * (h - 8)) / rows);
      cotyledons(d, p, 3 + rng() * 2, rng() * TAU);
    }
  }
  pen.stroke(outline(box), 1, d.ink, 0.85);
  pen.hair(outline(bed), 0.5, d.ink, 0.6);
}

/** A galvanised watering can of length ~len at c, its spout pointing along `turn`. */
export function wateringCan(d: Draw, c: Pt, len: number, turn: number, rng: Rng): void {
  const { pen } = d;
  const u = pt(Math.cos(turn), Math.sin(turn));
  // Centred on its footprint: tank back at −0.6·len, rose at +0.6·len.
  const at = (x: number, y: number): Pt => pt(c.x + u.x * (x - len * 0.15) - u.y * y, c.y + u.y * (x - len * 0.15) + u.x * y);
  const rx = len * 0.32;
  const ry = len * 0.24;
  const tank = Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * TAU;
    const sq = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.7;
    const sy = Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** 0.8;
    return at(-len * 0.12 + sq * rx, sy * ry);
  });
  // The spout, from low on the front of the tank, and its rose.
  const spout = [at(len * 0.12, -ry * 0.25), at(len * 0.62, -ry * 0.1), at(len * 0.62, ry * 0.06), at(len * 0.12, ry * 0.3)];
  const rose = oval(at(len * 0.66, 0).x, at(len * 0.66, 0).y, len * 0.09, len * 0.09, 18);
  for (const s of [tank, spout, rose]) castShadow(d, s, 9, 0.16);
  body(d, spout, ZINC, 0.75);
  pen.crescent(spout, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(spout, mix(ZINC, d.ink, 0.5), 0.35));
  pen.stroke(outline(spout), 0.9, d.ink, 0.85, false);
  body(d, rose, mix(ZINC, '#c9a25e', 0.3), 0.8);
  for (let k = 0; k < 12; k++) {
    const p = polar(at(len * 0.66, 0), rng() * TAU, Math.sqrt(rng()) * len * 0.065);
    pen.dot(p.x, p.y, 0.6, DARK, 0.7);
  }
  pen.stroke(closed(rose), 0.9, d.ink, 0.9, false);
  body(d, tank, ZINC, 0.75);
  pen.clipped(tank, () => {
    // Seams round the tank and the soft sheen of zinc.
    for (const k of [0.45, 0.8]) pen.hair(closed(tank.map((p) => pt(c.x + (p.x - c.x) * k + u.x * len * 0.12 * (1 - k) * -1, c.y + (p.y - c.y) * k + u.y * len * 0.12 * (1 - k) * -1))), 0.5, d.ink, 0.35);
    pen.stipple(tank, 60, () => 0.5, 0.6, mix(ZINC, '#6f7a76', 0.6));
  });
  pen.crescent(tank, pt(SHADOW.x * ry * 0.3, SHADOW.y * ry * 0.3), () => pen.fill(tank, PAPER_FILL, 0.35));
  pen.crescent(tank, pt(-SHADOW.x * ry * 0.35, -SHADOW.y * ry * 0.35), () => pen.fill(tank, mix(ZINC, d.ink, 0.5), 0.35));
  shade(d, tank, 0.3);
  // The filling hole at the back, and the handle arching over the top.
  const mouth = oval(at(-len * 0.28, 0).x, at(-len * 0.28, 0).y, ry * 0.42, ry * 0.42, 16);
  pen.fill(mouth, '#3f5a66', 0.85);
  pen.hair([at(-len * 0.31, -ry * 0.15), at(-len * 0.25, -ry * 0.1)], 0.8, PAPER_FILL, 0.7);
  pen.stroke(closed(mouth), 0.9, d.ink, 0.9, false);
  const handle = [at(-len * 0.38, -2.5), at(len * 0.12, -2.5), at(len * 0.12, 2.5), at(-len * 0.38, 2.5)];
  castShadow(d, handle, 6, 0.2);
  body(d, handle, mix(ZINC, PAPER_FILL, 0.2), 0.7);
  pen.stroke(outline(handle, 3), 0.9, d.ink, 0.9, false);
  pen.stroke(closed(tank), 1.2, d.ink, 0.9);
}

/** A cast-iron floor grating over a heating trench: a w × h frame of ornamental openings, rusting. */
export function grating(d: Draw, x0: number, y0: number, w: number, h: number, rng: Rng): void {
  const { pen } = d;
  const frame = [pt(x0, y0), pt(x0 + w, y0), pt(x0 + w, y0 + h), pt(x0, y0 + h)];
  body(d, frame, IRON, 0.8);
  pen.clipped(frame, () => {
    pen.stipple(frame, Math.round((w * h) / 30), () => 0.6, 0.8, RUST);
    const cell = 13;
    for (let x = x0 + 7; x + cell - 3 < x0 + w - 6; x += cell) {
      for (let y = y0 + 7; y + cell - 3 < y0 + h - 6; y += cell) {
        const hc = pt(x + (cell - 3) / 2, y + (cell - 3) / 2);
        const hole = Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * TAU;
          // A squircle: a square opening with rounded corners, as cast.
          const k = (cell - 5) / 2 / (Math.abs(Math.cos(a)) ** 4 + Math.abs(Math.sin(a)) ** 4) ** 0.25;
          return pt(hc.x + Math.cos(a) * k, hc.y + Math.sin(a) * k);
        });
        pen.fill(hole, DARK, 0.9);
        pen.hair(closed(hole).slice(6, 11), 0.5, PAPER_FILL, 0.35);
      }
    }
    for (let k = 0; k < 3; k++) pen.fill(oval(x0 + rng() * w, y0 + rng() * h, 10 + rng() * 20, 5 + rng() * 9, 14), RUST, 0.25);
  });
  pen.stroke(outline([pt(x0 + 4, y0 + 4), pt(x0 + w - 4, y0 + 4), pt(x0 + w - 4, y0 + h - 4), pt(x0 + 4, y0 + h - 4)]), 0.6, PAPER_FILL, 0.3, false);
  pen.stroke(outline(frame), 1.2, d.ink, 0.95);
}
