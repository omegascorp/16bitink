import { closed, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, pathOf, type Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { SNAKE_W } from '../types';
import { rgba } from '../wash';
import { centreOf } from './barrensSnakePaint';

/**
 * The African egg-eater's paint box (Dasypeltis scabra, chapter 4) and the
 * brushwork its back strip and its neck share: a dull grey-brown ground
 * (the dust of the savanna), the dark chocolate chevrons and rhombs down
 * the back that copy the rhombic night adder's, each edged with a pale
 * line as the adder's are, the narrow dark bars low on the flanks, and the
 * cylinder's light and shade (matte: the scales are strongly keeled).
 * Everything is deterministic: the same call paints the same pixels.
 */
export const EGG_PAINT = {
  ground: '#9c8b72',
  dust: '#c9b996',
  warm: '#a8865e',
  cool: '#7f7a70',
  shadow: '#33281d',
  mark: '#3a2a1e',
  markLit: '#62492f',
  markDeep: '#1d140d',
  rim: '#120c08',
  edging: '#ece2c8',
  belly: '#e7dfcc',
  lip: '#d9cdb2',
  mouth: '#2a2224',
  mouthDeep: '#0f0b0d',
  gum: '#4a3a3c',
  iris: '#8d7a60',
  tongue: '#3b3438',
  tongueTip: '#141114',
} as const;

const E = EGG_PAINT;

/** The back's cross-section wash, `yTop` being where the strip's y = 0 lies: dusty fawn where the light hits, deepening to umber-grey on the far flank. */
export function eggCrossWash(ctx: CanvasRenderingContext2D, yTop: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  g.addColorStop(0, '#d3c4a4');
  g.addColorStop(0.16, '#bba98a');
  g.addColorStop(0.42, '#a39073');
  g.addColorStop(0.74, '#8a775e');
  g.addColorStop(1, '#5f5040');
  return g;
}

/**
 * The night adder's mark, as the egg-eater wears it: a chevron across the
 * back, its point forward (towards the head, −x) on the midline, its arms
 * swept back to the flanks, its hind edge notched; `w` its thickness along
 * the body, `reach` how far down each flank the arms run.
 */
export function chevronShape(cx: number, w: number, reach: number, seed: number, cy = SNAKE_W / 2, notch = 0.18, sweepK = 0.75): Pt[] {
  const j = (k: number): number => {
    const v = Math.sin(seed * 9.13 + k * 3.7) * 43758.5453;
    return (v - Math.floor(v) - 0.5) * 0.9;
  };
  const sweep = w * sweepK;
  const A = pt(cx - w / 2 + j(1) * 0.3, cy);
  const arm = (s: 1 | -1): Pt[] => [
    pt(cx - w / 2 + sweep * 0.42 + j(2 + s) * 0.4, cy + s * reach * 0.5),
    pt(cx - w / 2 + sweep + j(4 + s) * 0.5, cy + s * reach),
    pt(cx + w / 2 + sweep * 0.85 + j(6 + s) * 0.5, cy + s * reach * 0.94),
    pt(cx + w / 2 + sweep * 0.4 + j(8 + s) * 0.4, cy + s * reach * 0.5),
  ];
  const up = arm(-1);
  const down = arm(1);
  return densify([A, ...up, pt(cx + w * notch + j(12) * 0.3, cy), ...down.reverse()], 0.9);
}

/** Points every ~`step` px along a closed polygon, so the pen keeps its sides and only softens the corners. */
export function densify(poly: readonly Pt[], step = 0.8): Pt[] {
  const out: Pt[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  });
  return out;
}

/**
 * A dark mark painted as watercolour: the pale edging laid first as a
 * slightly bigger shape (the adder's cream outline), the chocolate laid in
 * over it, its heart lifted warm towards the light, the pigment pooled
 * near-black at the drying edge, a firm pen rim and a fine ink hairline.
 */
export function paintEggMark(ctx: CanvasRenderingContext2D, shape: readonly Pt[], seed: number, ink: string, rim = 1.1, edging = 0.6): void {
  const pen = new Pen(ctx, seed, 0.3);
  const { cx, cy, rx, ry } = centreOf(shape);
  if (edging > 0) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(E.edging, edging);
    ctx.lineWidth = 2.3;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
  }
  pen.fill(shape, E.mark, 0.95);
  pen.clipped(shape, () => {
    glaze(ctx, cx - rx * 0.2, cy - ry * 0.3, rx * 0.85, ry * 0.6, 0, E.markLit, 0.45);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(E.markDeep, 0.6);
    ctx.lineWidth = rim * 2.4;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
    pen.stroke(closed(shape), rim * 1.1, E.rim, 0.8, false);
    // Granulation: the pigment settling unevenly in the paper's tooth.
    pen.stipple(shape, Math.round(rx * ry * 1.6), () => 0.7, 0.3, rgba(E.markDeep, 0.5));
    pen.stipple(shape, Math.round(rx * ry * 0.6), (_, y) => (y < cy ? 0.8 : 0.2), 0.28, rgba(E.dust, 0.35));
  });
  pen.hair(closed(shape), 0.28, ink, 0.32);
}

/** The dusty glazes of the ground between the marks: fawn on the crown, warm umber on the flank, cool grey low down. */
export function dustGlazes(ctx: CanvasRenderingContext2D, x: number, step: number, r: () => number): void {
  glaze(ctx, x + (r() - 0.5) * 3, 11.5 + (r() - 0.5) * 2, step * 0.32, 6.5, 0, E.dust, 0.32);
  glaze(ctx, x + step / 2 + (r() - 0.5) * 5, 18.5 + r() * 2, step * 0.6, 3, 0, E.warm, 0.26);
  glaze(ctx, x + (r() - 0.5) * 5, 21.5, step * 0.55, 2.2, 0, E.cool, 0.3);
  glaze(ctx, x + step / 2 + (r() - 0.5) * 6, 3.6 + r(), step * 0.5, 2.2, 0, E.dust, 0.3);
}

/** Points every ~`step` px along an open polyline. */
export function densifyOpen(pts: readonly Pt[], step = 0.8): Pt[] {
  const out: Pt[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  }
  return out;
}

/** A faint pale glint along a polyline (a keel catching the light). */
export function glintLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, a: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(PAPER_FILL, a);
  ctx.lineWidth = w;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}
