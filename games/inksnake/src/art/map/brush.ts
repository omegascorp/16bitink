import type { Rng } from '../../logic/rng';
import { closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { PENCIL, SHADOW_DIR } from './common';

/**
 * One drawing vocabulary for the map's things, in two hands: painted (paper,
 * a watercolour wash, a dark crescent on the side away from the light, a
 * cast shadow and a pen contour) or pencilled for a chapter still being
 * drawn (graphite outlines traced once firmly and partly again, left
 * unfinished where the hand stopped, shadow sides hatched, no colour).
 * Every place's things are written once against a Brush, so a band paints
 * either way from the same code.
 */
export class Brush {
  /** How much of each outline the draftsman has drawn (1 when painted). */
  done = 1;

  constructor(readonly d: Draw, readonly draft: boolean) {}

  get pen(): Draw['pen'] {
    return this.d.pen;
  }

  get ink(): string {
    return this.draft ? PENCIL : this.d.ink;
  }

  /** The line colour for detail drawn in `colour`: graphite in a draft. */
  tone(colour: string): string {
    return this.draft ? PENCIL : colour;
  }

  /** Paper, then the wash; a draft only knocks back what's under it. */
  body(shape: readonly Pt[], colour: string, alpha = 0.6): void {
    if (this.draft) {
      this.pen.fill(shape, PAPER_FILL, 0.22);
      return;
    }
    this.pen.fill(shape, PAPER_FILL, 1);
    this.pen.fill(shape, colour, alpha);
  }

  /** A flat glaze of colour (nothing in a draft). */
  tint(shape: readonly Pt[], colour: string, alpha: number): void {
    if (!this.draft) this.pen.fill(shape, colour, alpha);
  }

  /** The side away from the light: a dark crescent `k` deep, or hatching. */
  shade(shape: readonly Pt[], k: number, colour: string, alpha = 0.35): void {
    const shift = pt(-SHADOW_DIR.x * k, -SHADOW_DIR.y * k);
    if (this.draft) {
      this.pen.crescent(shape, shift, () => {
        this.pen.fill(shape, PENCIL, 0.07);
        this.pen.hatch(shape, 3, 0.9, 0.45, { color: PENCIL, alpha: Math.min(0.6, alpha + 0.22) });
      });
      return;
    }
    this.pen.crescent(shape, shift, () => this.pen.fill(shape, colour, alpha));
  }

  /** Form hatching across the whole shadow side, as an illustrator lays it over the wash. */
  hatchShade(shape: readonly Pt[], k: number, alpha = 0.22, spacing = 4): void {
    const shift = pt(-SHADOW_DIR.x * k, -SHADOW_DIR.y * k);
    this.pen.crescent(shape, shift, () => this.pen.hatch(shape, spacing, 0.9, 0.45, { color: this.ink, alpha }));
  }

  /** The shape's shadow on the ground, `dist` away from the light. */
  cast(shape: readonly Pt[], dist: number, alpha = 0.14, colour?: string): void {
    const s = shape.map((p) => pt(p.x + SHADOW_DIR.x * dist, p.y + SHADOW_DIR.y * dist));
    if (this.draft) {
      this.pen.fill(s, PENCIL, 0.08);
      this.pen.hatch(s, 3.8, 0.9, 0.4, { color: PENCIL, alpha: 0.28 });
      return;
    }
    this.pen.fill(s, colour ?? mix(this.d.ink, '#3a3020', 0.45), alpha);
  }

  /** A closed contour: inked, or pencilled with the unfinished part a ghost and part of it traced again. */
  edge(shape: readonly Pt[], w = 1, alpha = 0.85): void {
    const ring = closed(shape);
    if (!this.draft) {
      this.pen.stroke(ring, w, this.d.ink, alpha);
      return;
    }
    const cut = Math.max(2, Math.floor(ring.length * this.done));
    this.pen.stroke(ring.slice(0, cut + 1), Math.max(0.85, w * 0.85), PENCIL, Math.min(0.9, alpha + 0.1));
    if (cut < ring.length - 1) this.pen.hair(ring.slice(cut), 0.45, PENCIL, alpha * 0.35);
    this.pen.hair(ring.slice(0, Math.floor(ring.length * 0.45)).map((p) => pt(p.x + 1.3, p.y - 0.9)), 0.5, PENCIL, alpha * 0.5);
  }

  /** An open line in ink (or `colour`), graphite in a draft. */
  line(pts: readonly Pt[], w = 0.6, alpha = 0.7, colour?: string): void {
    this.pen.hair(dense(pts), this.draft ? Math.max(0.5, Math.min(w, 0.8)) : w, this.draft ? PENCIL : colour ?? this.d.ink, this.draft ? Math.min(0.75, alpha + 0.1) : alpha);
  }

  /** A firmer open stroke (a rail, a ridge). */
  stroke(pts: readonly Pt[], w = 1, alpha = 0.85, colour?: string): void {
    this.pen.stroke(dense(pts), this.draft ? Math.min(w, 0.9) : w, this.draft ? PENCIL : colour ?? this.d.ink, this.draft ? Math.min(0.75, alpha) : alpha, false);
  }

  dot(x: number, y: number, r: number, colour: string, alpha = 0.9): void {
    if (this.draft) this.pen.dot(x, y, Math.max(0.6, r * 0.55), PENCIL, alpha * 0.6);
    else this.pen.dot(x, y, r, colour, alpha);
  }

  /** Hatching across a shape in the line colour. */
  hatch(shape: readonly Pt[], spacing: number, angle: number, alpha = 0.3, w = 0.4): void {
    this.pen.hatch(shape, spacing, angle, w, { color: this.ink, alpha });
  }

  /** A soft rub of graphite where a draft's shading has been blocked in (nothing when painted). */
  smudge(c: Pt, rx: number, ry: number, rng: Rng): void {
    if (!this.draft) return;
    this.pen.fill(scalloped(c, 1, 7, rng, 0.25).map((p) => pt(c.x + (p.x - c.x) * rx, c.y + (p.y - c.y) * ry)), PENCIL, 0.09);
  }

  /** A highlight: paper showing through the wash (nothing in a draft). */
  glint(pts: readonly Pt[], w = 1.4, alpha = 0.7): void {
    if (!this.draft) this.pen.hair(pts, w, PAPER_FILL, alpha);
  }

  /** The shade colour for a wash. */
  deep(colour: string, k = 0.45): string {
    return mix(colour, this.d.ink, k);
  }
}

/**
 * A polyline with points filled in every few px along its straight runs:
 * the pen tapers a stroke over its first and last points, so a two-point
 * line would otherwise be all taper and vanish.
 */
export function dense(pts: readonly Pt[], step = 6): Pt[] {
  if (pts.length > 3) return [...pts];
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const z = pts[i + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(z.x - a.x, z.y - a.y) / step));
    for (let k = 0; k < n; k++) out.push(pt(a.x + ((z.x - a.x) * k) / n, a.y + ((z.y - a.y) * k) / n));
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** A closed outline with `lobes` soft scallops round radius r: a bush or a crown seen from above. */
export function scalloped(c: Pt, r: number, lobes: number, rng: Rng, depth = 0.12): Pt[] {
  const n = lobes * 5;
  const ph = rng() * TAU;
  const amp = Array.from({ length: lobes }, () => 0.7 + rng() * 0.6);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU + ph;
    const lobe = Math.floor(i / 5);
    const u = (i % 5) / 5;
    const rr = r * (1 - depth + depth * amp[lobe]! * Math.sin(Math.PI * u) ** 0.6);
    return pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr);
  });
}

/** An irregular closed blob round c, rx × ry, turned by `turn`. */
export function blob(c: Pt, rx: number, ry: number, rng: Rng, rough = 0.12, n = 22, turn = 0): Pt[] {
  const [p1, p2, p3] = [rng() * TAU, rng() * TAU, rng() * TAU];
  const cs = Math.cos(turn);
  const sn = Math.sin(turn);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const k = 1 + rough * (0.55 * Math.sin(a * 2 + p1) + 0.3 * Math.sin(a * 3 + p2) + 0.15 * Math.sin(a * 5 + p3));
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    return pt(c.x + x * cs - y * sn, c.y + x * sn + y * cs);
  });
}

/** An axis-aligned box as points every `step` px along its sides (so the pen keeps its corners). */
export function boxPts(x0: number, y0: number, x1: number, y1: number, step = 10): Pt[] {
  const out: Pt[] = [];
  const side = (a: Pt, b: Pt): void => {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  };
  side(pt(x0, y0), pt(x1, y0));
  side(pt(x1, y0), pt(x1, y1));
  side(pt(x1, y1), pt(x0, y1));
  side(pt(x0, y1), pt(x0, y0));
  return out;
}

/** A box w × h centred on c and turned by `rot`, as points every `step` px. */
export function turnedBox(c: Pt, w: number, h: number, rot: number, step = 10): Pt[] {
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  return boxPts(-w / 2, -h / 2, w / 2, h / 2, step).map((p) => pt(c.x + p.x * cs - p.y * sn, c.y + p.x * sn + p.y * cs));
}

/** A point in a turned box's own frame (u, v in -0.5..0.5 of w and h). */
export const frame = (c: Pt, w: number, h: number, rot: number) => (u: number, v: number): Pt =>
  pt(c.x + u * w * Math.cos(rot) - v * h * Math.sin(rot), c.y + u * w * Math.sin(rot) + v * h * Math.cos(rot));

/** A point r from c in direction a. */
export const polar = (c: Pt, a: number, r: number): Pt => pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);

const HAND = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';

/** A naturalist's note lettered beside a thing: pencil in a draft, ink when painted, with a short leader line to it. */
export function note(b: Brush, at: Pt, to: Pt, text: string, size = 19): void {
  const { ctx } = b.pen;
  ctx.save();
  ctx.font = `500 ${size}px ${HAND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = b.draft ? PENCIL : mix(b.d.ink, PAPER_FILL, 0.15);
  ctx.globalAlpha = b.draft ? 0.85 : 0.8;
  ctx.fillText(text, at.x, at.y);
  const w = ctx.measureText(text).width;
  ctx.restore();
  const from = pt(at.x + Math.sign(to.x - at.x) * Math.min(w / 2, Math.abs(to.x - at.x)) * 0.6, at.y + Math.sign(to.y - at.y) * size * 0.55);
  b.line([from, pt((from.x + to.x) / 2 + 3, (from.y + to.y) / 2), to], 0.5, 0.55);
}
