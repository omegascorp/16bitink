import type { Resource } from '../../logic/resources';
import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { CROWN_GOLD } from './build';
import { BARK, cluster, END_GRAIN, flask, gem, GOLD, GOLD_DEEP, lump, ORE, SULFUR } from './parts';
import { mix, paint, SHADOW, sprite } from './paintKit';

/**
 * The purse bar's resource icons (about 22 units, centred) and the owner's
 * flag over a captured site. Big simple shapes with a heavy silhouette, so
 * each reads at 18 px.
 */
const ICON_BOUNDS = { x0: -16, y0: -16, x1: 16, y1: 16 };

function coinStack(d: Draw): void {
  for (let i = 0; i < 4; i++) {
    const y = 8 - i * 3;
    const rim = [pt(-10, y - 2.4), pt(4, y - 2.4), ...Array.from({ length: 13 }, (_, k) => pt(-3 + 7 * Math.cos((k / 12) * Math.PI), y + 3 * Math.sin((k / 12) * Math.PI)))];
    paint(d, rim, GOLD_DEEP, { shadow: 0.3, hatch: 0, line: 0.6 });
    paint(d, oval(-3, y - 2.4, 7, 3, 20), GOLD, { shadow: 0.3, hatch: 0, line: 0.6, gloss: true });
  }
  const face = oval(5, 3, 6.5, 6.5, 24);
  paint(d, face, GOLD, { shadow: 0.5, hatch: 0, line: 0.8, gloss: true });
  d.pen.stroke(closed(oval(5, 3, 4.8, 4.8, 20)), 0.6, GOLD_DEEP, 0.9);
  // A little crown struck on its face.
  d.pen.stroke([pt(2.6, 4.6), pt(2.6, 1.6), pt(3.9, 3), pt(5, 1), pt(6.1, 3), pt(7.4, 1.6), pt(7.4, 4.6), pt(2.6, 4.6)], 0.7, GOLD_DEEP, 1, false);
}

function log(d: Draw, rng: Rng): void {
  const a = pt(-7, 5);
  const b = pt(9, -4);
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  const n = pt(((b.y - a.y) / l) * 5, (-(b.x - a.x) / l) * 5);
  const body = [pt(a.x + n.x, a.y + n.y), ...bezier(pt(b.x + n.x, b.y + n.y), pt(b.x + 3, b.y), pt(b.x - n.x, b.y - n.y), 6), pt(a.x - n.x, a.y - n.y)];
  paint(d, body, BARK, { shadow: 0.6, hatch: 0.3, line: 0.8 });
  for (const k of [-0.5, 0, 0.5]) d.pen.hair([pt(a.x + n.x * k + 2, a.y + n.y * k - 1), pt(b.x + n.x * k - 1, b.y + n.y * k)], 0.5, mix(BARK, SHADOW, 0.6), 0.8);
  // A twig stub.
  paint(d, [pt(1, -2), pt(2, -7), pt(4, -7), pt(4, -1)], BARK, { shadow: 0.4, hatch: 0, line: 0.6 });
  const end = oval(a.x, a.y, 4.2, 5.2, 18).map((p) => pt(a.x + (p.x - a.x) * 0.95 - (p.y - a.y) * 0.2, p.y));
  paint(d, end, END_GRAIN, { shadow: 0.3, hatch: 0, line: 0.8 });
  for (const k of [0.62, 0.3]) d.pen.hair(closed(end.map((p) => pt(a.x + (p.x - a.x) * k, a.y + (p.y - a.y) * k))), 0.45, mix(END_GRAIN, BARK, 0.6), 0.9);
  void rng;
}

function sulfurHeap(d: Draw, rng: Rng): void {
  const heap = [...bezier(pt(-11, 8), pt(-6, -9), pt(0, -9), 8), ...bezier(pt(0, -9), pt(7, -9), pt(11, 8), 8).slice(1)];
  paint(d, heap, SULFUR, { shadow: 0.75, hatch: 0.3, line: 0.8 });
  d.pen.clipped(heap, () => d.pen.stipple(heap, 60, () => 0.6, 0.55, '#fff4b0'));
  for (const [x, y] of [[-6, 7], [1, 8], [7, 6.5]] as const) lump(d, rng, pt(x, y), 2.6, 2, mix(SULFUR, '#c99a2e', 0.3), 0.6);
}

const ICON: Record<Resource, (d: Draw, rng: Rng) => void> = {
  gold: coinStack,
  wood: log,
  ore: (d, rng) => {
    lump(d, rng, pt(-4, 3), 7, 6.4, '#8d929c', 0.8);
    lump(d, rng, pt(5, 4), 5.6, 5, mix(ORE, '#9a6b4e', 0.4), 0.8);
  },
  mercury: (d) => flask(d, pt(0, 10.5), 6.8, undefined, 0.8),
  sulfur: sulfurHeap,
  crystal: (d, rng) => cluster(d, rng, pt(0, 10), 22, undefined, 0.75),
  gems: (d) => gem(d, pt(0, 1), 10.5, undefined, 0.8),
};

/** A resource's icon for the purse bar, centred on (0, 0), about 22 units across. */
export function drawResourceIcon(ctx: CanvasRenderingContext2D, r: Resource, seed: number): void {
  sprite(ctx, seed, 0, { bounds: ICON_BOUNDS, line: 0.9, rim: 0.4 }, ICON[r]);
}

/** A small owner's flag on a pole, foot at (0, 0), about 22 tall; `color` is the owner's banner. */
export function drawFlag(ctx: CanvasRenderingContext2D, color: string, seed: number, f: number): void {
  sprite(ctx, seed, f, { bounds: { x0: -6, y0: -28, x1: 18, y1: 4 }, line: 0.6, rim: 0.4 }, (d) => {
    const top = pt(0, -22);
    d.pen.stroke([pt(0, 0.5), top], 1.2, '#5a3d26', 1, false);
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
