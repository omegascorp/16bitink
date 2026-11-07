import { createRng } from '../../../src/logic/rng';
import { CORN } from '../../../src/art/snakes/corn';
import { glaze, periodicLine, scaleRows } from '../../../src/art/snakes/cornPaint';
import type { Draw } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import { Pen, pathOf, type Pt, withScratch } from '../../../src/art/pen';
import { SNAKE_W, stripLength, type SnakeArt } from '../../../src/art/types';
import { rgba } from '../../../src/art/wash';

/**
 * The reticulated python's skin seen side on, for the strip the promo lays
 * along a body (sprites.ts drawBody): the back at the strip's top edge (lit),
 * the belly at its bottom. A gold-tan ground; along the back a chain of
 * olive-grey diamonds rimmed in black, the black "net" running down from
 * them round flank diamonds and pale, white-eyed spots; the cream belly
 * plates along the bottom; small scales, an iridescent sheen along the top.
 * One period painted once and laid end to end, as boaArt.ts does.
 */
export const RETIC = {
  gold: '#d3ae62', tan: '#b48a48', low: '#8a6f45', deep: '#4d3a22', olive: '#7b7356', oliveDeep: '#545038', net: '#15110c',
  pale: '#f1ead4', belly: '#e9dcae', bellyLine: '#a8955e', sheen: '#9fb4d8', line: '#1a130c',
} as const;

const PERIOD = 72;
const UNITS = 2;
const STEP = PERIOD / UNITS;
const mod = (i: number, n: number): number => ((i % n) + n) % n;

function crossWash(ctx: CanvasRenderingContext2D): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
  g.addColorStop(0, '#e6c57c');
  g.addColorStop(0.2, RETIC.gold);
  g.addColorStop(0.5, RETIC.tan);
  g.addColorStop(0.8, RETIC.low);
  g.addColorStop(1, RETIC.deep);
  return g;
}

/** A diamond with soft, wobbled sides (centre, half width, half height). */
function diamond(cx: number, cy: number, hw: number, hh: number, seed: number): Pt[] {
  const rng = createRng(seed);
  const tips = [{ x: cx - hw, y: cy }, { x: cx, y: cy - hh }, { x: cx + hw, y: cy }, { x: cx, y: cy + hh }];
  const out: Pt[] = [];
  tips.forEach((a, i) => {
    const b = tips[(i + 1) % 4]!;
    const bow = (rng() - 0.3) * 0.18;
    for (let k = 0; k < 8; k++) {
      const u = k / 8;
      const mx = a.x + (b.x - a.x) * u;
      const my = a.y + (b.y - a.y) * u;
      const s = Math.sin(u * Math.PI) * bow;
      out.push({ x: mx + (my - cy) * s, y: my - (mx - cx) * s * (hh / hw) });
    }
  });
  return out;
}

function inkLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, alpha = 0.95): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(RETIC.net, alpha);
  ctx.lineWidth = w;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** One unit of the net: the dorsal diamond, the flank diamond, the lines between and the white-eyed spot in the gap before it. */
function paintUnit(ctx: CanvasRenderingContext2D, i: number, seed: number): void {
  const k = mod(i, UNITS);
  const rng = createRng(5100 + k * 37);
  const cx = i * STEP + STEP / 2 + (rng() - 0.5) * 2;
  const pen = new Pen(ctx, seed + k, 0.3);
  // The black net running down the flank from the back's diamond.
  const lt = { x: cx - 12.5, y: 3.6 };
  const rt = { x: cx + 12.5, y: 3.6 };
  const fl = { x: cx - 7.5, y: 14.6 + (rng() - 0.5) };
  const fr = { x: cx + 7.5, y: 14.6 + (rng() - 0.5) };
  inkLine(ctx, [lt, { x: cx - 9.6, y: 9.5 }, fl], 1.5);
  inkLine(ctx, [rt, { x: cx + 9.8, y: 9.5 }, fr], 1.5);
  inkLine(ctx, [fl, { x: cx - 13, y: 18.4 }, { x: cx - 18, y: 20.2 }], 1.2);
  inkLine(ctx, [fr, { x: cx + 13, y: 18.4 }, { x: cx + 18, y: 20.2 }], 1.2);
  // The back's diamond: olive-grey, its rim black, lit along its top.
  const d = diamond(cx, 3.2, 13.4, 6.8, 5200 + k);
  pen.fill(d, RETIC.olive, 0.97);
  pen.clipped(d, () => {
    glaze(ctx, cx - 2, 0.5, 9, 3.2, 0, '#a59c78', 0.55);
    ctx.strokeStyle = rgba(RETIC.oliveDeep, 0.8);
    ctx.lineWidth = 1.4;
    pathOf(ctx, d);
    ctx.stroke();
  });
  inkLine(ctx, [...d, d[0]!], 1.55);
  // The flank diamond, darker, with a pale fleck at its heart.
  const f = diamond(cx, 14.6, 7.4, 4.2, 5300 + k);
  pen.fill(f, RETIC.oliveDeep, 0.95);
  pen.clipped(f, () => glaze(ctx, cx - 1.5, 13.5, 4.5, 2, 0, RETIC.olive, 0.7));
  inkLine(ctx, [...f, f[0]!], 1.2);
  pen.fill([{ x: cx - 1.6, y: 14.6 }, { x: cx, y: 13.7 }, { x: cx + 1.6, y: 14.6 }, { x: cx, y: 15.5 }], RETIC.pale, 0.6);
  // In the gold gap before it: a black-rimmed pale spot with a white eye.
  const gx = cx - STEP / 2 + (rng() - 0.5) * 1.5;
  const g = diamond(gx, 15.2, 4.6, 3.2, 5400 + k);
  pen.fill(g, RETIC.pale, 0.9);
  inkLine(ctx, [...g, g[0]!], 1.1);
  pen.fill([{ x: gx - 1.2, y: 15.2 }, { x: gx, y: 14.3 }, { x: gx + 1.2, y: 15.2 }, { x: gx, y: 16.1 }], '#ffffff', 0.85);
  // Small dark flecks low on the flank.
  for (let j = 0; j < 3; j++) pen.fill(diamond(cx - 14 + j * 14 + (rng() - 0.5) * 3, 19.2, 1.6, 0.9, 5500 + k * 3 + j), RETIC.net, 0.55);
}

function paintBelly(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = RETIC.belly;
  ctx.fillRect(0, 20.6, PERIOD, SNAKE_W - 20.6);
  ctx.strokeStyle = rgba(RETIC.bellyLine, 0.75);
  ctx.lineWidth = 0.3;
  for (let x = 0; x <= PERIOD; x += 3) {
    ctx.beginPath();
    ctx.moveTo(x, 20.8);
    ctx.quadraticCurveTo(x + 0.9, 22.2, x + 0.3, 23.6);
    ctx.stroke();
  }
  const g = ctx.createLinearGradient(0, 20.6, 0, SNAKE_W);
  g.addColorStop(0, rgba(RETIC.deep, 0.25));
  g.addColorStop(0.4, rgba(RETIC.deep, 0));
  g.addColorStop(1, rgba(RETIC.deep, 0.35));
  ctx.fillStyle = g;
  ctx.fillRect(0, 20.6, PERIOD, SNAKE_W - 20.6);
  ctx.restore();
}

/** Light and shade over the pattern: the round of the body, a gloss band and the faint rainbow of the scales along the back. */
function modelOver(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
  g.addColorStop(0, rgba(PAPER_FILL, 0.2));
  g.addColorStop(0.12, rgba(PAPER_FILL, 0.28));
  g.addColorStop(0.3, rgba(PAPER_FILL, 0));
  g.addColorStop(0.62, rgba(RETIC.deep, 0.08));
  g.addColorStop(0.84, rgba(RETIC.deep, 0.3));
  g.addColorStop(1, rgba(RETIC.deep, 0.15));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  const s = ctx.createLinearGradient(0, 1.5, 0, 8);
  s.addColorStop(0, rgba(RETIC.sheen, 0));
  s.addColorStop(0.5, rgba(RETIC.sheen, 0.2));
  s.addColorStop(1, rgba(RETIC.sheen, 0));
  ctx.fillStyle = s;
  ctx.fillRect(0, 1.5, PERIOD, 6.5);
}

function grainDots(ctx: CanvasRenderingContext2D, seed: number): void {
  const rng = createRng(seed);
  for (let i = 0; i < 520; i++) {
    const x = rng() * PERIOD;
    const y = 1 + rng() * 22;
    ctx.fillStyle = rng() < 0.15 ? rgba(PAPER_FILL, 0.22) : rgba(RETIC.deep, 0.08 + 0.12 * rng());
    for (const k of [-PERIOD, 0, PERIOD]) {
      ctx.beginPath();
      ctx.arc(x + k, y, 0.18 + rng() * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintTile(ctx: CanvasRenderingContext2D, f: number): void {
  const boil = f * 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0.4, PERIOD, SNAKE_W - 0.8);
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 0.97;
  ctx.fillStyle = crossWash(ctx);
  ctx.fillRect(0, 0, PERIOD, SNAKE_W);
  ctx.globalAlpha = 1;
  for (let i = -1; i <= UNITS; i++) paintUnit(ctx, i, 5600 + boil);
  paintBelly(ctx);
  scaleRows(ctx, 0, PERIOD, 0, 2.4, 0.3, PERIOD);
  grainDots(ctx, 5700);
  modelOver(ctx);
  ctx.restore();
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, 0.9, 0.55, RETIC.line, 0.95, 5800 + boil);
  periodicLine(ctx, PERIOD, -2, PERIOD + 2, SNAKE_W - 0.9, 0.7, RETIC.line, 1, 5900 + boil);
}

/** The strip with the back along its top edge (`under` false) or along its bottom edge (`under` true), for bodies laid either way. */
const stripOf = (under: boolean) => (d: Draw, length: number): void => {
  const { ctx } = d.pen;
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    if (under) {
      tctx.translate(0, SNAKE_W);
      tctx.scale(1, -1);
    }
    paintTile(tctx, d.f);
    for (let x = 0; x < Math.min(length, stripLength(PERIOD)); x += PERIOD) ctx.drawImage(tile, x, 0, PERIOD, SNAKE_W);
  });
};

/**
 * In the shape bakeStrip takes (only the strip is the python's; its head is
 * reticHead.ts). drawBody lays the strip's top edge to the left of the
 * spine's travel (head to tail), so a body whose head is on the right wants
 * the back on the strip's top edge, and one whose head is on the left wants
 * it on the bottom edge.
 */
export const RETIC_HEAD_RIGHT: SnakeArt = { ...CORN, period: PERIOD, drawStrip: stripOf(false) };
export const RETIC_HEAD_LEFT: SnakeArt = { ...CORN, period: PERIOD, drawStrip: stripOf(true) };
