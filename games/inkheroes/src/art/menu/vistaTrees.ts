import type { Rng } from '../../logic/rng';
import { pt, TAU } from '../kit';
import { pathOf, type Pen, type Pt } from '../pen';
import { bloomAt, LIGHT, mix, rgba, SHADOW, softly, yAt } from './vistaKit';

/**
 * Trees for the menu's paintings, as a pen-and-wash illustrator paints
 * them. A broadleaf's crown is a few big masses of foliage with scalloped,
 * leafy edges: the whole laid in mid-green, each mass then lit warm on its
 * upper left and sunk into cool shadow on its lower right (darkest where
 * the mass above overhangs it), dappled with small leaf marks, and given
 * the pen's scalloped contour only on the side turned from the light.
 * Pines are tiers of drooping boughs, each shading the tier below.
 */

/** Low evening sun on foliage: a warm olive-gold, never pale. */
const SUNLIT = '#c8a04e';

export type Ink = { readonly pen: Pen; readonly ink: string };

export interface TreeTone {
  readonly leaf: string;
  readonly trunk: string;
}

/** A leafy outline: an ellipse whose edge swells into small scallops (leaf clumps), roughened. */
function leafy(rng: Rng, c: Pt, rx: number, ry: number, lobes: number, n = 64): Pt[] {
  const ph = rng() * TAU;
  const [q1, q2] = [rng() * TAU, rng() * TAU];
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const scallop = Math.abs(Math.sin((a * lobes) / 2 + ph)) ** 0.6;
    const k = 0.84 + 0.16 * scallop + 0.08 * Math.sin(a * 2 + q1) + 0.05 * Math.sin(a * 3 + q2);
    return pt(c.x + Math.cos(a) * rx * k, c.y + Math.sin(a) * ry * k);
  });
}

interface Mass {
  readonly c: Pt;
  readonly rx: number;
  readonly ry: number;
  readonly shape: Pt[];
}

function unionPath(ctx: CanvasRenderingContext2D, shapes: readonly (readonly Pt[])[]): void {
  ctx.beginPath();
  for (const s of shapes) {
    s.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
  }
}

/** Runs `draw` clipped to one shape. */
function within(ctx: CanvasRenderingContext2D, shape: readonly Pt[], draw: () => void): void {
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  draw();
  ctx.restore();
}

/** The major masses of a crown, back (top) ones first. */
function massesOf(rng: Rng, c: Pt, rx: number, ry: number): Mass[] {
  const n = rx > 60 ? 6 : rx > 20 ? 4 : 2;
  const out: Mass[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rng() * 0.8;
    const d = i === 0 ? 0 : 0.42 + rng() * 0.18;
    const mx = rx * (0.5 + rng() * 0.18);
    const my = ry * (0.45 + rng() * 0.18);
    const mc = pt(c.x + Math.cos(a) * rx * d * 0.9, c.y + Math.sin(a) * ry * d * 0.8 - ry * 0.05);
    out.push({ c: mc, rx: mx, ry: my, shape: leafy(rng, mc, mx, my, Math.max(5, Math.round(mx / Math.max(2.5, rx * 0.07)))) });
  }
  return out.sort((p, q) => p.c.y - q.c.y);
}

/** A crown of foliage centred on `c`, rx × ry. */
export function crown(d: Ink, rng: Rng, c: Pt, rx: number, ry: number, leaf: string, inkAlpha: number): void {
  const ctx = d.pen.ctx;
  const masses = massesOf(rng, c, rx, ry);
  const lit = mix(leaf, SUNLIT, 0.42);
  const deep = mix(leaf, SHADOW, 0.6);
  const all = masses.map((m) => m.shape);
  ctx.fillStyle = rgba(mix(leaf, deep, 0.25), 0.97);
  unionPath(ctx, all);
  ctx.fill('nonzero');
  ctx.save();
  unionPath(ctx, all);
  ctx.clip('nonzero');
  for (const m of masses) {
    const r = Math.min(m.rx, m.ry);
    // The overhang: shade cast by this mass on whatever lies below and right of it.
    softly(ctx, r * 0.25, deep, 0.55, (cc) => pathOf(cc, m.shape.map((p) => pt(p.x + r * 0.18, p.y + r * 0.28))));
    within(ctx, m.shape, () => {
      ctx.fillStyle = rgba(mix(leaf, deep, 0.15), 0.9);
      ctx.fillRect(m.c.x - m.rx * 1.2, m.c.y - m.ry * 1.2, m.rx * 2.4, m.ry * 2.4);
      softly(ctx, r * 0.3, deep, 0.6, (cc) => {
        cc.beginPath();
        cc.ellipse(m.c.x + m.rx * 0.45, m.c.y + m.ry * 0.55, m.rx * 0.85, m.ry * 0.7, 0, 0, TAU);
      });
      bloomAt(ctx, pt(m.c.x - m.rx * 0.32, m.c.y - m.ry * 0.38), r * 0.95, lit, 0.6);
      bloomAt(ctx, pt(m.c.x - m.rx * 0.4, m.c.y - m.ry * 0.5), r * 0.4, mix(lit, SUNLIT, 0.3), 0.35);
    });
  }
  // The crown as a whole turns from the light.
  softly(ctx, Math.min(rx, ry) * 0.3, mix(deep, SHADOW, 0.25), 0.4, (cc) => {
    cc.beginPath();
    cc.ellipse(c.x + rx * 0.55, c.y + ry * 0.6, rx * 0.9, ry * 0.7, 0, 0, TAU);
  });
  // Leaf marks: small scallops and dabs, light up and left, dark down and right.
  const mark = Math.max(1, Math.min(rx, ry) * 0.06);
  const marks = Math.min(260, Math.round(((rx * ry) / (mark * mark)) * 0.35));
  ctx.lineCap = 'round';
  for (let i = 0; i < marks; i++) {
    const p = pt(c.x + (rng() * 2 - 1) * rx, c.y + (rng() * 2 - 1) * ry);
    const side = ((p.x - c.x) / rx) * 0.55 + ((p.y - c.y) / ry) * 0.84;
    if (side < -0.25) {
      ctx.fillStyle = rgba(mix(lit, SUNLIT, 0.3), 0.5);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, mark * 0.9, mark * 0.6, -0.4, 0, TAU);
      ctx.fill();
    } else if (side > 0.1) {
      ctx.strokeStyle = rgba(mix(deep, SHADOW, 0.3), 0.45);
      ctx.lineWidth = Math.max(0.4, mark * 0.35);
      ctx.beginPath();
      ctx.arc(p.x, p.y - mark * 0.4, mark, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (inkAlpha > 0) {
    // The pen only where the crown turns from the light: its lower-right edge, in broken scalloped runs.
    for (const m of masses) {
      const out = ((m.c.x - c.x) / rx) * 0.55 + ((m.c.y - c.y) / ry) * 0.84;
      const n = m.shape.length;
      let runPts: Pt[] = [];
      for (let i = 0; i <= n; i++) {
        const p = m.shape[i % n]!;
        const facing = ((p.x - m.c.x) / m.rx) * 0.55 + ((p.y - m.c.y) / m.ry) * 0.84;
        if (facing > 0.15 - out * 0.3 && rng() > 0.03) runPts.push(p);
        else {
          if (runPts.length > 3) d.pen.hair(runPts, Math.max(0.45, rx * 0.012), d.ink, inkAlpha);
          runPts = [];
        }
      }
      if (runPts.length > 3) d.pen.hair(runPts, Math.max(0.45, rx * 0.012), d.ink, inkAlpha);
    }
  }
}

/**
 * A broadleaf tree on `base`, about `s` tall: a tapering trunk lit on its
 * left with a branch or two into the crown, the crown, and its shadow on
 * the ground.
 */
export function tree(d: Ink, rng: Rng, base: Pt, s: number, tone: TreeTone, inkAlpha: number, shadow = true): void {
  const ctx = d.pen.ctx;
  const lean = (rng() - 0.5) * s * 0.08;
  if (shadow) {
    softly(ctx, s * 0.03, SHADOW, 0.26, (cc) => {
      cc.beginPath();
      cc.ellipse(base.x + s * 0.2, base.y + s * 0.012, s * 0.34, s * 0.045, 0, 0, TAU);
    });
  }
  const tw = s * 0.035;
  const top = pt(base.x + lean, base.y - s * 0.55);
  const trunk = [pt(base.x - tw * 1.6, base.y + 1), pt(base.x - tw, base.y - s * 0.08), pt(top.x - tw * 0.5, top.y), pt(top.x + tw * 0.5, top.y), pt(base.x + tw, base.y - s * 0.08), pt(base.x + tw * 1.7, base.y + 1)];
  d.pen.fill(trunk, tone.trunk, 0.97);
  d.pen.clipped(trunk, () => {
    d.pen.fill([pt(base.x + tw * 0.1, base.y + 2), pt(top.x + tw * 0.1, top.y), pt(top.x + tw, top.y), pt(base.x + tw * 2, base.y + 2)], mix(tone.trunk, SHADOW, 0.5), 0.6);
    d.pen.hair([pt(base.x - tw * 0.6, base.y - s * 0.02), pt(top.x - tw * 0.25, top.y + s * 0.05)], Math.max(0.5, tw * 0.35), mix(tone.trunk, LIGHT, 0.5), 0.6);
  });
  for (const side of [-1, 1]) {
    const from = pt(top.x, top.y + s * 0.1);
    d.pen.stroke([from, pt(from.x + side * s * 0.12, from.y - s * 0.12), pt(from.x + side * s * 0.2, from.y - s * 0.16)], Math.max(0.6, tw * 0.6), tone.trunk, 0.95, false);
  }
  if (inkAlpha > 0) d.pen.stroke(trunk.slice(3), Math.max(0.5, tw * 0.25), d.ink, inkAlpha, false);
  crown(d, rng, pt(base.x + lean, base.y - s * 0.68), s * 0.3, s * 0.27, tone.leaf, inkAlpha);
}

/** One pine tier's outline: from its apex out to a skirt of drooping bough tips, `half` wide at `y`. */
function tier(rng: Rng, apex: Pt, y: number, half: number, s: number): { readonly shape: Pt[]; readonly skirt: Pt[] } {
  const tips = Math.max(3, Math.round(half / Math.max(1.5, s * 0.03)));
  const skirt: Pt[] = [];
  for (let k = 0; k <= tips; k++) {
    const u = k / tips;
    const x = apex.x - half + u * half * 2;
    const edge = Math.abs(u - 0.5) * 2;
    const yy = y - (1 - edge) * s * 0.02 + edge * s * 0.012;
    skirt.push(pt(x, yy + s * 0.012 * (0.4 + rng())));
    if (k < tips) skirt.push(pt(x + half / tips, yy - s * 0.008 * (0.5 + rng())));
  }
  const left = Array.from({ length: 4 }, (_, i) => pt(apex.x - (half * (i + 1)) / 5 - (rng() - 0.3) * s * 0.01, apex.y + ((y - apex.y) * (i + 1)) / 5));
  const right = left.map((p) => pt(apex.x + (apex.x - p.x) * (0.9 + rng() * 0.2), p.y)).reverse();
  return { shape: [apex, ...left, ...skirt, ...right], skirt };
}

/** A dark pine on `base`, `s` tall: tiers of drooping boughs lit along their left, deep on the right, each shading the next. */
export function pine(d: Ink, rng: Rng, base: Pt, s: number, leaf: string, inkAlpha: number): void {
  const ctx = d.pen.ctx;
  d.pen.fill([pt(base.x - s * 0.018, base.y), pt(base.x - s * 0.01, base.y - s * 0.3), pt(base.x + s * 0.01, base.y - s * 0.3), pt(base.x + s * 0.02, base.y)], '#24180f', 0.95);
  const tiers = Math.max(3, Math.min(8, Math.round(s / 18)));
  const lit = mix(leaf, SUNLIT, 0.4);
  const deep = mix(leaf, SHADOW, 0.6);
  const parts = Array.from({ length: tiers }, (_, i) => {
    const t1 = (i + 1.7) / (tiers + 0.7);
    const apex = pt(base.x + (rng() - 0.5) * s * 0.01, base.y - s + s * 0.86 * (i / (tiers + 0.7)));
    const y = Math.min(base.y - s * 0.06, base.y - s + s * 0.92 * t1);
    const half = s * 0.24 * (0.16 + 0.84 * Math.min(1, t1)) * (0.88 + rng() * 0.24);
    return { apex, y, half, ...tier(rng, apex, y, half, s) };
  });
  // Lowest tier first, so each higher one overlaps the one below and throws its shade on it.
  for (const p of [...parts].reverse()) {
    softly(ctx, s * 0.02, deep, 0.6, (cc) => pathOf(cc, p.skirt.map((q) => pt(q.x + s * 0.01, q.y + s * 0.025)).concat([pt(p.apex.x + p.half, p.y - s * 0.02), pt(p.apex.x - p.half, p.y - s * 0.02)])));
    within(ctx, p.shape, () => {
      const g = ctx.createLinearGradient(p.apex.x - p.half, 0, p.apex.x + p.half, 0);
      g.addColorStop(0, rgba(lit, 0.97));
      g.addColorStop(0.4, rgba(leaf, 0.97));
      g.addColorStop(0.62, rgba(mix(leaf, deep, 0.6), 0.97));
      g.addColorStop(1, rgba(deep, 0.97));
      ctx.fillStyle = g;
      ctx.fillRect(p.apex.x - p.half - 2, p.apex.y - 2, p.half * 2 + 4, p.y - p.apex.y + s * 0.05);
      bloomAt(ctx, pt(p.apex.x - p.half * 0.35, p.apex.y + (p.y - p.apex.y) * 0.45), p.half * 0.6, mix(lit, SUNLIT, 0.25), 0.3);
      // Needles: short strokes raking down and out along each bough.
      ctx.lineCap = 'round';
      const n = Math.round(p.half * 0.9);
      for (let k = 0; k < n; k++) {
        const u = rng() * 2 - 1;
        const x = p.apex.x + u * p.half * 0.95;
        const y = p.apex.y + (p.y - p.apex.y) * (0.35 + rng() * 0.6);
        if (u < -0.3) continue;
        ctx.strokeStyle = rgba(mix(deep, SHADOW, 0.25), 0.4);
        ctx.lineWidth = Math.max(0.35, s * 0.004);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + u * s * 0.012, y + s * 0.018);
        ctx.stroke();
      }
    });
    if (inkAlpha > 0) d.pen.hair(p.skirt.slice(Math.floor(p.skirt.length * 0.35)), Math.max(0.4, s * 0.005), d.ink, inkAlpha);
  }
}

/** A wood's edge: a band of trees along `line`, back rows first, each nearer row a little bigger and lower. */
export function woodland(d: Ink, rng: Rng, line: readonly Pt[], o: { readonly s: number; readonly rows: number; readonly gap: number; readonly tone: TreeTone; readonly pines?: number; readonly pineLeaf?: string; readonly inkAlpha: number }): void {
  for (let r = 0; r < o.rows; r++) {
    const s = o.s * (0.75 + r * 0.15);
    for (let x = line[0]!.x + rng() * o.gap; x < line[line.length - 1]!.x; x += o.gap * (0.6 + rng() * 0.6)) {
      const base = pt(x, yAt(line, x) + r * o.s * 0.12 + (rng() - 0.5) * o.s * 0.06);
      if (rng() < (o.pines ?? 0)) pine(d, rng, base, s * (1.1 + rng() * 0.3), o.pineLeaf ?? '#3f5d48', o.inkAlpha);
      else tree(d, rng, base, s * (0.85 + rng() * 0.3), o.tone, o.inkAlpha, false);
    }
  }
}
