import type { Rng } from '../logic/rng';
import { arc, blob, body, castShadow, polar, SHADOW } from './groundKit';
import { closed, type Draw, oval, pt, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { rod, rodShadow } from './allotmentKit';
import { mix, rgba } from './wash';

/**
 * The allotment's crops, seen from above, all healthy and appetising:
 * cabbages, leeks, lettuces, carrot tops, runner beans on a row of crossed
 * canes, marigolds, rows of seedlings and the seed labels at the row ends.
 * Board coordinates; `s` scales each plant; each takes the rng it draws its
 * variety from.
 */
const CABBAGE = '#7fa48d';
const CABBAGE_HEART = '#c8dc9c';
const LEEK = '#6f9e80';
const LEEK_PALE = '#dfe8c4';
const LETTUCE = '#9cc65a';
const LETTUCE_DEEP = '#5f8f3c';
const LOLLO = '#9a4b5a';
const CARROT_TOP = '#6c9c43';
const CARROT = '#e07a2a';
const BEAN_LEAF = '#5c8d44';
const BEAN_FLOWER = '#d8432e';
const BEAN_POD = '#8ab34c';
const CANE = '#cdb57c';
const MARIGOLD = '#e8902a';
const MARIGOLD_LIT = '#f4bf3c';
const SEEDLING = '#8fbd58';
const LABEL = '#f6f1e2';

/** A leaf blade from base to tip along a, `wide` its half-width at the middle (share of len). */
function blade(base: Pt, a: number, len: number, wide: number): Pt[] {
  const tip = polar(base, a, len);
  return [...arc(base, tip, wide * len, 7), ...arc(tip, base, wide * len, 7).slice(1)];
}

/** A cabbage, radius r: wrapper leaves fanned round a pale tight heart, veined and shaded. */
export function cabbage(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  castShadow(d, blob(c, r, r * 0.95, rng, 0.12, 18), r * 0.35, 0.16);
  const n = 6 + Math.floor(rng() * 2);
  const turn = rng() * TAU;
  for (let k = 0; k < n; k++) {
    const a = turn + (k / n) * TAU + (rng() - 0.5) * 0.3;
    const leaf = blob(polar(c, a, r * 0.52), r * 0.5, r * 0.4, rng, 0.14, 16, a);
    body(d, leaf, mix(CABBAGE, '#9fb879', rng() * 0.35), 0.78);
    pen.crescent(leaf, pt(-SHADOW.x * r * 0.18, -SHADOW.y * r * 0.18), () => pen.fill(leaf, mix(CABBAGE, d.ink, 0.45), 0.35));
    pen.hair([polar(c, a, r * 0.3), polar(c, a, r * 0.92)], 0.5, PAPER_FILL, 0.7);
    for (const s of [1, -1]) pen.hair([polar(c, a, r * 0.6), polar(c, a + s * 0.35, r * 0.85)], 0.35, PAPER_FILL, 0.5);
    pen.hair(closed(leaf), 0.5, d.ink, 0.6);
  }
  const heart = blob(c, r * 0.42, r * 0.4, rng, 0.06, 16);
  castShadow(d, heart, r * 0.08, 0.15);
  body(d, heart, CABBAGE_HEART, 0.8);
  pen.hair(arc(polar(c, turn, r * 0.32), polar(c, turn + 2.2, r * 0.32), r * 0.12, 6), 0.5, d.ink, 0.5);
  pen.hair(arc(polar(c, turn + 3, r * 0.2), polar(c, turn + 5, r * 0.22), r * 0.08, 5), 0.45, d.ink, 0.45);
  pen.crescent(heart, pt(-SHADOW.x * r * 0.12, -SHADOW.y * r * 0.12), () => pen.fill(heart, mix(CABBAGE, d.ink, 0.3), 0.3));
  pen.stroke(closed(heart), 0.7, d.ink, 0.75, false);
}

/** A leek, its flat fan of blue-green straps opened along a, length r, the pale shaft at the middle. */
export function leek(d: Draw, c: Pt, r: number, a: number, rng: Rng): void {
  const { pen } = d;
  const n = 6;
  for (let k = 0; k < n; k++) {
    const side = k % 2 === 0 ? 0 : Math.PI;
    const ang = a + side + ((k >> 1) - 1) * 0.5 + (rng() - 0.5) * 0.2;
    const len = r * (0.7 + rng() * 0.4);
    const b = blade(c, ang, len, 0.34);
    castShadow(d, b, 3, 0.12);
    body(d, b, mix(LEEK, '#8fb28a', rng() * 0.4), 0.8);
    pen.crescent(b, pt(-SHADOW.x * 2, -SHADOW.y * 2), () => pen.fill(b, mix(LEEK, d.ink, 0.45), 0.35));
    pen.hair([c, polar(c, ang, len * 0.85)], 0.4, PAPER_FILL, 0.6);
    pen.hair(closed(b), 0.45, d.ink, 0.65);
  }
  const shaft = oval(c.x, c.y, r * 0.13, r * 0.13, 10);
  body(d, shaft, LEEK_PALE, 0.9);
  pen.hair(closed(shaft), 0.5, d.ink, 0.7);
}

/** A lettuce, radius r: frilled outer leaves round a tighter lighter heart; some are red-leaved. */
export function lettuce(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const red = rng() < 0.3;
  const outerCol = red ? mix(LOLLO, LETTUCE_DEEP, 0.25) : LETTUCE;
  castShadow(d, blob(c, r, r, rng, 0.2, 18), r * 0.3, 0.15);
  const n = 7;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rng() * 0.4;
    const leaf = blob(polar(c, a, r * 0.5), r * 0.52, r * 0.42, rng, 0.32, 18, a);
    body(d, leaf, mix(outerCol, '#c5d77a', rng() * 0.3), 0.72);
    pen.crescent(leaf, pt(-SHADOW.x * r * 0.15, -SHADOW.y * r * 0.15), () => pen.fill(leaf, mix(outerCol, d.ink, 0.4), 0.3));
    pen.hair([polar(c, a, r * 0.2), polar(c, a, r * 0.85)], 0.35, PAPER_FILL, 0.55);
    pen.hair(closed(leaf), 0.45, d.ink, 0.55);
  }
  const heart = blob(c, r * 0.4, r * 0.38, rng, 0.25, 14);
  body(d, heart, red ? mix(LETTUCE, LOLLO, 0.35) : '#cfe08a', 0.8);
  pen.hair(arc(polar(c, 0.5, r * 0.25), polar(c, 2.8, r * 0.25), r * 0.1, 5), 0.4, d.ink, 0.45);
  pen.hair(closed(heart), 0.5, d.ink, 0.65);
}

/** Carrot tops: feathery fronds from a crown, the orange shoulder just showing. */
export function carrotTop(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  pen.fill(blob(polar(c, 0.98, r * 0.25), r * 0.8, r * 0.7, rng, 0.25, 14), d.ink, 0.07);
  pen.fill(blob(c, r * 0.8, r * 0.7, rng, 0.3, 14, rng() * TAU), CARROT_TOP, 0.4);
  const n = 5 + Math.floor(rng() * 3);
  // The leaflets are many and tiny: laid in as one batch of short strokes.
  const { ctx } = pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = rgba('#7fae4a', 0.95);
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rng() * 0.6;
    const len = r * (0.7 + rng() * 0.4);
    const stem = arc(c, polar(c, a, len), (rng() - 0.5) * 3, 5);
    pen.hair(stem, 0.55, mix(CARROT_TOP, d.ink, 0.35), 0.85);
    for (let i = 1; i < stem.length; i++) {
      for (const s of [1, -1]) {
        const tip = polar(stem[i]!, a + s * 0.8, 2.6 + rng() * 1.6);
        ctx.moveTo(stem[i]!.x, stem[i]!.y);
        ctx.lineTo(tip.x, tip.y);
      }
    }
  }
  ctx.stroke();
  ctx.restore();
  pen.dot(c.x, c.y, r * 0.13, CARROT, 0.95);
  pen.hair(closed(oval(c.x, c.y, r * 0.13, r * 0.13, 8)), 0.4, d.ink, 0.6);
}

/** A marigold, radius r: a ruffled orange pompom with a lit top, a dark eye and a few feathery leaves. */
export function marigold(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  for (let k = 0; k < 4; k++) {
    const a = rng() * TAU;
    pen.hair([polar(c, a, r * 0.6), polar(c, a, r * 1.6)], 1.6, BEAN_LEAF, 0.7);
  }
  const head = blob(c, r, r, rng, 0.22, 16);
  castShadow(d, head, r * 0.35, 0.16);
  body(d, head, MARIGOLD, 0.85);
  pen.fill(blob(pt(c.x - r * 0.2, c.y - r * 0.2), r * 0.6, r * 0.55, rng, 0.25, 12), MARIGOLD_LIT, 0.75);
  for (let k = 0; k < 6; k++) pen.hair(arc(polar(c, (k / 6) * TAU, r * 0.75), polar(c, (k / 6) * TAU + 0.6, r * 0.75), r * 0.12, 4), 0.4, '#9a4a18', 0.5);
  pen.crescent(head, pt(-SHADOW.x * r * 0.3, -SHADOW.y * r * 0.3), () => pen.fill(head, '#a2461a', 0.3));
  pen.dot(c.x, c.y, r * 0.16, '#6a3a1a', 0.85);
  pen.hair(closed(head), 0.5, d.ink, 0.7);
}

/** A seedling: a pair of seed leaves, maybe the first true leaf between them. */
export function seedling(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const a = rng() * TAU;
  for (const side of [0, Math.PI]) {
    const b = blade(c, a + side, s, 0.62);
    body(d, b, SEEDLING, 0.85);
    pen.hair(closed(b), 0.4, d.ink, 0.6);
  }
  if (rng() < 0.4) pen.hair([c, polar(c, a + 1.6, s * 0.7)], 1.2, LETTUCE_DEEP, 0.8);
}

/** A white seed label pushed into the soil, leaning, with its pencilled name and a shadow. */
export function seedLabel(d: Draw, c: Pt, a: number): void {
  const { pen } = d;
  const u = pt(Math.cos(a), Math.sin(a));
  const n = pt(-u.y, u.x);
  const at = (s: number, t: number): Pt => pt(c.x + u.x * s + n.x * t, c.y + u.y * s + n.y * t);
  const tag = [at(-7, -2.4), at(6, -2.4), at(8, 0), at(6, 2.4), at(-7, 2.4)];
  castShadow(d, tag, 3.5, 0.18);
  body(d, tag, LABEL, 0.9);
  pen.hair([at(-5, -0.4), at(-2, 0.3), at(1, -0.5), at(4, 0.2)], 0.45, '#5a5a6a', 0.7);
  pen.hair(closed(tag), 0.5, d.ink, 0.8);
}

/**
 * A row of runner beans on crossed canes from a to b: the A-frame's long
 * shadow, the ridge cane, pairs of canes crossing over it, strings between,
 * leaves climbing thick along the top with scarlet flowers and hanging pods.
 * `hw` is half the frame's spread across the row.
 */
export function beanRow(d: Draw, a: Pt, b: Pt, hw: number, rng: Rng): void {
  const { pen } = d;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const u = pt((b.x - a.x) / len, (b.y - a.y) / len);
  const n = pt(-u.y, u.x);
  const at = (s: number, t: number): Pt => pt(a.x + u.x * s + n.x * t, a.y + u.y * s + n.y * t);
  // The tall row's long soft shadow, cast down-right onto the bed.
  const fall = 18;
  const shadow = [at(-4, -hw * 0.4), at(len + 4, -hw * 0.4), at(len + 4, hw * 0.4), at(-4, hw * 0.4)].map((p) => pt(p.x + SHADOW.x * fall, p.y + SHADOW.y * fall));
  pen.fill(blob(pt((shadow[0]!.x + shadow[2]!.x) / 2, (shadow[0]!.y + shadow[2]!.y) / 2), len / 2 + 6, hw * 0.75, rng, 0.08, 26, Math.atan2(u.y, u.x)), d.ink, 0.12);
  // Strings along each side, then the canes.
  for (const t of [-hw, hw]) pen.hair([at(0, t), at(len, t)], 0.4, '#7a6a52', 0.6);
  const step = 30;
  for (let s = 6; s <= len - 4; s += step + (rng() - 0.5) * 6) {
    const lean = (rng() - 0.5) * 4;
    for (const side of [1, -1]) {
      const foot = at(s + lean * side, side * hw);
      const top = at(s - lean * side, -side * hw * 0.25);
      rodShadow(d, [foot, top].map((p) => pt(p.x + SHADOW.x * 2, p.y + SHADOW.y * 2)), 2.4, 0.14);
      rod(d, [foot, top], 2.4, CANE);
    }
  }
  // The foliage: a mass of deep shade along the ridge, heart-shaped leaves climbing thick over it.
  pen.fill(blob(at(len / 2, 0), len / 2 + 4, hw * 0.7, rng, 0.06, 40, Math.atan2(u.y, u.x)), mix(BEAN_LEAF, d.ink, 0.45), 0.55);
  rod(d, [at(-4, 0), at(len + 4, 0)], 2.4, CANE);
  for (let s = 2; s < len; s += 4 + rng() * 4) {
    const c = at(s, (rng() - 0.5) * hw * 1.3);
    const la = rng() * TAU;
    const size = 9 + rng() * 5;
    const tip = polar(c, la, size);
    const leaf = [...arc(c, tip, size * 0.75, 7), ...arc(tip, c, size * 0.75, 7).slice(1)].map((p, i, all) => (i === Math.floor(all.length * 0.75) ? polar(p, la + Math.PI, size * 0.15) : p));
    castShadow(d, leaf, 3, 0.12);
    body(d, leaf, mix(BEAN_LEAF, '#a3c662', rng() * 0.5), 0.82);
    pen.crescent(leaf, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(leaf, mix(BEAN_LEAF, d.ink, 0.45), 0.35));
    pen.hair([c, polar(c, la, size * 0.8)], 0.4, PAPER_FILL, 0.55);
    pen.hair(closed(leaf), 0.45, d.ink, 0.6);
  }
  // Pods hanging and scarlet flower sprays.
  for (let s = 10; s < len - 6; s += 14 + rng() * 14) {
    const c = at(s, (rng() - 0.5) * hw * 1.4);
    if (rng() < 0.5) {
      const pa = Math.atan2(n.y, n.x) + (rng() - 0.5) * 0.8;
      const pod = blade(c, pa, 13 + rng() * 5, 0.09);
      body(d, pod, BEAN_POD, 0.85);
      pen.hair(closed(pod), 0.45, d.ink, 0.7);
    } else {
      for (let k = 0; k < 4; k++) {
        const f = polar(c, rng() * TAU, rng() * 3.5);
        pen.dot(f.x, f.y, 1.6 + rng() * 0.6, BEAN_FLOWER, 0.92);
      }
      pen.dot(c.x - 0.6, c.y - 0.8, 0.7, '#f6b2a0', 0.8);
    }
  }
}
