import type { Rng } from '../logic/rng';
import { blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, oval, pt, TAU } from './kit';
import { LEAF, MOSS, PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The meadow's things, seen from above: a weathered wooden bench, old fence
 * posts, a stile in a broken run of fence, molehills of fresh crumbly
 * earth. Tall things throw long shadows down-right, away from the light at
 * the upper left. Board coordinates.
 */
export const OAK = '#b5ab96';
const OAK_DEEP = '#6e6352';
const OAK_DARK = '#4a4034';
const SOIL = '#6f4f36';
const SOIL_LIT = '#a07a58';
const LICHEN = '#c9c47a';

/** The shadow of something upright `width` thick at c, thrown `reach` along the ground down-right. */
export function longShadow(d: Draw, c: Pt, width: number, reach: number, alpha: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = rgba(d.ink, alpha);
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x + SHADOW.x * reach, c.y + SHADOW.y * reach);
  ctx.stroke();
  ctx.restore();
}

/** A rectangle along u (length) and n (across), as a polygon. */
function rect(c: Pt, u: Pt, len: number, wide: number, off = 0): Pt[] {
  const n = pt(-u.y, u.x);
  const at = (s: number, t: number): Pt => pt(c.x + u.x * s + n.x * (t + off), c.y + u.y * s + n.y * (t + off));
  return [at(-len / 2, -wide / 2), at(len / 2, -wide / 2), at(len / 2, wide / 2), at(-len / 2, wide / 2)];
}

/** One weathered board: silvery wash, grain, a crescent of shade, an outline. */
export function board(d: Draw, shape: readonly Pt[], u: Pt, rng: Rng, colour = OAK): void {
  const { pen } = d;
  body(d, shape, mix(colour, '#9a8f7a', rng() * 0.5), 0.75);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const c = pt((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
  const size = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  pen.clipped(shape, () => {
    for (let k = 0; k < Math.max(3, size / 9); k++) {
      const p = polar(c, rng() * TAU, rng() * size * 0.4);
      const l = 6 + rng() * size * 0.35;
      pen.hair([pt(p.x - u.x * l, p.y - u.y * l), pt(p.x + (rng() - 0.5), p.y + (rng() - 0.5)), pt(p.x + u.x * l, p.y + u.y * l)], 0.4, OAK_DARK, 0.35);
    }
    if (rng() < 0.4) pen.fill(blob(polar(c, rng() * TAU, size * 0.2), 2.5 + rng() * 3, 2 + rng() * 2, rng, 0.3, 10), LICHEN, 0.5);
  });
  pen.crescent(shape, pt(-SHADOW.x * 1.6, -SHADOW.y * 1.6), () => pen.fill(shape, OAK_DARK, 0.3));
  pen.stroke(outline(shape, 6), 0.75, d.ink, 0.85, false);
}

/** A wooden bench from above, `len` long, its seat towards `facing` (unit vector): slats, a back rail, arms, its shadow. */
export function bench(d: Draw, c: Pt, facing: Pt, len: number, rng: Rng): void {
  // Along the bench, chosen so rect's offsets run towards `facing`.
  const u = pt(facing.y, -facing.x);
  const slats = [7, -1, -9].map((t) => rect(c, u, len, 6.5, t));
  const back = [-20, -26].map((t) => rect(c, u, len + 4, 4.5, t));
  const arms = [-1, 1].map((s) => rect(pt(c.x + u.x * s * (len / 2 - 1), c.y + u.y * s * (len / 2 - 1)), u, 5, 36, -9.5));
  // One shadow for the whole bench, longer behind where the back stands tall.
  const foot = rect(c, u, len + 4, 38, -9.5);
  castShadow(d, foot, 8, 0.14);
  for (const s of back) castShadow(d, s, 18, 0.12);
  for (const s of [...slats, ...back]) board(d, s, u, rng);
  for (const s of arms) board(d, s, facing, rng, mix(OAK, OAK_DEEP, 0.3));
  // Bolt heads where the slats cross the frame.
  for (const s of [-1, 1]) {
    for (const t of [7, -1, -9]) {
      const p = pt(c.x + u.x * s * (len / 2 - 8) + facing.x * t, c.y + u.y * s * (len / 2 - 8) + facing.y * t);
      d.pen.dot(p.x, p.y, 0.8, OAK_DARK, 0.8);
    }
  }
}

/** An old fence post seen end-on: a square-sawn top gone grey and split, end grain and lichen, its long shadow down-right. */
export function fencePost(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const turn = rng() * TAU;
  const u = pt(Math.cos(turn), Math.sin(turn));
  // A square with its corners worn round.
  const corners = rect(c, u, r * 1.8, r * 1.7);
  const top = outline(corners, 2).slice(0, -1).map((p) => {
    const k = Math.hypot(p.x - c.x, p.y - c.y) > r * 1.15 ? 0.9 : 1;
    return pt(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k);
  });
  // Tall, so its shadow runs long down-right.
  longShadow(d, c, r * 1.8, r * 5.5, 0.14);
  body(d, top, mix(OAK, OAK_DEEP, 0.5), 0.85);
  pen.clipped(top, () => {
    const pith = polar(c, turn + 0.8, r * 0.25);
    for (let k = 1; k <= 4; k++) pen.hair(closed(blob(pith, r * k * 0.24, r * k * 0.21, rng, 0.1, 12, turn)), 0.45, OAK_DARK, 0.55);
    pen.fill(blob(polar(c, turn + 3.5, r * 0.5), r * 0.4, r * 0.3, rng, 0.3, 10), LICHEN, 0.65);
    pen.stipple(top, Math.round(r * 4), () => 0.6, 0.4, OAK_DARK);
  });
  pen.stroke([polar(c, turn, r * 0.95), polar(c, turn + 0.15, r * 0.35), polar(c, turn + 0.05, r * 0.1)], 0.9, d.ink, 0.85, false);
  pen.crescent(top, pt(-SHADOW.x * r * 0.35, -SHADOW.y * r * 0.35), () => pen.fill(top, OAK_DARK, 0.4));
  pen.stroke(closed(top), 1, d.ink, 0.9, false);
}

/**
 * A stile in an old run of fence, centred at c along u, `len` long: two
 * rails between weathered posts, and where the path crosses, a step board
 * on its own little posts either side of the fence. Shadows run long.
 */
export function stile(d: Draw, c: Pt, u: Pt, len: number, rng: Rng): void {
  const n = pt(-u.y, u.x);
  const at = (s: number, t = 0): Pt => pt(c.x + u.x * s + n.x * t, c.y + u.y * s + n.y * t);
  const posts = [-len / 2, -len / 4 + (rng() - 0.5) * 8, -11, 11, len / 4 + (rng() - 0.5) * 8, len / 2];
  // Steps either side, parallel to the fence: low, so short shadows.
  const steps = [-1, 1].map((side) => rect(at(0, side * 13), u, 30, 8));
  for (const st of steps) castShadow(d, st, 7, 0.16);
  for (const side of [-1, 1]) for (const s of [-12, 12]) longShadow(d, at(s, side * 13), 4, 8, 0.12);
  // The rails: a high one throwing a long shadow, a lower one just beside it (the fence leans a little).
  const rails = [rect(at(0), u, len, 4.5, -1.2), rect(at(0), u, len - 6, 3.8, 3)];
  castShadow(d, rails[0]!, 30, 0.12);
  castShadow(d, rails[1]!, 16, 0.1);
  for (const st of steps) board(d, st, u, rng, mix(OAK, '#c2b394', 0.4));
  for (const r of rails) board(d, r, u, rng);
  for (const s of posts) {
    const p = at(s, (rng() - 0.5) * 1.5);
    fencePost(d, p, Math.abs(s) === 11 ? 6.5 : 5.5, rng);
    for (let k = 0; k < 6; k++) {
      const a = rng() * TAU;
      const b = polar(p, a, 6);
      d.pen.hair([b, polar(b, a + (rng() - 0.5) * 0.8, 4 + rng() * 5)], 0.8, mix(LEAF, MOSS, rng()), 0.75);
    }
  }
}

/** A molehill: a heap of fresh crumbly earth washed brown, lit on its upper-left, stippled with grains, a few clods outlined, crumbs spilt round it. */
export function molehill(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const mound = blob(c, r, r * 0.9, rng, 0.22, 36, rng() * TAU).map((p) => {
    const k = 1 + (rng() - 0.5) * 0.14;
    return pt(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k);
  });
  castShadow(d, mound, r * 0.25, 0.14);
  // Grass pressed flat round its foot.
  for (let k = 0; k < 18; k++) {
    const a = rng() * TAU;
    const p = polar(c, a, r * (0.85 + rng() * 0.15));
    pen.hair([p, polar(p, a + (rng() - 0.5) * 0.6, 4 + rng() * 6)], 0.8, mix(LEAF, MOSS, rng()), 0.7);
  }
  body(d, mound, SOIL, 0.7);
  const lit = pt(c.x - SHADOW.x * r * 0.3, c.y - SHADOW.y * r * 0.3);
  pen.clipped(mound, () => {
    pen.fill(blob(lit, r * 0.6, r * 0.5, rng, 0.25, 16), SOIL_LIT, 0.6);
    pen.fill(blob(lit, r * 0.3, r * 0.25, rng, 0.25, 12), PAPER_FILL, 0.18);
    // Grains: light ones on the lit side, dark on the shaded.
    pen.stipple(mound, Math.round(r * 9), (x, y) => Math.max(0.1, 1 - Math.hypot(x - lit.x, y - lit.y) / r), 0.55, mix(SOIL_LIT, PAPER_FILL, 0.35));
    pen.stipple(mound, Math.round(r * 9), (x, y) => Math.min(1, Math.hypot(x - lit.x, y - lit.y) / r), 0.55, mix(SOIL, d.ink, 0.45));
    // A few clods, each with a dark underside.
    for (let k = 0; k < 6; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.7);
      const s = 1.6 + rng() * 1.6;
      const clod = blob(p, s, s * 0.8, rng, 0.25, 9);
      pen.fill(clod, mix(SOIL, SOIL_LIT, 0.5), 0.8);
      pen.hair(closed(clod).slice(3, 9), 0.45, d.ink, 0.6);
    }
  });
  pen.crescent(mound, pt(-SHADOW.x * r * 0.4, -SHADOW.y * r * 0.4), () => pen.fill(mound, mix(SOIL, d.ink, 0.35), 0.4));
  pen.crescent(mound, pt(-SHADOW.x * r * 0.3, -SHADOW.y * r * 0.3), () => pen.hatch(mound, 2.2, 0.9, 0.4, { color: d.ink, alpha: 0.28 }));
  pen.hair(closed(mound), 0.6, d.ink, 0.45);
  for (let k = 0; k < 14; k++) {
    const p = polar(c, rng() * TAU, r * (1 + rng() * 0.5));
    const s = 0.6 + rng() * 1.1;
    pen.fill(oval(p.x, p.y, s, s * 0.8, 7), rng() < 0.5 ? SOIL : SOIL_LIT, 0.75);
  }
}
