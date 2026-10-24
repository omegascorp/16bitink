import type { Rng } from '../../logic/rng';
import { bezier, closed, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import {
  arch, backArc, CROWN_BLUE, CROWN_GOLD, DEPTH, frontArc, frontOf, HOLE, P, pyramid, quad, roundWash, sideOf, type Box, type Surface,
} from '../sites/build';
import { blob, boundsOf, crisp, dab, flat, groundShadow, LIGHT, mix, paint, rgba, SHADOW, soft, sprite } from '../sites/paintKit';
import { cone } from '../sites/spire';
import { SLOTS, type TownDrawer } from './types';

/**
 * The Crown's walls on the ridge at the back of the town, in three
 * stages, each grown from the last: the fort (a coursed curtain wall,
 * round corner towers under blue slate spires, a twin-towered gatehouse
 * with its portcullis), the citadel (a tall square keep behind the gate,
 * thicker and taller towers, wall towers between) and the castle (a
 * second, higher tier on the keep, an inner ring of slender spired towers
 * and banners everywhere). Drawn at the townscape's scale: a gate about
 * two storeys high, stone courses a hand's breadth on the page.
 *
 * Grim and weathered: warm grey stone in dark mortar, streaked by rain and
 * mossed at the foot, roofs of deep blue-grey slate, the Crown's blue only
 * in its banners, gilt kept to the finials.
 */
/** The Crown's blue in cloth hung out in the evening light: deepened, so its lit side lands on the true blue. */
const BLUE = mix(CROWN_BLUE, '#141a33', 0.3);
const GOLD = CROWN_GOLD;
const WALL = '#544c40';
const KEEP = '#5c5245';
/** Deep blue-grey slate for the spires and roofs. */
const SLATE = '#1b2540';
const MORTAR = '#2b241d';
const MOSS = '#3e4a24';
const IRON = '#25211d';
/** Ashlar courses and stone lengths, units. */
const COURSE = 7.2;
const STONE_LEN = 13;

// ---- Masonry ----

function pathFor(shape: readonly Pt[]): Path2D {
  const path = new Path2D();
  shape.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
  path.closePath();
  return path;
}

/** One wall face: washed for the light, coursed, streaked by the weather and darkened at its foot. */
function face(d: Draw, rng: Rng, at: Surface, w: number, h: number, color: string, tone: number): Pt[] {
  const ctx = d.pen.ctx;
  const shape = crisp(quad(at, 0, 0, w, h), 4);
  flat(d, shape, color, { tone, hatch: tone > 0.2 ? 0.24 : 0, line: 0 });
  masonry(d, rng, at, w, h, shape, color);
  d.pen.clipped(shape, () => {
    // The stone weathered unevenly: warm umber in places, cold grey in others.
    soft(ctx, 6, () => {
      for (let i = 0; i < Math.max(1, (w * h) / 700); i++) {
        const c = at(rng() * w, rng() * h);
        d.pen.fill(blob(c, 8 + rng() * 16, 5 + rng() * 9, rng, 0.3, 12), rng() < 0.5 ? '#6a5236' : '#4a5060', 0.16);
      }
    });
    // Rain has run down it from the parapet, leaving dark streaks.
    soft(ctx, 1.4, () => {
      for (let u = 3 + rng() * 8; u < w - 3; u += 8 + rng() * 18) {
        const top = h * (0.75 + rng() * 0.25);
        d.pen.fill(quad(at, u, top - 12 - rng() * 30, u + 1.5 + rng() * 3, top), mix(color, SHADOW, 0.6), 0.14 + rng() * 0.1);
      }
    });
    // Lit high where the sun reaches over the hills, damp and darker low down.
    const g = ctx.createLinearGradient(at(0, h).x, at(0, h).y, at(0, 0).x, at(0, 0).y);
    g.addColorStop(0, rgba(LIGHT, 0.08));
    g.addColorStop(0.5, rgba(SHADOW, 0));
    g.addColorStop(1, rgba(SHADOW, 0.3));
    ctx.fillStyle = g;
    ctx.fill(pathFor(shape));
    // Damp and moss gathered at its foot.
    soft(ctx, 3, () => d.pen.fill(quad(at, -3, -2, w + 3, Math.min(h * 0.32, 14)), MOSS, 0.32));
    soft(ctx, 1.5, () => {
      for (let i = 0; i < w / 10; i++) d.pen.fill(blob(at(rng() * w, rng() * Math.min(h * 0.3, 12)), 2 + rng() * 4, 1 + rng() * 2, rng, 0.3, 8), mix(MOSS, LIGHT, 0.15), 0.35);
    });
  });
  d.pen.stroke(closed(shape), 0.5, d.ink, 0.8);
  return shape;
}

/**
 * Coursed stonework laid over a face: blocks of uneven length, each tinted a
 * little apart (some sun-bleached, some dark with damp), sunk in dark mortar,
 * its top arris catching the light; here and there a crack or a tuft of moss in a joint.
 */
function masonry(d: Draw, rng: Rng, at: Surface, w: number, h: number, clip: readonly Pt[], color: string): void {
  const { pen } = d;
  pen.clipped(clip, () => {
    let row = 0;
    for (let v = 0; v < h; v += COURSE, row++) {
      let u = row % 2 === 0 ? -rng() * STONE_LEN * 0.5 : -STONE_LEN * 0.5 - rng() * 2;
      const v1 = Math.min(h, v + COURSE);
      while (u < w) {
        const u1 = u + STONE_LEN * (0.6 + rng() * 0.8);
        const r = rng();
        const tint = r < 0.22 ? mix(color, LIGHT, 0.35) : r < 0.5 ? mix(color, '#3e372e', 0.55) : r < 0.62 ? '#7a6248' : r < 0.72 ? '#5a5f68' : null;
        if (tint) pen.fill(quad(at, u + 0.4, v + 0.4, u1 - 0.4, v1 - 0.4), tint, 0.16 + rng() * 0.16);
        pen.hair([at(u1, v + 0.3), at(u1, v1 - 0.3)], 0.5, MORTAR, 0.55);
        pen.hair([at(u + 0.6, v1 - 0.5), at(u1 - 0.6, v1 - 0.5)], 0.45, mix(color, LIGHT, 0.45), 0.32);
        if (rng() < 0.05) pen.hair([at(u + 2, v1 - 0.6), at(u + 3.5, v + COURSE * 0.5), at(u + 3, v + 0.5)], 0.35, MORTAR, 0.6);
        if (v < h * 0.45 && rng() < 0.12) pen.fill(blob(at(u1, v + 0.5), 1.4 + rng() * 1.5, 0.8 + rng(), rng, 0.3, 8), MOSS, 0.55);
        u = u1;
      }
      pen.hair([at(0, v + 0.15), at(w, v + 0.15)], 0.55, MORTAR, 0.5);
    }
  });
}

/** A narrow arrow slit: a dark arched slot, its sill catching a little light. */
function slit(d: Draw, at: Surface, u: number, v: number, w: number, h: number): void {
  arch(d, (a, b) => at(a, b + v), u, w, h, WALL, 0);
  d.pen.hair([at(u - 0.6, v - 0.4), at(u + w + 0.6, v - 0.4)], 0.6, mix(WALL, LIGHT, 0.4), 0.55);
  // Rain stains running down from the sill.
  soft(d.pen.ctx, 0.8, () => d.pen.fill(quad(at, u + 0.4, v - 6 - w, u + w - 0.4, v - 0.4), SHADOW, 0.18));
}

/** A box of masonry: its right side, front and (optionally) its top, each washed for the light. */
function box(d: Draw, rng: Rng, b: Box, color: string, top = true): Pt[] {
  face(d, rng, sideOf(b), b.z1 - b.z0, b.h1 - b.h0, color, 0.4);
  const front = face(d, rng, frontOf(b), b.x1 - b.x0, b.h1 - b.h0, color, 0.05);
  if (top) flat(d, crisp([P(b.x0, b.z0, b.h1), P(b.x1, b.z0, b.h1), P(b.x1, b.z1, b.h1), P(b.x0, b.z1, b.h1)], 4), color, { tone: -0.12, line: 0.45 });
  return front;
}

/** Merlons along the front edge of a wall's top from u0 to u1 at height h: each with its lit cap and shaded right cheek. */
function battlements(d: Draw, at: Surface, u0: number, u1: number, h: number, color: string, mw = 8, gap = 6, mh = 9, depth = 6): void {
  const back = P(0, depth, 0);
  const n = Math.max(1, Math.floor((u1 - u0 + gap) / (mw + gap)));
  const start = u0 + (u1 - u0 - (n * mw + (n - 1) * gap)) / 2;
  for (let i = 0; i < n; i++) {
    const u = start + i * (mw + gap);
    const a = at(u, h + mh);
    const b = at(u + mw, h + mh);
    const lid = [a, b, pt(b.x + back.x, b.y + back.y), pt(a.x + back.x, a.y + back.y)];
    const cheek = [at(u + mw, h), pt(at(u + mw, h).x + back.x, at(u + mw, h).y + back.y), lid[2]!, b];
    d.pen.fill(cheek, mix(color, SHADOW, 0.55), 1);
    d.pen.stroke(closed(crisp(cheek, 2)), 0.4, d.ink, 0.8);
    flat(d, crisp(quad(at, u, h, u + mw, h + mh), 2), color, { tone: 0.08, line: 0.45 });
    flat(d, crisp(lid, 2), mix(color, LIGHT, 0.22), { tone: -0.1, line: 0.4 });
    d.pen.hair([at(u + 0.6, h + mh * 0.5), at(u + mw - 0.6, h + mh * 0.5)], 0.45, MORTAR, 0.5);
    soft(d.pen.ctx, 0.8, () => d.pen.fill(quad(at, u + mw * 0.3, h - 8, u + mw * 0.55, h), SHADOW, 0.16));
  }
}

interface Shaft {
  readonly base: Pt;
  readonly top: Pt;
  readonly body: Pt[];
  /** A point on its face towards the viewer: `u` across from its axis, `v` up from its foot. */
  readonly at: Surface;
}

/** A round tower's shaft at (x, z), radius r, from h0 to h1: shaded round, coursed stone following its curve. */
function shaft(d: Draw, rng: Rng, x: number, z: number, r: number, h0: number, h1: number, color: string, stones = true): Shaft {
  const { pen } = d;
  const base = P(x, z, h0);
  const top = P(x, z, h1);
  const body = [...frontArc(base.x, base.y, r, 24), ...backArc(top.x, top.y, r, 24)];
  roundWash(d, body, base.x - r, base.x + r, color, 0.28);
  if (stones) {
    pen.clipped(body, () => {
      for (let v = COURSE, k = 0; v < h1 - h0; v += COURSE, k++) {
        const y = base.y - v;
        pen.hair(frontArc(base.x, y, r, 20), 0.5, MORTAR, 0.5);
        pen.hair(frontArc(base.x - 0.4, y + 0.9, r * 0.92, 16).slice(1, 9), 0.4, mix(color, LIGHT, 0.45), 0.3);
        const n = Math.max(4, Math.round((r * Math.PI) / STONE_LEN));
        for (let i = 0; i < n; i++) {
          const t = ((i + (k % 2) * 0.5 + rng() * 0.25) / n) * Math.PI;
          const px = base.x - r * Math.cos(t);
          const py = y + r * DEPTH * Math.sin(t);
          pen.hair([pt(px, py), pt(px, py + COURSE - 0.4)], 0.45, MORTAR, 0.5);
          if (rng() < 0.3) {
            const t1 = t + (STONE_LEN / r) * 0.9;
            const qx = base.x - r * Math.cos(t1);
            pen.fill([pt(px, py), pt(qx, y + r * DEPTH * Math.sin(t1)), pt(qx, y + r * DEPTH * Math.sin(t1) + COURSE), pt(px, py + COURSE)], rng() < 0.4 ? mix(color, LIGHT, 0.35) : mix(color, '#3e372e', 0.55), 0.2);
          }
        }
      }
    });
  }
  pen.clipped(body, () => {
    // Hold the lit band down: weathered stone, not whitewash.
    pen.fill(body, mix(color, SHADOW, 0.5), 0.16);
    soft(pen.ctx, 3, () => pen.fill([...frontArc(base.x, base.y - 8, r + 2), pt(base.x + r + 2, base.y + 10), pt(base.x - r - 2, base.y + 10)], MOSS, 0.34));
    // Rain streaks down the drum, and the weather darkening it under the eave.
    soft(pen.ctx, 1.2, () => {
      for (let u = -r * 0.85; u < r * 0.85; u += 4 + rng() * 7) {
        const len = 10 + rng() * (h1 - h0) * 0.4;
        pen.fill([pt(base.x + u, top.y + 4), pt(base.x + u + 1.6, top.y + 4), pt(base.x + u + 1.2, top.y + 4 + len), pt(base.x + u + 0.3, top.y + 4 + len)], mix(color, SHADOW, 0.6), 0.12 + rng() * 0.1);
      }
    });
    soft(pen.ctx, 2.5, () => pen.fill([...backArc(top.x, top.y, r + 2), ...frontArc(top.x, top.y + 6, r + 2).reverse()], SHADOW, 0.25));
  });
  pen.stroke(closed(crisp(body, 4)), 0.55, d.ink, 0.85);
  return { base, top, body, at: (u, v) => pt(base.x + u, base.y - v) };
}

/** A row of corbels under a tower's eave or parapet: small dark teeth round its front. */
function corbels(d: Draw, top: Pt, r: number, color: string, n = 11, drop = 4): void {
  for (let i = 1; i < n; i++) {
    const s = (i / n) * Math.PI;
    const x = top.x - r * Math.cos(s);
    const y = top.y + r * DEPTH * Math.sin(s);
    const w = 1.3 * Math.sin(s) + 0.4;
    d.pen.fill([pt(x - w, y), pt(x + w, y), pt(x + w * 0.7, y + drop), pt(x - w * 0.7, y + drop)], mix(color, SHADOW, 0.55), 0.9);
  }
}

// ---- Roofs, finials and flags ----

/** A gilt ball and spike at a roof's apex; returns the spike's tip. */
function gilt(d: Draw, apex: Pt, h = 9): Pt {
  const { pen } = d;
  const tip = pt(apex.x, apex.y - h);
  pen.stroke([apex, tip], 0.8, d.ink, 0.95, false);
  const ball = blob(pt(apex.x, apex.y - h * 0.4), 1.8, 1.8, () => 0.5, 0, 14);
  paint(d, ball, GOLD, { shadow: 0.6, hatch: 0, line: 0.4, gloss: true });
  pen.dot(apex.x - 0.6, apex.y - h * 0.4 - 0.7, 0.45, '#f0cf78', 0.9);
  return tip;
}

/** A swallowtailed pennant flying from a pole: blue with a gilt edge, rippling out to the right. */
function flag(d: Draw, foot: Pt, h: number, len = 24, wave = 0, color = BLUE): void {
  const { pen } = d;
  const top = pt(foot.x, foot.y - h);
  pen.stroke([foot, top], 0.8, d.ink, 0.95, false);
  const y0 = top.y + 1.5;
  const fh = len * 0.42;
  const upper = bezier(pt(top.x, y0), pt(top.x + len * 0.5, y0 - 3 + wave), pt(top.x + len, y0 + 1.5 + wave * 0.5), 10);
  const lower = bezier(pt(top.x + len, y0 + fh + wave * 0.4), pt(top.x + len * 0.5, y0 + fh - 1 + wave), pt(top.x, y0 + fh), 10);
  const cloth = [...upper, pt(top.x + len * 0.7, y0 + fh * 0.5 + wave * 0.5), ...lower];
  paint(d, cloth, color, { shadow: 0.7, hatch: 0.18, line: 0.45 });
  pen.clipped(cloth, () => {
    pen.hair(upper.map((p) => pt(p.x, p.y + 1.4)), 0.6, mix(GOLD, SHADOW, 0.15), 0.7);
    pen.hair(bezier(pt(top.x + len * 0.35, y0), pt(top.x + len * 0.42, y0 + fh * 0.5), pt(top.x + len * 0.38, y0 + fh), 6), 1, mix(color, SHADOW, 0.6), 0.55);
  });
  pen.dot(top.x, top.y - 0.8, 1.3, GOLD, 1);
  pen.dot(top.x - 0.4, top.y - 1.2, 0.4, '#f0cf78', 0.85);
}

/** A blue slate spire over a round tower: the cone, a broad gilt band at its eave, a gilt finial and a pennant. */
function spire(d: Draw, rng: Rng, top: Pt, r: number, rise: number, wave: number, pole = 20): void {
  const apex = cone(d, rng, pt(top.x, top.y + 1), r, rise, SLATE, null);
  // A lead flashing at the eave, dull, its lit edge the only shine.
  const band = [...frontArc(top.x, top.y - 1.8, r * 0.98, 18), ...frontArc(top.x, top.y + 1, r, 18).reverse()];
  paint(d, band, '#3a3c44', { shadow: 0.6, hatch: 0, line: 0.4 });
  d.pen.hair(frontArc(top.x, top.y - 1.6, r * 0.97, 14).slice(1, 6), 0.5, mix(SLATE, LIGHT, 0.45), 0.6);
  const tip = gilt(d, apex, 7);
  if (pole > 0) flag(d, tip, pole, 15 + r * 0.22, wave);
}

/** A hanging banner down a wall face: blue cloth, a gilt border and crown, a swallowtail hem, soft folds. */
function banner(d: Draw, at: Surface, u: number, v: number, w: number, h: number): void {
  const { pen } = d;
  const rod = [at(u - 2, v), at(u + w + 2, v)];
  const cloth = [at(u, v), at(u + w, v), at(u + w, v - h), at(u + w / 2, v - h + w * 0.45), at(u, v - h)];
  dab(d, cloth.map((p) => pt(p.x + 2, p.y + 1.5)), SHADOW, 0.4, 1.5);
  paint(d, cloth, BLUE, { shadow: 0.8, hatch: 0.14, line: 0.45 });
  pen.clipped(cloth, () => {
    for (let k = 1; k < 4; k++) soft(pen.ctx, 1, () => pen.fill(quad(at, u + (w * k) / 4 - 0.8, v - h, u + (w * k) / 4 + 0.8, v), SHADOW, 0.3));
    pen.hair([at(u + 1.6, v - 1), at(u + 1.6, v - h + 1)], 0.6, GOLD, 0.75);
    pen.hair([at(u + w - 1.6, v - 1), at(u + w - 1.6, v - h + 1)], 0.6, GOLD, 0.75);
  });
  crownMark(d, at(u + w / 2, v - h * 0.38), w * 0.3);
  pen.stroke(rod, 1.2, mix(GOLD, SHADOW, 0.3), 0.95, false);
}

/** The Crown's mark: a little gilt three-pointed crown. */
function crownMark(d: Draw, c: Pt, s: number): void {
  const crown = [pt(c.x - s, c.y + s * 0.5), pt(c.x - s, c.y - s * 0.5), pt(c.x - s * 0.5, c.y), pt(c.x, c.y - s * 0.8), pt(c.x + s * 0.5, c.y), pt(c.x + s, c.y - s * 0.5), pt(c.x + s, c.y + s * 0.5)];
  paint(d, crown, GOLD, { shadow: 0.5, hatch: 0, line: 0.35, gloss: true });
}

/** A heater shield over the gate: the Crown's blue, a gilt crown, a gilt rim. */
function shield(d: Draw, c: Pt, s: number): void {
  const sh = [pt(c.x - s, c.y - s), pt(c.x + s, c.y - s), pt(c.x + s * 0.95, c.y + s * 0.3), ...bezier(pt(c.x + s * 0.95, c.y + s * 0.3), pt(c.x + s * 0.6, c.y + s * 1.05), pt(c.x, c.y + s * 1.35), 6).slice(1), ...bezier(pt(c.x, c.y + s * 1.35), pt(c.x - s * 0.6, c.y + s * 1.05), pt(c.x - s * 0.95, c.y + s * 0.3), 6).slice(1)];
  paint(d, sh, GOLD, { shadow: 0.55, hatch: 0, line: 0.5, gloss: true });
  const inner = sh.map((p) => pt(c.x + (p.x - c.x) * 0.82, c.y + 0.6 + (p.y - c.y) * 0.84));
  paint(d, inner, BLUE, { shadow: 0.6, hatch: 0.1, line: 0.35 });
  crownMark(d, pt(c.x, c.y + 0.6), s * 0.5);
}

// ---- Towers ----

interface TowerSpec {
  readonly r: number;
  readonly h: number;
  readonly rise: number;
  readonly wave: number;
  /** The pennant's pole above the finial (0 for none). */
  readonly pole?: number;
}

/** A round tower: arrow slits up its face, corbels under the eave, a blue slate spire with a gilt finial and its pennant. */
function roundTower(d: Draw, rng: Rng, x: number, z: number, t: TowerSpec, color = WALL): void {
  const s = shaft(d, rng, x, z, t.r, 0, t.h, color);
  for (let v = 22; v < t.h - 14; v += 26) slit(d, s.at, -t.r * 0.35 + ((v / 26) % 2) * t.r * 0.2, v, 3.4, 10);
  corbels(d, s.top, t.r, color, 13, 4.5);
  spire(d, rng, s.top, t.r + 2.5, t.rise, t.wave, t.pole ?? (t.r > 15 ? 22 : 16));
}

/** A square wall tower standing proud of the curtain: slits, a crenellated top or a blue pyramid cap. */
function wallTower(d: Draw, rng: Rng, x: number, w: number, h: number, capped: boolean, wave: number): void {
  const b: Box = { x0: x - w / 2, x1: x + w / 2, z0: -6, z1: 14, h0: 0, h1: h };
  box(d, rng, b, WALL, !capped);
  const at = frontOf(b);
  slit(d, at, w / 2 - 1.7, h * 0.38, 3.4, 10);
  slit(d, at, w / 2 - 1.7, h * 0.7, 3.4, 10);
  if (capped) {
    d.pen.fill(crisp([P(b.x0 - 3, b.z0 - 3, h - 1.5), P(b.x1 + 3, b.z0 - 3, h - 1.5), P(b.x1 + 3, b.z1 + 3, h - 1.5), P(b.x1 + 3, b.z1 + 3, h + 1), P(b.x1 + 3, b.z0 - 3, h + 1), P(b.x0 - 3, b.z0 - 3, h + 1)], 3), '#3a3c44', 0.95);
    const apex = pyramid(d, rng, b, 38, SLATE, 'slate', 3);
    flag(d, gilt(d, apex, 7), 16, 20, wave);
  } else {
    battlements(d, at, 0, w, h, WALL, 7, 5);
  }
}

/** A round tower's shadow thrown right across the face behind it (light from the upper left): a soft band, its top edge sloping down. */
function towerShadow(d: Draw, onto: readonly Pt[], x: number, z: number, r: number, top: number): void {
  const base = P(x, z, 0);
  const xa = base.x + r * 0.35;
  const xb = base.x + r + 16;
  const band = [pt(xa, base.y - top), pt(xb, base.y - top + 16), pt(xb, base.y + 30), pt(xa, base.y + 30)];
  d.pen.clipped(onto, () => soft(d.pen.ctx, 3.5, () => d.pen.fill(band, SHADOW, 0.4)));
}

// ---- The walls ----

interface Plan {
  readonly wallH: number;
  readonly corner: TowerSpec;
  readonly back: TowerSpec;
  readonly gate: TowerSpec;
  readonly gateH: number;
  /** Square towers along the curtain between the corners and the gate. */
  readonly mid: 'none' | 'flat' | 'capped';
  readonly keep: 0 | 1 | 2;
  readonly inner: boolean;
  readonly banners: boolean;
}

const FORT: Plan = {
  wallH: 48,
  corner: { r: 21, h: 82, rise: 60, wave: 1 },
  back: { r: 13, h: 62, rise: 36, wave: -1, pole: 14 },
  gate: { r: 15, h: 76, rise: 34, wave: 1.5, pole: 18 },
  gateH: 64,
  mid: 'none',
  keep: 0,
  inner: false,
  banners: false,
};

const CITADEL: Plan = {
  wallH: 54,
  corner: { r: 25, h: 96, rise: 72, wave: 1 },
  back: { r: 15, h: 74, rise: 44, wave: -1, pole: 16 },
  gate: { r: 17, h: 90, rise: 42, wave: 1.5, pole: 0 },
  gateH: 72,
  mid: 'flat',
  keep: 1,
  inner: false,
  banners: false,
};

const CASTLE: Plan = {
  wallH: 58,
  corner: { r: 28, h: 116, rise: 92, wave: 1, pole: 18 },
  back: { r: 16, h: 84, rise: 52, wave: -1, pole: 16 },
  gate: { r: 19, h: 100, rise: 50, wave: 1.5, pole: 0 },
  gateH: 80,
  mid: 'capped',
  keep: 2,
  inner: true,
  banners: true,
};

const SPAN = 236;
/** The towers inside the curtain, either side of the keep. */
const INNER_X = 160;
const INNER_Z = 58;

/** The keep behind the gate: a tall square tower of pale stone, slits and a lit window, gilt under its eaves, a blue pyramid roof. */
function keep(d: Draw, rng: Rng, tiers: 1 | 2): void {
  const lower: Box = tiers === 1 ? { x0: -40, x1: 40, z0: 40, z1: 88, h0: 0, h1: 128 } : { x0: -48, x1: 48, z0: 34, z1: 92, h0: 0, h1: 112 };
  box(d, rng, lower, KEEP, tiers === 2);
  const at = frontOf(lower);
  const w = lower.x1 - lower.x0;
  for (const v of tiers === 1 ? [70, 102] : [66, 92]) {
    slit(d, at, w * 0.25 - 2, v, 4, 12);
    slit(d, at, w * 0.75 - 2, v, 4, 12);
  }
  const win = arch(d, at, w / 2 - 6, 12, 20, KEEP, 3, tiers === 1 ? 108 : 78);
  d.pen.clipped(win, () => d.pen.fill(quad(at, w / 2 - 6, tiers === 1 ? 108 : 78, w / 2 + 6, (tiers === 1 ? 108 : 78) + 7), '#e0a848', 0.6));
  if (tiers === 1) {
    eaves(d, lower);
    const apex = pyramid(d, rng, lower, 40, SLATE, 'slate', 4);
    flag(d, gilt(d, apex, 9), 16, 28, 1);
    return;
  }
  // Two tiers: a crenellated platform with spired bartizans at its front corners, then the upper keep.
  battlements(d, at, 0, w, lower.h1, KEEP, 8, 6, 9, 6);
  const upper: Box = { x0: -27, x1: 27, z0: 48, z1: 78, h0: lower.h1, h1: 146 };
  box(d, rng, upper, KEEP, false);
  const au = frontOf(upper);
  slit(d, au, 25, 14, 4, 12);
  eaves(d, upper);
  const apex = pyramid(d, rng, upper, 28, SLATE, 'slate', 3);
  flag(d, gilt(d, apex, 7), 12, 24, 1);
  for (const x of [lower.x0 + 4, lower.x1 - 4]) {
    const top = P(x, lower.z0 + 3, lower.h1 + 4);
    const turret = shaft(d, rng, x, lower.z0 + 3, 7, lower.h1 - 14, lower.h1 + 6, KEEP, false);
    corbels(d, turret.top, 7, KEEP, 9, 3);
    spire(d, rng, pt(top.x, top.y - 2), 8.5, 26, x < 0 ? 1 : -1, 0);
  }
}

/** The stone cornice under a keep's eaves, dentils casting their shadows below. */
function eaves(d: Draw, b: Box): void {
  const h = b.h1;
  const band = crisp([P(b.x0, b.z0, h - 3.5), P(b.x1, b.z0, h - 3.5), P(b.x1, b.z1, h - 3.5), P(b.x1, b.z1, h), P(b.x1, b.z0, h), P(b.x0, b.z0, h)], 3);
  flat(d, band, mix(KEEP, LIGHT, 0.12), { tone: 0, line: 0.45 });
  for (let u = 4; u < b.x1 - b.x0; u += 6) d.pen.fill(crisp([P(b.x0 + u, b.z0, h - 3.5), P(b.x0 + u + 2, b.z0, h - 3.5), P(b.x0 + u + 2, b.z0, h - 6.5), P(b.x0 + u, b.z0, h - 6.5)], 1), mix(KEEP, SHADOW, 0.6), 0.8);
}

/** The gatehouse: a block over an arched gate with its portcullis half raised, a shield, machicolations and merlons; a tower either side. */
function gatehouse(d: Draw, rng: Rng, plan: Plan): void {
  const h = plan.gateH;
  const g: Box = { x0: -30, x1: 30, z0: -8, z1: 12, h0: 0, h1: h };
  box(d, rng, g, WALL);
  const at = frontOf(g);
  const gw = 26;
  const gh = 38;
  const hole = arch(d, at, 30 - gw / 2, gw, gh, WALL, 4.5);
  d.pen.clipped(hole, () => {
    // Daylight in the ward beyond, seen down the passage.
    soft(d.pen.ctx, 2.5, () => d.pen.fill(quad(at, 30 - gw / 2 + 7, 0, 30 + gw / 2 - 7, 11), '#8a7450', 0.4));
    // The portcullis, half raised.
    for (let u = 30 - gw / 2 + 2.5; u < 30 + gw / 2; u += 4.2) {
      d.pen.stroke([at(u, gh + 2), at(u, 17)], 1.1, IRON, 0.95, false);
      d.pen.stroke([at(u - 0.8, 17), at(u, 14.5), at(u + 0.8, 17)], 0.8, IRON, 0.95, false);
    }
    for (let v = 20; v < gh; v += 4.6) d.pen.stroke([at(30 - gw / 2, v), at(30 + gw / 2, v)], 0.9, IRON, 0.9, false);
  });
  // Machicolations over the gate, then the merlons.
  const mach = crisp(quad(at, 6, h - 12, 54, h - 4), 3);
  flat(d, mach, WALL, { tone: 0, line: 0.45 });
  for (let u = 9; u < 52; u += 6) d.pen.fill(crisp(quad(at, u, h - 14.5, u + 3, h - 12), 1.5), HOLE, 0.85);
  battlements(d, at, 0, 60, h, WALL, 7, 5);
  shield(d, at(30, gh + 12), 6.5);
  towerShadow(d, crisp(quad(at, 0, 0, 60, h), 4), -36, -3, plan.gate.r, plan.gate.h);
  // Earth worn into the threshold.
  dab(d, [at(30 - gw / 2 - 2, 0), at(30 + gw / 2 + 2, 0), pt(at(30 + gw / 2 + 10, 0).x, at(0, 0).y + 12), pt(at(30 - gw / 2 - 10, 0).x, at(0, 0).y + 12)], '#5e4a32', 0.5, 3);
  roundTower(d, rng, -36, -3, plan.gate);
  roundTower(d, rng, 36, -3, { ...plan.gate, wave: -plan.gate.wave });
}

/** The curtain wall from x0 to x1: a battered plinth, coursed stone, a lit wall-walk, merlons; slits and drains along it. */
function curtain(d: Draw, rng: Rng, x0: number, x1: number, plan: Plan): Pt[] {
  const b: Box = { x0, x1, z0: 0, z1: 10, h0: 0, h1: plan.wallH };
  const front = box(d, rng, b, WALL);
  const at = frontOf(b);
  const w = x1 - x0;
  // A battered plinth along the foot.
  const plinth = crisp([at(-2, -4), at(w + 2, -4), at(w, 8), at(0, 8)], 4);
  flat(d, plinth, mix(WALL, SHADOW, 0.15), { tone: 0.15, line: 0.45, from: at(0, 8), to: at(0, -4) });
  d.pen.clipped(plinth, () => soft(d.pen.ctx, 2, () => d.pen.fill(quad(at, -2, -4, w + 2, 3), MOSS, 0.4)));
  d.pen.hair([at(0, 8), at(w, 8)], 0.7, mix(WALL, LIGHT, 0.4), 0.5);
  const hung = plan.banners ? [w * 0.24 - 7, w * 0.76 - 7] : [];
  for (let u = 26 + rng() * 10; u < w - 20; u += 40 + rng() * 14) {
    if (hung.every((m) => Math.abs(u - m - 7) > 16)) slit(d, at, u, plan.wallH * 0.48, 3.2, 10);
  }
  for (const m of hung) banner(d, at, m, plan.wallH - 3, 14, 30);
  battlements(d, at, 2, w - 2, plan.wallH, WALL);
  return front;
}

/** The wall's ground: a shadow along its foot, rough turf and fallen stones at the plinth. */
function footing(d: Draw, rng: Rng): void {
  groundShadow(d, 10, 6, SPAN + 30, 9, 0.38);
  for (let i = 0; i < 26; i++) {
    const x = -SPAN + rng() * SPAN * 2;
    if (Math.abs(x) < 30) continue;
    const c = pt(x, 6 + rng() * 5);
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 0.35 + (rng() - 0.5) * 0.3;
      const l = 3 + rng() * 2.5;
      d.pen.hair([c, pt(c.x + Math.cos(a) * l, c.y + Math.sin(a) * l)], 0.45, '#22361a', 0.75);
    }
  }
}

function walls(plan: Plan): (d: Draw, rng: Rng) => void {
  return (d, rng) => {
    // Back to front: the inner towers, the keep, then the curtain, its towers and the gate.
    if (plan.inner) {
      for (const x of [-100, 100]) roundTower(d, rng, x, 98, { r: 12, h: 100, rise: 48, wave: x < 0 ? 1 : -1, pole: 16 }, KEEP);
    }
    for (const s of [-1, 1] as const) roundTower(d, rng, s * INNER_X, INNER_Z, { ...plan.back, wave: plan.back.wave * s });
    if (plan.keep > 0) keep(d, rng, plan.keep === 2 ? 2 : 1);
    const left = curtain(d, rng, -SPAN, -30, plan);
    const right = curtain(d, rng, 30, SPAN, plan);
    towerShadow(d, left, -SPAN, 4, plan.corner.r, plan.wallH + 20);
    towerShadow(d, right, 36, -3, plan.gate.r, plan.wallH + 20);
    if (plan.mid !== 'none') {
      for (const s of [-1, 1] as const) {
        towerShadow(d, s < 0 ? left : right, s * 134 + 4, -6, 13, plan.wallH + 20);
        wallTower(d, rng, s * 134, 30, plan.wallH + 20, plan.mid === 'capped', s);
      }
    }
    gatehouse(d, rng, plan);
    roundTower(d, rng, -SPAN, 4, plan.corner);
    roundTower(d, rng, SPAN, 4, { ...plan.corner, wave: -plan.corner.wave });
  };
}

const FR = SLOTS.walls.frame;

function drawer(plan: Plan): TownDrawer {
  const draw = walls(plan);
  return (ctx, seed) => sprite(ctx, seed, 0, { bounds: boundsOf(FR), line: 0.9, rim: 0.4, ground: footing }, draw);
}

export const WALLS: Readonly<Record<'walls-fort' | 'walls-citadel' | 'walls-castle', TownDrawer>> = {
  'walls-fort': drawer(FORT),
  'walls-citadel': drawer(CITADEL),
  'walls-castle': drawer(CASTLE),
};

