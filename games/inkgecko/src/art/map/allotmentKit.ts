import type { Rng } from '../../logic/rng';
import { bezier, closed, type Draw, oval, pt, ribbon, TAU } from '../kit';
import { LEAF, MOSS, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxPts, turnedBox } from './band';
import { castShadow, scalloped } from './flora';
import type { Bed } from './allotmentCrops';

/**
 * The allotment's sheds and odds as the map paints them, in world px: a
 * felt-roofed timber shed seen from above, a row of three tidy compost
 * bays, a scarecrow in his straw hat, a wheelbarrow of picked vegetables
 * and sunflowers by a shed wall.
 */
const FELT = '#5f6b66';
const TIMBER = '#a7825a';
const SLAT = '#b8956a';
const COMPOST = '#5a4030';
const CANE = '#c7a76a';
const BED_TIMBER = '#9c7a52';

/** A pointed leaf from `base` towards `ang`, len long and w wide. */
export function leafShape(base: Pt, ang: number, len: number, w: number): Pt[] {
  const d = pt(Math.cos(ang), Math.sin(ang));
  const n = pt(-d.y, d.x);
  const at = (a: number, b: number): Pt => pt(base.x + d.x * a + n.x * b, base.y + d.y * a + n.y * b);
  return [...bezier(at(0, 0), at(len * 0.45, w), at(len, 0), 6), ...bezier(at(len, 0), at(len * 0.45, -w), at(0, 0), 6).slice(1)];
}


/** Paints a shed's walls may wear. */
export const SHED_PAINT = ['#a7825a', '#7f9c8a', '#7a8fa8', '#b38a5e'] as const;

/**
 * A garden shed from above, w × h overall, centred on c, its ridge running
 * across and its front drawn a little from the front, like the walls: two
 * slopes of roofing felt (the upper one lit), barge boards at the gables,
 * a gutter, and below the eave the boarded front with its door and window.
 */
export function shed(d: Draw, c: Pt, w: number, h: number, paint: string, rng: Rng): void {
  const { pen } = d;
  const FRONT = 26;
  const x0 = c.x - w / 2;
  const x1 = c.x + w / 2;
  const y0 = c.y - h / 2;
  const y1 = c.y + h / 2 - FRONT;
  const ridge = (y0 + y1) / 2 - 4;
  pen.fill(boxPts(x0, y0, x1, y1 + FRONT, 10).map((p) => pt(p.x + 26, p.y + 30)), d.ink, 0.15);
  // The front: shiplap boards, the door (a darker paint) with its latch, a four-pane window.
  const front = boxPts(x0 + 4, y1, x1 - 4, y1 + FRONT, 10);
  pen.fill(front, PAPER_FILL, 1);
  pen.fill(front, paint, 0.75);
  for (let y = y1 + 5; y < y1 + FRONT - 1; y += 5) pen.hair([pt(x0 + 5, y), pt(x1 - 5, y)], 0.4, d.ink, 0.35);
  const dx = x0 + w * (0.22 + rng() * 0.1);
  const door = boxPts(dx, y1 + 2, dx + 26, y1 + FRONT, 6);
  pen.fill(door, mix(paint, '#2f3f4a', 0.45), 0.85);
  for (let x = dx + 6.5; x < dx + 25; x += 6.5) pen.hair([pt(x, y1 + 3), pt(x, y1 + FRONT - 1)], 0.4, d.ink, 0.4);
  pen.hair(closed(door), 0.6, d.ink, 0.85);
  pen.dot(dx + 21, y1 + 15, 1.2, '#d8c27a', 0.95);
  const wx = x1 - w * 0.36;
  const win = boxPts(wx, y1 + 5, wx + 30, y1 + 18, 6);
  pen.fill(win, PAPER_FILL, 1);
  pen.fill(win, '#cfe2e4', 0.8);
  pen.fill([pt(wx + 4, y1 + 18), pt(wx + 12, y1 + 5), pt(wx + 17, y1 + 5), pt(wx + 9, y1 + 18)], PAPER_FILL, 0.7);
  pen.hair([pt(wx + 15, y1 + 5), pt(wx + 15, y1 + 18)], 0.8, '#f4f1e8', 0.95);
  pen.hair([pt(wx, y1 + 11.5), pt(wx + 30, y1 + 11.5)], 0.8, '#f4f1e8', 0.95);
  pen.hair(closed(win), 0.6, d.ink, 0.85);
  pen.crescent(front, pt(0, 4), () => pen.fill(front, d.ink, 0.18));
  pen.stroke(closed(front), 0.9, d.ink, 0.85, false);
  // The roof: felt in strips along the ridge, the upper slope catching the light, moss along the lower eave.
  const roof = boxPts(x0, y0, x1, y1 + 3, 10);
  const upper = boxPts(x0, y0, x1, ridge, 10);
  const lower = boxPts(x0, ridge, x1, y1 + 3, 10);
  pen.fill(roof, PAPER_FILL, 1);
  pen.fill(upper, mix(FELT, '#b8beb0', 0.45), 0.7);
  pen.fill(lower, FELT, 0.82);
  pen.fill(lower, d.ink, 0.1);
  for (let y = y0 + 11; y < y1; y += 11) {
    if (Math.abs(y - ridge) < 5) continue;
    pen.hair([pt(x0 + 3, y), pt(x1 - 3, y + (rng() - 0.5) * 1.5)], 0.45, y < ridge ? '#4d5752' : '#2c3431', 0.55);
  }
  pen.fill(boxPts(x0 + 14 + rng() * (w - 50), ridge + 6, x0 + 34 + rng() * (w - 50), ridge + 13, 6), mix(FELT, '#8a7a6a', 0.4), 0.4);
  for (let k = 0; k < 12; k++) pen.dot(x0 + 6 + rng() * (w - 12), y1 - 3 - rng() * 8, 1.4 + rng() * 2, rng() < 0.5 ? MOSS : LEAF, 0.6);
  pen.stroke([pt(x0 - 2, ridge), pt(x1 + 2, ridge)], 2.6, '#3a4440', 0.9, false);
  pen.hair([pt(x0, ridge - 2), pt(x1, ridge - 2)], 0.5, PAPER_FILL, 0.55);
  for (const x of [x0, x1]) {
    const board = boxPts(x - 3, y0 - 2, x + 3, y1 + 3, 10);
    pen.fill(board, PAPER_FILL, 1);
    pen.fill(board, paint, 0.85);
    pen.stroke(closed(board), 0.7, d.ink, 0.85, false);
  }
  pen.fill(boxPts(x0 - 2, y1 + 1, x1 + 2, y1 + 5, 12), '#4a4a52', 0.7);
  pen.stroke(closed(roof), 1.2, d.ink, 0.9, false);
}

/** A polytunnel from above, its long side across: hoops under the milky sheeting, tomatoes and beans a blur through it, timber end frames, a door at one end. */
export function polytunnel(d: Draw, c: Pt, w: number, h: number, rng: Rng): void {
  const { pen } = d;
  const x0 = c.x - w / 2;
  const x1 = c.x + w / 2;
  const y0 = c.y - h / 2;
  const y1 = c.y + h / 2;
  const body = boxPts(x0, y0, x1, y1, 12);
  pen.fill(body.map((p) => pt(p.x + 20, p.y + 30)), d.ink, 0.13);
  // Where the sheeting is dug into the ground along both sides.
  for (const y of [y0, y1]) pen.fill(boxPts(x0 + 2, y - 3, x1 - 2, y + 3, 12), '#6b4a33', 0.45);
  pen.fill(body, PAPER_FILL, 1);
  pen.clipped(body, () => {
    pen.fill(boxPts(x0, c.y - 9, x1, c.y + 9, 12), mix('#a88a68', PAPER_FILL, 0.2), 0.45);
    for (const side of [-1, 1]) {
      for (let x = x0 + 14; x < x1 - 10; x += 13 + rng() * 6) {
        const p = pt(x, c.y + side * h * (0.27 + rng() * 0.08));
        pen.fill(scalloped(p, 8 + rng() * 4, 5, rng, 0.25), mix(LEAF, '#2f5a33', rng() * 0.4), 0.7);
        if (rng() < 0.55) pen.dot(p.x + (rng() - 0.5) * 8, p.y + (rng() - 0.5) * 6, 2.2, '#d8322e', 0.6);
      }
    }
  });
  // The sheeting: milky over it all, lit along the upper flank, greying towards the lower; its curve shaded.
  pen.fill(body, '#dfe7e2', 0.4);
  pen.fill(boxPts(x0, y0, x1, y0 + h * 0.3, 12), PAPER_FILL, 0.3);
  pen.fill(boxPts(x0, c.y + h * 0.15, x1, y1, 12), '#6f7f80', 0.2);
  pen.fill(boxPts(x0, c.y + h * 0.36, x1, y1, 12), '#4f5f60', 0.16);
  pen.clipped(body, () => pen.hatch(boxPts(x0, c.y + h * 0.25, x1, y1, 12), 3.6, 0.95, 0.4, { color: d.ink, alpha: 0.12 }));
  for (let x = x0 + 30; x < x1 - 14; x += 30) {
    pen.hair([pt(x, y0 + 1), pt(x + 0.6, c.y), pt(x, y1 - 1)], 0.9, '#5f6a6a', 0.45);
    pen.hair([pt(x + 2, y0 + 3), pt(x + 2, c.y - h * 0.12)], 0.8, PAPER_FILL, 0.8);
  }
  pen.hair([pt(x0 + 12, y0 + h * 0.2), pt(x1 - 12, y0 + h * 0.2 + 1)], 1.6, PAPER_FILL, 0.7);
  for (const x of [x0, x1]) {
    const frame = boxPts(x - 3, y0 - 1, x + 3, y1 + 1, 10);
    pen.fill(frame, PAPER_FILL, 1);
    pen.fill(frame, '#a7825a', 0.8);
    pen.stroke(closed(frame), 0.7, d.ink, 0.85, false);
  }
  const door = boxPts(x1 + 3, c.y - 15, x1 + 7, c.y + 15, 6);
  pen.fill(door, mix('#a7825a', d.ink, 0.2), 0.85);
  pen.hair(closed(door), 0.6, d.ink, 0.85);
  pen.stroke([pt(x0, y0), pt(x1, y0)], 0.9, d.ink, 0.75, false);
  pen.stroke([pt(x0, y1), pt(x1, y1)], 1.2, d.ink, 0.85, false);
}

/** Two striped deckchairs set out by a shed, a mug on the grass between them. */
export function deckchairs(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const stripes = [['#d0607a', '#f2efe6'], ['#5b7fc7', '#f2efe6'], ['#e9c23b', '#5f8f4e']][Math.floor(rng() * 3)]!;
  for (const s of [-1, 1]) {
    const a = s * 0.35 + (rng() - 0.5) * 0.2;
    const at = (u: number, v: number): Pt => pt(c.x + s * 24 + u * Math.cos(a) - v * Math.sin(a), c.y + u * Math.sin(a) + v * Math.cos(a));
    const frame = [at(-13, -20), at(13, -20), at(13, 22), at(-13, 22)];
    pen.fill(frame.map((p) => pt(p.x + 9, p.y + 13)), d.ink, 0.12);
    for (let k = 0; k < 5; k++) {
      const u0 = -11 + (k * 22) / 5;
      const strip = [at(u0, -18), at(u0 + 22 / 5, -18), at(u0 + 22 / 5, 16), at(u0, 16)];
      pen.fill(strip, PAPER_FILL, 1);
      pen.fill(strip, stripes[k % 2]!, 0.85);
    }
    pen.crescent([at(-11, -18), at(11, -18), at(11, 16), at(-11, 16)], pt(0, -6), () => pen.fill(frame, d.ink, 0.18));
    for (const u of [-12, 12]) pen.stroke([at(u, -20), at(u, 22)], 2, '#a7825a', 0.95, false);
    pen.stroke([at(-13, 22), at(13, 22)], 2, '#a7825a', 0.95, false);
    pen.hair(closed([at(-11, -18), at(11, -18), at(11, 16), at(-11, 16)]), 0.6, d.ink, 0.8);
  }
  pen.dot(c.x + 1, c.y + 8, 3.6, d.ink, 0.12);
  pen.dot(c.x, c.y + 6, 3.4, '#f4f1e8', 1);
  pen.dot(c.x, c.y + 6, 2.3, '#6a4428', 0.85);
  pen.circle(c.x, c.y + 6, 3.4, 0.5, d.ink);
}

/** Three slatted compost bays in a row, open at the front: fresh clippings, crumbly compost, and straw and leaves. */
export function compostBays(d: Draw, x0: number, y0: number, bay: number, rng: Rng): void {
  const { pen } = d;
  const t = 5;
  const fills = [mix(LEAF, MOSS, 0.4), COMPOST, '#c9a95a'];
  pen.fill(boxPts(x0 + 10, y0 + 14, x0 + bay * 3 + 18, y0 + bay + 14, 12), d.ink, 0.1);
  for (let i = 0; i < 3; i++) {
    const bx = x0 + i * bay;
    const heap = scalloped(pt(bx + bay / 2, y0 + bay / 2 + 4), bay / 2 - t - 1, 7, rng, 0.12);
    pen.fill(heap, PAPER_FILL, 1);
    pen.fill(heap, fills[i]!, i === 1 ? 0.62 : 0.6);
    pen.crescent(heap, pt(-4, -6), () => pen.fill(heap, i === 1 ? '#2f2219' : '#4a5a2a', 0.25));
    pen.clipped(heap, () => {
      for (let k = 0; k < 26; k++) {
        const p = pt(bx + t + rng() * (bay - t * 2), y0 + t + rng() * (bay - t));
        if (i === 1) pen.dot(p.x, p.y, 0.8 + rng(), rng() < 0.5 ? '#2f2219' : '#a08060', 0.6);
        else {
          const a = rng() * TAU;
          pen.hair([p, pt(p.x + Math.cos(a) * 5, p.y + Math.sin(a) * 5)], 0.6, i === 0 ? '#3f6b3a' : '#9a7a3a', 0.6);
        }
      }
    });
    if (i === 2) for (let k = 0; k < 6; k++) pen.fill(leafShape(pt(bx + 8 + rng() * (bay - 16), y0 + 8 + rng() * (bay - 16)), rng() * TAU, 6, 2.5), ['#d3a24c', '#c4733f'][k % 2]!, 0.85);
    pen.hair(closed(heap), 0.5, d.ink, 0.5);
  }
  // The slatted back and dividing walls, drawn over the heaps' edges.
  const walls = [boxPts(x0, y0, x0 + bay * 3, y0 + t, 12)];
  for (let i = 0; i <= 3; i++) walls.push(boxPts(x0 + i * bay - t / 2, y0, x0 + i * bay + t / 2, y0 + bay, 8));
  for (const s of walls) {
    pen.fill(s, PAPER_FILL, 1);
    pen.fill(s, SLAT, 0.8);
    pen.stroke(closed(s), 0.7, d.ink, 0.85, false);
  }
  for (let i = 0; i < 3; i++) for (let k = 1; k < 4; k++) pen.hair([pt(x0 + i * bay + (k * bay) / 4, y0 + 0.5), pt(x0 + i * bay + (k * bay) / 4, y0 + t - 0.5)], 0.4, d.ink, 0.5);
  // A fork laid across the front of the bays.
  const a = pt(x0 + bay * 0.6, y0 + bay + 12);
  const b = pt(x0 + bay * 1.9, y0 + bay + 6);
  pen.stroke([a, b], 2.2, TIMBER, 0.95, false);
  pen.hair([a, b], 0.5, d.ink, 0.7);
  for (let k = -1.5; k <= 1.5; k++) pen.hair([pt(b.x, b.y + k * 2.4), pt(b.x + 14, b.y + k * 2.4 - 1)], 0.8, '#5d6670', 0.95);
}

/**
 * A scarecrow from above, standing tall in a bed: his wide straw hat, an
 * old patched coat over the cross-bar with straw at the cuffs, and the long
 * shadow his height throws.
 */
export function scarecrow(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const arm = 38;
  const coat = rng() < 0.5 ? '#5a6f9a' : '#9a5a4a';
  // The shadow: a cross thrown long down the bed.
  const sh = pt(30, 46);
  pen.stroke([pt(c.x - arm + sh.x, c.y + sh.y), pt(c.x + arm + sh.x, c.y + sh.y)], 7, d.ink, 0.1, false);
  pen.stroke([pt(c.x, c.y), pt(c.x + sh.x * 1.25, c.y + sh.y * 1.25)], 5, d.ink, 0.1, false);
  pen.fill(oval(c.x + sh.x, c.y + sh.y - 3, 13, 11, 16), d.ink, 0.1);
  for (const s of [-1, 1]) {
    const sleeve = ribbon([pt(c.x + s * 6, c.y + 2), pt(c.x + s * arm, c.y + 2 + (rng() - 0.5) * 3)], (u) => 7 - u * 1.5).shape;
    pen.fill(sleeve, PAPER_FILL, 1);
    pen.fill(sleeve, coat, 0.75);
    pen.crescent(sleeve, pt(0, -2.5), () => pen.fill(sleeve, d.ink, 0.25));
    pen.stroke(closed(sleeve), 0.7, d.ink, 0.85, false);
    for (let k = 0; k < 5; k++) {
      const a = (s > 0 ? 0 : Math.PI) + (rng() - 0.5) * 1.4;
      const root = pt(c.x + s * (arm - 1), c.y + 2);
      pen.hair([root, pt(root.x + Math.cos(a) * 7, root.y + Math.sin(a) * 7)], 0.7, '#d9b85a', 0.95);
    }
  }
  const body = oval(c.x, c.y + 4, 11, 8, 14);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, coat, 0.8);
  const patch = boxPts(c.x + 2, c.y + 4, c.x + 8, c.y + 9, 4);
  pen.fill(patch, '#c9a24a', 0.85);
  pen.hair(closed(patch), 0.4, d.ink, 0.7);
  pen.stroke(closed(body), 0.8, d.ink, 0.85, false);
  const brim = scalloped(pt(c.x - 1, c.y - 2), 15, 9, rng, 0.06);
  pen.fill(brim.map((p) => pt(p.x + 3, p.y + 4)), d.ink, 0.15);
  pen.fill(brim, PAPER_FILL, 1);
  pen.fill(brim, '#e2c77a', 0.8);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU;
    pen.hair([pt(c.x - 1 + Math.cos(a) * 8, c.y - 2 + Math.sin(a) * 8), pt(c.x - 1 + Math.cos(a) * 12.5, c.y - 2 + Math.sin(a) * 12.5)], 0.35, '#9a7a3a', 0.6);
  }
  const crown = oval(c.x - 2, c.y - 3.5, 7, 6.5, 14);
  pen.fill(crown, '#d6b866', 0.95);
  pen.stroke(closed(oval(c.x - 2, c.y - 3.5, 7.6, 7.1, 14)), 1.6, '#b23a2a', 0.85, false);
  pen.crescent(crown, pt(-2, -3), () => pen.fill(crown, '#8a6a2a', 0.35));
  pen.hair(closed(crown), 0.5, d.ink, 0.75);
  pen.stroke(closed(brim), 0.8, d.ink, 0.85);
}

/** A wheelbarrow on the path, its tray heaped with the day's picking. */
export function wheelbarrow(d: Draw, c: Pt, ang: number, rng: Rng): void {
  const { pen } = d;
  const cs = Math.cos(ang);
  const sn = Math.sin(ang);
  const at = (u: number, v: number): Pt => pt(c.x + u * cs - v * sn, c.y + u * sn + v * cs);
  const tray = [at(-18, -14), at(16, -17), at(22, 0), at(16, 17), at(-18, 14)];
  pen.fill(tray.map((p) => pt(p.x + 8, p.y + 12)), d.ink, 0.13);
  for (const s of [-1, 1]) {
    const h = [at(-14, s * 10), at(-44, s * 13)];
    pen.stroke(h, 2.6, TIMBER, 0.95, false);
    pen.hair(h, 0.5, d.ink, 0.7);
  }
  const wheel = turnedBox(at(27, 0), 14, 5, ang, 3);
  pen.fill(wheel, '#3a3a40', 0.85);
  pen.hair(closed(wheel), 0.5, d.ink, 0.8);
  pen.fill(tray, PAPER_FILL, 1);
  pen.fill(tray, '#5f8a6a', 0.75);
  const inner = [at(-15, -11), at(14, -13), at(18, 0), at(14, 13), at(-15, 11)];
  pen.fill(inner, '#3f5f4a', 0.55);
  for (let k = 0; k < 6; k++) {
    const p = at(-10 + rng() * 22, (rng() - 0.5) * 18);
    const a = rng() * TAU;
    const root = leafShape(p, a, 9, 2);
    pen.fill(root, '#e07a2a', 0.95);
    pen.hair(closed(root), 0.35, d.ink, 0.6);
    pen.hair([p, pt(p.x - Math.cos(a) * 5, p.y - Math.sin(a) * 5)], 0.8, LEAF, 0.85);
  }
  const cab = scalloped(at(6, 3), 6.5, 6, rng, 0.2);
  pen.fill(cab, '#9fbfa0', 0.95);
  pen.hair(closed(cab), 0.45, d.ink, 0.7);
  pen.stroke(closed(tray), 0.9, d.ink, 0.85, false);
}

/** A sunflower from above, its face to the sky: a ring of yellow petals round the seed disc, two broad leaves below. */
export function sunflower(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  pen.fill(oval(c.x + r * 1.4, c.y + r * 2.1, r * 1.1, r, 14), d.ink, 0.1);
  for (const s of [-1, 1]) {
    const leaf = leafShape(pt(c.x + s * 2, c.y + r * 0.6), Math.PI / 2 + s * 0.9, r * 1.5, r * 0.55);
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, mix(LEAF, MOSS, 0.3), 0.75);
    pen.hair(closed(leaf), 0.45, d.ink, 0.6);
  }
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU + rng() * 0.1;
    const petal = leafShape(pt(c.x + Math.cos(a) * r * 0.45, c.y + Math.sin(a) * r * 0.45), a, r * 0.65, r * 0.17);
    pen.fill(petal, PAPER_FILL, 1);
    pen.fill(petal, '#f0c234', 0.92);
    pen.hair(closed(petal), 0.35, d.ink, 0.5);
  }
  const disc = oval(c.x, c.y, r * 0.5, r * 0.5, 16);
  pen.fill(disc, '#6a4428', 0.95);
  pen.clipped(disc, () => {
    for (let k = 0; k < 14; k++) pen.dot(c.x + (rng() - 0.5) * r * 0.9, c.y + (rng() - 0.5) * r * 0.9, 0.7, '#c99a50', 0.7);
  });
  pen.crescent(disc, pt(-2, -3), () => pen.fill(disc, '#2a1a10', 0.4));
  pen.hair(closed(disc), 0.5, d.ink, 0.8);
  pen.hair(bezier(pt(c.x + r * 0.4, c.y - r * 0.4), pt(c.x + r * 0.55, c.y), pt(c.x + r * 0.3, c.y + r * 0.45), 5), 0.4, PAPER_FILL, 0.5);
}

/** The bed's edging: boards round a raised bed, or the crisp spade-cut edge of a dug one. */
export function edging(d: Draw, b: Bed): void {
  const { pen } = d;
  if (!b.raised) {
    pen.hair(closed(boxPts(b.x0, b.y0, b.x1, b.y1, 14)), 0.6, mix('#5a4030', d.ink, 0.3), 0.45);
    return;
  }
  const t = 5;
  const outer = boxPts(b.x0 - t, b.y0 - t, b.x1 + t, b.y1 + t, 14);
  pen.fill(boxPts(b.x0 - t + 3, b.y1 + t, b.x1 + t + 3, b.y1 + t + 4, 20), d.ink, 0.12);
  for (const s of [boxPts(b.x0 - t, b.y0 - t, b.x1 + t, b.y0, 20), boxPts(b.x0 - t, b.y1, b.x1 + t, b.y1 + t, 20), boxPts(b.x0 - t, b.y0, b.x0, b.y1, 20), boxPts(b.x1, b.y0, b.x1 + t, b.y1, 20)]) {
    pen.fill(s, PAPER_FILL, 1);
    pen.fill(s, BED_TIMBER, 0.62);
  }
  pen.fill(boxPts(b.x0 - t, b.y0 - t, b.x1 + t, b.y0 - t + 2, 20), PAPER_FILL, 0.35);
  pen.stroke(closed(outer), 0.8, d.ink, 0.8, false);
  pen.hair(closed(boxPts(b.x0, b.y0, b.x1, b.y1, 14)), 0.45, d.ink, 0.55);
  for (const [x, y] of [[b.x0 - t / 2, b.y0 - t / 2], [b.x1 + t / 2, b.y0 - t / 2], [b.x0 - t / 2, b.y1 + t / 2], [b.x1 + t / 2, b.y1 + t / 2]] as const) pen.dot(x, y, 1, d.ink, 0.7);
}

/** A net over the bed on corner posts, its mesh drawn fine, sagging a little between. */
export function netting(d: Draw, b: Bed): void {
  const { pen } = d;
  const box = boxPts(b.x0 - 2, b.y0 - 2, b.x1 + 2, b.y1 + 2, 14);
  pen.fill(box.map((p) => pt(p.x + 10, p.y + 14)), d.ink, 0.05);
  pen.clipped(box, () => {
    const ctx = pen.ctx;
    ctx.save();
    ctx.strokeStyle = '#26316a';
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    const span = b.x1 - b.x0 + b.y1 - b.y0;
    for (let k = -span; k < span; k += 7) {
      ctx.moveTo(b.x0 + k, b.y0);
      ctx.lineTo(b.x0 + k + (b.y1 - b.y0), b.y1);
      ctx.moveTo(b.x0 + k, b.y1);
      ctx.lineTo(b.x0 + k + (b.y1 - b.y0), b.y0);
    }
    ctx.stroke();
    ctx.restore();
  });
  pen.fill(box, PAPER_FILL, 0.1);
  pen.hair(closed(box), 0.6, d.ink, 0.5);
  const posts: Pt[] = [pt(b.x0, b.y0), pt(b.x1, b.y0), pt(b.x0, b.y1), pt(b.x1, b.y1)];
  for (let x = b.x0 + 120; x < b.x1 - 60; x += 120) posts.push(pt(x, b.y0), pt(x, b.y1));
  for (const p of posts) {
    pen.dot(p.x + 4, p.y + 6, 3, d.ink, 0.12);
    pen.dot(p.x, p.y, 2.6, CANE, 0.95);
    pen.circle(p.x, p.y, 2.6, 0.5, d.ink);
  }
}
