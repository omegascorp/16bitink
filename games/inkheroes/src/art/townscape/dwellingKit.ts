import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { deepen, LICHEN, MOSS, mossFoot } from './light';
import { ashlar, boards, CROWN_BLUE, CROWN_GOLD, frontOf, HOLE, P, quad, roundWash, shingles, sideOf, type Box, type Surface } from '../sites/build';
import { blob, boundsOf, crisp, dab, flat, glow, LIGHT, mix, paint, rgba, SHADOW, soft } from '../sites/paintKit';
import { IRON } from '../sites/parts';
import { townSprite } from './townSprite';
import { SLOTS, type Slot, type TownDrawer } from './types';

/**
 * The townscape's building kit for the Crown's dwellings: the map's build
 * kit (sites/build.ts) scaled up to the town screen, where a door is about
 * 18 units tall, with more of the finish a painter puts in close up: big
 * coursed stones, quoins, slates with moss, windows with their reveals and
 * sills, heavy doors with iron straps, eave shadows and heraldry.
 */
export const OAK = '#4e3420';
export const OAK_DARK = '#2e1c10';
export const SLATE = '#454d58';
export const SLATE_WARM = '#4d4850';
export const STRAW = '#9a7c44';
export const CANDLE = '#f7c560';
export const STEEL = '#8a8e96';

/** Stone courses and slates at townscape scale. */
const COURSE = 6.4;
const STONE_LEN = 12;

export type Finish = 'stone' | 'plaster' | 'plank' | 'none';
export type Roofing = 'slate' | 'shingle';

/** A point offset by a vector. */
export const off = (p: Pt, v: Pt): Pt => pt(p.x + v.x, p.y + v.y);

/** One wall face: washed for the light, textured, weathered, grimed at its foot, lined. */
export function face(d: Draw, rng: Rng, at: Surface, w: number, h: number, color: string, tex: Finish, tone: number): Pt[] {
  const { pen } = d;
  const shape = crisp(quad(at, 0, 0, w, h), 4);
  flat(d, shape, color, { tone: deepen(tone), hatch: tone > 0.2 ? 0.22 : 0, line: 0 });
  const toned = tone > 0 ? mix(color, SHADOW, tone * 0.7) : color;
  if (tex === 'stone') { ashlar(d, rng, at, w, h, shape, toned, COURSE, STONE_LEN); mossFoot(d, rng, at, w, h, shape); }
  if (tex === 'plank') boards(d, rng, at, w, h, shape, toned, 5.2);
  if (tex === 'plaster') {
    pen.clipped(shape, () => {
      // Patches where the render has fallen and the stone shows.
      for (let i = 0; i < Math.max(1, Math.round((w * h) / 1800)); i++) {
        const c = at(rng() * w, h * (0.15 + rng() * 0.6));
        const patch = blob(c, 5 + rng() * 5, 3 + rng() * 3, rng, 0.35, 14);
        pen.fill(patch, mix(toned, '#735f46', 0.5), 0.35);
        for (let k = 0; k < 3; k++) pen.hair([pt(c.x - 4, c.y - 2 + k * 2.6), pt(c.x + 4, c.y - 2 + k * 2.6)], 0.35, d.ink, 0.35);
      }
    });
  }
  pen.clipped(shape, () => {
    // Wet-in-wet blooms: the wash pooling warmer and cooler across the face.
    for (let i = 0; i < Math.max(2, Math.round((w * h) / 900)); i++) {
      const c = at(rng() * w, rng() * h);
      const tint = rng() < 0.5 ? '#705a3b' : '#5a5e66';
      dab(d, blob(c, 6 + rng() * 10, 4 + rng() * 6, rng, 0.3, 14), mix(toned, tint, 0.6), 0.16, 3);
    }
    pen.stipple(shape, Math.round(w * h * 0.06), () => 0.55, 0.42, mix(toned, SHADOW, 0.45));
    // Rain streaks down from the top, and grime settled at the foot.
    for (let i = 0; i < Math.round(w / 22); i++) {
      const u = rng() * w;
      dab(d, crisp(quad(at, u, h * (0.35 + rng() * 0.3), u + 2 + rng() * 3, h), 3), mix(toned, SHADOW, 0.4), 0.12, 1.2);
    }
    soft(pen.ctx, 2.4, () => pen.fill(quad(at, -3, -2, w + 3, Math.min(h * 0.25, 9)), mix(toned, '#4a3624', 0.5), 0.26));
    // The light: a warm glaze where it strikes the upper left, a cool one settling to the lower right.
    const r = Math.max(w, h);
    soft(pen.ctx, r * 0.18, () => {
      pen.fill(blob(at(w * 0.12, h * 0.85), r * 0.45, r * 0.3, rng, 0.2, 16), LIGHT, tone > 0.2 ? 0.08 : 0.2);
      pen.fill(blob(at(w * 0.95, h * 0.1), r * 0.5, r * 0.32, rng, 0.2, 16), SHADOW, 0.1);
    });
  });
  pen.stroke(closed(shape), 0.7, d.ink, 0.88);
  return shape;
}

/** A box: its right side in shade, its front in half-light, and (optionally) its lit top. */
export function box(d: Draw, rng: Rng, b: Box, color: string, tex: Finish, top = true): { front: Pt[]; side: Pt[] } {
  const side = face(d, rng, sideOf(b), b.z1 - b.z0, b.h1 - b.h0, color, tex, 0.4);
  const front = face(d, rng, frontOf(b), b.x1 - b.x0, b.h1 - b.h0, color, tex, 0.05);
  if (top) flat(d, crisp([P(b.x0, b.z0, b.h1), P(b.x1, b.z0, b.h1), P(b.x1, b.z1, b.h1), P(b.x0, b.z1, b.h1)], 4), color, { tone: -0.3, line: 0.65 });
  return { front, side };
}

/** Dressed corner stones up an edge at `u` of a face, alternately long and short, reaching into the face by `dir`. */
export function quoins(d: Draw, at: Surface, u: number, h: number, color: string, dir: 1 | -1, tone = 0): void {
  const c = mix(color, LIGHT, 0.08 - tone * 0.3);
  for (let v = 0, k = 0; v + 2 < h; v += COURSE * 1.25, k++) {
    const l = k % 2 === 0 ? 7.5 : 4.5;
    const v1 = Math.min(h, v + COURSE * 1.25);
    const s = crisp([at(u, v + 0.4), at(u + dir * l, v + 0.4), at(u + dir * l, v1 - 0.4), at(u, v1 - 0.4)], 3);
    flat(d, s, c, { tone: tone + (k % 3 === 1 ? 0.06 : 0), line: 0.45 });
  }
}

/** A string course: a moulded band across a face at `v`, lit on its top lip, shadow cast under it. */
export function stringCourse(d: Draw, at: Surface, u0: number, u1: number, v: number, color: string, tone = 0): void {
  const { pen } = d;
  pen.clipped(crisp(quad(at, u0, v - 5, u1, v), 3), () => soft(pen.ctx, 1.2, () => pen.fill(quad(at, u0, v - 4, u1, v - 1), SHADOW, 0.3)));
  const band = crisp(quad(at, u0 - 1, v - 1.2, u1 + 1, v + 2.2), 3);
  flat(d, band, mix(color, LIGHT, 0.2), { tone, line: 0.55 });
  pen.hair([at(u0, v + 1.9), at(u1, v + 1.9)], 0.6, PAPER_FILL, 0.55);
}

// ---- Roofs ----

function plane(d: Draw, rng: Rng, at: Surface, w: number, h: number, color: string, tone: number, kind: Roofing): Pt[] {
  const { pen } = d;
  const shape = crisp(quad(at, 0, 0, w, h), 4);
  flat(d, shape, color, { tone: deepen(tone), hatch: tone > 0.2 ? 0.26 : 0, line: 0 });
  const toned = tone > 0 ? mix(color, SHADOW, tone * 0.6) : color;
  if (kind === 'slate') shingles(d, rng, at, w, h, shape, toned, 4.4, 5.4);
  else shingles(d, rng, at, w, h, shape, toned, 5, 4.6);
  pen.clipped(shape, () => {
    // Lichen and moss low on the slope, a sheen of light skimming its upper part.
    for (let i = 0; i < Math.round(w / 22); i++) {
      const c = at(rng() * w, h * rng() * 0.3);
      dab(d, blob(c, 3 + rng() * 5, 1.6 + rng() * 2, rng, 0.4, 12), rng() < 0.5 ? MOSS : LICHEN, 0.22, 1.6);
    }
    if (tone < 0.2) soft(pen.ctx, 4, () => pen.fill(quad(at, 0, h * 0.62, w * 0.55, h), LIGHT, 0.16));
    soft(pen.ctx, 1.6, () => pen.fill(quad(at, -2, -2, w + 2, 2.4), SHADOW, 0.25));
  });
  pen.stroke(closed(shape), 0.75, d.ink, 0.92);
  return shape;
}

/** A soft band of shadow cast by the eaves down a face, from `v` downwards. */
export function eaveShadow(d: Draw, at: Surface, w: number, v: number, depth = 8, alpha = 0.32): void {
  const { pen } = d;
  pen.clipped(crisp(quad(at, 0, v - depth * 1.6, w, v), 3), () => soft(pen.ctx, depth * 0.35, () => pen.fill(quad(at, -2, v - depth, w + 2, v + 2), SHADOW, alpha)));
}

/**
 * A gabled roof over a box, as build.ts's `gable` at townscape scale:
 * `along` 'x' runs the ridge across the view (the long front slope and a
 * gable on the right), 'z' runs it away (the gable to the front).
 */
export function gableRoof(d: Draw, rng: Rng, b: Box, rise: number, along: 'x' | 'z', color: string, kind: Roofing, wallColor: string, o = 4): { apex: Pt; ridge: [Pt, Pt] } {
  const h = b.h1;
  if (along === 'x') {
    const zm = (b.z0 + b.z1) / 2;
    eaveShadow(d, frontOf(b), b.x1 - b.x0, b.h1 - b.h0, 9);
    const end = crisp([P(b.x1, b.z0, h), P(b.x1, b.z1, h), P(b.x1, zm, h + rise)], 4);
    flat(d, end, wallColor, { tone: deepen(0.42), hatch: 0.26, line: 0.65 });
    const back: Surface = (u, v) => P(b.x0 - o + u, b.z1 + o - (v / rise) * (b.z1 + o - zm), h + v);
    plane(d, rng, back, b.x1 - b.x0 + 2 * o, rise, color, -0.1, kind);
    const front: Surface = (u, v) => P(b.x0 - o + u, b.z0 - o + (v / rise) * (zm - b.z0 + o), h - o * 0.5 + v * (1 + (o * 0.5) / rise));
    plane(d, rng, front, b.x1 - b.x0 + 2 * o, rise, color, 0.06, kind);
    // The ridge capping.
    d.pen.stroke([P(b.x0 - o, zm, h + rise), P(b.x1 + o, zm, h + rise)], 1.6, mix(color, SHADOW, 0.35), 0.95, false);
    return { apex: P(b.x1, zm, h + rise), ridge: [P(b.x0 - o, zm, h + rise), P(b.x1 + o, zm, h + rise)] };
  }
  const xm = (b.x0 + b.x1) / 2;
  const end = crisp([P(b.x0, b.z0, h), P(b.x1, b.z0, h), P(xm, b.z0, h + rise)], 4);
  flat(d, end, wallColor, { tone: 0.06, line: 0.65 });
  const depth = b.z1 - b.z0 + 2 * o;
  const lift = (v: number): number => h - o * 0.5 + v * (1 + (o * 0.5) / rise);
  const left: Surface = (u, v) => P(b.x0 - o + (v / rise) * (xm - b.x0 + o), b.z1 + o - u, lift(v));
  const right: Surface = (u, v) => P(b.x1 + o - (v / rise) * (b.x1 + o - xm), b.z0 - o + u, lift(v));
  plane(d, rng, left, depth, rise, color, -0.14, kind);
  plane(d, rng, right, depth, rise, color, 0.42, kind);
  // Barge boards up the front verge.
  d.pen.stroke([P(b.x0 - o, b.z0 - o, h - o * 0.5), P(xm, b.z0 - o, h + rise + o * 0.5), P(b.x1 + o, b.z0 - o, h - o * 0.5)], 1.8, mix(color, SHADOW, 0.3), 0.95, false);
  return { apex: P(xm, b.z0 - o, h + rise + o * 0.5), ridge: [P(xm, b.z0 - o, h + rise + o * 0.5), P(xm, b.z1 + o, h + rise + o * 0.5)] };
}

/** A hipped (pyramid) roof over a box, its apex `rise` above the eaves. */
export function pyramidRoof(d: Draw, rng: Rng, b: Box, rise: number, color: string, o = 3): Pt {
  const h = b.h1 - o * 0.5;
  const [x0, x1, z0, z1] = [b.x0 - o, b.x1 + o, b.z0 - o, b.z1 + o];
  const apex = P((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, b.h1 + rise);
  const tri = (a: Pt, c: Pt, tone: number): void => {
    const shape = crisp([a, c, apex], 4);
    flat(d, shape, color, { tone: deepen(tone), hatch: tone > 0.2 ? 0.28 : 0, line: 0 });
    const span = Math.hypot(c.x - a.x, c.y - a.y);
    const at: Surface = (u, v) => {
      const t = v / rise;
      const base = pt(a.x + ((c.x - a.x) * u) / span, a.y + ((c.y - a.y) * u) / span);
      return pt(base.x + (apex.x - base.x) * t, base.y + (apex.y - base.y) * t);
    };
    shingles(d, rng, at, span, rise, shape, tone > 0 ? mix(color, SHADOW, tone * 0.6) : color, 4.2, 4.6);
    d.pen.stroke(closed(shape), 0.75, d.ink, 0.92);
  };
  tri(P(x0, z1, h), P(x0, z0, h), -0.2);
  tri(P(x1, z0, h), P(x1, z1, h), 0.45);
  tri(P(x0, z0, h), P(x1, z0, h), 0.05);
  for (const c of [P(x0, z0, h), P(x1, z0, h)]) d.pen.stroke([c, apex], 1.3, mix(color, SHADOW, 0.35), 0.9, false);
  return apex;
}

// ---- Openings ----

export interface WindowOpts {
  readonly arched?: boolean;
  readonly lit?: boolean;
  /** Stone mullion and transom (or leading, when lit). */
  readonly bars?: boolean;
  readonly sill?: boolean;
  readonly shutters?: string;
  /** How the face is turned from the light (0 front, 0.4 side). */
  readonly tone?: number;
}

/** An opening's outline on a face: square-headed or round-arched, grown by `g`. */
function opening(at: Surface, u: number, v: number, w: number, h: number, arched: boolean, g: number): Pt[] {
  if (!arched) return crisp(quad(at, u - g, v - g, u + w + g, v + h + g), 2);
  const r = w / 2 + g;
  const sp = v + h - w / 2;
  const head = Array.from({ length: 13 }, (_, i) => {
    const a = (i / 12) * Math.PI;
    return at(u + w / 2 + Math.cos(a) * r, sp + Math.sin(a) * r);
  });
  return crisp([at(u - g, sp), at(u - g, v - g), at(u + w + g, v - g), ...head.slice(0, -1)], 2);
}

/** Fills an opening with warm candlelight: bright at its heart, amber to its frame. */
function lamplight(d: Draw, hole: readonly Pt[]): void {
  const ctx = d.pen.ctx;
  const xs = hole.map((p) => p.x);
  const ys = hole.map((p) => p.y);
  const c = pt((Math.min(...xs) + Math.max(...xs)) / 2, Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * 0.6);
  const r = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  d.pen.clipped(hole, () => {
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 0.8);
    g.addColorStop(0, '#fff1c0');
    g.addColorStop(0.45, CANDLE);
    g.addColorStop(1, '#a8562a');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  });
}

/** Dark glass with a cool reflection of the sky at its upper left. */
function glass(d: Draw, hole: readonly Pt[]): void {
  const ctx = d.pen.ctx;
  const xs = hole.map((p) => p.x);
  const ys = hole.map((p) => p.y);
  d.pen.clipped(hole, () => {
    const g = ctx.createLinearGradient(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
    g.addColorStop(0, '#4c5466');
    g.addColorStop(0.45, '#24262e');
    g.addColorStop(1, HOLE);
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) - Math.min(...xs) + 2, Math.max(...ys) - Math.min(...ys) + 2);
  });
}

/** A window: a dressed surround, glass or candlelight, the reveal's shadow, bars, a sill and shutters. */
export function window(d: Draw, at: Surface, u: number, v: number, w: number, h: number, wall: string, o: WindowOpts = {}): Pt[] {
  const { pen } = d;
  const tone = o.tone ?? 0;
  const arched = o.arched ?? false;
  if (o.shutters) {
    for (const [s0, s1] of [[u - w * 0.55 - 1.6, u - 1.6], [u + w + 1.6, u + w * 1.55 + 1.6]] as const) {
      const sh = crisp(quad(at, s0, v + 0.5, s1, v + h - (arched ? w * 0.3 : 0)), 2);
      flat(d, sh, o.shutters, { tone: tone + 0.05, line: 0.5 });
      pen.clipped(sh, () => {
        for (let k = 1; k < 3; k++) pen.hair([at(s0 + ((s1 - s0) * k) / 3, v + 1), at(s0 + ((s1 - s0) * k) / 3, v + h - 1)], 0.4, d.ink, 0.5);
        pen.hair([at(s0, v + h * 0.3), at(s1, v + h * 0.3)], 0.6, mix(o.shutters!, SHADOW, 0.5), 0.8);
      });
    }
  }
  const surround = opening(at, u, v, w, h, arched, 1.9);
  flat(d, surround, mix(wall, LIGHT, 0.28), { tone, line: 0.5 });
  const hole = opening(at, u, v, w, h, arched, 0);
  if (o.lit) lamplight(d, hole);
  else glass(d, hole);
  if (o.bars) {
    const bar = o.lit ? mix(OAK_DARK, SHADOW, 0.2) : mix(wall, LIGHT, 0.1);
    pen.clipped(hole, () => {
      if (o.lit) {
        for (let k = -h; k < w + h; k += 3.2) {
          pen.hair([at(u + k, v), at(u + k + h, v + h)], 0.35, bar, 0.7);
          pen.hair([at(u + k + h, v), at(u + k, v + h)], 0.35, bar, 0.7);
        }
      }
      pen.stroke([at(u + w / 2, v), at(u + w / 2, v + h)], o.lit ? 0.8 : 1.3, bar, 0.95, false);
      pen.stroke([at(u, v + h * 0.58), at(u + w, v + h * 0.58)], o.lit ? 0.8 : 1.2, bar, 0.95, false);
    });
  }
  // The reveal: the wall's thickness shades the opening's top and left; a sliver of light inside its right jamb.
  pen.crescent(hole, pt(1.6, 1.9), () => soft(pen.ctx, 0.4, () => pen.fill(hole, SHADOW, o.lit ? 0.38 : 0.5)));
  pen.clipped(hole, () => pen.fill(crisp(quad(at, u + w - 1.1, v, u + w, v + h - (arched ? w / 2 : 0)), 2), mix(wall, LIGHT, 0.2), o.lit ? 0.3 : 0.55));
  pen.stroke(closed(hole), 0.65, d.ink, 0.92);
  if (o.sill ?? true) {
    pen.clipped(crisp(quad(at, u - 3, v - 6, u + w + 3, v - 1.6), 2), () => soft(pen.ctx, 1, () => pen.fill(quad(at, u - 2, v - 5, u + w + 3, v - 1.8), SHADOW, 0.32)));
    const sill = crisp(quad(at, u - 2, v - 2.2, u + w + 2, v + 0.3), 2);
    flat(d, sill, mix(wall, LIGHT, 0.35), { tone, line: 0.5 });
    pen.hair([at(u - 1.8, v + 0.1), at(u + w + 1.8, v + 0.1)], 0.6, PAPER_FILL, 0.7);
  }
  return hole;
}

export interface DoorOpts {
  readonly arched?: boolean;
  readonly wood?: string;
  /** Width of the voussoir ring (0 for a plain timber frame). */
  readonly ring?: number;
  readonly tone?: number;
  /** Left open a crack: the dark hall within and warm light from it. */
  readonly ajar?: boolean;
}

/** A heavy door: a voussoired arch, an oak leaf of boards, iron strap hinges and studs, a ring pull, a step. */
export function door(d: Draw, rng: Rng, at: Surface, u: number, w: number, h: number, wall: string, o: DoorOpts = {}): Pt[] {
  const { pen } = d;
  const arched = o.arched ?? true;
  const ring = o.ring ?? 3.6;
  const wood = o.wood ?? OAK;
  const tone = o.tone ?? 0;
  const sp = h - w / 2;
  if (ring > 0) {
    const outer = opening(at, u, 0, w, h, arched, ring);
    flat(d, outer, mix(wall, LIGHT, 0.22), { tone, line: 0.6 });
    // Voussoirs round the head and a keystone; jamb stones down the sides.
    if (arched) {
      for (let i = 1; i < 9; i++) {
        const a = Math.PI - (i / 9) * Math.PI;
        pen.hair([at(u + w / 2 + Math.cos(a) * (w / 2), sp + Math.sin(a) * (w / 2)), at(u + w / 2 + Math.cos(a) * (w / 2 + ring), sp + Math.sin(a) * (w / 2 + ring))], 0.5, d.ink, 0.65);
      }
      const k = crisp([at(u + w / 2 - 2.2, h - 0.6), at(u + w / 2 + 2.2, h - 0.6), at(u + w / 2 + 2.8, h + ring + 0.8), at(u + w / 2 - 2.8, h + ring + 0.8)], 1.5);
      flat(d, k, mix(wall, LIGHT, 0.4), { tone, line: 0.5 });
    }
    for (let v = 0; v < (arched ? sp : h); v += 5.2) {
      for (const [a, b] of [[u - ring, u], [u + w, u + w + ring]] as const) pen.hair([at(a, v), at(b, v)], 0.45, d.ink, 0.6);
    }
  }
  const leaf = opening(at, u, 0, w, h, arched, 0);
  flat(d, leaf, wood, { tone: tone + 0.05, line: 0 });
  boards(d, rng, at, w, h, leaf, wood, w / 4);
  if (o.ajar) {
    const gap = crisp(quad(at, u + w * 0.62, 0, u + w * 0.78, arched ? sp + w * 0.2 : h), 2);
    pen.clipped(leaf, () => {
      pen.fill(gap, HOLE, 0.95);
      soft(pen.ctx, 1, () => pen.fill(crisp(quad(at, u + w * 0.64, 0, u + w * 0.7, sp), 2), CANDLE, 0.7));
    });
  }
  pen.clipped(leaf, () => {
    // Iron straps with curled ends, studded, and a ring pull.
    for (const v of [h * 0.2, arched ? sp * 0.85 : h * 0.75]) {
      pen.stroke([at(u + 0.5, v), at(u + w * 0.78, v)], 1.5, IRON, 0.95, false);
      pen.stroke(bezier(at(u + w * 0.78, v), at(u + w * 0.88, v + 1.6), at(u + w * 0.82, v + 2.4), 5), 0.9, IRON, 0.9, false);
      for (let s = u + 2; s < u + w * 0.75; s += 2.6) pen.dot(at(s, v).x, at(s, v).y, 0.42, '#928473', 0.95);
    }
    pen.crescent(leaf, pt(2, 2.4), () => soft(pen.ctx, 0.6, () => pen.fill(leaf, SHADOW, 0.45)));
  });
  const rp = at(u + w * 0.7, h * 0.45);
  pen.stroke(closed(oval(rp.x, rp.y + 1.2, 1.3, 1.6, 10)), 0.6, IRON, 1);
  pen.dot(rp.x, rp.y, 0.7, IRON, 1);
  pen.stroke(closed(leaf), 0.75, d.ink, 0.95);
  return leaf;
}

/** A narrow arrow loop with a cross slot, splayed in its dressed surround. */
export function loop(d: Draw, at: Surface, u: number, v: number, h: number, wall: string, tone = 0): void {
  const { pen } = d;
  const sur = crisp(quad(at, u - 2.4, v - 1.6, u + 2.4, v + h + 1.6), 2);
  flat(d, sur, mix(wall, LIGHT, 0.25), { tone, line: 0.45 });
  const slot = crisp(quad(at, u - 0.7, v, u + 0.7, v + h), 1.5);
  pen.fill(slot, HOLE, 0.95);
  pen.fill(crisp(quad(at, u - 2, v + h * 0.55 - 0.6, u + 2, v + h * 0.55 + 0.6), 1.5), HOLE, 0.95);
  pen.stroke(closed(slot), 0.45, d.ink, 0.9);
}

// ---- Battlements ----

/**
 * One row of merlons standing on the base line a0 → a1 (screen points, drawn
 * in that order, so run a side row from the back forwards), each `mh` tall
 * and `mw` wide with `gap` between, its lid running back by `back`: the
 * faces toned `tone`, the end faces (at the a1 end of each) `endTone`.
 */
export function crenels(d: Draw, a0: Pt, a1: Pt, mh: number, back: Pt, color: string, tone: number, endTone = 0.5, mw = 7, gap = 5): void {
  const len = Math.hypot(a1.x - a0.x, a1.y - a0.y);
  const dir = pt((a1.x - a0.x) / len, (a1.y - a0.y) / len);
  const at = (s: number, up: number): Pt => pt(a0.x + dir.x * s, a0.y + dir.y * s - up);
  const n = Math.max(1, Math.floor((len + gap) / (mw + gap)));
  const lead = (len - (n * mw + (n - 1) * gap)) / 2;
  for (let i = 0; i < n; i++) {
    const s0 = lead + i * (mw + gap);
    const s1 = s0 + mw;
    const lid = [at(s0, mh), at(s1, mh), off(at(s1, mh), back), off(at(s0, mh), back)];
    const end = [at(s1, 0), off(at(s1, 0), back), off(at(s1, mh), back), at(s1, mh)];
    flat(d, crisp(end, 2), color, { tone: endTone, line: 0.45 });
    flat(d, crisp(lid, 2), color, { tone: -0.35, line: 0.45 });
    const fr = crisp([at(s0, 0), at(s1, 0), at(s1, mh), at(s0, mh)], 2);
    flat(d, fr, color, { tone, line: 0.55 });
    d.pen.hair([at(s0 + 0.5, mh * 0.5), at(s1 - 0.5, mh * 0.5)], 0.4, d.ink, 0.45);
    d.pen.hair([at(s0 + 0.6, mh - 0.6), at(s1 - 0.6, mh - 0.6)], 0.5, PAPER_FILL, 0.5);
  }
}

/** A row of corbels under a projecting parapet along a front face, from u0 to u1 below height v. */
export function corbels(d: Draw, at: Surface, u0: number, u1: number, v: number, color: string, tone = 0, step = 7): void {
  for (let u = u0; u <= u1 + 0.01; u += step) {
    const c = crisp([at(u - 1.8, v), at(u + 1.8, v), at(u + 1.4, v - 2.6), at(u + 0.6, v - 5), at(u - 0.6, v - 5), at(u - 1.4, v - 2.6)], 1.5);
    flat(d, c, mix(color, LIGHT, 0.15), { tone, line: 0.45 });
    d.pen.clipped(crisp(quad(at, u - 1, v - 9, u + 4, v - 4.6), 2), () => soft(d.pen.ctx, 0.8, () => d.pen.fill(quad(at, u, v - 8, u + 3, v - 4.6), SHADOW, 0.3)));
  }
}

// ---- Heraldry and dressing ----

/** A heater shield's outline, `c` at the middle of its top edge. */
export function shieldShape(c: Pt, w: number, h: number): Pt[] {
  return [
    ...bezier(pt(c.x - w / 2, c.y), pt(c.x, c.y - h * 0.06), pt(c.x + w / 2, c.y), 6),
    pt(c.x + w / 2, c.y + h * 0.42),
    ...bezier(pt(c.x + w / 2, c.y + h * 0.42), pt(c.x + w * 0.46, c.y + h * 0.82), pt(c.x, c.y + h), 8).slice(1),
    ...bezier(pt(c.x, c.y + h), pt(c.x - w * 0.46, c.y + h * 0.82), pt(c.x - w / 2, c.y + h * 0.42), 8).slice(1),
  ];
}

/** The Crown's charge: a gilt crown, three points and a band, `c` at its middle. */
export function crownCharge(d: Draw, c: Pt, s: number): void {
  const k = s / 10;
  const shape = [pt(c.x - 5 * k, c.y + 3 * k), pt(c.x - 5.4 * k, c.y - 3 * k), pt(c.x - 2.6 * k, c.y), pt(c.x, c.y - 4.6 * k), pt(c.x + 2.6 * k, c.y), pt(c.x + 5.4 * k, c.y - 3 * k), pt(c.x + 5 * k, c.y + 3 * k)];
  paint(d, shape, CROWN_GOLD, { shadow: 0.35, hatch: 0, line: 0.5, gloss: true });
  for (const p of [pt(c.x - 5.4 * k, c.y - 3 * k), pt(c.x, c.y - 4.6 * k), pt(c.x + 5.4 * k, c.y - 3 * k)]) d.pen.dot(p.x, p.y - 0.6 * k, 0.9 * k, CROWN_GOLD, 1);
  d.pen.hair([pt(c.x - 4.8 * k, c.y + 1.4 * k), pt(c.x + 4.8 * k, c.y + 1.4 * k)], 0.45, mix(CROWN_GOLD, SHADOW, 0.5), 0.9);
}

/** A blue heater shield with a gilt border and the Crown's charge. */
export function shield(d: Draw, c: Pt, w: number, h: number): Pt[] {
  const shape = shieldShape(c, w, h);
  paint(d, shape, CROWN_BLUE, { shadow: 0.45, hatch: 0.12, line: 0.75 });
  const inner = shieldShape(pt(c.x, c.y + h * 0.07), w * 0.82, h * 0.84);
  d.pen.stroke(closed(inner), Math.max(0.9, w * 0.07), CROWN_GOLD, 0.95);
  crownCharge(d, pt(c.x, c.y + h * 0.42), w * 0.55);
  d.pen.stroke(bezier(pt(c.x - w * 0.36, c.y + h * 0.1), pt(c.x - w * 0.4, c.y + h * 0.4), pt(c.x - w * 0.2, c.y + h * 0.72), 6), 0.7, PAPER_FILL, 0.4, false);
  return shape;
}

/**
 * A hanging banner from a crossbar at `top` (the middle of its head), `w`
 * by `h`, swallow-tailed, its cloth falling in folds; `charge` paints the
 * device at its middle.
 */
export function banner(d: Draw, top: Pt, w: number, h: number, color: string, charge?: (c: Pt) => void, sway = 0): Pt[] {
  const { pen } = d;
  const ctx = pen.ctx;
  const x0 = top.x - w / 2;
  const fold = (t: number): number => Math.sin(t * Math.PI * 3) * 0.9;
  const leftEdge = Array.from({ length: 9 }, (_, i) => pt(x0 + sway * (i / 8) ** 2 + fold(i / 8) * 0.4, top.y + (h * i) / 8));
  const rightEdge = Array.from({ length: 9 }, (_, i) => pt(x0 + w + sway * (i / 8) ** 2 - fold(i / 8) * 0.4, top.y + (h * i) / 8));
  const notch = pt(top.x + sway, top.y + h * 0.8);
  const cloth = [...leftEdge, notch, ...[...rightEdge].reverse()];
  paint(d, cloth, color, { shadow: 0.35, hatch: 0, line: 0 });
  pen.clipped(cloth, () => {
    // Folds: soft vertical bands of shade and light.
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, i % 2 === 0 ? rgba(LIGHT, 0.2) : rgba(SHADOW, 0.28));
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 2, top.y - 1, w + 4 + Math.abs(sway), h + 2);
    pen.stroke([...leftEdge.map((p) => pt(p.x + 1.6, p.y)), pt(notch.x, notch.y - 2.4), ...[...rightEdge].reverse().map((p) => pt(p.x - 1.6, p.y))], 1, CROWN_GOLD, 0.95, false);
  });
  if (charge) charge(pt(top.x + sway * 0.3, top.y + h * 0.4));
  pen.stroke(closed(cloth), 0.7, d.ink, 0.92);
  const bar = [pt(x0 - 3, top.y - 0.6), pt(x0 + w + 3, top.y - 0.6)];
  pen.stroke(bar, 1.8, OAK_DARK, 1, false);
  for (const p of bar) pen.dot(p.x, p.y, 1.2, CROWN_GOLD, 1);
  return cloth;
}

/** A flag on a staff from `foot` up `h`: a gilt finial and a long swallow-tailed pennon streaming right. */
export function flag(d: Draw, foot: Pt, h: number, color: string, len = 22, depth = 9, wave = 1.5): void {
  const { pen } = d;
  const top = pt(foot.x, foot.y - h);
  pen.stroke([foot, top], 1.3, d.ink, 0.95, false);
  const y0 = top.y + 1.5;
  const upper = bezier(pt(top.x, y0), pt(top.x + len * 0.5, y0 - 3 + wave), pt(top.x + len, y0 + 1.5 + wave), 10);
  const lower = bezier(pt(top.x + len, y0 + depth * 0.95 + wave), pt(top.x + len * 0.5, y0 + depth * 0.9 + wave * 1.5), pt(top.x, y0 + depth), 10);
  const cloth = [...upper, pt(top.x + len * 0.74, y0 + depth * 0.52 + wave), ...lower];
  paint(d, cloth, color, { shadow: 0.4, hatch: 0, line: 0.6 });
  pen.clipped(cloth, () => pen.stroke(bezier(pt(top.x + 2, y0 + depth * 0.5), pt(top.x + len * 0.4, y0 + depth * 0.2 + wave), pt(top.x + len * 0.8, y0 + depth * 0.55 + wave), 8), 1.4, mix(color, SHADOW, 0.4), 0.45, false));
  pen.dot(top.x, top.y - 1, 1.6, CROWN_GOLD, 1);
  pen.dot(top.x - 0.5, top.y - 1.5, 0.55, PAPER_FILL, 0.85);
}

/** A barrel standing on the ground, `c` at the middle of its foot: bellied staves, iron hoops, its lid. */
export function barrel(d: Draw, c: Pt, r: number, h: number, wood = '#69492b'): void {
  const { pen } = d;
  const ry = r * 0.42;
  const side = [...bezier(pt(c.x - r, c.y - h), pt(c.x - r * 1.2, c.y - h / 2), pt(c.x - r, c.y), 8), ...oval(c.x, c.y, r, ry, 24).filter((p) => p.y >= c.y - 0.01).sort((a, b) => a.x - b.x), ...bezier(pt(c.x + r, c.y), pt(c.x + r * 1.2, c.y - h / 2), pt(c.x + r, c.y - h), 8)];
  roundWash(d, side, c.x - r * 1.15, c.x + r * 1.15, wood, 0.25);
  pen.clipped(side, () => {
    for (let k = -3; k <= 3; k++) pen.hair(bezier(pt(c.x + k * r * 0.28, c.y - h), pt(c.x + k * r * 0.34, c.y - h / 2), pt(c.x + k * r * 0.28, c.y + ry * 0.9), 6), 0.4, mix(wood, SHADOW, 0.6), 0.6);
    for (const t of [0.14, 0.4, 0.62, 0.88]) {
      const y = c.y - h * t;
      const rr = r * (1 + 0.18 * Math.sin(t * Math.PI));
      pen.stroke(oval(c.x, y, rr, ry, 20).filter((p) => p.y >= y - 0.01).sort((a, b) => a.x - b.x), 1.1, IRON, 0.9, false);
    }
  });
  pen.stroke(closed(side), 0.7, d.ink, 0.92);
  const lid = oval(c.x, c.y - h, r, ry, 20);
  flat(d, lid, mix(wood, LIGHT, 0.25), { tone: -0.1, line: 0.6 });
  pen.hair([pt(c.x - r * 0.7, c.y - h), pt(c.x + r * 0.7, c.y - h)], 0.4, d.ink, 0.5);
}

/** Grass tufts along the ground from x0 to x1 at y. */
export function tufts(d: Draw, rng: Rng, x0: number, x1: number, y: number, n: number, k = 1): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + rng() * (x1 - x0);
    for (let j = -2; j <= 2; j++) d.pen.stroke([pt(x + j * 0.9, y + rng() * 0.6), pt(x + j * 2.2 * k + (rng() - 0.5), y - (3 + rng() * 4) * k)], 0.6, rng() < 0.5 ? '#4d6634' : '#365930', 0.95, false);
  }
}

/** A worn patch of earth and flagstones under a building's door, painted on the ground. */
export function apron(d: Draw, rng: Rng, c: Pt, rx: number, ry: number, stones = true): void {
  const { pen } = d;
  const patch = blob(c, rx, ry, rng, 0.18, 24);
  soft(pen.ctx, 2, () => pen.fill(patch, '#76604a', 0.55));
  if (!stones) return;
  for (let i = 0; i < Math.round(rx / 3); i++) {
    const p = pt(c.x + (rng() - 0.5) * rx * 1.5, c.y + (rng() - 0.5) * ry * 1.3);
    const s = blob(p, 3 + rng() * 2.5, 1.5 + rng(), rng, 0.2, 10);
    pen.fill(s, mix('#8e7c62', PAPER_FILL, rng() * 0.3), 0.85);
    pen.hair(closed(s), 0.4, d.ink, 0.5);
  }
}

/** A soft tint washed over everything painted so far on the layer (the haze of distance). */
export function haze(d: Draw, color: string, alpha: number, x0: number, y0: number, x1: number, y1: number): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

/** A lit window's glow spilling into the air around it. */
export function windowGlow(d: Draw, c: Pt, r: number, alpha = 0.3): void {
  glow(d.pen.ctx, c, r, CANDLE, alpha);
}

/** Paints `draw` as a finished building in its slot's frame: ground first, the figure inked and rim-lit, then the air. */
export function dwelling(slot: Slot, draw: (d: Draw, rng: Rng) => void, ground: (d: Draw, rng: Rng) => void, air?: (d: Draw, rng: Rng) => void, line = 1.3): TownDrawer {
  return (ctx, seed) => townSprite(ctx, seed, 0, { bounds: boundsOf(SLOTS[slot].frame), line, ground, air }, draw);
}
