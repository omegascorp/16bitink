import type { Rng } from '../../logic/rng';
import { bezier, closed, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { DEPTH, frontArc, P, roundWash, type Surface } from '../sites/build';
import { blob, boundsOf, dab, flat, glow, groundShadow, LIGHT, mix, paint, SHADOW, soft, sparkle } from '../sites/paintKit';
import { atmosphere, BLUE, disc, door, GOLD, roundBody, slab, box, surround, window } from './hallParts';
import { townSprite } from './townSprite';
import { SLOTS, type TownDrawer } from './types';

/**
 * The mage guild: a slender round tower of pale stone under a Crown-blue
 * spire, an armillary star turning at its tip and a faint arcane light in
 * its windows. The second level adds a corbelled gallery and a narrower
 * upper storey, the spire raised on top; the base is the same tower.
 */

const BOUNDS = boundsOf(SLOTS.guild.frame);
const STONE_PALE = '#a29a88';
const ARCANE = '#8fb8ff';
const ARCANE_DEEP = '#9a7cf0';
/** The tower's axis stands this far back from the anchor (its plinth's front edge at the anchor). */
const ZC = 30;
const R = 23;
const SHAFT = 106;

/** A point on a round tower's face: `u` round from its front centre (units of arc), `v` up from `base`. */
const drumAt = (base: Pt, r: number): Surface => (u, v) => {
  const t = Math.PI / 2 + u / r;
  return pt(base.x - r * Math.cos(t), base.y + r * DEPTH * Math.sin(t) - v);
};

/** Coursed stone round a drum: joints following its curve, staggered, some stones tinted, a few lit. */
function towerStones(d: Draw, rng: Rng, base: Pt, r: number, h: number, clip: readonly Pt[], color: string, course = 6.6): void {
  const { pen } = d;
  pen.clipped(clip, () => {
    for (let v = 0, k = 0; v < h; v += course, k++) {
      const arc = frontArc(base.x, base.y - v, r, 24);
      pen.hair(arc, 0.42, d.ink, 0.38);
      pen.hair(arc.map((p) => pt(p.x, p.y - 0.8)), 0.5, LIGHT, 0.25);
      const n = Math.round((Math.PI * r) / 11);
      for (let i = 0; i < n; i++) {
        const t = ((i + (k % 2) * 0.5 + rng() * 0.2) / n) * Math.PI;
        const x = base.x - r * Math.cos(t);
        const y = base.y - v + r * DEPTH * Math.sin(t);
        pen.hair([pt(x, y - 0.3), pt(x, y - course + 0.3)], 0.4, d.ink, 0.38 * Math.sin(t) + 0.1);
        if (rng() < 0.35) {
          const t1 = t + (Math.PI / n) * (0.8 + rng() * 0.2);
          const x1 = base.x - r * Math.cos(t1);
          const y1 = base.y - v + r * DEPTH * Math.sin(t1);
          pen.fill([pt(x, y - 0.4), pt(x1, y1 - 0.4), pt(x1, y1 - course + 0.4), pt(x, y - course + 0.4)], rng() < 0.4 ? mix(color, LIGHT, 0.5) : mix(color, '#604d37', 0.45), 0.16 + rng() * 0.1);
        }
      }
    }
    for (let i = 0; i < 6; i++) dab(d, [pt(base.x - r + rng() * r * 2, base.y - rng() * h), pt(base.x - r + rng() * r * 2, base.y - rng() * h), pt(base.x - r + rng() * r * 2, base.y - rng() * h)], mix(color, SHADOW, 0.3), 0.08, 4);
    soft(pen.ctx, 3, () => pen.fill([...frontArc(base.x, base.y - 9, r + 2, 18), pt(base.x + r + 2, base.y + 16), pt(base.x - r - 2, base.y + 16)], mix(color, SHADOW, 0.55), 0.22));
  });
}

/** A round storey: shaft washed round, coursed, and lined. Returns its body. */
function storey(d: Draw, rng: Rng, base: Pt, r: number, h: number, color: string): Pt[] {
  const body = roundBody(d, base, r, h, color, 0.3);
  towerStones(d, rng, base, r, h, body, color);
  d.pen.stroke([...body, body[0]!], 0.65, d.ink, 0.9);
  return body;
}

/** A ring of corbels under a projecting band: the tower's crown or a gallery's floor. */
function corbels(d: Draw, base: Pt, r: number, v: number, n: number, color: string): void {
  const { pen } = d;
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n) * Math.PI;
    const k = Math.sin(t);
    const x = base.x - r * Math.cos(t);
    const y = base.y + r * DEPTH * k - v;
    const w = 1.8 * k + 0.4;
    const c = [pt(x - w, y), pt(x + w, y), pt(x + w * 0.8, y + 3.2), pt(x, y + 5), pt(x - w * 0.8, y + 3.2)];
    pen.fill(c.map((p) => pt(p.x + 0.8, p.y + 0.8)), SHADOW, 0.3);
    flat(d, c, mix(color, LIGHT, Math.cos(t) < 0 ? 0.3 : 0.05), { tone: Math.cos(t) > 0.4 ? 0.3 : 0, line: 0.4 });
  }
}

/** The rod at the spire's tip, with a gilt collar, that carries the armillary. Returns its top. */
function finialRod(d: Draw, apex: Pt): Pt {
  d.pen.stroke([pt(apex.x, apex.y + 2), pt(apex.x, apex.y - 6)], 1.2, d.ink, 0.95, false);
  d.pen.dot(apex.x, apex.y - 1, 1.6, GOLD, 1);
  return pt(apex.x, apex.y - 6);
}

/** The armillary star on the rod (painted in the air, unoutlined): gilt rings round a blue ball, a star above. Returns the star's centre. */
function armillary(d: Draw, tip: Pt, s: number): Pt {
  const { pen } = d;
  pen.stroke([tip, pt(tip.x, tip.y - s * 2.8)], 0.8, d.ink, 0.95, false);
  const c = pt(tip.x, tip.y - s * 1.2);
  const ring = (rx: number, ry: number, rot: number): Pt[] => Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return pt(c.x + x * Math.cos(rot) - y * Math.sin(rot), c.y + x * Math.sin(rot) + y * Math.cos(rot));
  });
  const ball = Array.from({ length: 16 }, (_, i) => pt(c.x + Math.cos((i / 16) * Math.PI * 2) * s * 0.3, c.y + Math.sin((i / 16) * Math.PI * 2) * s * 0.3));
  paint(d, ball, BLUE, { shadow: 0.4, hatch: 0, gloss: true, line: 0.4 });
  for (const [rx, ry, rot] of [[s * 0.4, s, 0], [s, s * 0.28, 0], [s, s * 0.34, -0.42]] as const) {
    const pts = ring(rx, ry, rot);
    pen.stroke(pts.map((p) => pt(p.x + 0.35, p.y + 0.35)), 1.1, d.ink, 0.55, false);
    pen.stroke(pts, 0.75, GOLD, 1, false);
    pen.stroke(pts.slice(18, 28).map((p) => pt(p.x - 0.15, p.y - 0.15)), 0.3, '#fff2c0', 0.8, false);
  }
  const st = pt(c.x, c.y - s * 1.9);
  const star = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? (i % 4 === 0 ? s * 0.9 : s * 0.6) : s * 0.24;
    return pt(st.x + Math.cos(a) * r, st.y + Math.sin(a) * r);
  });
  paint(d, star, GOLD, { shadow: 0.3, hatch: 0, gloss: true, line: 0.4 });
  return st;
}

/**
 * A slender spire over a round top: concave, washed round, laid with
 * fish-scale slates in staggered rows, a gilt band at its eave. Returns
 * its apex.
 */
function spire(d: Draw, rng: Rng, top: Pt, r: number, rise: number): Pt {
  const { pen } = d;
  const apex = pt(top.x, top.y - rise);
  const half = (t: number): number => { const u = 1 - t; return r * (u * u + 2 * u * t * 0.3); };
  const left = Array.from({ length: 15 }, (_, i) => pt(top.x - half(1 - i / 14), top.y - rise * (1 - i / 14)));
  const shape = [...left, ...frontArc(top.x, top.y, r, 24).slice(1), ...left.map((p) => pt(2 * top.x - p.x, p.y)).reverse().slice(1, -1)];
  roundWash(d, shape, top.x - r, top.x + r, BLUE, 0.3);
  pen.clipped(shape, () => {
    const rows = Math.round(rise / 4.2);
    for (let k = 0; k < rows; k++) {
      const t = k / rows;
      const rr = half(t);
      const cy = top.y - rise * t;
      const step = rise / rows;
      const n = Math.max(3, Math.round(rr / 2.6));
      for (let i = 0; i < n; i++) {
        const a0 = ((i + (k % 2) * 0.5) / n) * Math.PI;
        const a1 = ((i + 1 + (k % 2) * 0.5) / n) * Math.PI;
        if (a0 >= Math.PI) continue;
        const p0 = pt(top.x - rr * Math.cos(a0), cy + rr * DEPTH * Math.sin(a0));
        const p1 = pt(top.x - rr * Math.cos(Math.min(a1, Math.PI)), cy + rr * DEPTH * Math.sin(Math.min(a1, Math.PI)));
        const sag = pt((p0.x + p1.x) / 2, (p0.y + p1.y) / 2 + step * 0.75);
        const scale = bezier(p0, sag, p1, 6);
        if (rng() < 0.3) pen.fill([...scale, pt(p1.x, p1.y - step * 0.3), pt(p0.x, p0.y - step * 0.3)], rng() < 0.5 ? mix(BLUE, LIGHT, 0.45) : mix(BLUE, SHADOW, 0.4), 0.3);
        pen.hair(scale, 0.38, d.ink, 0.45);
        pen.hair(scale.slice(1, 4).map((p) => pt(p.x - 0.2, p.y - 0.7)), 0.35, mix(BLUE, LIGHT, 0.6), 0.4);
      }
    }
    soft(pen.ctx, 1.4, () => pen.stroke(bezier(pt(top.x - r * 0.55, top.y + 2), pt(top.x - r * 0.3, top.y - rise * 0.4), pt(apex.x - 0.5, apex.y + rise * 0.12), 10), 1.6, LIGHT, 0.35, false));
  });
  const band = [...frontArc(top.x, top.y - 2.6, r * 0.98, 20), ...frontArc(top.x, top.y + 0.4, r * 1.01, 20).reverse()];
  paint(d, band, GOLD, { shadow: 0.4, hatch: 0, gloss: true, line: 0.45 });
  pen.stroke(closed(shape), 0.8, d.ink, 0.95);
  return apex;
}

/** A lucarne on the spire's front: a little stone face with an arched window holding the arcane light, under its own slated gable. Returns the window's centre. */
function lucarne(d: Draw, c: Pt, s: number): Pt {
  const { pen } = d;
  soft(pen.ctx, 1.5, () => pen.fill([pt(c.x + s, c.y + 1), pt(c.x + s * 2.6, c.y + 2), pt(c.x + s * 2.2, c.y - s * 1.8), pt(c.x + s, c.y - s * 2.2)], SHADOW, 0.3));
  const face = [pt(c.x - s, c.y), pt(c.x + s, c.y), pt(c.x + s, c.y - s * 1.5), pt(c.x - s, c.y - s * 1.5)];
  flat(d, face, STONE_PALE, { tone: 0.02, line: 0.5 });
  const w = pt(c.x, c.y - s * 0.7);
  const hole = [pt(w.x - s * 0.45, c.y - s * 0.15), ...Array.from({ length: 7 }, (_, i) => { const a = Math.PI - (i / 6) * Math.PI; return pt(w.x + Math.cos(a) * s * 0.45, w.y - s * 0.25 - Math.sin(a) * s * 0.45); }), pt(w.x + s * 0.45, c.y - s * 0.15)];
  pen.fill(hole, '#313669', 1);
  pen.clipped(hole, () => glow(pen.ctx, w, s * 0.8, ARCANE, 0.95));
  pen.stroke(closed(hole), 0.45, d.ink, 0.9);
  const roof = [pt(c.x - s * 1.45, c.y - s * 1.3), pt(c.x + s * 1.45, c.y - s * 1.3), pt(c.x + s * 0.2, c.y - s * 2.75), pt(c.x - s * 0.2, c.y - s * 2.75)];
  paint(d, roof, BLUE, { shadow: 0.35, hatch: 0, line: 0.55 });
  for (let k = 1; k < 3; k++) pen.hair([pt(c.x - s * (1.45 - k * 0.42), c.y - s * (1.3 + k * 0.48)), pt(c.x + s * (1.45 - k * 0.42), c.y - s * (1.3 + k * 0.48))], 0.35, d.ink, 0.5);
  pen.dot(c.x, c.y - s * 2.85, 0.8, GOLD, 1);
  return w;
}

/** A stone balustrade round the front of a circular walk at `c` (its floor), radius r. */
function roundBalustrade(d: Draw, c: Pt, r: number, h: number, color: string): void {
  const { pen } = d;
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI;
    const k = Math.sin(t);
    const x = c.x - r * Math.cos(t);
    const y = c.y + r * DEPTH * k;
    const w = 0.5 + 0.7 * k;
    const b = [pt(x - w, y), ...bezier(pt(x - w, y), pt(x - w * 2, y - h * 0.4), pt(x - w * 0.6, y - h + 1.6), 4).slice(1), pt(x + w * 0.6, y - h + 1.6), ...bezier(pt(x + w * 0.6, y - h + 1.6), pt(x + w * 2, y - h * 0.4), pt(x + w, y), 4).slice(1)];
    pen.fill(b, mix(color, LIGHT, Math.cos(t) < 0 ? 0.25 : 0), 1);
    pen.fill(b.map((p) => pt(p.x + w * 0.6, p.y)), mix(color, SHADOW, 0.4), 0.4);
    pen.hair(closed(b), 0.32, d.ink, 0.7);
  }
  const rail = [...frontArc(c.x, c.y - h, r + 0.6, 28), ...frontArc(c.x, c.y - h + 1.8, r + 0.6, 28).reverse()];
  flat(d, rail, mix(color, LIGHT, 0.2), { tone: -0.05, line: 0.45 });
  pen.hair(frontArc(c.x, c.y - h - 0.2, r + 0.3, 28), 0.6, PAPER_FILL, 0.7);
}

/** The tower's base: plinth and steps, the shaft with its door, windows, the rune band and crown of corbels. Returns its top. */
function towerBase(d: Draw, rng: Rng, crown = R + 3.5): { readonly top: Pt; readonly lit: Pt; readonly lamp: Pt } {
  const base = P(0, ZC, 0);
  disc(d, pt(base.x, base.y), R + 7, 3, mix(STONE_PALE, '#6c5d4a', 0.25));
  disc(d, pt(base.x, base.y - 3), R + 4, 3, STONE_PALE);
  const b = pt(base.x, base.y - 6);
  const body = storey(d, rng, b, R, SHAFT - 6, STONE_PALE);
  const at = drumAt(b, R);
  surround(d, at, -9, 0, 18, 24, 3, STONE_PALE, true);
  door(d, at, -9, 18, 24, { arched: true, color: '#412d43' });
  window(d, at, -25, 40, 9, 22, STONE_PALE, { key: true, transoms: 1, frame: 2 });
  window(d, at, 14, 54, 9, 24, STONE_PALE, { key: true, transoms: 1, frame: 2, lit: 0 });
  window(d, at, -5, 66, 10, 26, STONE_PALE, { key: true, transoms: 2, frame: 2.2 });
  // The rune band: a dressed course carved with the guild's signs.
  const band = [...frontArc(b.x, b.y - 32, R + 0.4, 24), ...frontArc(b.x, b.y - 36.5, R + 0.4, 24).reverse()];
  flat(d, band, mix(STONE_PALE, LIGHT, 0.25), { tone: 0, line: 0.45 });
  runes(d, rng, b, 34.2, 0.8, d.ink);
  ivy(d, rng, b, 58);
  const lamp = doorLamp(d, at);
  steps2(d);
  shadeUnder(d, body, b, SHAFT - 6);
  corbels(d, b, crown > R + 5 ? R + 3.5 : R, SHAFT - 6, crown > R + 5 ? 15 : 13, STONE_PALE);
  disc(d, pt(b.x, b.y - SHAFT + 6), crown, 4, mix(STONE_PALE, LIGHT, 0.1));
  return { top: pt(b.x, b.y - SHAFT + 2), lit: at(18.5, 64), lamp };
}

/** Little marks round a drum at height v: the guild's runes, inked (or glowing). */
function runes(d: Draw, rng: Rng, b: Pt, v: number, alpha: number, color: string, w = 0.5): void {
  const r = createRuneRng(rng);
  for (let i = 0; i < 16; i++) {
    const t = ((i + 0.5) / 16) * Math.PI;
    const k = Math.sin(t);
    const x = b.x - R * Math.cos(t);
    const y = b.y + R * DEPTH * k - v;
    const glyph = Array.from({ length: 3 }, () => pt(x + (r() - 0.5) * 2.4 * k, y + (r() - 0.5) * 3));
    d.pen.stroke(glyph, w, color, alpha * (0.4 + 0.6 * k), false);
  }
}

/** A rune generator that repeats: the same glyphs carved and then glowing. */
function createRuneRng(rng: Rng): () => number {
  const seed = Math.floor(rng() * 1e6);
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Ivy climbing the tower's lit flank from the plinth: two wandering vines, thick with leaves low down, lighter where the sun finds them. */
function ivy(d: Draw, rng: Rng, b: Pt, top: number): void {
  const { pen } = d;
  const at = drumAt(b, R + 0.6);
  for (const [u0, h] of [[-21, top], [-15, top * 0.55]] as const) {
    let u = u0;
    const vine: Pt[] = [];
    for (let v = -2; v < h; v += 3) {
      u += (rng() - 0.5) * 2.2;
      vine.push(at(Math.max(-R * 1.45, u), v));
    }
    pen.stroke(vine, 0.6, '#402b1a', 0.8, false);
    vine.forEach((p, i) => {
      const k = 1 - i / vine.length;
      for (let j = 0; j < 1 + k * 3; j++) {
        const c = pt(p.x + (rng() - 0.5) * 9 * (0.35 + k), p.y + (rng() - 0.5) * 4);
        const leaf = blob(c, 1.3 + rng() * 0.9, 1 + rng() * 0.6, rng, 0.3, 9, rng() * 3);
        const lit = rng() < 0.45;
        pen.fill(leaf, lit ? '#52733b' : rng() < 0.5 ? '#36592f' : '#2a4928', 0.95);
        if (lit) pen.hair(closed(leaf).slice(0, 5), 0.3, '#879769', 0.6);
        pen.hair(closed(leaf), 0.28, '#222612', 0.55);
      }
    });
  }
}

/** An iron lantern on a bracket beside the door, holding a cold blue flame. Returns the flame. */
function doorLamp(d: Draw, at: Surface): Pt {
  const { pen } = d;
  const wallPt = at(13.5, 21);
  const end = pt(wallPt.x + 4, wallPt.y - 1);
  pen.stroke([wallPt, pt(wallPt.x + 2, wallPt.y - 2), end], 0.8, '#2a2522', 1, false);
  const c = pt(end.x, end.y + 4.5);
  const cage = [pt(c.x - 1.8, c.y - 2.8), pt(c.x + 1.8, c.y - 2.8), pt(c.x + 1.4, c.y + 2.4), pt(c.x - 1.4, c.y + 2.4)];
  pen.fill(cage, '#c9e4ff', 0.95);
  pen.clipped(cage, () => glow(pen.ctx, c, 3, ARCANE, 1));
  pen.stroke(closed(cage), 0.55, '#2a2522', 1);
  pen.stroke([pt(c.x, c.y - 2.8), pt(c.x, c.y + 2.4)], 0.35, '#2a2522', 0.9, false);
  pen.fill([pt(c.x - 2.4, c.y - 2.8), pt(c.x + 2.4, c.y - 2.8), pt(c.x, c.y - 5)], '#2a2522', 1);
  pen.stroke([end, pt(c.x, c.y - 5)], 0.5, '#2a2522', 1, false);
  return c;
}

/** Two shallow steps up to the door. */
function steps2(d: Draw): void {
  slab(d, box(-12, 12, ZC - R - 9, ZC - R + 1, 0, 3), mix(STONE_PALE, '#6c5d4a', 0.2), { line: 0.5 });
  slab(d, box(-10, 10, ZC - R - 5, ZC - R + 2, 3, 6), STONE_PALE, { line: 0.5 });
}

/** The crown's shadow on the shaft below it. */
function shadeUnder(d: Draw, body: readonly Pt[], b: Pt, v: number): void {
  d.pen.clipped(body, () => soft(d.pen.ctx, 3, () => d.pen.fill([...frontArc(b.x, b.y - v + 2, R + 4, 18), ...frontArc(b.x + 2, b.y - v + 12, R + 4, 18).reverse()], SHADOW, 0.32)));
}

/** The gallery of the second level: a balustraded walk round the upper storey's foot. */
function gallery(d: Draw, top: Pt): void {
  roundBalustrade(d, top, R + 5.5, 9, STONE_PALE);
}

/** The upper storey of the second level: a narrower drum with three lit windows, its own corbel crown. */
function upperStorey(d: Draw, rng: Rng, foot: Pt, h: number): { readonly top: Pt; readonly lit: readonly Pt[] } {
  const r = R - 7;
  const body = storey(d, rng, foot, r, h, STONE_PALE);
  const at = drumAt(foot, r);
  const lit: Pt[] = [];
  for (const u of [-13, 0, 13]) {
    window(d, at, u - 3.5, 14, 7, 24, STONE_PALE, { key: true, transoms: 1, frame: 1.8, lit: 0 });
    lit.push(at(u, 24));
  }
  d.pen.clipped(body, () => soft(d.pen.ctx, 3, () => d.pen.fill([...frontArc(foot.x, foot.y - h + 2, r + 4, 18), ...frontArc(foot.x + 2, foot.y - h + 10, r + 4, 18).reverse()], SHADOW, 0.3)));
  corbels(d, foot, r, h, 10, STONE_PALE);
  disc(d, pt(foot.x, foot.y - h), r + 3, 3.5, mix(STONE_PALE, LIGHT, 0.1));
  return { top: pt(foot.x, foot.y - h - 3.5), lit };
}

interface Lights {
  readonly windows: readonly Pt[];
  /** The spire's tip, where the armillary stands. */
  readonly tip: Pt;
  readonly size: number;
  readonly runeBase: Pt;
}

/** The air over the painted tower: arcane light in its windows, the runes faintly alight, the star glinting, a few motes drifting. */
function arcaneAir(d: Draw, rng: Rng, l: Lights, motes: number): void {
  const ctx = d.pen.ctx;
  for (const w of l.windows) {
    glow(ctx, w, 16, ARCANE, 0.28);
    glow(ctx, w, 6, '#e6f0ff', 0.4);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  soft(ctx, 1.2, () => runes(d, createFixed(7), l.runeBase, 34.2, 0.45, ARCANE, 0.9));
  ctx.restore();
  const star = armillary(d, l.tip, l.size);
  glow(ctx, star, 14, '#ffe9a8', 0.35);
  sparkle(d, pt(star.x + 1.5, star.y - 1.5), 4);
  for (let i = 0; i < motes; i++) {
    const p = pt(star.x + (rng() - 0.5) * 60, star.y + 30 + rng() * 80);
    glow(ctx, p, 3 + rng() * 2, rng() < 0.5 ? ARCANE : ARCANE_DEEP, 0.4);
    d.pen.dot(p.x, p.y, 0.5, '#f4f8ff', 0.9);
  }
}

const createFixed = (n: number): Rng => {
  let s = n;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

/** Paints the windows that hold the arcane light (inside the figure, before its finish). */
function litGlass(d: Draw, at: Pt, w: number, h: number): void {
  d.pen.clipped([pt(at.x - w, at.y - h), pt(at.x + w, at.y - h), pt(at.x + w, at.y + h), pt(at.x - w, at.y + h)], () => {
    glow(d.pen.ctx, at, h, ARCANE, 0.75);
  });
}

function guildGround(d: Draw): void {
  groundShadow(d, 4, -10, 44, 12, 0.26);
  soft(d.pen.ctx, 4, () => d.pen.fill([P(0, ZC - R), P(40, ZC - R - 10), P(52, ZC + 10), P(10, ZC + R)], SHADOW, 0.16));
}

function guildOne(d: Draw, rng: Rng): Lights {
  const t = towerBase(d, rng);
  litGlass(d, t.lit, 4, 10);
  const top = spire(d, rng, t.top, R + 3.5, 74);
  const luc = lucarne(d, pt(t.top.x - 3, t.top.y - 16), 5);
  const apex = finialRod(d, top);
  atmosphere(d, -75, -260, 75, 14);
  return { windows: [t.lit, luc, t.lamp], tip: apex, size: 6.5, runeBase: pt(P(0, ZC).x, P(0, ZC).y - 6) };
}

function guildTwo(d: Draw, rng: Rng): Lights {
  const t = towerBase(d, rng, R + 7);
  litGlass(d, t.lit, 4, 10);
  const up = upperStorey(d, rng, t.top, 46);
  for (const p of up.lit) litGlass(d, p, 3.5, 10);
  gallery(d, t.top);
  const top = spire(d, rng, up.top, R - 1, 64);
  const luc = lucarne(d, pt(up.top.x - 2, up.top.y - 14), 4.2);
  const apex = finialRod(d, top);
  atmosphere(d, -75, -280, 75, 14);
  return { windows: [t.lit, ...up.lit, luc, t.lamp], tip: apex, size: 7, runeBase: pt(P(0, ZC).x, P(0, ZC).y - 6) };
}

/** Draws a guild level through the sprite finish, keeping where its lights fell for the air above it. */
function drawGuild(level: (d: Draw, rng: Rng) => Lights, motes: number): TownDrawer {
  return (ctx, seed) => {
    let lights: Lights | null = null;
    townSprite(ctx, seed, 0, {
      bounds: BOUNDS,
      line: 1.3,
      ground: guildGround,
      air: (d, rng) => { if (lights) arcaneAir(d, rng, lights, motes); },
    }, (d, rng) => { lights = level(d, rng); });
  };
}

export const GUILD: Readonly<Record<'guild-1' | 'guild-2', TownDrawer>> = {
  'guild-1': drawGuild(guildOne, 3),
  'guild-2': drawGuild(guildTwo, 7),
};

