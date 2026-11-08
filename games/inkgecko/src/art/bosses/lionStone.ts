import type { Rng } from '../../logic/rng';
import { blob, body, castShadow, outline, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { LEAF, MOSS, PAPER_FILL, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { glaze } from '../propsKit';
import { LICHEN, LIMESTONE, LIMESTONE_COOL, mossPatch, rect, worn } from '../ruinsThings';
import { mix } from '../wash';

/**
 * The stone lion's stonework: weathered limestone painted as the ruins'
 * blocks are (a wash on paper, a lit bloom, grain, stains, lichen, a core
 * shadow hatched at its darkest, a pen contour), its stepped plinth with
 * chipped arrises and moss in the joints, and the marks of a hit: ink
 * fissures with a lit lip, and chips flying off.
 */
export const LION_STONE = mix(LIMESTONE, '#cfa86c', 0.42);
export const LION_DEEP = mix(STONE_DARK, '#6d5a3c', 0.35);
export const HOLLOW = '#2b2a31';
const LICHEN_PALE = '#e3e4d2';
const LICHEN_ORANGE = '#d39a45';

/** A shape's bounding centre and its larger side. */
export function bounds(shape: readonly Pt[]): { c: Pt; size: number } {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { c: pt((x0 + x1) / 2, (y0 + y1) / 2), size: Math.max(x1 - x0, y1 - y0) };
}

export interface StoneLook {
  readonly tone?: string;
  /** Strength of the core shadow (1 = normal). */
  readonly shade?: number;
  readonly line?: number;
  /** How many lichen spots, roughly. */
  readonly lichen?: number;
  /** Stipple dots per square unit of its size. */
  readonly grain?: number;
  /** How deep the core shadow reaches, as a share of the size. */
  readonly depth?: number;
}

/** Lichen on old stone: grey-green crusts, a yellow rosette, now and then an orange fleck. */
export function lichen(d: Draw, c: Pt, size: number, rng: Rng, n: number): void {
  const { pen } = d;
  for (let k = 0; k < n; k++) {
    const p = polar(c, rng() * TAU, Math.sqrt(rng()) * size * 0.42);
    const r = Math.min(size * (0.05 + rng() * 0.05), 1.8 + rng() * 1.6) + 0.8;
    const kind = rng();
    const colour = kind < 0.5 ? LICHEN_PALE : kind < 0.88 ? LICHEN : LICHEN_ORANGE;
    const crust = blob(p, kind < 0.88 ? r : r * 0.45, (kind < 0.88 ? r : r * 0.45) * 0.8, rng, 0.35, 12, rng() * TAU);
    pen.fill(crust, colour, kind < 0.5 ? 0.7 : 0.6);
    pen.hair(closed(crust), 0.3, mix(colour, d.ink, 0.5), 0.4);
    for (let j = 0; j < 3; j++) pen.dot(p.x + (rng() - 0.5) * r, p.y + (rng() - 0.5) * r, 0.35, mix(colour, d.ink, 0.45), 0.6);
  }
}

/**
 * One carved piece of limestone: paper and a wash, a lit bloom towards the
 * light, stains and grain, lichen, the far side falling into hatched shade,
 * a lit rim, and an ink contour heavier on the shadow side.
 */
export function stone(d: Draw, shape: readonly Pt[], rng: Rng, look: StoneLook = {}): void {
  const { pen } = d;
  const { c, size } = bounds(shape);
  const tone = look.tone ?? LION_STONE;
  const sh = look.shade ?? 1;
  const dp = look.depth ?? 0.13;
  body(d, shape, tone, 0.82);
  pen.clipped(shape, () => {
    glaze(d, c.x - SHADOW.x * size * 0.16, c.y - SHADOW.y * size * 0.16, size * 0.42, size * 0.3, -0.6, PAPER_FILL, 0.4);
    for (let k = 0; k < 2; k++) {
      const p = polar(c, rng() * TAU, rng() * size * 0.3);
      pen.fill(blob(p, size * 0.2, size * 0.12, rng, 0.35, 12, rng() * TAU), LION_DEEP, 0.1);
    }
    pen.stipple(shape, Math.round(size * size * (look.grain ?? 0.2)), () => 0.6, 0.3, STONE_DARK);
    lichen(d, c, size, rng, look.lichen ?? Math.round(size / 14));
  });
  pen.crescent(shape, pt(-SHADOW.x * size * dp, -SHADOW.y * size * dp), () => pen.fill(shape, mix(LION_DEEP, d.ink, 0.25), 0.42 * sh));
  if (size > 12) pen.crescent(shape, pt(-SHADOW.x * size * dp * 1.5, -SHADOW.y * size * dp * 1.5), () => pen.hatch(shape, 2.1, 0.9, 0.4, { color: d.ink, alpha: 0.34 * sh }));
  pen.crescent(shape, pt(SHADOW.x * size * 0.07, SHADOW.y * size * 0.07), () => pen.fill(shape, PAPER_FILL, 0.38));
  pen.stroke(closed(shape), look.line ?? 1.1, d.ink, 0.92);
}

/** A square with its edges knocked about: worn corners and a few chipped notches along each side. */
function chipped(c: Pt, u: Pt, s: number, rng: Rng, notches: number): Pt[] {
  const sq = outline(worn(rect(c, u, s, s), 4 + rng() * 3), 3).slice(0, -1);
  const n = sq.length;
  const bites = Array.from({ length: notches }, () => ({ at: Math.floor(rng() * n), w: 2 + Math.floor(rng() * 3), deep: 1.5 + rng() * 2.5 }));
  return sq.map((p, i) => {
    const bite = bites.find((b) => Math.abs(i - b.at) <= b.w);
    if (!bite) return p;
    const k = (1 - Math.abs(i - bite.at) / (bite.w + 1)) * bite.deep * (0.7 + rng() * 0.6);
    const toC = Math.hypot(c.x - p.x, c.y - p.y) || 1;
    return pt(p.x + ((c.x - p.x) / toC) * k, p.y + ((c.y - p.y) / toC) * k);
  });
}

/** Moss and tiny weeds grown in clumps along a joint from a to b. */
function mossJoint(d: Draw, a: Pt, b: Pt, rng: Rng, clumps: number): void {
  const { pen } = d;
  for (let k = 0; k < clumps; k++) {
    const t = rng();
    const c = pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    const n = 3 + Math.floor(rng() * 5);
    for (let j = 0; j < n; j++) {
      const p = pt(c.x + (b.x - a.x) * (rng() - 0.5) * 0.08, c.y + (b.y - a.y) * (rng() - 0.5) * 0.08);
      const q = pt(p.x + (rng() - 0.5) * 2, p.y + (rng() - 0.5) * 2);
      const r = 0.8 + rng() * 1.3;
      pen.fill(oval(q.x, q.y, r, r * 0.8, 7), rng() < 0.45 ? LEAF : rng() < 0.5 ? MOSS : '#b9cc78', 0.8);
    }
  }
}

/**
 * The plinth the lion lies on, `s` square, turned by `turn`: a lower step,
 * the top slab with a sunk margin, both chipped at the arrises, moss in the
 * joint between them and along a crack, lichen over all.
 */
export function plinth(d: Draw, s: number, turn: number, rng: Rng): Pt[] {
  const { pen } = d;
  const c = pt(0, 0);
  const u = pt(Math.cos(turn), Math.sin(turn));
  const base = chipped(c, u, s + 12, rng, 5);
  const top = chipped(c, u, s, rng, 6);
  castShadow(d, base, 9, 0.12);
  castShadow(d, base, 5, 0.12);
  stone(d, base, rng, { tone: mix(LIMESTONE_COOL, LIMESTONE, 0.3), shade: 0.7, line: 1, lichen: 7, grain: 0.07, depth: 0.04 });
  castShadow(d, top, 3.5, 0.26);
  stone(d, top, rng, { tone: mix(LIMESTONE_COOL, LIMESTONE, 0.35), shade: 0.6, line: 1.2, lichen: 14, grain: 0.07, depth: 0.035 });
  // The joint between the step and the slab, moss in it.
  const joint = rect(c, u, s + 1.5, s + 1.5);
  for (let i = 0; i < 4; i++) mossJoint(d, joint[i]!, joint[(i + 1) % 4]!, rng, 2 + Math.floor(rng() * 2));
  // The sunk margin round the top, and an old crack across one corner, moss grown in it.
  pen.hair(closed(outline(worn(rect(c, u, s - 9, s - 9), 3), 6)), 0.55, d.ink, 0.4);
  const corner = rect(c, u, s - 1, s - 1)[1]!;
  const crack = crackPath(polar(corner, Math.PI + turn, 14), Math.PI * 0.62 + turn, 16, rng);
  pen.stroke(crack, 0.9, d.ink, 0.75, false);
  mossJoint(d, crack[0]!, crack[crack.length - 1]!, rng, 2);
  pen.clipped(top, () => {
    mossPatch(d, rect(c, u, s - 6, s - 6)[3]!, 6, rng, 0.55);
    mossPatch(d, rect(c, u, s - 4, s - 4)[2]!, 4, rng, 0.5);
  });
  return top;
}

/** A jagged crack from `from` heading along `ang`, `len` long, as a polyline. */
export function crackPath(from: Pt, ang: number, len: number, rng: Rng): Pt[] {
  const out = [from];
  let a = ang;
  for (let s = 0; s < len; s += 2.4 + rng() * 2) {
    a += (rng() - 0.5) * 1.1;
    a += (ang - a) * 0.35;
    out.push(polar(out[out.length - 1]!, a, 2.4 + rng() * 2));
  }
  return out;
}

/** An ink fissure along `path`: a dark split, a lit lip on the side towards the light, a hairline branch or two. */
export function fissure(d: Draw, path: readonly Pt[], rng: Rng, w = 1.3): void {
  const { pen } = d;
  pen.stroke(path.map((p) => pt(p.x - SHADOW.x * 0.8, p.y - SHADOW.y * 0.8)), w * 0.9, PAPER_FILL, 0.7, false);
  pen.stroke(path, w * 1.6, HOLLOW, 0.3, false);
  pen.stroke(path, w, d.ink, 0.95, false);
  for (let k = 0; k < 2; k++) {
    const i = 1 + Math.floor(rng() * (path.length - 2));
    const p = path[i]!;
    const q = path[Math.min(path.length - 1, i + 1)]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x) + (rng() < 0.5 ? 1 : -1) * (0.6 + rng() * 0.5);
    pen.hair(crackPath(p, a, 4 + rng() * 5, rng), w * 0.45, d.ink, 0.85);
  }
}

/** A chip of stone knocked flying from `from` along `ang`: a tumbling fragment, its shadow, speed lines and a puff of grit behind it. */
export function flyingChip(d: Draw, at: Pt, ang: number, r: number, rng: Rng): void {
  const { pen } = d;
  const corners = 5 + Math.floor(rng() * 2);
  const spin = rng() * TAU;
  const chip = Array.from({ length: corners }, (_, i) => polar(at, spin + (i / corners) * TAU + (rng() - 0.5) * 0.6, r * (0.6 + rng() * 0.5)));
  const back = (k: number, side: number): Pt => polar(polar(at, ang + Math.PI, k), ang + Math.PI / 2, side);
  for (const [k0, k1, side] of [[r + 1.5, r + 11, 0], [r + 0.5, r + 7.5, r * 0.75], [r + 0.5, r + 7, -r * 0.75]] as const) {
    pen.stroke([back(k0, side), back(k1, side * 1.2)], 0.7, d.ink, 0.8, false);
  }
  pen.stipple(oval(back(r + 4, 0).x, back(r + 4, 0).y, r + 3, r + 3, 12), 26, () => 0.6, 0.45, STONE_DARK);
  castShadow(d, chip, 5, 0.18);
  body(d, chip, mix(LION_STONE, PAPER_FILL, 0.25), 0.85);
  pen.crescent(chip, pt(-SHADOW.x * r * 0.5, -SHADOW.y * r * 0.5), () => pen.fill(chip, LION_DEEP, 0.55));
  pen.stroke(closed(chip), 0.8, d.ink, 0.95);
}

/** A fresh scar where a chip came away: pale, raw stone inside a jagged ink edge. */
export function scar(d: Draw, at: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const s = blob(at, r, r * 0.75, rng, 0.45, 9, rng() * TAU);
  pen.fill(s, PAPER_FILL, 0.75);
  pen.fill(s, mix(LIMESTONE, PAPER_FILL, 0.4), 0.4);
  pen.crescent(s, pt(SHADOW.x * r * 0.4, SHADOW.y * r * 0.4), () => pen.fill(s, LION_DEEP, 0.45));
  pen.hair(closed(s), 0.6, d.ink, 0.85);
}
