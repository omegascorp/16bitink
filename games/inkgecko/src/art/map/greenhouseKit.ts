import type { Rng } from '../../logic/rng';
import { bezier, closed, type Draw, oval, pt, TAU } from '../kit';
import { LEAF, MOSS, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxPts, turnedBox } from './band';
import { castShadow, shrub } from './flora';

/**
 * The glasshouse's furniture and fabric as the map paints them, in world
 * px: slatted staging benches with pots and seed trays, the water butt,
 * the vine trained under the roof, a lemon in its tub, cold frames, and the
 * glasshouse's low brick walls with their white glazing frames and doors.
 */
export const WOOD = '#c49a66';
export const TERRACOTTA = '#c06a43';
export const FRAME = '#f4f1e8';
export const GLASS = '#cfe2e4';
const SOIL = '#6b4a33';
const SPROUT = '#7fae55';
const GRAPE = '#6a4a8c';
const LEMON = '#e8c840';
export const BLOOM_POTS = ['#d0607a', '#c23f56', '#f2efe6', '#9b86c4', '#e6b34a'] as const;
/** Half a doorway's opening, as the garden gate's. */
export const DOOR_OPEN = 42;
/** The low wall's width, seen from above. */
export const WALL = 14;

/** Plants a pot may hold. */
export type PotPlant = 'seedlings' | 'bloom' | 'fern' | 'empty';

/** A terracotta pot from above: its rim, the soil, and what grows in it. */
export function pot(d: Draw, c: Pt, r: number, rng: Rng, plant: PotPlant): void {
  const { pen } = d;
  const rim = oval(c.x, c.y, r, r, 18);
  castShadow(d, rim, r * 0.5, 0.14);
  pen.fill(rim, PAPER_FILL, 1);
  pen.fill(rim, TERRACOTTA, 0.62);
  const inner = oval(c.x, c.y, r * 0.76, r * 0.76, 16);
  pen.fill(inner, plant === 'empty' ? mix(TERRACOTTA, d.ink, 0.45) : SOIL, 0.6);
  pen.crescent(rim, pt(-r * 0.2, -r * 0.3), () => pen.fill(rim, mix(TERRACOTTA, d.ink, 0.4), 0.3));
  pen.hair(closed(rim), 0.7, d.ink, 0.8);
  if (plant === 'seedlings') {
    for (let i = 0; i < 3; i++) {
      const a = rng() * TAU;
      const s = pt(c.x + Math.cos(a) * r * 0.35, c.y + Math.sin(a) * r * 0.35);
      sprout(d, s, 2.6 + rng() * 1.2, rng() * TAU);
    }
  } else if (plant === 'bloom') {
    shrub(d, pt(c.x - 1, c.y - 1.5), r * 0.95, rng, BLOOM_POTS[Math.floor(rng() * BLOOM_POTS.length)]!);
  } else if (plant === 'fern') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rng() * 0.4;
      const tip = pt(c.x + Math.cos(a) * r * 1.25, c.y + Math.sin(a) * r * 1.25);
      pen.hair(bezier(c, pt((c.x + tip.x) / 2 + Math.sin(a) * 2, (c.y + tip.y) / 2 - Math.cos(a) * 2), tip, 5), 1.6, mix(LEAF, '#ffffff', 0.15), 0.8);
      pen.hair([c, tip], 0.4, d.ink, 0.45);
    }
  }
}

/** A seedling's first pair of leaves. */
function sprout(d: Draw, c: Pt, s: number, ang: number): void {
  for (const k of [0, Math.PI]) {
    const a = ang + k;
    d.pen.fill(oval(c.x + Math.cos(a) * s * 0.8, c.y + Math.sin(a) * s * 0.8, s, s * 0.55, 8).map((p) => rot(p, c, a)), SPROUT, 0.85);
  }
  d.pen.dot(c.x, c.y, 0.6, d.ink, 0.5);
}

/** p turned about c by a (for shapes laid out unturned). */
function rot(p: Pt, c: Pt, a: number): Pt {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return pt(c.x + dx * Math.cos(a) - dy * Math.sin(a), c.y + dx * Math.sin(a) + dy * Math.cos(a));
}

/** A wooden seed tray, rows of seedlings pricked out in it. */
export function seedTray(d: Draw, c: Pt, w: number, h: number, rng: Rng): void {
  const { pen } = d;
  const tray = boxPts(c.x - w / 2, c.y - h / 2, c.x + w / 2, c.y + h / 2, 8);
  castShadow(d, tray, 5, 0.14);
  pen.fill(tray, PAPER_FILL, 1);
  pen.fill(tray, mix(WOOD, '#d8c3a0', 0.4), 0.6);
  const soil = boxPts(c.x - w / 2 + 3.5, c.y - h / 2 + 3.5, c.x + w / 2 - 3.5, c.y + h / 2 - 3.5, 8);
  pen.fill(soil, SOIL, 0.55);
  const cols = Math.max(2, Math.floor((w - 8) / 9));
  const rows = Math.max(2, Math.floor((h - 8) / 9));
  const full = rng() < 0.3 ? 0.6 : 1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (rng() > full) continue;
      const p = pt(c.x - w / 2 + 4 + ((i + 0.5) * (w - 8)) / cols, c.y - h / 2 + 4 + ((j + 0.5) * (h - 8)) / rows);
      sprout(d, p, 1.8 + rng() * 0.8, rng() * TAU);
    }
  }
  pen.stroke(closed(tray), 0.8, d.ink, 0.8, false);
}

/** A slatted staging bench from above, x0..x1 × y0..y1, its slats running along it, laden with pots and trays. */
export function bench(d: Draw, x0: number, y0: number, x1: number, y1: number, rng: Rng): void {
  const { pen } = d;
  const top = boxPts(x0, y0, x1, y1, 12);
  castShadow(d, top, 16, 0.13);
  pen.fill(top, PAPER_FILL, 1);
  pen.fill(top, WOOD, 0.42);
  for (let x = x0 + 10; x < x1 - 4; x += 10) pen.hair([pt(x, y0 + 2), pt(x + 0.5, (y0 + y1) / 2), pt(x, y1 - 2)], 0.45, mix(WOOD, d.ink, 0.55), 0.5);
  pen.crescent(top, pt(-3, -4.5), () => pen.fill(top, mix(WOOD, d.ink, 0.4), 0.35));
  pen.stroke(closed(top), 1, d.ink, 0.85, false);
  const w = x1 - x0;
  let y = y0 + 12;
  while (y < y1 - 26) {
    const kind = rng();
    if (kind < 0.3 && y + 50 < y1 - 6) {
      seedTray(d, pt((x0 + x1) / 2 + (rng() - 0.5) * 6, y + 22), w - 18 - rng() * 14, 40, rng);
      y += 52;
    } else if (kind < 0.78) {
      const n = Math.max(2, Math.floor((w - 8) / 32));
      const r = 10 + rng() * 2.5;
      const plant: PotPlant = rng() < 0.55 ? 'seedlings' : rng() < 0.6 ? 'bloom' : 'empty';
      for (let i = 0; i < n; i++) if (rng() < 0.88) pot(d, pt(x0 + ((i + 0.5) * w) / n + (rng() - 0.5) * 3, y + r + 1), r, rng, plant);
      y += r * 2 + 8;
    } else {
      const r = 17 + rng() * 4;
      pot(d, pt((x0 + x1) / 2 + (rng() - 0.5) * (w - 2 * r - 12), y + r + 2), r, rng, rng() < 0.6 ? 'bloom' : 'fern');
      y += r * 2 + 10;
    }
    if (rng() < 0.2) y += 12;
  }
}

/** A water butt from above: a staved oak barrel, its iron hoop, dark water with the sky in it. */
export function waterButt(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rim = oval(c.x, c.y, r, r, 30);
  const water = oval(c.x, c.y, r * 0.8, r * 0.8, 26);
  castShadow(d, rim, r * 0.6, 0.16);
  pen.fill(rim, PAPER_FILL, 1);
  pen.fill(rim, mix(WOOD, '#7a5636', 0.35), 0.7);
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * TAU;
    pen.hair([pt(c.x + Math.cos(a) * r * 0.8, c.y + Math.sin(a) * r * 0.8), pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r)], 0.4, d.ink, 0.5);
  }
  pen.fill(water, '#3f6f86', 0.65);
  pen.crescent(water, pt(4, 6), () => pen.fill(water, '#2c4f5c', 0.4));
  pen.hair(oval(c.x - r * 0.15, c.y - r * 0.2, r * 0.45, r * 0.22, 16).slice(9, 15), 1.4, PAPER_FILL, 0.7);
  pen.stroke(closed(oval(c.x, c.y, r * 0.92, r * 0.92, 28)), 1.2, '#4a4a52', 0.6, false);
  pen.stroke(closed(water), 0.8, d.ink, 0.7);
  pen.stroke(closed(rim), 1.2, d.ink, 0.85);
}

/** A metal watering can lying by the bench: body, spout and rose, handle. */
export function wateringCan(d: Draw, c: Pt, ang: number): void {
  const { pen } = d;
  const body = turnedBox(c, 34, 22, ang, 6);
  const at = (u: number, v: number): Pt => rot(pt(c.x + u, c.y + v), c, ang);
  castShadow(d, body, 7, 0.14);
  const spout = [at(14, -4), at(40, -14), at(42, -10), at(16, 2)];
  pen.fill(spout, PAPER_FILL, 1);
  pen.fill(spout, '#8fa39a', 0.6);
  pen.hair(closed(spout), 0.6, d.ink, 0.75);
  const rose = oval(at(43, -12).x, at(43, -12).y, 4, 4, 10);
  pen.fill(rose, '#8fa39a', 0.8);
  pen.hair(closed(rose), 0.6, d.ink, 0.8);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, '#8fa39a', 0.6);
  pen.crescent(body, pt(-3, -4), () => pen.fill(body, '#4f6660', 0.35));
  pen.stroke(closed(body), 0.9, d.ink, 0.85, false);
  pen.stroke([at(-12, -2), at(-2, -16), at(10, -2)], 2.2, '#5d6f69', 0.85, false);
}

/** A lemon tree in a square wooden tub, lemons in its crown. */
export function tubTree(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const tub = boxPts(c.x - r * 0.55, c.y - r * 0.55, c.x + r * 0.55, c.y + r * 0.55, 8);
  castShadow(d, tub, 8, 0.15);
  pen.fill(tub, PAPER_FILL, 1);
  pen.fill(tub, '#5f7f86', 0.55);
  pen.stroke(closed(tub), 1, d.ink, 0.8, false);
  shrub(d, pt(c.x - 2, c.y - 3), r, rng, null, mix(LEAF, '#2f5a33', 0.25));
  for (let i = 0; i < 9; i++) {
    const a = rng() * TAU;
    const k = r * (0.3 + rng() * 0.5);
    const p = pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k);
    const fruit = oval(p.x, p.y, 3.6, 2.8, 10).map((q) => rot(q, p, a));
    pen.fill(fruit, LEMON, 0.95);
    pen.hair(closed(fruit), 0.45, d.ink, 0.6);
    pen.dot(p.x - 1, p.y - 1, 0.7, PAPER_FILL, 0.8);
  }
}

/** A cold frame on the grass: a low timber box, its glazed lid catching the light. */
export function coldFrame(d: Draw, c: Pt, w: number, h: number, rng: Rng): void {
  const { pen } = d;
  const box = boxPts(c.x - w / 2, c.y - h / 2, c.x + w / 2, c.y + h / 2, 10);
  castShadow(d, box, 10, 0.15);
  pen.fill(box, PAPER_FILL, 1);
  pen.fill(box, WOOD, 0.55);
  const lights = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < lights; i++) {
    const lx0 = c.x - w / 2 + 5 + (i * (w - 10)) / lights + 2;
    const lx1 = c.x - w / 2 + 5 + ((i + 1) * (w - 10)) / lights - 2;
    const pane = boxPts(lx0, c.y - h / 2 + 5, lx1, c.y + h / 2 - 5, 8);
    pen.fill(pane, GLASS, 0.75);
    pen.clipped(pane, () => {
      for (let k = 0; k < 6; k++) {
        const p = pt(lx0 + rng() * (lx1 - lx0), c.y + (rng() - 0.5) * h * 0.6);
        sprout(d, p, 2.4, rng() * TAU);
      }
      pen.fill([pt(lx0, c.y + h / 2), pt(lx0 + 14, c.y - h / 2), pt(lx0 + 24, c.y - h / 2), pt(lx0 + 10, c.y + h / 2)], PAPER_FILL, 0.55);
    });
    pen.hair(closed(pane), 0.6, d.ink, 0.6);
  }
  pen.stroke(closed(box), 1, d.ink, 0.85, false);
}

/** A stack of upturned pots, the top one's base hole showing. */
export function potStack(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rim = oval(c.x, c.y, r, r, 18);
  castShadow(d, rim, r * 0.9, 0.16);
  for (const k of [1, 0.86, 0.72]) {
    const ring = oval(c.x - (1 - k) * 6, c.y - (1 - k) * 9, r * k, r * k, 18);
    pen.fill(ring, PAPER_FILL, 1);
    pen.fill(ring, TERRACOTTA, 0.6);
    pen.crescent(ring, pt(-2, -3), () => pen.fill(ring, mix(TERRACOTTA, d.ink, 0.4), 0.3));
    pen.hair(closed(ring), 0.7, d.ink, 0.8);
  }
  pen.dot(c.x - r * 0.28 * 6 / r, c.y - r * 0.28 * 9 / r, r * 0.16, d.ink, 0.6);
}

/** A run of the vine trained under the roof: its rod, broad lobed leaves either side, and bunches of grapes hanging below. */
export function vineRun(d: Draw, spine: readonly Pt[], rng: Rng): void {
  const { pen } = d;
  pen.stroke(spine.map((p) => pt(p.x + 6, p.y + 9)), 4, d.ink, 0.1, false);
  pen.stroke(spine, 3.2, '#7a5636', 0.85, false);
  pen.hair(spine, 0.6, d.ink, 0.8);
  const bunches: Pt[] = [];
  for (let i = 1; i < spine.length - 1; i += 1) {
    const p = spine[i]!;
    for (const side of [-1, 1]) {
      if (rng() < 0.15) continue;
      const c = pt(p.x + side * (16 + rng() * 24), p.y + (rng() - 0.5) * 26);
      const r = 17 + rng() * 7;
      pen.hair([p, c], 0.8, '#7a5636', 0.7);
      vineLeaf(d, c, r, rng);
      if (rng() < 0.22) bunches.push(pt(c.x - side * 4, c.y + r * 0.7));
    }
  }
  for (const b of bunches) grapes(d, b, rng);
}

/** A vine leaf: five lobes, veins from the stalk, lit on its upper left. */
function vineLeaf(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  // Five pointed lobes with deep bays between them, the stalk's notch at the bottom.
  const turn = rng() * TAU;
  const shape = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * TAU;
    const lobe = Math.abs(Math.cos(a * 2.5)) ** 1.6;
    const notch = 1 - 0.35 * Math.max(0, Math.cos(a - Math.PI / 2)) ** 12;
    const k = r * (0.58 + 0.42 * lobe) * notch;
    return pt(c.x + Math.cos(a + turn) * k, c.y + Math.sin(a + turn) * k);
  });
  castShadow(d, shape, 6, 0.1);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(LEAF, MOSS, rng() * 0.6), 0.65);
  pen.crescent(shape, pt(-r * 0.25, -r * 0.35), () => pen.fill(shape, '#3f6b3a', 0.3));
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU + rng() * 0.3;
    pen.hair([c, pt(c.x + Math.cos(a) * r * 0.7, c.y + Math.sin(a) * r * 0.7)], 0.35, d.ink, 0.35);
  }
  pen.hair(closed(shape), 0.55, d.ink, 0.6);
}

/** A bunch of grapes hanging down: a tapering cluster of dark round berries, each with its glint. */
function grapes(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const colour = rng() < 0.7 ? GRAPE : '#a3b35a';
  const rows = [4, 4, 3, 3, 2, 1];
  rows.forEach((n, j) => {
    for (let i = 0; i < n; i++) {
      const p = pt(c.x + (i - (n - 1) / 2) * 4.6 + (rng() - 0.5) * 1.2, c.y + j * 4.2);
      pen.dot(p.x + 1.2, p.y + 1.8, 2.5, d.ink, 0.12);
      pen.dot(p.x, p.y, 2.5, colour, 0.9);
      pen.dot(p.x - 0.8, p.y - 0.9, 0.7, PAPER_FILL, 0.75);
    }
  });
}

