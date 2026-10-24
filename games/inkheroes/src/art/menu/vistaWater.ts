import type { Rng } from '../../logic/rng';
import { pt, ribbon } from '../kit';
import { pathOf, type Pen, type Pt } from '../pen';
import { gradeFill, LIGHT, mix, poolEdge, rgba, SHADOW, soft, softly, through } from './vistaKit';

/**
 * Water and ways in the menu's paintings: a winding river that mirrors
 * the sky, an old humpbacked stone bridge seen side on with its
 * reflection, and a worn road narrowing into the distance.
 */

type Ink = { readonly pen: Pen; readonly ink: string };

export interface RiverTone {
  readonly far: string;
  readonly near: string;
  readonly bank: string;
}

/** A river along `spine` (far end first), `w0` wide there and `w1` at the near end. Returns its outline. */
export function river(d: Ink, rng: Rng, spine: readonly Pt[], w0: number, w1: number, tone: RiverTone, inkAlpha: number): Pt[] {
  const ctx = d.pen.ctx;
  const line = through(spine, 4);
  const width = (u: number): number => (w0 + (w1 - w0) * u ** 1.5) * (1 + 0.18 * Math.sin(u * 23));
  const { top, bot, shape } = ribbon(line, width);
  const y0 = Math.min(...shape.map((p) => p.y));
  const y1 = Math.max(...shape.map((p) => p.y));
  // The earth lip of each bank, a little wider than the water.
  const lip = ribbon(line, (u) => width(u) * 1.18 + 3).shape;
  soft(ctx, 1, () => d.pen.fill(lip, tone.bank, 0.75));
  gradeFill(ctx, shape, y0, y1, [[0, tone.far], [0.55, mix(tone.far, tone.near, 0.6)], [1, tone.near]]);
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  // The banks' dark reflections along each edge, and the sky's light down the middle.
  const bankWidth = Math.max(3, w1 * 0.16);
  softly(ctx, 2.5, mix(tone.near, SHADOW, 0.45), 0.45, (c) => {
    c.beginPath();
    top.forEach((p, i) => (i === 0 ? c.moveTo(p.x, p.y + 1) : c.lineTo(p.x, p.y + 1)));
  }, { stroke: bankWidth });
  softly(ctx, 2.5, mix(tone.near, SHADOW, 0.3), 0.3, (c) => {
    c.beginPath();
    bot.forEach((p, i) => (i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y)));
  }, { stroke: bankWidth });
  // Glints and ripples: short level strokes of the sky's gold, longer and more open nearer.
  for (let i = 0; i < line.length; i += 2) {
    const u = i / (line.length - 1);
    const c = line[i]!;
    const w = width(u);
    for (let j = 0; j < 2; j++) {
      if (rng() > 0.6) continue;
      const len = w * (0.15 + rng() * 0.35);
      const x = c.x + (rng() - 0.5) * w * 0.6;
      ctx.strokeStyle = rgba(rng() < 0.75 ? '#f6d48a' : mix(tone.near, SHADOW, 0.35), 0.45 + rng() * 0.4);
      ctx.lineWidth = 0.5 + u * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - len / 2, c.y);
      ctx.lineTo(x + len / 2, c.y + (rng() - 0.5) * 0.6);
      ctx.stroke();
    }
  }
  ctx.restore();
  poolEdge(ctx, shape, mix(tone.near, SHADOW, 0.4), 0.3, 2);
  if (inkAlpha > 0) {
    d.pen.stroke(top, 0.8, d.ink, inkAlpha, false);
    d.pen.stroke(bot, 0.6, d.ink, inkAlpha * 0.6, false);
  }
  return shape;
}

export interface RoadTone {
  readonly lit: string;
  readonly edge: string;
}

/** A dirt road along `spine` (far end first), `w0` wide there and `w1` near: a shaded verge, a lit track, wheel ruts. */
export function road(d: Ink, rng: Rng, spine: readonly Pt[], w0: number, w1: number, tone: RoadTone, inkAlpha: number): void {
  const ctx = d.pen.ctx;
  const line = through(spine, 4);
  const w = (u: number): number => w0 + (w1 - w0) * u * u;
  soft(ctx, 1.4, () => d.pen.fill(ribbon(line, (u) => w(u) * 1.25 + 1).shape, tone.edge, 0.55));
  const { top, bot, shape } = ribbon(line, w);
  const y0 = Math.min(...shape.map((p) => p.y));
  const y1 = Math.max(...shape.map((p) => p.y));
  gradeFill(ctx, shape, y0, y1, [[0, mix(tone.lit, LIGHT, 0.2)], [1, tone.lit]], 0.95);
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  for (const k of [-0.22, 0.22]) {
    const rut = ribbon(line, (u) => w(u) * (1 + k * 2)).top;
    d.pen.hair(rut, 0.5, mix(tone.edge, SHADOW, 0.2), 0.3);
  }
  for (let i = 0; i < line.length * 0.6; i++) {
    const p = line[Math.floor(rng() * line.length)]!;
    d.pen.dot(p.x + (rng() - 0.5) * 10, p.y + (rng() - 0.5) * 3, 0.5, tone.edge, 0.4);
  }
  ctx.restore();
  if (inkAlpha > 0) {
    d.pen.hair(top, 0.6, d.ink, inkAlpha * 0.7);
    d.pen.hair(bot, 0.7, d.ink, inkAlpha);
  }
}

export interface BridgeSpec {
  readonly x0: number;
  readonly x1: number;
  /** The water line under it. */
  readonly water: number;
  /** The deck's height over the water at the ends and at the crown. */
  readonly end: number;
  readonly crown: number;
  readonly arches: readonly { readonly at: number; readonly span: number; readonly rise: number }[];
  readonly stone: string;
  readonly inkAlpha: number;
}

/** The arch's opening: a half ellipse springing at the water; `at` and `span` as fractions of the bridge. */
function archHole(b: BridgeSpec, a: BridgeSpec['arches'][number], grow = 0, n = 16): Pt[] {
  const len = b.x1 - b.x0;
  const cx = b.x0 + len * a.at;
  const r = (len * a.span) / 2 + grow;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = Math.PI + (i / n) * Math.PI;
    return pt(cx + Math.cos(t) * r, b.water + 1 + Math.sin(t) * (a.rise + grow));
  });
}

/** The deck's top line: a hump from the ends up to the crown in the middle. */
function deckLine(b: BridgeSpec): Pt[] {
  const len = b.x1 - b.x0;
  return Array.from({ length: 25 }, (_, i) => {
    const u = i / 24;
    const hump = Math.sin(Math.PI * u) ** 0.8;
    return pt(b.x0 + len * u, b.water - b.end - (b.crown - b.end) * hump);
  });
}

/**
 * An old stone bridge side on over water at `water`: a humped deck with a
 * lit coping, coursed stone washed warm above and darkened by damp near
 * the water, round arches dark beneath with ringed voussoirs, cutwaters at
 * the piers, and its broken reflection in the river below.
 */
export function bridge(d: Ink, rng: Rng, b: BridgeSpec): void {
  const ctx = d.pen.ctx;
  const deck = deckLine(b);
  const body = [...deck, pt(b.x1 + 4, b.water + 2), pt(b.x0 - 4, b.water + 2)];
  const holes = b.arches.map((a) => archHole(b, a));
  const top = Math.min(...deck.map((p) => p.y));
  const paintBody = (): void => {
    ctx.save();
    ctx.beginPath();
    for (const ring of [body, ...holes]) {
      ring.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
    }
    ctx.clip('evenodd');
    const g = ctx.createLinearGradient(b.x0, top, b.x1 * 0.4 + b.x0 * 0.6, b.water);
    g.addColorStop(0, mix(b.stone, LIGHT, 0.35));
    g.addColorStop(0.6, b.stone);
    g.addColorStop(1, mix(b.stone, '#2e3628', 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 6, top - 2, b.x1 - b.x0 + 12, b.water - top + 6);
    // Courses of stone, a few stones tinted apart.
    for (let y = top + 4; y < b.water; y += 3.4) {
      d.pen.hair([pt(b.x0 - 4, y), pt(b.x1 + 4, y + (rng() - 0.5))], 0.35, d.ink, 0.22 * (b.inkAlpha + 0.4));
      for (let x = b.x0 + rng() * 6; x < b.x1; x += 5 + rng() * 4) {
        if (rng() < 0.3) d.pen.fill([pt(x, y), pt(x + 4.5, y), pt(x + 4.5, y + 3.2), pt(x, y + 3.2)], rng() < 0.5 ? mix(b.stone, LIGHT, 0.5) : mix(b.stone, '#6d604e', 0.5), 0.25);
        d.pen.hair([pt(x, y), pt(x, y + 3.2)], 0.3, d.ink, 0.2 * (b.inkAlpha + 0.4));
      }
    }
    // Moss and damp low down.
    softly(ctx, 3, '#2e3e22', 0.45, (c) => pathOf(c, [pt(b.x0 - 4, b.water - 7), pt(b.x1 + 4, b.water - 7), pt(b.x1 + 4, b.water + 2), pt(b.x0 - 4, b.water + 2)]));
    ctx.restore();
  };
  // The reflection first: the bridge flipped about the water line, softened and broken by ripples.
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x0 - 10, b.water + 1, b.x1 - b.x0 + 20, (b.crown + 10) * 1.1);
  ctx.clip();
  ctx.globalAlpha = 0.3;
  ctx.translate(0, b.water * 2 + 2);
  ctx.scale(1, -1);
  soft(ctx, 1.2, paintBody);
  ctx.restore();
  ctx.save();
  for (let y = b.water + 3; y < b.water + b.crown; y += 2.5 + rng() * 2) {
    ctx.strokeStyle = rgba('#e8c27a', 0.4);
    ctx.lineWidth = 0.7;
    const x = b.x0 + rng() * (b.x1 - b.x0);
    ctx.beginPath();
    ctx.moveTo(x - 6 - rng() * 14, y);
    ctx.lineTo(x + 6 + rng() * 14, y);
    ctx.stroke();
  }
  ctx.restore();
  paintBody();
  // The arches: dark under the vault, the far bank's light glimpsed low.
  for (const [i, hole] of holes.entries()) {
    const a = b.arches[i]!;
    gradeFill(ctx, hole, b.water - a.rise, b.water, [[0, mix(SHADOW, b.stone, 0.15)], [0.7, mix(SHADOW, '#5e7a8a', 0.5)], [1, '#b88a50']], 0.92);
    const ring = archHole(b, a, 3.2);
    for (let k = 1; k < 10; k++) {
      const j = Math.round((k / 10) * (hole.length - 1));
      d.pen.hair([hole[j]!, ring[j]!], 0.4, d.ink, 0.5 * (b.inkAlpha + 0.3));
    }
    d.pen.stroke(hole, 0.7, d.ink, b.inkAlpha, false);
  }
  // Cutwaters on the piers between arches.
  for (let i = 0; i + 1 < b.arches.length; i++) {
    const len = b.x1 - b.x0;
    const ra = b.arches[i]!;
    const rb = b.arches[i + 1]!;
    const x = b.x0 + len * ((ra.at + ra.span / 2 + rb.at - rb.span / 2) / 2);
    const h = Math.min(ra.rise, rb.rise) * 0.55;
    const cw = [pt(x - 3.4, b.water + 1), pt(x - 3.4, b.water - h), pt(x, b.water - h - 4), pt(x + 3.4, b.water - h), pt(x + 3.4, b.water + 1)];
    d.pen.fill(cw, mix(b.stone, LIGHT, 0.15), 0.95);
    d.pen.fill([pt(x + 0.6, b.water + 1), pt(x + 0.6, b.water - h - 3), pt(x + 3.4, b.water - h), pt(x + 3.4, b.water + 1)], mix(b.stone, SHADOW, 0.35), 0.6);
    d.pen.stroke(cw, 0.55, d.ink, b.inkAlpha, false);
  }
  // The coping: a lit band along the deck with its shadow under.
  const coping = [...deck, ...deck.map((p) => pt(p.x, p.y + 2.6)).reverse()];
  d.pen.fill(coping, mix(b.stone, LIGHT, 0.55), 0.95);
  d.pen.hair(deck.map((p) => pt(p.x, p.y + 3.2)), 0.6, mix(b.stone, SHADOW, 0.5), 0.6);
  d.pen.stroke(deck, 0.85, d.ink, b.inkAlpha, false);
  d.pen.stroke([pt(b.x0 - 4, b.water + 1), deck[0]!], 0.7, d.ink, b.inkAlpha * 0.8, false);
  d.pen.stroke([deck[deck.length - 1]!, pt(b.x1 + 4, b.water + 1)], 0.9, d.ink, b.inkAlpha, false);
}
