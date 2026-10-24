import type { Rng } from '../../logic/rng';
import { pt, TAU } from '../kit';
import { pathOf, type Pen, type Pt } from '../pen';
import { bandBelow, brushwork, gradeFill, LIGHT, mix, modelForm, poolEdge, rgba, SHADOW, soft, softly, variegate, yAt } from './vistaKit';

/**
 * The land in the menu's vista: ranges of far blue mountains, and rolling
 * hills washed and modelled by the late light with a patchwork of fields
 * and hedgerows over them. Far things carry no pen line; nearer ones a
 * faint one.
 */

export interface Peak {
  readonly x: number;
  readonly top: number;
  readonly half: number;
}

/** A ridge from a to b, broken into crags by midpoint displacement. */
function crags(rng: Rng, a: Pt, b: Pt, rough: number, depth = 5): Pt[] {
  if (depth === 0) return [a, b];
  const m = pt((a.x + b.x) / 2 + (rng() - 0.5) * rough * 0.4, (a.y + b.y) / 2 + (rng() - 0.5) * rough);
  return [...crags(rng, a, m, rough * 0.55, depth - 1), ...crags(rng, m, b, rough * 0.55, depth - 1).slice(1)];
}

export interface RangeTone {
  readonly body: string;
  readonly lit: string;
  readonly shade: string;
  readonly snow: string;
}

/**
 * A range of peaks standing on `base`: each laid in as one wash, its sunny
 * face warmed from the apex down and its far face, split off by a ragged
 * spine, in a cooler, deeper, granulating wash; snow on the high ones
 * running down the gullies; mist gathering at the foot.
 */
export function mountains(ctx: CanvasRenderingContext2D, rng: Rng, peaks: readonly Peak[], base: number, tone: RangeTone): void {
  for (const p of peaks) {
    const apex = pt(p.x, p.top);
    const left = crags(rng, pt(p.x - p.half, base + 4), apex, p.half * 0.32, 6);
    const right = crags(rng, apex, pt(p.x + p.half * (0.9 + rng() * 0.3), base + 4), p.half * 0.32, 6);
    const body = [...left, ...right.slice(1)];
    const foot = pt(p.x + p.half * (0.1 + rng() * 0.2), base + 4);
    const spine = crags(rng, apex, foot, p.half * 0.25, 5);
    const face = [...spine, ...[...right].reverse().slice(0, -1)];
    const sunny = [...left, ...spine.slice(1).reverse()];
    const tall = base - p.top;
    soft(ctx, 0.6, () => gradeFill(ctx, body, p.top, base, [[0, tone.body], [1, mix(tone.body, tone.lit, 0.3)]]));
    ctx.save();
    pathOf(ctx, body);
    ctx.clip();
    soft(ctx, 1.2, () => gradeFill(ctx, sunny, p.top, base, [[0, tone.lit], [0.6, mix(tone.lit, tone.body, 0.6)], [1, tone.body]], 0.8));
    soft(ctx, 0.8, () => gradeFill(ctx, face, p.top, base, [[0, tone.shade], [1, mix(tone.shade, tone.body, 0.6)]], 0.9));
    // Gullies: dark runs down the far face, lit ribs down the sunny one.
    for (let i = 0; i < 6; i++) {
      const sunnySide = i % 3 === 0;
      const t = 0.12 + rng() * 0.55;
      const a = sunnySide ? pt(apex.x - p.half * t * 0.7, p.top + tall * t * 0.95) : pt(apex.x + (foot.x - apex.x) * t + p.half * 0.25 * rng() * t, p.top + tall * t * 0.9);
      const len = tall * (0.08 + rng() * 0.14);
      ctx.strokeStyle = rgba(sunnySide ? mix(tone.lit, LIGHT, 0.5) : mix(tone.shade, SHADOW, 0.25), sunnySide ? 0.35 : 0.25);
      ctx.lineWidth = 0.8 + rng() * 1.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(a.x + len * 0.12, a.y + len * 0.5, a.x + len * (0.1 + rng() * 0.2), a.y + len);
      ctx.stroke();
    }
    // Granulation: pigment settled in the paper's tooth on the shaded face.
    ctx.fillStyle = rgba(mix(tone.shade, SHADOW, 0.35), 0.28);
    for (let i = 0; i < tall * 1.5; i++) {
      const x = apex.x + rng() * p.half;
      const y = p.top + rng() * tall;
      ctx.fillRect(x, y, 0.6 + rng() * 0.7, 0.6 + rng() * 0.7);
    }
    if (tall > 95) {
      const cap = tall * (0.22 + rng() * 0.08);
      const line: Pt[] = [];
      for (let x = p.x - p.half; x <= p.x + p.half; x += 3) {
        const run = Math.sin(x * 0.21 + p.x) * 0.5 + Math.sin(x * 0.53) * 0.3;
        line.push(pt(x, p.top + cap * (0.75 + 0.45 * run) + (rng() - 0.5) * 3));
      }
      const snowShape = [pt(p.x - p.half, p.top - 10), pt(p.x + p.half * 1.3, p.top - 10), ...line.reverse()];
      ctx.save();
      pathOf(ctx, snowShape);
      ctx.clip();
      soft(ctx, 0.5, () => {
        ctx.fillStyle = rgba(tone.snow, 0.92);
        pathOf(ctx, body);
        ctx.fill();
        gradeFill(ctx, face, p.top, p.top + cap, [[0, mix(tone.shade, tone.snow, 0.55)], [1, mix(tone.shade, tone.snow, 0.3)]], 0.85);
      });
      ctx.restore();
    }
    ctx.restore();
  }
  // Mist gathering at the range's foot.
  const g = ctx.createLinearGradient(0, base - 70, 0, base + 6);
  g.addColorStop(0, rgba(tone.lit, 0));
  g.addColorStop(1, rgba(mix(tone.lit, LIGHT, 0.4), 0.85));
  ctx.fillStyle = g;
  ctx.fillRect(-50, base - 70, 4000, 80);
}

export interface HillTone {
  readonly lit: string;
  readonly body: string;
  readonly deep: string;
}

/**
 * A hill (or a run of them) from its crest line down to `bottom`: a graded
 * wash, the light glowing on its upper-left faces and the core shadow on
 * the far side, brushwork, pigment pooled under the crest, and a pen line
 * along the crest at `inkAlpha` (none on far hills).
 */
export function hill(d: { readonly pen: Pen; readonly ink: string }, rng: Rng, crest: readonly Pt[], bottom: number, tone: HillTone, o: { readonly reach: number; readonly inkAlpha: number; readonly ink?: number; readonly texture?: number; readonly fields?: (shape: readonly Pt[]) => void }): Pt[] {
  const ctx = d.pen.ctx;
  const shape = bandBelow(crest, bottom);
  const top = Math.min(...crest.map((p) => p.y));
  gradeFill(ctx, shape, top, bottom, [[0, tone.lit], [0.35, tone.body], [1, tone.deep]]);
  variegate(ctx, rng, shape, [tone.lit, tone.deep, mix(tone.body, '#c2a35e', 0.5), mix(tone.body, '#6f8f8a', 0.4)], { x0: crest[0]!.x, y0: top, x1: crest[crest.length - 1]!.x, y1: Math.min(bottom, top + 260) }, 0.26, 3);
  o.fields?.(shape);
  modelForm(ctx, shape, { reach: o.reach, blur: o.reach * 0.6, lit: mix(tone.lit, LIGHT, 0.6), litAlpha: 0.45, shade: mix(tone.deep, SHADOW, 0.35), shadeAlpha: 0.42 });
  if ((o.texture ?? 0) > 0) {
    const box = { x0: crest[0]!.x, y0: top, x1: crest[crest.length - 1]!.x, y1: bottom };
    brushwork(ctx, rng, shape, o.texture!, box, [mix(tone.lit, LIGHT, 0.3), tone.deep, mix(tone.body, '#b5a160', 0.4)], { len: 14, width: 1.6, alpha: 0.22, angle: -0.08 });
  }
  poolEdge(ctx, shape, mix(tone.deep, SHADOW, 0.3), 0.25, Math.max(1.5, o.reach * 0.12));
  if (o.inkAlpha > 0) d.pen.stroke(crest, o.ink ?? 1, d.ink, o.inkAlpha, false);
  return shape;
}

const FIELD_TINTS = ['#d9c27a', '#c9b56e', '#a9bd76', '#93ad66', '#c9a978', '#b7c27f', '#e0cf8e', '#9fb46e'] as const;

export interface FieldOpts {
  readonly x0: number;
  readonly x1: number;
  /** The first row's distance below the crest, the row count and the first row's depth. */
  readonly from: number;
  readonly rows: number;
  readonly depth: number;
  readonly alpha: number;
  readonly hedge: string;
  /** Where the field boundaries running away from us converge. */
  readonly vp: Pt;
}

/** Moves a point on the line from the vanishing point `vp` through `p` down to height y. */
const along = (vp: Pt, p: Pt, y: number): Pt => pt(vp.x + ((p.x - vp.x) * (y - vp.y)) / Math.max(1, p.y - vp.y), y);

/** A hedgerow along a to b: an uneven soft band of dark bushes, lit along its top, with the odd tree standing out of it. */
function hedgerow(ctx: CanvasRenderingContext2D, rng: Rng, a: Pt, b: Pt, color: string, size: number): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(3, Math.round(len / (size * 1.5)));
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const tree = rng() < 0.06 ? 2.2 : 1;
    top.push(pt(x, y - size * (0.7 + rng() * 0.7) * tree));
    bot.push(pt(x, y + size * 0.2));
  }
  const band = [...top, ...bot.reverse()];
  softly(ctx, size * 0.35, color, 0.55, (c) => pathOf(c, band));
  ctx.strokeStyle = rgba(mix(color, LIGHT, 0.45), 0.5);
  ctx.lineWidth = Math.max(0.6, size * 0.35);
  ctx.beginPath();
  top.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x - size * 0.2, p.y + size * 0.25) : ctx.lineTo(p.x - size * 0.2, p.y + size * 0.25)));
  ctx.stroke();
}

/**
 * A patchwork of fields over a hillside, in rows that follow its crest,
 * deepening as they come nearer, their side boundaries running back to a
 * vanishing point: each field a soft pale wash (wheat, stubble, meadow),
 * some ploughed, a few left as the hill's own green, hedgerows along some
 * of the boundaries.
 */
export function fields(d: { readonly pen: Pen; readonly ink: string }, rng: Rng, shape: readonly Pt[], crest: readonly Pt[], o: FieldOpts): void {
  const ctx = d.pen.ctx;
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  let off = o.from;
  const hedgeSize = (y: number): number => Math.max(1.1, (y - o.vp.y) * 0.02);
  for (let r = 0; r < o.rows; r++) {
    const h = o.depth * (1 + r * 0.45) * (0.75 + rng() * 0.5);
    const lineY = (x: number, k: number): number => yAt(crest, x) + off + h * k;
    let x = o.x0 - rng() * 60;
    while (x < o.x1) {
      const w = (70 + rng() * 120) * (0.8 + r * 0.2);
      const tl = pt(x, lineY(x, 0));
      const tr = pt(x + w, lineY(x + w, 0));
      const bl = along(o.vp, tl, lineY(x, 1));
      const br = along(o.vp, tr, lineY(x + w, 1));
      const patch = [tl, tr, br, bl];
      if (rng() < 0.75) {
        const tint = FIELD_TINTS[Math.floor(rng() * FIELD_TINTS.length)]!;
        softly(ctx, 1.6, tint, o.alpha * (0.55 + rng() * 0.45), (c) => pathOf(c, patch));
        if (rng() < 0.3) {
          ctx.save();
          pathOf(ctx, patch);
          ctx.clip();
          ctx.strokeStyle = rgba(mix(tint, SHADOW, 0.4), 0.18);
          ctx.lineWidth = 0.7;
          for (let k = 0.05; k < 1; k += 0.08) {
            const t = pt(tl.x + (tr.x - tl.x) * k, tl.y + (tr.y - tl.y) * k);
            const b = along(o.vp, t, lineY(t.x, 1) + 4);
            ctx.beginPath();
            ctx.moveTo(t.x, t.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      if (rng() < 0.4) hedgerow(ctx, rng, bl, br, o.hedge, hedgeSize(bl.y));
      if (rng() < 0.25) hedgerow(ctx, rng, tr, br, o.hedge, hedgeSize(br.y));
      x += w;
    }
    off += h;
  }
  ctx.restore();
}
