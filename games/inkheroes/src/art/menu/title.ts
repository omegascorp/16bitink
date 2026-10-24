import { createRng, type Rng } from '../../logic/rng';
import { closed, makeDraw, pt, type Draw } from '../kit';
import { INK } from '../palette';
import { pathOf, type Pt } from '../pen';
import { CROWN_BLUE, CROWN_GOLD } from '../sites/build';
import { crisp } from '../sites/paintKit';
import { TITLE, type MenuDrawer } from './types';
import { bloomAt, LIGHT, mix, poolEdge, rgba, SHADOW, soft, through } from './vistaKit';

/**
 * The game's name on the Crown's banner: a ribbon of blue cloth arched
 * across the sky, gold-trimmed and stitched, its swallowtailed ends folded
 * back behind it and turned into shadow. Washed like the rest of the
 * painting (lit from the upper left, creases and pooled edges, a fine pen
 * contour), lettered in bold hand script in deep ink edged with gold.
 */
const { w: W } = TITLE;
const CX = W / 2;
/** The band's half-width, height and arch. */
const HALF = 222;
const BAND = 82;
const ARCH = 13;
const TOP = 40;
const DROP = 24;
const TAIL = 84;

/** The band's top edge at x: highest in the middle. */
const topAt = (x: number): number => TOP + ARCH * ((x - CX) / HALF) ** 2;
const slopeAt = (x: number): number => (2 * ARCH * (x - CX)) / (HALF * HALF);

function bandShape(): Pt[] {
  const top = Array.from({ length: 41 }, (_, i) => {
    const x = CX - HALF + (i / 40) * HALF * 2;
    return pt(x, topAt(x));
  });
  return [...top, ...[...top].reverse().map((p) => pt(p.x, p.y + BAND))];
}

/** One tail (side −1 left, 1 right): set lower, reaching out past the band, notched at its end. */
function tailShape(side: -1 | 1): Pt[] {
  const inner = CX + side * (HALF - 34);
  const outer = CX + side * (HALF + TAIL);
  const y0 = topAt(CX + side * HALF) + DROP;
  const lift = -6;
  const top = through([pt(inner, y0), pt((inner + outer) / 2, y0 + lift * 0.6), pt(outer, y0 + lift)], 6);
  const bot = top.map((p) => pt(p.x, p.y + BAND)).reverse();
  const notch = pt(outer - side * 30, y0 + lift + BAND / 2);
  return [...top, notch, ...bot];
}

/** The fold where the band turns back into a tail: a dark triangle of the cloth's back. */
function foldShape(side: -1 | 1): Pt[] {
  const end = CX + side * HALF;
  const y = topAt(end) + BAND;
  return [pt(end, y), pt(end - side * 34, y + DROP - 1), pt(end - side * 34, y - 2)];
}

/** Cloth washed in its blue: lit at the upper left, creased, pigment pooled at the hems. */
function cloth(d: Draw, rng: Rng, shape: readonly Pt[], tone: number, creases: readonly number[]): void {
  const ctx = d.pen.ctx;
  const body = mix(CROWN_BLUE, SHADOW, tone);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(x0, y0, x0 + (x1 - x0) * 0.35, y1);
  g.addColorStop(0, mix(body, LIGHT, 0.32));
  g.addColorStop(0.5, body);
  g.addColorStop(1, mix(body, SHADOW, 0.35));
  ctx.fillStyle = g;
  ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  for (let i = 0; i < 8; i++) bloomAt(ctx, pt(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0)), 18 + rng() * 30, rng() < 0.5 ? mix(body, LIGHT, 0.3) : mix(body, SHADOW, 0.35), 0.3);
  // Creases: a soft dark trough with a lit ridge beside it, running across the cloth.
  for (const cx of creases) {
    soft(ctx, 5, () => {
      ctx.fillStyle = rgba(mix(body, SHADOW, 0.5), 0.55);
      ctx.beginPath();
      ctx.ellipse(cx + 4, (y0 + y1) / 2 + 4, 7, (y1 - y0) * 0.6, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(mix(body, LIGHT, 0.45), 0.45);
      ctx.beginPath();
      ctx.ellipse(cx - 7, (y0 + y1) / 2, 5, (y1 - y0) * 0.6, 0.12, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // The lower hem in shade, a little hatching in it.
  soft(ctx, 6, () => {
    ctx.fillStyle = rgba(mix(body, SHADOW, 0.6), 0.45);
    ctx.fillRect(x0 - 4, y1 - 14, x1 - x0 + 8, 20);
  });
  ctx.restore();
  d.pen.crescent(shape, pt(-4, -14), () => d.pen.hatch(shape, 3, 0.95, 0.4, { color: INK, alpha: 0.18 }));
  poolEdge(ctx, shape, mix(body, SHADOW, 0.5), 0.5, 3);
}

/** Gold trim along an edge, set `inset` inside it: a gilt band with a dark under-line and stitch dots. */
function trim(d: Draw, edge: readonly Pt[], inset: number): void {
  const line = edge.map((p) => pt(p.x, p.y + inset));
  d.pen.stroke(line.map((p) => pt(p.x + 0.4, p.y + 1.4)), 1.4, mix(CROWN_GOLD, SHADOW, 0.55), 0.6, false);
  d.pen.stroke(line, 2.4, CROWN_GOLD, 0.95, false);
  d.pen.hair(line.map((p) => pt(p.x - 0.3, p.y - 0.5)), 0.7, mix(CROWN_GOLD, LIGHT, 0.6), 0.8);
  for (let i = 2; i < line.length - 1; i += 3) {
    const p = line[i]!;
    d.pen.dot(p.x, p.y + (inset > 0 ? 4 : -4), 0.55, mix(CROWN_GOLD, LIGHT, 0.3), 0.8);
  }
}

/** The name, letter by letter along the band's arch: a soft shadow, a light edge, a gold edge, then deep ink. */
function lettering(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.save();
  ctx.font = '700 96px Caveat, cursive';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const total = ctx.measureText(text).width;
  const start = CX - total / 2;
  const base = (x: number): number => topAt(x) + BAND * 0.76;
  const glyphs = [...text].map((ch, i) => {
    const x = start + ctx.measureText(text.slice(0, i)).width;
    const wch = ctx.measureText(ch).width;
    const mid = x + wch / 2;
    return { ch, x, mid, y: base(mid), a: Math.atan(slopeAt(mid)) };
  });
  const each = (draw: (ch: string) => void): void => {
    for (const g of glyphs) {
      ctx.save();
      ctx.translate(g.mid, g.y);
      ctx.rotate(g.a);
      ctx.translate(g.x - g.mid, 0);
      draw(g.ch);
      ctx.restore();
    }
  };
  ctx.lineJoin = 'round';
  soft(ctx, 2.5, () => {
    ctx.fillStyle = rgba(mix(CROWN_BLUE, SHADOW, 0.75), 0.75);
    each((ch) => ctx.fillText(ch, 2.5, 4));
  });
  ctx.strokeStyle = rgba('#fbf1d8', 0.95);
  ctx.lineWidth = 10;
  each((ch) => ctx.strokeText(ch, 0, 0));
  ctx.strokeStyle = CROWN_GOLD;
  ctx.lineWidth = 6;
  each((ch) => ctx.strokeText(ch, 0, 0));
  ctx.strokeStyle = rgba(mix(CROWN_GOLD, LIGHT, 0.55), 0.9);
  ctx.lineWidth = 1.6;
  each((ch) => ctx.strokeText(ch, -0.8, -1.2));
  const ink = ctx.createLinearGradient(0, TOP, 0, TOP + BAND);
  ink.addColorStop(0, '#2a3262');
  ink.addColorStop(0.55, '#181d40');
  ink.addColorStop(1, '#12162f');
  ctx.fillStyle = ink;
  each((ch) => ctx.fillText(ch, 0, 0));
  ctx.restore();
}

/** A small gilt lozenge with a glint. */
function lozenge(d: Draw, c: Pt, r: number): void {
  const shape = [pt(c.x, c.y - r), pt(c.x + r * 0.7, c.y), pt(c.x, c.y + r), pt(c.x - r * 0.7, c.y)];
  d.pen.fill(shape, CROWN_GOLD, 1);
  d.pen.fill([shape[0]!, shape[1]!, c], mix(CROWN_GOLD, LIGHT, 0.5), 0.8);
  d.pen.stroke(closed(shape), 0.7, d.ink, 0.8);
}

export const drawTitle: MenuDrawer = (ctx, seed) => {
  const rng = createRng(seed);
  const d = makeDraw(ctx, seed + 1, 0, 0);
  const band = bandShape();
  const tails = [tailShape(-1), tailShape(1)];
  // A soft shadow under the whole banner, thrown down and right onto the sky.
  soft(ctx, 7, () => {
    ctx.fillStyle = rgba('#3a4370', 0.28);
    for (const s of [band, ...tails]) {
      pathOf(ctx, s.map((p) => pt(p.x + 4, p.y + 7)));
      ctx.fill();
    }
  });
  for (const [i, t] of tails.entries()) {
    const side = i === 0 ? -1 : 1;
    cloth(d, rng, t, 0.3, [CX + side * (HALF + TAIL * 0.35)]);
    const top = t.slice(0, Math.floor((t.length - 1) / 2));
    d.pen.clipped(t, () => {
      trim(d, top, 7);
      trim(d, top.map((p) => pt(p.x, p.y + BAND)), -7);
    });
    d.pen.stroke(closed(crisp(t, 3)), 1.3, d.ink, 0.9);
  }
  for (const side of [-1, 1] as const) {
    const f = foldShape(side);
    d.pen.fill(f, mix(CROWN_BLUE, SHADOW, 0.7), 1);
    d.pen.hatch(f, 2.2, 0.9, 0.4, { color: INK, alpha: 0.35 });
    d.pen.stroke(closed(crisp(f, 3)), 1.1, d.ink, 0.9);
  }
  cloth(d, rng, band, 0.05, [CX - 150, CX + 40, CX + 170]);
  const top = band.slice(0, 41);
  trim(d, top, 7);
  trim(d, top.map((p) => pt(p.x, p.y + BAND)), -7);
  d.pen.stroke(closed(crisp(band, 3)), 1.5, d.ink, 0.95);
  // A dry-brush shine along the band's upper fold.
  d.pen.hair(top.slice(4, 26).map((p) => pt(p.x, p.y + 15)), 2.2, mix(CROWN_BLUE, LIGHT, 0.7), 0.35);
  lozenge(d, pt(CX - HALF + 18, topAt(CX - HALF + 18) + BAND / 2), 6);
  lozenge(d, pt(CX + HALF - 18, topAt(CX + HALF - 18) + BAND / 2), 6);
  lettering(ctx, 'InkHeroes');
};
