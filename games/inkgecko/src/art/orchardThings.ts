import type { Rng } from '../logic/rng';
import { arc, blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, oval, pt, shade, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix } from './wash';

/**
 * The orchard's things, seen from above: apple-tree canopy, apples (on the
 * bough and fallen, always whole and sound), fallen leaves, long-grass
 * tufts and wildflowers, an orchard ladder and a basket of apples. Board
 * coordinates; each takes the rng it draws its variety from.
 */
export const CANOPY = '#5d8a45';
const CANOPY_DEEP = '#2f5235';
const CANOPY_LIT = '#a9c46a';
const APPLE_RED = '#c8402e';
const APPLE_GREEN = '#a8b94a';
const APPLE_STREAK = '#e0a03a';
const STALK = '#6b4a2a';
export const TIMBER = '#b89568';
const WICKER = '#c9a066';
export const GRASS_BLADE = '#6f9a46';
const DAISY_HEART = '#e9b52e';
const BUTTERCUP = '#f0c42c';
const CLOVER_HEAD = '#d98fae';
const CORNFLOWER = '#5b7fc8';

/** An apple, whole and sound: rosy over green, a lit cheek, its stalk dimple and maybe a leaf. */
export function apple(d: Draw, c: Pt, r: number, rng: Rng, leaf = true): void {
  const { pen } = d;
  const shape = blob(c, r, r * 0.96, rng, 0.05, 20);
  castShadow(d, shape, r * 0.45, 0.16);
  const ripe = rng();
  body(d, shape, mix(APPLE_GREEN, APPLE_RED, 0.35 + ripe * 0.65), 0.82);
  pen.clipped(shape, () => {
    for (let k = 0; k < 5; k++) {
      const a = rng() * TAU;
      pen.hair([polar(c, a, r * 0.2), polar(c, a + 0.1, r * 0.95)], 0.6, ripe > 0.5 ? '#8f2a20' : APPLE_STREAK, 0.4);
    }
  });
  pen.crescent(shape, pt(-SHADOW.x * r * 0.35, -SHADOW.y * r * 0.35), () => pen.fill(shape, '#6e2219', 0.3));
  pen.fill(oval(c.x - r * 0.35, c.y - r * 0.35, r * 0.3, r * 0.2, 10), PAPER_FILL, 0.65);
  pen.hair(closed(oval(c.x + r * 0.05, c.y + r * 0.05, r * 0.18, r * 0.15, 10)), 0.5, d.ink, 0.6);
  const sa = rng() * TAU;
  pen.hair([pt(c.x + r * 0.05, c.y + r * 0.05), polar(c, sa, r * 0.55)], 1, STALK, 0.95);
  if (leaf && rng() < 0.5) {
    const base = polar(c, sa, r * 0.5);
    const tip = polar(base, sa + 0.4, r * 1.1);
    const blade = [...arc(base, tip, r * 0.28, 6), ...arc(tip, base, r * 0.28, 6).slice(1)];
    body(d, blade, CANOPY, 0.75);
    pen.hair([base, tip], 0.4, CANOPY_DEEP, 0.7);
    pen.hair(closed(blade), 0.45, d.ink, 0.75);
  }
  pen.stroke(closed(shape), 0.9, d.ink, 0.9);
}

/** An apple leaf lying on the grass: a pointed oval with a midrib and veins. */
export function fallenLeaf(d: Draw, c: Pt, len: number, a: number, colour: string): void {
  const { pen } = d;
  const p0 = polar(c, a, -len / 2);
  const p1 = polar(c, a, len / 2);
  const blade = [...arc(p0, p1, len * 0.24, 8), ...arc(p1, p0, len * 0.24, 8).slice(1)];
  castShadow(d, blade, 2.5, 0.1);
  body(d, blade, colour, 0.6);
  pen.crescent(blade, pt(-1.5, -2.2), () => pen.fill(blade, mix(colour, d.ink, 0.4), 0.3));
  pen.hair([p0, p1], 0.45, d.ink, 0.5);
  for (const t of [0.3, 0.5, 0.7]) {
    const m = pt(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t);
    for (const s of [1, -1]) pen.hair([m, polar(m, a + s * 0.9, len * 0.16)], 0.3, d.ink, 0.35);
  }
  pen.hair(closed(blade), 0.5, d.ink, 0.65);
}

/** One cluster of the canopy, radius r: a dark mass, lit leaves on top, single leaves breaking the edge. */
export function leafCluster(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const mass = blob(c, r, r * 0.9, rng, 0.18, 26, rng() * TAU);
  pen.fill(mass, PAPER_FILL, 1);
  pen.fill(mass, mix(CANOPY, CANOPY_DEEP, 0.25 + rng() * 0.2), 0.85);
  pen.clipped(mass, () => {
    // Lit tops of the leaves towards the light, as dabs.
    for (let k = 0; k < 16; k++) {
      const p = polar(pt(c.x - SHADOW.x * r * 0.3, c.y - SHADOW.y * r * 0.3), rng() * TAU, Math.sqrt(rng()) * r * 0.7);
      const a = rng() * TAU;
      const blade = [...arc(polar(p, a, -5), polar(p, a, 5), 2.6, 4), ...arc(polar(p, a, 5), polar(p, a, -5), 2.6, 4).slice(1)];
      pen.fill(blade, mix(CANOPY_LIT, CANOPY, rng() * 0.5), 0.75);
    }
  });
  pen.crescent(mass, pt(-SHADOW.x * r * 0.35, -SHADOW.y * r * 0.35), () => pen.fill(mass, CANOPY_DEEP, 0.4));
  shade(d, mass, 0.35);
  // Leaves breaking the outline.
  for (let k = 0; k < 7; k++) {
    const a = rng() * TAU;
    const base = polar(c, a, r * 0.85);
    const tip = polar(base, a + (rng() - 0.5) * 0.8, 9 + rng() * 5);
    const blade = [...arc(base, tip, 3.2, 5), ...arc(tip, base, 3.2, 5).slice(1)];
    body(d, blade, mix(CANOPY, CANOPY_LIT, rng() * 0.6), 0.8);
    pen.hair(closed(blade), 0.45, d.ink, 0.7);
  }
  pen.hair(closed(mass), 0.7, d.ink, 0.55);
}

/** A tuft of long grass leaning along `lean`, `len` long. */
export function tuft(d: Draw, base: Pt, lean: number, len: number, rng: Rng): void {
  const { pen } = d;
  const n = 5 + Math.floor(rng() * 4);
  for (let k = 0; k < n; k++) {
    const a = lean + (rng() - 0.5) * 1.3;
    const l = len * (0.6 + rng() * 0.5);
    const from = polar(base, rng() * TAU, rng() * 3);
    const tip = polar(from, a, l);
    const mid = polar(polar(from, a, l * 0.55), a + Math.PI / 2, (rng() - 0.5) * l * 0.3);
    const colour = mix(GRASS_BLADE, rng() < 0.3 ? '#c4b45a' : '#3f6b3a', rng() * 0.5);
    pen.hair([from, mid, tip], 0.9 + rng() * 0.6, colour, 0.8);
    if (rng() < 0.5) pen.hair([from, mid, tip], 0.35, d.ink, 0.45);
  }
}

/** A wildflower seen from above: daisy, buttercup, clover head or cornflower. */
export function wildflower(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const kind = rng();
  if (kind < 0.4) {
    const turn = rng() * TAU;
    for (let k = 0; k < 12; k++) {
      const tip = polar(c, turn + (k / 12) * TAU, 5.5);
      pen.hair([polar(c, turn + (k / 12) * TAU, 1.5), tip], 1.6, PAPER_FILL, 0.95);
    }
    pen.hair(closed(oval(c.x, c.y, 5.8, 5.8, 14)), 0.35, d.ink, 0.35);
    pen.dot(c.x, c.y, 1.8, DAISY_HEART, 1);
  } else if (kind < 0.65) {
    for (let k = 0; k < 5; k++) {
      const pc = polar(c, (k / 5) * TAU + rng(), 2.6);
      pen.fill(oval(pc.x, pc.y, 2.6, 2.6, 10), BUTTERCUP, 0.95);
    }
    pen.hair(closed(oval(c.x, c.y, 5, 5, 12)), 0.4, d.ink, 0.6);
    pen.dot(c.x, c.y, 1, '#9a7a14', 0.9);
  } else if (kind < 0.85) {
    const head = oval(c.x, c.y, 4.5, 4.5, 12);
    pen.fill(head, CLOVER_HEAD, 0.85);
    pen.stipple(head, 14, () => 0.8, 0.5, '#a3506e');
    pen.hair(closed(head), 0.4, d.ink, 0.55);
  } else {
    for (let k = 0; k < 7; k++) pen.hair([c, polar(c, (k / 7) * TAU, 5.5)], 1.8, CORNFLOWER, 0.9);
    pen.dot(c.x, c.y, 1.4, '#2d3f7a', 0.9);
  }
}

/** A wooden orchard ladder lying on the grass from a to b, `wide` across. */
export function ladder(d: Draw, a: Pt, b: Pt, wide: number, rng: Rng): void {
  const { pen } = d;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const u = pt((b.x - a.x) / len, (b.y - a.y) / len);
  const n = pt(-u.y, u.x);
  // Orchard ladders taper to the top (b).
  const at = (t: number, s: number): Pt => {
    const half = (wide / 2) * (1 - 0.35 * t);
    return pt(a.x + u.x * len * t + n.x * half * s, a.y + u.y * len * t + n.y * half * s);
  };
  const rail = (s: number): Pt[] => [at(-0.02, s - 0.12), at(1.02, s - 0.12), at(1.02, s + 0.12), at(-0.02, s + 0.12)];
  const rungs = Array.from({ length: Math.floor(len / 34) }, (_, k) => (k + 0.6) / Math.floor(len / 34));
  for (const s of [rail(1), rail(-1)]) castShadow(d, s, 10, 0.16);
  for (const t of rungs) {
    const rung = [at(t - 0.012, -0.95), at(t + 0.012, -0.95), at(t + 0.012, 0.95), at(t - 0.012, 0.95)];
    castShadow(d, rung, 8, 0.14);
    body(d, rung, mix(TIMBER, '#8a6a46', rng() * 0.3), 0.7);
    pen.crescent(rung, pt(-SHADOW.x * 1.5, -SHADOW.y * 1.5), () => pen.fill(rung, '#5a4028', 0.35));
    pen.stroke(outline(rung, 4), 0.8, d.ink, 0.85, false);
  }
  for (const s of [1, -1]) {
    const r = rail(s);
    body(d, r, TIMBER, 0.72);
    pen.clipped(r, () => {
      for (let k = 0; k < len / 25; k++) {
        const t = rng();
        pen.hair([at(t, s + (rng() - 0.5) * 0.15), at(Math.min(1, t + 0.08 + rng() * 0.1), s + (rng() - 0.5) * 0.15)], 0.4, d.ink, 0.35);
      }
    });
    pen.crescent(r, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(r, '#5a4028', 0.35));
    pen.stroke(outline(r, 6), 1, d.ink, 0.9);
  }
}

/** A round wicker basket of apples, radius r. */
export function basket(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const rim = oval(c.x, c.y, r, r, 40);
  castShadow(d, rim, 9, 0.2);
  body(d, rim, WICKER, 0.75);
  pen.clipped(rim, () => {
    // The weave: short slanting strokes in rings.
    for (let ring = 0; ring < 3; ring++) {
      const rr = r - 2.5 - ring * 2.6;
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * TAU + (ring % 2) * 0.08;
        pen.hair([polar(c, a, rr + 1.2), polar(c, a + 0.1, rr - 1.2)], 0.5, mix(WICKER, d.ink, 0.5), 0.6);
      }
    }
  });
  pen.crescent(rim, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(rim, '#6b4a2a', 0.35));
  const inside = oval(c.x, c.y, r - 9, r - 9, 32);
  pen.fill(inside, '#3b2a1e', 0.6);
  pen.stroke(closed(rim), 1.2, d.ink, 0.9);
  pen.hair(closed(inside), 0.6, d.ink, 0.7);
  // Apples heaped in it, then the handle arching over.
  const heap = [pt(0, 0), ...Array.from({ length: 6 }, (_, k) => polar(pt(0, 0), (k / 6) * TAU + 0.3, (r - 9) * 0.55))];
  for (const h of heap.reverse()) apple(d, pt(c.x + h.x, c.y + h.y), (r - 9) * 0.34, rng, false);
  const handle = [...arc(polar(c, 2.6, r - 2), polar(c, -0.54, r - 2), 0, 10)];
  pen.stroke(handle.map((p) => pt(p.x + 6, p.y + 9)), 4.5, d.ink, 0.12, false);
  pen.stroke(handle, 4.5, mix(WICKER, '#8a6a46', 0.4), 0.95, false);
  pen.hair(handle.map((p) => pt(p.x - 1.6, p.y - 1.6)), 0.6, d.ink, 0.85);
  pen.hair(handle.map((p) => pt(p.x + 1.6, p.y + 1.6)), 0.6, d.ink, 0.85);
}
