import { createRng, type Rng } from '../../logic/rng';
import { arc, blob, body, castShadow, outline, polar, SHADOW } from '../groundKit';
import { bezier, closed, type Draw, oval, pt, shade, TAU } from '../kit';
import { MOSS, PAPER_FILL, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { IRON, LICHEN, OAK, OAK_DARK, STRAW, STRAW_DEEP, STRAW_LIT, WEATHERED, WEATHERED_DARK } from './farmKit';

/**
 * The farm's solid things seen from above, each filling its collision
 * shape, lit from the upper left with its shadow thrown down-right: a hay
 * bale, a field stone, a fence post with the stubs of its broken rails, a
 * galvanised water trough, a barrel. Board coordinates.
 */
const TWINE = '#efe2bd';
const TIN = '#b7bcc0';
const TIN_DEEP = '#6f7780';
const WATER = '#5d7f86';
const WATER_DEEP = '#2f4a52';
const SKY = '#dfe9ea';
const ROCK_WARM = '#c7b28d';
const ROCK_COOL = '#a9aea6';
const STAVE = '#a87a4c';

export const rngAt = (x: number, y: number, k = 0): Rng => createRng(Math.round(x * 131 + y * 71 + k * 977));

/** The convex hull of a set of points (monotone chain). */
function hull(points: readonly Pt[]): Pt[] {
  const ps = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: readonly Pt[]): Pt[] => {
    const out: Pt[] = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(ps), ...half([...ps].reverse())];
}

/** The shadow of a tall thing: its outline swept down-right out to `reach`, deepest near its foot. */
export function tallShadow(d: Draw, shape: readonly Pt[], reach: number, alpha: number): void {
  const at = (k: number): Pt[] => shape.map((p) => pt(p.x + SHADOW.x * reach * k, p.y + SHADOW.y * reach * k));
  d.pen.fill(hull([...shape, ...at(1)]), d.ink, alpha * 0.45);
  d.pen.fill(hull([...shape, ...at(0.5)]), d.ink, alpha * 0.4);
  d.pen.fill(hull([...at(0.08), ...at(0.2)]), d.ink, alpha * 0.25);
}

/** A bale's outline along its own axis: s 0..len, t ±hw; corners rounded, sides bulging a little as packed straw does. */
function baleOutline(len: number, hw: number): [number, number][] {
  const rc = Math.min(7, hw * 0.35, len * 0.2);
  const out: [number, number][] = [];
  const side = (s0: number, s1: number, t: number, n: number): void => {
    for (let k = 0; k < n; k++) {
      const s = s0 + ((s1 - s0) * k) / n;
      out.push([s, t + Math.sign(t) * 1.6 * Math.sin((Math.PI * (s - rc)) / Math.max(1, len - 2 * rc))]);
    }
  };
  const end = (s: number, t0: number, t1: number, n: number): void => {
    for (let k = 0; k < n; k++) {
      const t = t0 + ((t1 - t0) * k) / n;
      out.push([s - Math.sign(s - len / 2) * 1.2 * Math.sin((Math.PI * (t - t0)) / (t1 - t0)), t]);
    }
  };
  const corner = (cs: number, ct: number, a0: number): void => {
    for (let k = 0; k < 4; k++) out.push([cs + Math.cos(a0 + (k / 4) * (Math.PI / 2)) * rc, ct + Math.sin(a0 + (k / 4) * (Math.PI / 2)) * rc]);
  };
  const ns = Math.max(4, Math.round(len / 6));
  const nt = Math.max(3, Math.round(hw / 4));
  side(rc, len - rc, -hw, ns);
  corner(len - rc, -hw + rc, -Math.PI / 2);
  end(len, -hw + rc, hw - rc, nt);
  corner(len - rc, hw - rc, 0);
  side(len - rc, rc, hw, ns);
  corner(rc, hw - rc, Math.PI / 2);
  end(0, hw - rc, -hw + rc, nt);
  corner(rc, -hw + rc, Math.PI);
  return out;
}

/**
 * A rectangular hay bale filling x, y, w × h: packed golden straw in
 * flakes, two bands of twine along it, bristly cut ends, a crescent of
 * shade, its shadow down-right.
 */
export function hayBale(d: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = rngAt(x, y, 1);
  const along = w >= h;
  const len = along ? w : h;
  const hw = (along ? h : w) / 2 - 1.6;
  const a = along ? pt(x, y + h / 2) : pt(x + w / 2, y);
  const u = along ? pt(1, 0) : pt(0, 1);
  const n = pt(-u.y, u.x);
  const at = (s: number, t: number): Pt => pt(a.x + u.x * s + n.x * t, a.y + u.y * s + n.y * t);
  const shape = baleOutline(len, hw).map(([s, t]) => at(s, t));
  tallShadow(d, shape, 16, 0.34);
  body(d, shape, mix(STRAW, rng() < 0.5 ? STRAW_DEEP : '#c9b47a', rng() * 0.3), 0.75);
  pen.clipped(shape, () => {
    for (let k = 0; k < 4; k++) pen.fill(closed([at(rng() * len, -hw), at(rng() * len, hw), at(rng() * len, hw * (rng() - 0.5))]), rng() < 0.5 ? STRAW_LIT : STRAW_DEEP, 0.12);
    // The flakes the baler packed it in: soft breaks across, each flake a touch different.
    const cuts: number[] = [0];
    for (let s = 8 + rng() * 6; s < len - 6; s += 9 + rng() * 5) cuts.push(s);
    cuts.push(len);
    for (let i = 0; i + 1 < cuts.length; i++) {
      if (rng() < 0.4) pen.fill([at(cuts[i]!, -hw - 2), at(cuts[i + 1]!, -hw - 2), at(cuts[i + 1]!, hw + 2), at(cuts[i]!, hw + 2)], rng() < 0.5 ? STRAW_LIT : STRAW_DEEP, 0.1);
      if (i > 0) pen.hair([at(cuts[i]!, -hw), at(cuts[i]! + (rng() - 0.5) * 3, 0), at(cuts[i]! + (rng() - 0.5) * 3, hw)], 0.55, mix(STRAW_DEEP, d.ink, 0.4), 0.4);
    }
    // Loose stalks over the top, mostly lying along the bale.
    const count = Math.round((len * hw) / 5);
    ctx.save();
    ctx.lineCap = 'round';
    const base = Math.atan2(u.y, u.x);
    for (const [colour, alpha, wd] of [[STRAW_DEEP, 0.55, 0.8], [STRAW_LIT, 0.85, 0.9], ['#8a6a2c', 0.4, 0.6]] as const) {
      ctx.strokeStyle = rgba(colour, alpha);
      ctx.lineWidth = wd;
      ctx.beginPath();
      for (let k = 0; k < count / 3; k++) {
        const p = at(rng() * len, (rng() * 2 - 1) * hw);
        const ang = base + (rng() - 0.5) * (rng() < 0.8 ? 0.9 : 3);
        const l = 3 + rng() * 7;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(ang) * l, p.y + Math.sin(ang) * l);
      }
      ctx.stroke();
    }
    ctx.restore();
  });
  pen.crescent(shape, pt(-SHADOW.x * hw * 0.35, -SHADOW.y * hw * 0.35), () => pen.fill(shape, mix(STRAW_DEEP, d.ink, 0.35), 0.38));
  pen.crescent(shape, pt(SHADOW.x * 3, SHADOW.y * 3), () => pen.fill(shape, PAPER_FILL, 0.32));
  shade(d, shape, 0.22);
  for (const k of [-0.5, 0.5]) {
    const steps = Math.max(3, Math.round(len / 10));
    const line = Array.from({ length: steps + 1 }, (_, i) => at(1 + ((len - 2) * i) / steps, hw * k + Math.sin(i * 1.3) * 0.4));
    pen.stroke(line.map((p) => pt(p.x + SHADOW.x * 1.5, p.y + SHADOW.y * 1.5)), 1.5, d.ink, 0.25, false);
    pen.stroke(line, 2, TWINE, 0.95, false);
    pen.hair(line, 0.45, mix(STRAW_DEEP, d.ink, 0.5), 0.55);
  }
  for (const s of [0, len]) {
    for (let k = 0; k < Math.round(hw / 2.5); k++) {
      const p = at(s, (rng() * 2 - 1) * (hw - 3));
      const ang = Math.atan2(u.y, u.x) + (s === 0 ? Math.PI : 0) + (rng() - 0.5) * 1.1;
      pen.hair([p, polar(p, ang, 2.5 + rng() * 4)], 0.55, rng() < 0.5 ? STRAW_DEEP : '#7d5e28', 0.75);
    }
  }
  pen.stroke(closed(shape), 1.2, d.ink, 0.9);
}

/** A lumpy round outline filling radius r round c: a stone's. */
function stoneRound(c: Pt, r: number, rng: Rng): Pt[] {
  const n = 9 + Math.floor(rng() * 3);
  const corners = Array.from({ length: n }, (_, i) => polar(c, ((i + rng() * 0.5) / n) * TAU, r * (0.9 + rng() * 0.12)));
  return corners.flatMap((p, i) => {
    const a = corners[(i - 1 + n) % n]!;
    const b = corners[(i + 1) % n]!;
    return bezier(pt((a.x + p.x) / 2, (a.y + p.y) / 2), p, pt((p.x + b.x) / 2, (p.y + b.y) / 2), 4).slice(0, 4);
  });
}

/** A field stone, radius r: a rounded boulder half sunk in the turf, lit top, bedding lines, lichen and moss, hatched on its shady side. */
export function fieldStone(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 2);
  const shape = stoneRound(c, r, rng);
  castShadow(d, shape, r * 0.4, 0.13);
  castShadow(d, shape, r * 0.22, 0.13);
  body(d, shape, mix(rng() < 0.5 ? ROCK_WARM : ROCK_COOL, '#9a948a', 0.35 + rng() * 0.3), 0.85);
  const turn = rng() * TAU;
  pen.clipped(shape, () => {
    pen.fill(shape, STONE_DARK, 0.2);
    pen.fill(blob(pt(c.x - SHADOW.x * r * 0.28, c.y - SHADOW.y * r * 0.28), r * 0.6, r * 0.5, rng, 0.2, 18, turn), PAPER_FILL, 0.24);
    for (let k = -2; k <= 2; k++) {
      const o = polar(c, turn + Math.PI / 2, k * r * 0.34 + (rng() - 0.5) * 5);
      pen.hair(arc(polar(o, turn, -r * 1.2), polar(o, turn, r * 1.2), (rng() - 0.5) * r * 0.4, 10), 0.5, d.ink, 0.18 + rng() * 0.12);
    }
    for (let k = 0; k < 4; k++) pen.fill(blob(polar(c, rng() * TAU, rng() * r * 0.6), r * (0.15 + rng() * 0.2), r * (0.1 + rng() * 0.12), rng, 0.3, 14), STONE_DARK, 0.1);
    pen.stipple(shape, Math.round(r * 9), () => 0.6, 0.6, STONE_DARK);
    pen.stipple(shape, Math.round(r * 3), () => 0.5, 0.9, '#5e5a54');
    pen.stipple(shape, Math.round(r * 2), () => 0.6, 0.5, PAPER_FILL);
    for (let k = 0; k < 2 + Math.floor(r / 14); k++) {
      const p = polar(c, rng() * TAU, rng() * r * 0.7);
      const lr = 2.5 + rng() * 4;
      const lich = blob(p, lr, lr * 0.85, rng, 0.25, 14);
      pen.fill(lich, rng() < 0.6 ? LICHEN : '#d9d8cc', 0.6);
      pen.hair(closed(lich), 0.4, d.ink, 0.3);
    }
    // Moss in the damp crease where it meets the ground, on the shady side.
    for (let k = 0; k < r * 0.9; k++) {
      const p = polar(c, 1.0 + (rng() - 0.5) * 2.2, r * (0.78 + rng() * 0.25));
      pen.fill(oval(p.x, p.y, 1.4 + rng() * 2, 1.1 + rng() * 1.5, 8), rng() < 0.4 ? '#5f8f4e' : MOSS, 0.6);
    }
  });
  pen.crescent(shape, pt(-SHADOW.x * r * 0.25, -SHADOW.y * r * 0.25), () => pen.fill(shape, mix(STONE_DARK, d.ink, 0.3), 0.5));
  pen.crescent(shape, pt(SHADOW.x * r * 0.12, SHADOW.y * r * 0.12), () => pen.fill(shape, PAPER_FILL, 0.3));
  shade(d, shape, 0.38, r > 24);
  const start = polar(c, rng() * TAU, r * 0.95);
  pen.stroke([start, polar(start, Math.atan2(c.y - start.y, c.x - start.x) + 0.3, r * 0.35), polar(start, Math.atan2(c.y - start.y, c.x - start.x) - 0.1, r * 0.6)], 0.8, d.ink, 0.7, false);
  pen.stroke(closed(shape), 1.6, d.ink, 0.95);
}

/** A rail's broken stub from a post side, along u, `len` long, `wide` across: grey board, a split end. */
function railStub(d: Draw, from: Pt, u: Pt, len: number, wide: number, rng: Rng): void {
  const n = pt(-u.y, u.x);
  const at = (s: number, t: number): Pt => pt(from.x + u.x * s + n.x * t, from.y + u.y * s + n.y * t);
  const jag = Array.from({ length: 4 }, (_, i) => at(len - (i % 2 ? 2.5 : 0) - rng() * 1.5, wide / 2 - (wide * i) / 3));
  const shape = [at(0, -wide / 2), ...[...jag].reverse(), at(0, wide / 2)];
  tallShadow(d, shape, 11, 0.24);
  body(d, shape, mix(WEATHERED, '#9a8f7a', rng() * 0.5), 0.82);
  d.pen.hair([at(1, -0.5), at(len - 2, 0.4)], 0.4, WEATHERED_DARK, 0.6);
  d.pen.crescent(shape, pt(-SHADOW.x * 1.4, -SHADOW.y * 1.4), () => d.pen.fill(shape, WEATHERED_DARK, 0.35));
  d.pen.stroke(outline(shape, 3), 0.7, d.ink, 0.85, false);
}

/** An old fence post, radius r: a square-sawn top gone grey and split, end grain, lichen, stubs of its broken rails, its long shadow. */
export function fencePost(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 3);
  const turn = (rng() - 0.5) * 0.3;
  const u = pt(Math.cos(turn), Math.sin(turn));
  const s = r * 0.72;
  const corners = [pt(-s, -s), pt(s, -s), pt(s, s), pt(-s, s)].map((p) => pt(c.x + p.x * u.x - p.y * u.y, c.y + p.x * u.y + p.y * u.x));
  const top = outline(corners, 2).slice(0, -1).map((p) => {
    const k = Math.hypot(p.x - c.x, p.y - c.y) > s * 1.25 ? 0.9 : 1;
    return pt(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k);
  });
  tallShadow(d, top, r * 4.5, 0.4);
  for (const side of [-1, 1]) railStub(d, polar(c, turn + (side < 0 ? Math.PI : 0), s - 1), pt(u.x * side, u.y * side), 7 + rng() * 4, 4.5, rng);
  body(d, top, mix(WEATHERED, WEATHERED_DARK, 0.35), 0.85);
  pen.clipped(top, () => {
    const pith = polar(c, turn + 0.8, s * 0.3);
    for (let k = 1; k <= 4; k++) pen.hair(closed(blob(pith, s * k * 0.28, s * k * 0.25, rng, 0.1, 12, turn)), 0.4, WEATHERED_DARK, 0.6);
    pen.fill(blob(polar(c, turn + 3.6, s * 0.55), s * 0.45, s * 0.32, rng, 0.3, 10), LICHEN, 0.65);
    pen.stipple(top, Math.round(r * 5), () => 0.6, 0.4, WEATHERED_DARK);
  });
  pen.stroke([polar(c, turn + 0.4, s * 1.1), polar(c, turn + 0.55, s * 0.4), polar(c, turn + 0.3, s * 0.05)], 0.8, d.ink, 0.85, false);
  pen.crescent(top, pt(-SHADOW.x * s * 0.4, -SHADOW.y * s * 0.4), () => pen.fill(top, WEATHERED_DARK, 0.4));
  pen.crescent(top, pt(SHADOW.x * 1.5, SHADOW.y * 1.5), () => pen.fill(top, PAPER_FILL, 0.3));
  pen.stroke(closed(top), 1.1, d.ink, 0.95, false);
}

/** A rounded rect x, y, w × h with corner radius rc, as a polygon. */
export function roundRect(x: number, y: number, w: number, h: number, rc: number): Pt[] {
  const corners: [number, number, number][] = [[x + w - rc, y + rc, -Math.PI / 2], [x + w - rc, y + h - rc, 0], [x + rc, y + h - rc, Math.PI / 2], [x + rc, y + rc, Math.PI]];
  return corners.flatMap(([cx, cy, a0]) => Array.from({ length: 6 }, (_, i) => polar(pt(cx, cy), a0 + (i / 5) * (Math.PI / 2), rc)));
}

/**
 * A galvanised water trough filling x, y, w × h: a rolled tin rim with its
 * spangle, rivets at the ends, water mirroring the sky with the rim's shade
 * across it, a floating leaf and straw, its shadow down-right.
 */
export function trough(d: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = d;
  const rng = rngAt(x, y, 4);
  const rc = Math.min(16, h * 0.38);
  const outer = roundRect(x, y, w, h, rc);
  const rim = 5;
  const inner = roundRect(x + rim, y + rim, w - rim * 2, h - rim * 2, rc - rim * 0.6);
  tallShadow(d, outer, 14, 0.36);
  body(d, outer, TIN, 0.8);
  pen.clipped(outer, () => {
    pen.stipple(outer, Math.round(w * 3), () => 0.6, 0.7, PAPER_FILL);
    pen.stipple(outer, Math.round(w * 2), () => 0.6, 0.6, TIN_DEEP);
  });
  pen.crescent(outer, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(outer, TIN_DEEP, 0.5));
  // The water.
  pen.fill(inner, WATER, 0.9);
  pen.clipped(inner, () => {
    const { ctx } = pen;
    const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
    g.addColorStop(0, rgba(SKY, 0.0));
    g.addColorStop(0.45, rgba(SKY, 0.55));
    g.addColorStop(0.6, rgba(SKY, 0.15));
    g.addColorStop(1, rgba(SKY, 0));
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    // The rim's shade on the water along the side nearest the light.
    pen.crescent(inner, pt(SHADOW.x * 7, SHADOW.y * 7), () => pen.fill(inner, WATER_DEEP, 0.55));
    // Ripples rung out from where a drip fell, and a few glints.
    const drip = pt(x + w * (0.6 + rng() * 0.2), y + h * 0.5);
    for (const rr of [4, 8, 13]) pen.hair(closed(oval(drip.x, drip.y, rr * 1.4, rr * 0.7, 18)), 0.5, PAPER_FILL, 0.5 - rr * 0.025);
    for (let k = 0; k < 5; k++) {
      const p = pt(x + rim + rng() * (w - rim * 2), y + rim + 4 + rng() * (h - rim * 2 - 8));
      pen.hair([p, pt(p.x + 6 + rng() * 8, p.y)], 0.6, PAPER_FILL, 0.6);
    }
    // A leaf and a few stalks of straw afloat.
    const leaf = pt(x + w * (0.2 + rng() * 0.2), y + h * 0.55);
    const tip = polar(leaf, -0.6, 9);
    const shape = [...arc(leaf, tip, 3, 5), ...arc(tip, leaf, 3, 5).slice(1)];
    castShadow(d, shape, 2, 0.25);
    body(d, shape, '#c98f46', 0.85);
    pen.hair(closed(shape), 0.4, d.ink, 0.7);
    for (let k = 0; k < 3; k++) {
      const p = pt(x + w * (0.35 + rng() * 0.4), y + rim + 3 + rng() * (h - rim * 2 - 6));
      pen.hair([p, polar(p, rng() * TAU, 6 + rng() * 5)], 0.8, STRAW, 0.9);
    }
  });
  pen.stroke(closed(inner), 1, d.ink, 0.85, false);
  // The rolled rim's lit crest, and rivets at the ends.
  pen.hair(closed(roundRect(x + 2, y + 2, w - 4, h - 4, rc - 1.5)).slice(0, 14), 0.9, PAPER_FILL, 0.7);
  for (const ex of [x + 2.5, x + w - 2.5]) for (const t of [0.3, 0.5, 0.7]) pen.dot(ex, y + h * t, 0.8, TIN_DEEP, 0.9);
  pen.stroke(closed(outer), 1.4, d.ink, 0.95);
}

/**
 * A barrel standing on end, radius r, seen from above: the iron hoop at
 * its chime, the stave ends round the head, head boards with a bung, and
 * its tall shadow.
 */
export function barrel(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 5);
  const rim = oval(c.x, c.y, r, r, 40);
  tallShadow(d, rim, r * 0.9, 0.36);
  body(d, rim, STAVE, 0.82);
  // Stave ends: a ring of short boards round the head.
  const chime = r - 6;
  const n = 18;
  const ph = rng() * TAU;
  pen.clipped(rim, () => {
    for (let k = 0; k < n; k++) {
      const a = ph + (k / n) * TAU;
      pen.hair([polar(c, a, chime - 1), polar(c, a, r)], 0.6, OAK_DARK, 0.75);
      pen.fill(closed([polar(c, a + 0.04, chime), polar(c, a + TAU / n - 0.04, chime), polar(c, a + TAU / n - 0.04, r), polar(c, a + 0.04, r)]), rng() < 0.5 ? '#c49a6a' : OAK, 0.18);
    }
  });
  // The head, sunk a little inside the chime: boards across with their grain.
  const head = oval(c.x, c.y, chime, chime, 36);
  const boards = [-0.62, -0.2, 0.22, 0.62];
  const ba = rng() * Math.PI;
  const u = pt(Math.cos(ba), Math.sin(ba));
  const nn = pt(-u.y, u.x);
  pen.fill(head, mix(STAVE, '#c9a274', 0.55), 0.9);
  pen.clipped(head, () => {
    for (let i = 0; i < boards.length; i++) {
      const t = boards[i]! * chime;
      const tone = mix('#c9a274', OAK, rng() * 0.5);
      const bw = chime * 0.42;
      const quad = [pt(c.x + nn.x * (t - bw / 2) - u.x * r, c.y + nn.y * (t - bw / 2) - u.y * r), pt(c.x + nn.x * (t - bw / 2) + u.x * r, c.y + nn.y * (t - bw / 2) + u.y * r), pt(c.x + nn.x * (t + bw / 2) + u.x * r, c.y + nn.y * (t + bw / 2) + u.y * r), pt(c.x + nn.x * (t + bw / 2) - u.x * r, c.y + nn.y * (t + bw / 2) - u.y * r)];
      pen.fill(quad, tone, 0.35);
      for (let g = 0; g < 3; g++) {
        const gt = t + (rng() - 0.5) * bw * 0.8;
        pen.hair([pt(c.x + nn.x * gt - u.x * r, c.y + nn.y * gt - u.y * r), pt(c.x + nn.x * (gt + (rng() - 0.5) * 2) + u.x * (rng() - 0.5) * 6, c.y + nn.y * gt), pt(c.x + nn.x * gt + u.x * r, c.y + nn.y * gt + u.y * r)], 0.4, OAK_DARK, 0.4);
      }
      if (i > 0) {
        const jt = t - bw / 2 - chime * 0.0;
        pen.hair([pt(c.x + nn.x * jt - u.x * r, c.y + nn.y * jt - u.y * r), pt(c.x + nn.x * jt + u.x * r, c.y + nn.y * jt + u.y * r)], 0.8, d.ink, 0.7);
      }
    }
    // The chime's shade falls across the head from the side nearest the light.
    pen.crescent(head, pt(SHADOW.x * 5, SHADOW.y * 5), () => pen.fill(head, OAK_DARK, 0.4));
  });
  const bung = polar(c, ba + Math.PI / 2, chime * 0.45);
  pen.fill(oval(bung.x, bung.y, 3.4, 3.4, 12), '#3a2a1c', 0.9);
  pen.fill(oval(bung.x - 0.4, bung.y - 0.5, 2.4, 2.4, 10), '#b48a5a', 0.95);
  pen.hair(closed(oval(bung.x, bung.y, 3.4, 3.4, 12)), 0.5, d.ink, 0.85);
  pen.hair(closed(head), 0.9, d.ink, 0.85);
  // The iron hoop round the chime, lit on its far side.
  const hoop = oval(c.x, c.y, r - 1.6, r - 1.6, 40);
  pen.stroke(closed(hoop), 3.2, IRON, 0.92, false);
  pen.hair(closed(oval(c.x, c.y, r - 1.2, r - 1.2, 40)).slice(26, 38), 0.7, '#c3c6cc', 0.75);
  for (let k = 0; k < 6; k++) {
    const a = ph + (k / 6) * TAU;
    const p = polar(c, a, r - 1.6);
    pen.dot(p.x, p.y, 0.8, '#c3c6cc', 0.8);
  }
  pen.crescent(rim, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(rim, d.ink, 0.18));
  pen.stroke(closed(rim), 1.3, d.ink, 0.95);
}
