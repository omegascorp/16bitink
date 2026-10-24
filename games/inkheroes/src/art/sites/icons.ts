import type { Resource } from '../../logic/resources';
import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { CROWN_GOLD } from './build';
import { cluster, flask, gem, lump } from './parts';
import { gleam, mix, paint, SHADOW, sprite } from './paintKit';

/**
 * The purse bar's resource icons (about 24 units, centred) and the owner's
 * flag over a captured site. Weighty, richly modelled shapes in deep
 * colour with a bright glint and a warm rim of light, so each reads at
 * 28 px on the dark leather bar.
 */
const ICON_BOUNDS = { x0: -16, y0: -16, x1: 16, y1: 16 };
const ICON_SCALE = 1.12;

const BRASS = '#c08e2c';
const BRASS_DEEP = '#6e4a14';
const GLINT = '#f6dc8e';
const LOG_BARK = '#4e3220';
const LOG_END = '#b08656';
const RAW_ORE = '#62656e';
const RUST_ORE = '#7a5440';
const SULFUR_DEEP = '#c49a26';
const RUBY = '#a8262a';
const EMERALD = '#25844f';
const SAPPHIRE = '#2a4f9e';

function coinStack(d: Draw): void {
  for (let i = 0; i < 4; i++) {
    const y = 8 - i * 3;
    const rim = [pt(-10, y - 2.4), pt(4, y - 2.4), ...Array.from({ length: 13 }, (_, k) => pt(-3 + 7 * Math.cos((k / 12) * Math.PI), y + 3 * Math.sin((k / 12) * Math.PI)))];
    paint(d, rim, BRASS_DEEP, { shadow: 0.4, hatch: 0, line: 0.5 });
    paint(d, oval(-3, y - 2.4, 7, 3, 20), BRASS, { shadow: 0.35, hatch: 0, line: 0.5, gloss: true });
  }
  const face = oval(5, 3, 6.5, 6.5, 24);
  paint(d, face, BRASS, { shadow: 0.6, hatch: 0.2, line: 0.7, gloss: true });
  d.pen.stroke(closed(oval(5, 3, 4.8, 4.8, 20)), 0.6, BRASS_DEEP, 0.95);
  // A crown struck on its face, and the light catching the coin's upper rim.
  d.pen.stroke([pt(2.6, 4.6), pt(2.6, 1.6), pt(3.9, 3), pt(5, 1), pt(6.1, 3), pt(7.4, 1.6), pt(7.4, 4.6), pt(2.6, 4.6)], 0.75, BRASS_DEEP, 1, false);
  gleam(d, bezier(pt(0.2, 0.6), pt(1.2, -2.6), pt(4.6, -3.2), 6), 0.9, 0.9);
  d.pen.dot(1.6, -1.4, 0.7, GLINT, 1);
}

/** One log lying from a (its sawn end, towards the viewer) back to b. */
function logPiece(d: Draw, a: Pt, b: Pt, r: number): void {
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  const n = pt(((b.y - a.y) / l) * r, (-(b.x - a.x) / l) * r);
  const body = [pt(a.x + n.x, a.y + n.y), ...bezier(pt(b.x + n.x, b.y + n.y), pt(b.x + r * 0.6, b.y), pt(b.x - n.x, b.y - n.y), 6), pt(a.x - n.x, a.y - n.y)];
  paint(d, body, LOG_BARK, { shadow: 0.7, hatch: 0.35, line: 0.6 });
  for (const k of [-0.55, 0, 0.5]) d.pen.hair([pt(a.x + n.x * k + 2, a.y + n.y * k - 0.5), pt(b.x + n.x * k - 1, b.y + n.y * k)], 0.5, mix(LOG_BARK, SHADOW, 0.6), 0.85);
  d.pen.hair([pt(a.x + n.x * 0.75 + 2, a.y + n.y * 0.75), pt(b.x + n.x * 0.75 - 1, b.y + n.y * 0.75)], 0.6, mix(LOG_BARK, GLINT, 0.45), 0.7);
  const end = oval(a.x, a.y, r * 0.85, r * 1.04, 18).map((p) => pt(a.x + (p.x - a.x) * 0.95 - (p.y - a.y) * 0.2, p.y));
  paint(d, end, LOG_END, { shadow: 0.45, hatch: 0, line: 0.6 });
  for (const k of [0.66, 0.36]) d.pen.hair(closed(end.map((p) => pt(a.x + (p.x - a.x) * k, a.y + (p.y - a.y) * k))), 0.45, mix(LOG_END, LOG_BARK, 0.65), 0.95);
}

function logs(d: Draw, rng: Rng): void {
  logPiece(d, pt(-3, -1), pt(11, -9), 4);
  logPiece(d, pt(-8, 7), pt(8, -2), 4.6);
  void rng;
}

function oreLumps(d: Draw, rng: Rng): void {
  lump(d, rng, pt(5, 4), 6, 5.2, RUST_ORE, 0.7);
  lump(d, rng, pt(-4, 3), 7.6, 6.8, RAW_ORE, 0.7);
  d.pen.dot(-6.5, -0.8, 0.7, GLINT, 0.8);
}

function sulfurHeap(d: Draw, rng: Rng): void {
  const heap = [...bezier(pt(-12, 8), pt(-6, -10), pt(0, -10), 8), ...bezier(pt(0, -10), pt(7, -10), pt(12, 8), 8).slice(1)];
  paint(d, heap, SULFUR_DEEP, { shadow: 0.85, hatch: 0.35, cross: true, line: 0.7 });
  d.pen.clipped(heap, () => d.pen.stipple(heap, 70, (x) => (x < 2 ? 0.7 : 0.25), 0.55, '#f0d870'));
  for (const [x, y] of [[-6, 7], [1, 8], [7, 6.5]] as const) lump(d, rng, pt(x, y), 2.6, 2, mix(SULFUR_DEEP, '#8a6418', 0.3), 0.5);
}

function gemTrio(d: Draw): void {
  gem(d, pt(-6.5, -2), 5.6, RUBY, 0.55);
  gem(d, pt(6.5, -2.5), 5.2, SAPPHIRE, 0.55);
  gem(d, pt(0, 3), 8.6, EMERALD, 0.7);
}

const ICON: Record<Resource, (d: Draw, rng: Rng) => void> = {
  gold: coinStack,
  wood: logs,
  ore: oreLumps,
  mercury: (d) => flask(d, pt(0, 11), 7, '#aeb6c0', 0.7),
  sulfur: sulfurHeap,
  crystal: (d, rng) => cluster(d, rng, pt(0, 11), 23, '#861a1e', 0.6),
  gems: gemTrio,
};

/** A resource's icon for the purse bar, centred on (0, 0), about 24 units across. */
export function drawResourceIcon(ctx: CanvasRenderingContext2D, r: Resource, seed: number): void {
  sprite(ctx, seed, 0, { bounds: ICON_BOUNDS, line: 0.75, rim: 0.65 }, (d, rng) => {
    d.pen.ctx.save();
    d.pen.ctx.scale(ICON_SCALE, ICON_SCALE);
    ICON[r](d, rng);
    d.pen.ctx.restore();
  });
}

/** A small owner's flag on a pole, foot at (0, 0), about 22 tall; `color` is the owner's banner. */
export function drawFlag(ctx: CanvasRenderingContext2D, color: string, seed: number, f: number): void {
  sprite(ctx, seed, f, { bounds: { x0: -6, y0: -28, x1: 18, y1: 4 }, line: 0.6, rim: 0.4 }, (d) => {
    const top = pt(0, -22);
    d.pen.stroke([pt(0, 0.5), top], 1.1, '#2e1c10', 1, false);
    const w = 0.4;
    const y0 = -21;
    const cloth: Pt[] = [
      pt(0.6, y0),
      ...bezier(pt(0.6, y0), pt(7, y0 - 2 + w), pt(13, y0 + 0.5), 8).slice(1),
      pt(9.5, y0 + 3.8),
      ...bezier(pt(13, y0 + 7.4 + w * 0.5), pt(7, y0 + 6 + w), pt(0.6, y0 + 8), 8),
    ];
    paint(d, cloth, color, { shadow: 0.45, hatch: 0.2, line: 0.6 });
    d.pen.hair([pt(0.8, y0 + 1), pt(0.8, y0 + 7.4)], 0.8, mix(color, SHADOW, 0.5), 0.8);
    d.pen.dot(0, top.y - 0.8, 1.4, CROWN_GOLD, 1);
    d.pen.dot(-0.4, top.y - 1.2, 0.5, PAPER_FILL, 0.9);
  });
}
