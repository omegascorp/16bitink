import type { Rng } from '../../logic/rng';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxPts, turnedBox } from './band';
import { castShadow, scalloped } from './flora';

/**
 * The barn's and farmyard's things as the map paints them, in world px:
 * small square bales singly and stacked, a heap of loose hay, the old hay
 * cart with its red wheels, grain sacks, a sleeping cat, hens about the
 * yard, milk churns, the stone trough under its pump, a thatched rick and
 * a log pile.
 */
export const STRAW = '#e2c47c';
const STRAW_DARK = '#a8863e';
const TWINE = '#c0603a';
const CART_RED = '#b5452e';
const CART_WOOD = '#9c8060';
const BURLAP = '#cbb48a';

/** One small square bale, w × h turned by rot: cut straw ends, two strings round it, lit on its upper face. */
export function bale(d: Draw, c: Pt, w: number, h: number, rot: number, rng: Rng, shadow = 0.16): void {
  const { pen } = d;
  const body = turnedBox(c, w, h, rot, 6);
  castShadow(d, body, 12, shadow);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(STRAW, '#cdb06a', rng() * 0.6), 0.85);
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  const at = (u: number, v: number): Pt => pt(c.x + u * cs - v * sn, c.y + u * sn + v * cs);
  pen.clipped(body, () => {
    for (let k = 0; k < Math.round(w / 2.6); k++) {
      const u = -w / 2 + rng() * w;
      const v = -h / 2 + rng() * h;
      pen.hair([at(u, v), at(u + 4 + rng() * 5, v + (rng() - 0.5) * 1.2)], 0.4, STRAW_DARK, 0.55);
    }
  });
  pen.crescent(body, pt(-2.5, -3.5), () => pen.fill(body, STRAW_DARK, 0.4));
  for (const k of [-0.22, 0.22]) pen.hair([at(-w / 2 + 0.5, h * k), at(w / 2 - 0.5, h * k)], 0.75, TWINE, 0.85);
  for (const s of [-1, 1]) pen.hair([at((s * w) / 2, -h / 2 + 1), at((s * w) / 2 + s * 1.2, 0), at((s * w) / 2, h / 2 - 1)], 0.5, STRAW_DARK, 0.8);
  pen.stroke(closed(body), 0.8, d.ink, 0.8, false);
}

/**
 * A stack of bales cols × rows laid in courses, each course stepped back a
 * little from the one below so the stack reads as built up, its shadow
 * thrown long.
 */
export function baleStack(d: Draw, x0: number, y0: number, cols: number, rows: number, courses: number, rng: Rng): void {
  const W = 34;
  const H = 18;
  const pitch = { x: W + 1, y: H + 1 };
  d.pen.fill(boxPts(x0 + 6, y0 + 8, x0 + cols * pitch.x + 4 + courses * 5, y0 + rows * pitch.y + 4 + courses * 7, 12), d.ink, 0.1);
  for (let l = 0; l < courses; l++) {
    const cut = l;
    for (let j = cut; j < rows; j++) {
      for (let i = 0; i < cols - Math.floor(cut / 2); i++) {
        if (l === courses - 1 && rng() < 0.12) continue;
        const odd = (j + l) % 2 === 0 ? 0 : 0.5;
        if (i + odd + 1 > cols) continue;
        const c = pt(x0 + (i + odd + 0.5) * pitch.x, y0 + (j + 0.5) * pitch.y - l * 3);
        bale(d, c, W, H, (rng() - 0.5) * 0.04, rng, 0.1);
      }
    }
  }
}

/** A heap of loose hay: a soft mound of strands, lit on top. */
export function hayHeap(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const body = scalloped(c, r, Math.max(7, Math.round(r / 6)), rng, 0.16);
  castShadow(d, body, r * 0.5, 0.14);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, STRAW, 0.75);
  pen.crescent(body, pt(-r * 0.3, -r * 0.4), () => pen.fill(body, STRAW_DARK, 0.4));
  pen.clipped(body, () => {
    for (let k = 0; k < r * 2.2; k++) {
      const a = rng() * TAU;
      const kk = r * Math.sqrt(rng());
      const p = pt(c.x + Math.cos(a) * kk, c.y + Math.sin(a) * kk);
      const b = rng() * Math.PI;
      pen.hair([p, pt(p.x + Math.cos(b) * 7, p.y + Math.sin(b) * 7)], 0.45, k % 3 === 0 ? PAPER_FILL : STRAW_DARK, 0.55);
    }
  });
  pen.hair(closed(body), 0.6, d.ink, 0.6);
}

/**
 * The old hay cart from above, its shafts towards `ang`: a boarded bed
 * between ladder sides, half loaded with hay, four red wheels with their
 * hubs, the shafts resting on the floor.
 */
export function hayCart(d: Draw, c: Pt, ang: number, rng: Rng): void {
  const { pen } = d;
  const cs = Math.cos(ang);
  const sn = Math.sin(ang);
  // u along the cart (towards its shafts), v across it.
  const at = (u: number, v: number): Pt => pt(c.x + u * cs - v * sn, c.y + u * sn + v * cs);
  const quad = (u0: number, v0: number, u1: number, v1: number): Pt[] => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  const bed = quad(-72, -34, 66, 34);
  pen.fill(bed.map((p) => pt(p.x + 26, p.y + 38)), d.ink, 0.15);
  for (const s of [-1, 1]) {
    const shaft = quad(60, s * 20 - 2.5, 150, s * 14 + 2.5);
    pen.fill(shaft.map((p) => pt(p.x + 6, p.y + 9)), d.ink, 0.1);
    pen.fill(shaft, PAPER_FILL, 1);
    pen.fill(shaft, CART_WOOD, 0.8);
    pen.hair(closed(shaft), 0.6, d.ink, 0.85);
  }
  for (const [u, r] of [[-40, 30], [36, 24]] as const) {
    for (const s of [-1, 1]) {
      const rim = quad(u - r, s * 37, u + r, s * 45);
      pen.fill(rim, PAPER_FILL, 1);
      pen.fill(rim, CART_RED, 0.85);
      pen.fill(quad(u - r, s * 41, u + r, s * 45), d.ink, 0.22);
      pen.stroke(closed(rim), 0.8, d.ink, 0.9, false);
      const hub = at(u, s * 48);
      pen.dot(hub.x, hub.y, 4.5, mix(CART_RED, d.ink, 0.3), 0.95);
      pen.circle(hub.x, hub.y, 4.5, 0.6, d.ink);
      pen.dot(hub.x - 1, hub.y - 1, 1.3, PAPER_FILL, 0.6);
    }
  }
  pen.fill(bed, PAPER_FILL, 1);
  pen.fill(bed, mix(CART_WOOD, '#d8c0a0', 0.3), 0.75);
  for (let v = -24; v <= 24; v += 12) pen.hair([at(-70, v), at(64, v)], 0.45, d.ink, 0.45);
  // The hay, heaped over the back half and spilling a little.
  const load = scalloped(at(-26, 0), 42, 9, rng, 0.12).map((p) => pt(c.x + (p.x - c.x) * 1, c.y + (p.y - c.y) * 1));
  pen.clipped(bed, () => {
    pen.fill(load, STRAW, 0.85);
    pen.crescent(load, pt(-6, -9), () => pen.fill(load, STRAW_DARK, 0.4));
    for (let k = 0; k < 70; k++) {
      const p = at(-70 + rng() * 90, (rng() - 0.5) * 64);
      const b = rng() * Math.PI;
      pen.hair([p, pt(p.x + Math.cos(b) * 7, p.y + Math.sin(b) * 7)], 0.45, k % 3 === 0 ? PAPER_FILL : STRAW_DARK, 0.6);
    }
  });
  for (const s of [-1, 1]) {
    const rail = quad(-74, s * 32 - 3, 68, s * 32 + 3);
    pen.fill(rail, PAPER_FILL, 1);
    pen.fill(rail, mix(CART_WOOD, d.ink, 0.15), 0.85);
    pen.stroke(closed(rail), 0.7, d.ink, 0.9, false);
    for (let u = -64; u < 64; u += 22) pen.dot(at(u, s * 32).x, at(u, s * 32).y, 1.4, d.ink, 0.7);
  }
  for (const u of [-74, 68]) pen.stroke([at(u, -35), at(u, 35)], 2.6, mix(CART_WOOD, d.ink, 0.25), 0.9, false);
  pen.stroke(closed(bed), 1.1, d.ink, 0.9, false);
}

/** A grain sack stood on end, its neck tied. */
export function sack(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const body = scalloped(c, 12, 6, rng, 0.08).map((p) => pt(p.x, c.y + (p.y - c.y) * 0.85));
  castShadow(d, body, 9, 0.16);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(BURLAP, '#a89070', rng() * 0.5), 0.8);
  pen.clipped(body, () => pen.hatch(body, 2.4, 0.2, 0.3, { color: '#8a7050', alpha: 0.35 }));
  pen.crescent(body, pt(-3, -4), () => pen.fill(body, '#6a5030', 0.3));
  pen.fill(oval(c.x - 1, c.y - 2, 4, 3.4, 10), mix(BURLAP, '#6a5030', 0.4), 0.8);
  pen.hair([pt(c.x - 4, c.y - 2), pt(c.x + 3, c.y - 1)], 0.8, TWINE, 0.9);
  pen.stroke(closed(body), 0.8, d.ink, 0.85);
}

/** A ginger cat curled asleep, tail round its nose. */
export function cat(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const fur = rng() < 0.6 ? '#e09a4a' : '#5a5560';
  const body = oval(c.x, c.y, 9, 7.5, 18);
  castShadow(d, body, 4, 0.18);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, fur, 0.85);
  for (let k = 0; k < 4; k++) pen.hair([pt(c.x - 5 + k * 3.4, c.y - 6), pt(c.x - 6 + k * 3.4, c.y - 2)], 0.6, mix(fur, d.ink, 0.5), 0.6);
  const head = oval(c.x + 6, c.y + 3, 4.2, 3.8, 12);
  pen.fill(head, PAPER_FILL, 1);
  pen.fill(head, fur, 0.9);
  pen.fill([pt(c.x + 4, c.y), pt(c.x + 5, c.y - 2.5), pt(c.x + 6.5, c.y - 0.5)], mix(fur, d.ink, 0.3), 0.9);
  pen.fill([pt(c.x + 8, c.y + 0.5), pt(c.x + 9.5, c.y - 1.8), pt(c.x + 10, c.y + 1.5)], mix(fur, d.ink, 0.3), 0.9);
  pen.hair([pt(c.x + 5.5, c.y + 3.5), pt(c.x + 7, c.y + 3.8)], 0.5, d.ink, 0.8);
  pen.hair([pt(c.x - 8, c.y + 2), pt(c.x - 6, c.y + 7), pt(c.x, c.y + 8.5), pt(c.x + 4, c.y + 7)], 2.2, mix(fur, d.ink, 0.15), 0.95);
  pen.hair(closed(head), 0.5, d.ink, 0.8);
  pen.stroke(closed(body), 0.7, d.ink, 0.85);
}

/** A hen from above, pecking: plump body, folded wings, tail, little head with its red comb. */
export function hen(d: Draw, c: Pt, ang: number, rng: Rng): void {
  const { pen } = d;
  const plumage = ['#f4efe2', '#b8683a', '#8a4a2a', '#e8d8b0'][Math.floor(rng() * 4)]!;
  const cs = Math.cos(ang);
  const sn = Math.sin(ang);
  const at = (u: number, v: number): Pt => pt(c.x + u * cs - v * sn, c.y + u * sn + v * cs);
  const body = oval(0, 0, 9, 6.5, 16).map((p) => at(p.x, p.y));
  pen.fill(body.map((p) => pt(p.x + 3, p.y + 5)), d.ink, 0.16);
  const tail = [at(-7, -3.5), at(-14, -1.5), at(-14, 2), at(-7, 3.5)];
  pen.fill(tail, mix(plumage, d.ink, 0.25), 0.9);
  pen.hair(closed(tail), 0.45, d.ink, 0.7);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, plumage, 0.9);
  for (const s of [-1, 1]) pen.hair([at(4, s * 5), at(-2, s * 6), at(-7, s * 3)], 0.45, d.ink, 0.6);
  pen.crescent(body, pt(-2, -3), () => pen.fill(body, mix(plumage, d.ink, 0.5), 0.3));
  pen.stroke(closed(body), 0.7, d.ink, 0.85);
  const head = oval(0, 0, 3.6, 3.2, 10).map((p) => at(p.x + 11, p.y));
  pen.fill(head, PAPER_FILL, 1);
  pen.fill(head, plumage, 0.95);
  pen.hair(closed(head), 0.45, d.ink, 0.8);
  pen.fill([at(14, -0.8), at(17, 0), at(14, 0.8)], '#e8b030', 1);
  pen.fill(oval(0, 0, 2.2, 1, 8).map((p) => at(p.x + 10.5, p.y)), '#d23a2a', 0.95);
}

/** A milk churn from above: its domed lid inside the shoulder, two handles. */
export function churn(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rim = oval(c.x, c.y, r, r, 20);
  castShadow(d, rim, r, 0.18);
  pen.fill(rim, PAPER_FILL, 1);
  pen.fill(rim, '#b8bfc2', 0.8);
  pen.crescent(rim, pt(-r * 0.3, -r * 0.4), () => pen.fill(rim, '#4a5258', 0.4));
  const lid = oval(c.x - r * 0.1, c.y - r * 0.12, r * 0.55, r * 0.55, 16);
  pen.fill(lid, '#d8dcdc', 0.95);
  pen.hair(closed(lid), 0.5, d.ink, 0.75);
  pen.dot(c.x - r * 0.3, c.y - r * 0.35, r * 0.18, PAPER_FILL, 0.9);
  for (const s of [-1, 1]) pen.hair([pt(c.x + s * r * 0.8, c.y - 3), pt(c.x + s * (r + 3), c.y), pt(c.x + s * r * 0.8, c.y + 3)], 1, '#4a5258', 0.9);
  pen.stroke(closed(rim), 0.9, d.ink, 0.85);
}

/** A stone water trough under a cast-iron pump, water to its brim. */
export function trough(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const w = 96;
  const h = 36;
  const outer = boxPts(c.x - w / 2, c.y - h / 2, c.x + w / 2, c.y + h / 2, 8);
  castShadow(d, outer, 16, 0.16);
  pen.fill(outer, PAPER_FILL, 1);
  pen.fill(outer, mix(STONE, '#b8b0a0', rng()), 0.75);
  pen.crescent(outer, pt(-3, -4), () => pen.fill(outer, STONE_DARK, 0.4));
  const water = boxPts(c.x - w / 2 + 7, c.y - h / 2 + 7, c.x + w / 2 - 7, c.y + h / 2 - 7, 8);
  pen.fill(water, '#7fa6b4', 0.85);
  pen.crescent(water, pt(3, 4), () => pen.fill(water, '#2c4f5c', 0.35));
  pen.hair([pt(c.x - 30, c.y - 4), pt(c.x - 6, c.y - 4)], 1.2, PAPER_FILL, 0.7);
  pen.hair(closed(water), 0.6, d.ink, 0.75);
  for (let k = 0; k < 6; k++) pen.dot(c.x - w / 2 + rng() * w, c.y + h / 2 - 2 - rng() * 4, 1.5 + rng() * 2, rng() < 0.5 ? MOSS : LEAF, 0.6);
  pen.stroke(closed(outer), 1.1, d.ink, 0.9, false);
  const post = pt(c.x + w / 2 - 16, c.y - h / 2 - 14);
  const p = oval(post.x, post.y, 8, 8, 14);
  castShadow(d, p, 14, 0.18);
  pen.fill(p, PAPER_FILL, 1);
  pen.fill(p, '#3f5a4a', 0.9);
  pen.dot(post.x - 2.5, post.y - 3, 1.6, PAPER_FILL, 0.6);
  pen.stroke(closed(p), 0.8, d.ink, 0.9);
  pen.stroke([post, pt(post.x - 4, post.y + 20)], 3, '#3f5a4a', 0.95, false);
  pen.stroke([post, pt(post.x + 26, post.y - 8)], 2.4, '#3f5a4a', 0.95, false);
  pen.dot(post.x + 26, post.y - 8, 2.4, '#3f5a4a', 1);
}

/** A thatched hay rick: its round thatch drawn in to a finial, roped down, its long shadow. */
export function rick(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const body = scalloped(c, r, 14, rng, 0.05);
  castShadow(d, body, r * 0.9, 0.16);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(STRAW, '#c0a060', 0.4), 0.8);
  pen.crescent(body, pt(-r * 0.35, -r * 0.5), () => pen.fill(body, STRAW_DARK, 0.45));
  for (let k = 0; k < 90; k++) {
    const a = (k / 90) * TAU + rng() * 0.05;
    const k0 = r * (0.08 + rng() * 0.3);
    const k1 = r * (0.6 + rng() * 0.38);
    pen.hair([pt(c.x + Math.cos(a) * k0, c.y + Math.sin(a) * k0), pt(c.x + Math.cos(a) * k1, c.y + Math.sin(a) * k1)], 0.4, k % 4 === 0 ? PAPER_FILL : STRAW_DARK, 0.5);
  }
  for (const k of [0.45, 0.78]) pen.hair(closed(oval(c.x, c.y, r * k, r * k, 30)), 0.7, '#7a5a30', 0.6);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    pen.hair([pt(c.x + Math.cos(a) * r * 0.2, c.y + Math.sin(a) * r * 0.2), pt(c.x + Math.cos(a) * r * 0.97, c.y + Math.sin(a) * r * 0.97)], 0.6, '#7a5a30', 0.55);
  }
  pen.fill(scalloped(c, r * 0.12, 6, rng, 0.3), STRAW_DARK, 0.9);
  pen.stroke(closed(body), 1.2, d.ink, 0.85);
}

/** Logs stacked against a wall, ends towards the viewer: bark along their tops, the cut ends' rings. */
export function logPile(d: Draw, x0: number, y: number, n: number, rng: Rng): void {
  const { pen } = d;
  pen.fill(boxPts(x0 + 8, y - 6, x0 + n * 15 + 18, y + 22, 10), d.ink, 0.13);
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < n - row; k++) {
      const r = 6.5 + rng() * 1.5;
      const e = pt(x0 + 8 + k * 15 + row * 7.5, y + 8 - row * 11);
      const end = oval(e.x, e.y, r, r * 0.95, 14);
      pen.fill(end, PAPER_FILL, 1);
      pen.fill(end, '#d8b888', 0.85);
      pen.hair(closed(oval(e.x, e.y, r * 0.5, r * 0.5, 10)), 0.35, '#8a6a4a', 0.7);
      pen.dot(e.x, e.y, 0.8, '#8a6a4a', 0.8);
      pen.stroke(closed(end), 0.9, '#5a4030', 0.85);
    }
  }
}

/** An oak barrel from above: its lid boards, the iron hoop at its rim. */
export function barrel(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const rim = oval(c.x, c.y, r, r, 22);
  castShadow(d, rim, r * 0.9, 0.18);
  pen.fill(rim, PAPER_FILL, 1);
  pen.fill(rim, mix(CART_WOOD, '#7a5a3a', rng() * 0.5), 0.8);
  for (let k = -2; k <= 2; k++) pen.hair([pt(c.x + k * r * 0.33, c.y - Math.sqrt(Math.max(0, r * r - (k * r * 0.33) ** 2)) * 0.85), pt(c.x + k * r * 0.33, c.y + Math.sqrt(Math.max(0, r * r - (k * r * 0.33) ** 2)) * 0.85)], 0.45, d.ink, 0.5);
  pen.crescent(rim, pt(-r * 0.3, -r * 0.4), () => pen.fill(rim, d.ink, 0.25));
  pen.stroke(closed(oval(c.x, c.y, r * 0.9, r * 0.9, 22)), 1.4, '#4a4a52', 0.7, false);
  pen.stroke(closed(rim), 0.9, d.ink, 0.9);
}
