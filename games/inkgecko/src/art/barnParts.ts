import { createRng, type Rng } from '../logic/rng';
import { body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, lerp, normals, pt, ribbon, shade, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { coverEnds, coverHalf, unit } from './tunnel';
import { mix, rgba } from './wash';

/**
 * The barn's covers, deck and seat, and the hay bale they share: a row of
 * bales laid end to end over a stretch of groove, a heavy squared-oak beam
 * bridge with iron straps carrying a groove over another, and a single
 * square bale for the gecko to sit on.
 */
export const STRAW = '#d9b862';
export const STRAW_DEEP = '#a5823a';
export const STRAW_LIT = '#f2e2a4';
const TWINE = '#efe2bd';
export const OAK = '#8a6440';
export const OAK_DARK = '#5a3d26';
const END_GRAIN = '#c49a6a';
const IRON = '#3f4048';
/** The ground tone under a raised groove in the barn: the beam bridge's planking. */
export const BARN_BED = '#d2b98e';
/** One bale's length in groove points (every ~4 units), give or take, and how far each runs on under the next. */
const BALE = 17;
const BALE_RUN_ON = 12;

/** The furthest any of pts[i..j] strays from the chord pts[i]→pts[j]. */
function bowOf(pts: readonly Pt[], i: number, j: number): number {
  const a = pts[i]!;
  const u = unit(a, pts[j]!);
  let m = 0;
  for (let k = i; k <= j; k++) m = Math.max(m, Math.abs((pts[k]!.x - a.x) * -u.y + (pts[k]!.y - a.y) * u.x));
  return m;
}

/** A bale's outline in its own frame: s along 0..len, t across ±hw; corners rounded, sides bulging a little as packed straw does. */
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
      out.push([s + Math.sign(s - len / 2) * 1.1 * Math.sin((Math.PI * (t - t0)) / (t1 - t0)), t]);
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
 * A small rectangular hay bale lying from a to b, hw either side: packed
 * golden straw in flakes, two bands of sisal twine along it, bristly cut
 * ends, a crescent of shade and its shadow `lift` away; `weathered` (0..1)
 * greys the straw, as last year's hay. Returns its outline.
 */
export function bale(d: Draw, a: Pt, b: Pt, hw: number, rng: Rng, lift = 9, weathered = 0): Pt[] {
  const { pen } = d;
  const { ctx } = pen;
  const u = unit(a, b);
  const n = pt(-u.y, u.x);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const at = (s: number, t: number): Pt => pt(a.x + u.x * s + n.x * t, a.y + u.y * s + n.y * t);
  const shape = baleOutline(len, hw).map(([s, t]) => at(s, t));
  castShadow(d, shape, lift, 0.12);
  castShadow(d, shape, lift * 0.55, 0.12);
  const tone = mix(mix(STRAW, rng() < 0.5 ? STRAW_DEEP : '#c9b47a', rng() * 0.35), '#b3a990', weathered);
  body(d, shape, tone, 0.72);
  pen.clipped(shape, () => {
    // Uneven colour where the wash pooled, paler towards the light.
    for (let k = 0; k < 3; k++) pen.fill(closed([at(rng() * len, -hw), at(rng() * len, hw), at(rng() * len, hw * (rng() - 0.5))]), rng() < 0.5 ? STRAW_LIT : STRAW_DEEP, 0.12);
    // Loose stalks over the top, mostly lying along the bale.
    const count = Math.round((len * hw) / 7);
    ctx.save();
    ctx.lineCap = 'round';
    const base = Math.atan2(u.y, u.x);
    for (const [colour, alpha, wd] of [[STRAW_DEEP, 0.55, 0.8], [STRAW_LIT, 0.8, 0.9], ['#8a6a2c', 0.4, 0.6]] as const) {
      ctx.strokeStyle = rgba(colour, alpha);
      ctx.lineWidth = wd;
      ctx.beginPath();
      for (let k = 0; k < count / 3; k++) {
        const p = at(rng() * len, (rng() * 2 - 1) * hw);
        const ang = base + (rng() - 0.5) * (rng() < 0.8 ? 0.9 : 3);
        const l = 3 + rng() * 6;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(ang) * l, p.y + Math.sin(ang) * l);
      }
      ctx.stroke();
    }
    ctx.restore();
    // The flakes the baler packed it in: soft breaks across.
    for (let s = 6 + rng() * 6; s < len - 5; s += 9 + rng() * 5) {
      pen.hair([at(s, -hw), at(s + (rng() - 0.5) * 3, 0), at(s + (rng() - 0.5) * 3, hw)], 0.5, mix(STRAW_DEEP, d.ink, 0.4), 0.35);
    }
  });
  pen.crescent(shape, pt(-SHADOW.x * hw * 0.35, -SHADOW.y * hw * 0.35), () => pen.fill(shape, mix(STRAW_DEEP, d.ink, 0.35), 0.35));
  pen.crescent(shape, pt(SHADOW.x * 2, SHADOW.y * 2), () => pen.fill(shape, PAPER_FILL, 0.3));
  shade(d, shape, 0.22);
  // Twine: two bands along it, each with its shadow and a pen line.
  for (const k of [-0.48, 0.48]) {
    const steps = Math.max(3, Math.round(len / 10));
    const line = Array.from({ length: steps + 1 }, (_, i) => at(1 + ((len - 2) * i) / steps, hw * k + Math.sin(i * 1.3) * 0.3));
    pen.stroke(line.map((p) => pt(p.x + SHADOW.x * 1.4, p.y + SHADOW.y * 1.4)), 1.4, d.ink, 0.25, false);
    pen.stroke(line, 1.8, TWINE, 0.95, false);
    pen.hair(line, 0.45, mix(STRAW_DEEP, d.ink, 0.5), 0.55);
  }
  // Bristly cut ends: stalks poking past the outline.
  for (const s of [0, len]) {
    for (let k = 0; k < Math.round(hw / 3); k++) {
      const p = at(s, (rng() * 2 - 1) * (hw - 3));
      const out = s === 0 ? -1 : 1;
      const ang = Math.atan2(u.y, u.x) + (out < 0 ? Math.PI : 0) + (rng() - 0.5) * 1.1;
      pen.hair([p, polar(p, ang, 2.5 + rng() * 4)], 0.55, rng() < 0.5 ? STRAW_DEEP : '#7d5e28', 0.75);
    }
  }
  pen.stroke(closed(shape), 1.1, d.ink, 0.85);
  return shape;
}

/**
 * The barn's cover over a stretch of groove: hay bales laid end to end
 * along it, each running on a little under the next so they follow a curve
 * without gaps. Covers coverHalf(grooveW) either side; dark mouths at both ends.
 */
export function baleRow(d: Draw, pts: readonly Pt[], grooveW: number): void {
  if (pts.length < 2) return;
  const rng = createRng(Math.round(pts[0]!.x * 13 + pts[0]!.y * 7 + pts.length));
  coverEnds(d, pts, grooveW);
  const half = coverHalf(grooveW);
  const last = pts.length - 1;
  const cuts = [0];
  while (cuts[cuts.length - 1]! < last) cuts.push(Math.min(last, cuts[cuts.length - 1]! + BALE - 2 + Math.floor(rng() * 5)));
  if (cuts.length > 2 && last - cuts[cuts.length - 2]! < BALE / 2) cuts.splice(cuts.length - 2, 1);
  for (let k = 0; k + 1 < cuts.length; k++) {
    const [i, j] = [cuts[k]!, cuts[k + 1]!];
    const u = unit(pts[i]!, pts[j]!);
    const pre = k === 0 ? 2 : BALE_RUN_ON;
    const post = k === cuts.length - 2 ? 2 : 0;
    const a = pt(pts[i]!.x - u.x * pre, pts[i]!.y - u.y * pre);
    const b = pt(pts[j]!.x + u.x * post, pts[j]!.y + u.y * post);
    bale(d, a, b, half + bowOf(pts, i, j), rng, 10);
  }
}

/** One squared oak beam along a polyline, `wd` wide: grain, checks, shade on its far side, iron straps with rivets. */
function beam(d: Draw, line: readonly Pt[], wd: number, rng: Rng): void {
  const { pen } = d;
  const r = ribbon(line, () => wd);
  body(d, r.shape, mix(OAK, '#a07a52', rng() * 0.4), 0.82);
  pen.clipped(r.shape, () => {
    for (const k of [-0.3, 0.05, 0.35]) {
      const nrm = normals(line);
      pen.hair(line.map((p, i) => pt(p.x + nrm[i]!.x * wd * k + Math.sin(i * 0.7 + k * 9) * 0.5, p.y + nrm[i]!.y * wd * k)), 0.45, OAK_DARK, 0.5);
    }
    if (line.length > 8) {
      const i = 2 + Math.floor(rng() * (line.length - 8));
      pen.stroke(line.slice(i, i + 5), 0.9, OAK_DARK, 0.7, false);
    }
  });
  pen.crescent(r.shape, pt(-SHADOW.x * wd * 0.35, -SHADOW.y * wd * 0.35), () => pen.fill(r.shape, OAK_DARK, 0.4));
  pen.stroke(outline(r.shape, 6), 1.1, d.ink, 0.9);
  // Iron straps wrapping it, each held by a pair of rivets.
  const nrm = normals(line);
  for (let i = 4; i < line.length - 3; i += 11) {
    const c = line[i]!;
    const n = nrm[i]!;
    const v = unit(line[i - 1]!, line[i + 1]!);
    const strap = [pt(c.x + n.x * (wd / 2 + 0.8) - v.x * 2.4, c.y + n.y * (wd / 2 + 0.8) - v.y * 2.4), pt(c.x + n.x * (wd / 2 + 0.8) + v.x * 2.4, c.y + n.y * (wd / 2 + 0.8) + v.y * 2.4), pt(c.x - n.x * (wd / 2 + 0.8) + v.x * 2.4, c.y - n.y * (wd / 2 + 0.8) + v.y * 2.4), pt(c.x - n.x * (wd / 2 + 0.8) - v.x * 2.4, c.y - n.y * (wd / 2 + 0.8) - v.y * 2.4)];
    pen.fill(strap, IRON, 0.85);
    pen.hair(closed(strap), 0.5, d.ink, 0.8);
    for (const s of [-0.25, 0.25]) pen.dot(c.x + n.x * wd * s, c.y + n.y * wd * s, 0.9, '#c9c3b6', 0.85);
  }
}

/**
 * The barn's deck: a heavy beam bridge from the hayloft. Oak planks laid
 * across, a squared oak beam with iron straps along each side, and a
 * square post with its end grain at each corner.
 */
export function beamDeck(d: Draw, pts: readonly Pt[], half: number, _grooveW: number, rng: Rng): void {
  const { pen } = d;
  const deck = ribbon(pts, () => half * 2 + 8);
  const last = pts.length - 1;
  for (let i = 0; i < last; i += 3) {
    const j = Math.min(last, i + 3);
    const plank = [deck.top[i]!, lerp(deck.top[i]!, deck.top[j]!, 0.86), lerp(deck.bot[i]!, deck.bot[j]!, 0.86), deck.bot[i]!];
    body(d, plank, mix(BARN_BED, OAK, 0.25 + rng() * 0.3), 0.75);
    pen.crescent(plank, pt(-SHADOW.x * 1.6, -SHADOW.y * 1.6), () => pen.fill(plank, OAK_DARK, 0.35));
    pen.hair(outline(plank, 5), 0.55, d.ink, 0.7);
  }
  const nrm = normals(pts);
  for (const s of [1, -1]) {
    const line = pts.map((p, i) => pt(p.x + nrm[i]!.x * s * (half - 5), p.y + nrm[i]!.y * s * (half - 5)));
    beam(d, line, 11, rng);
  }
  for (const i of [0, last]) {
    for (const s of [1, -1]) {
      const c = pt(pts[i]!.x + nrm[i]!.x * s * (half - 5), pts[i]!.y + nrm[i]!.y * s * (half - 5));
      const turn = Math.atan2(nrm[i]!.y, nrm[i]!.x);
      const post = [0, 1, 2, 3].map((k) => polar(c, turn + Math.PI / 4 + (k * TAU) / 4, 10));
      castShadow(d, post, 9, 0.22);
      body(d, post, END_GRAIN, 0.8);
      for (const rr of [6.5, 4, 1.8]) pen.hair(closed([0, 1, 2, 3].map((k) => polar(c, turn + Math.PI / 4 + (k * TAU) / 4 + rr * 0.02, rr))), 0.45, OAK_DARK, 0.6);
      pen.crescent(post, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(post, OAK_DARK, 0.4));
      pen.stroke(outline(post, 4), 1.1, d.ink, 0.95, false);
    }
  }
}

/**
 * A single square hay bale seen from above, radius ~r at c, for the gecko
 * to sit on: last year's hay, greyed so a tinted gecko reads on it, loose
 * straw scattered round its foot.
 */
export function balePad(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = createRng(Math.round(c.x * 31 + c.y * 17));
  // Straw spilt round it on the floor.
  for (let k = 0; k < 26; k++) {
    const p = polar(c, rng() * TAU, r * (0.85 + rng() * 0.35));
    const a = rng() * TAU;
    pen.hair([p, polar(p, a, 5 + rng() * 8)], 0.8, rng() < 0.5 ? STRAW_DEEP : STRAW, 0.8);
  }
  const turn = (rng() - 0.5) * 0.16;
  const along = pt(Math.cos(turn), Math.sin(turn));
  const hl = r * 0.8;
  bale(d, pt(c.x - along.x * hl, c.y - along.y * hl), pt(c.x + along.x * hl, c.y + along.y * hl), r * 0.74, rng, 8, 0.55);
}
