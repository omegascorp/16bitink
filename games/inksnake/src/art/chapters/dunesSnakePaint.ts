import { createRng } from '../../logic/rng';
import { closed, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, pathOf, type Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { SNAKE_W } from '../types';
import { rgba } from '../wash';
import { centreOf } from './barrensSnakePaint';

/**
 * The sidewinder's paint box and the brushwork its back strip and its neck
 * share: a pale ground the colour of the dune sand it lives on (cream to
 * pinkish buff), a row of soft tan-brown blotches down the back, each flecked
 * darker and edged paler, small brown spots in rows down the flanks, the
 * whole skin peppered with fine dark grains, the keeled scales matte.
 * Everything is deterministic: the same call paints the same pixels.
 */
export const SIDE_PAINT = {
  ground: '#dcc6a0',
  pale: '#f4ead2',
  pink: '#e3b9a0',
  grey: '#a59a88',
  shadow: '#4a3424',
  blotch: '#a87c55',
  blotchLit: '#c9a274',
  blotchDeep: '#74502f',
  fleck: '#5a3b24',
  stripe: '#7a5536',
  belly: '#f2ead8',
  lip: '#efe2c4',
  mouth: '#f0d6d0',
  mouthDeep: '#c98a8c',
  throat: '#5a2a2e',
  iris: '#cdb68c',
  horn: '#efe0bd',
} as const;

const P = SIDE_PAINT;

/** The back's cross-section wash, `yTop` being where the strip's y = 0 lies: sun-bleached cream where the light hits, warm buff on the far flank. */
export function sideCrossWash(ctx: CanvasRenderingContext2D, yTop: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  g.addColorStop(0, '#f6ead0');
  g.addColorStop(0.16, '#ecdcb9');
  g.addColorStop(0.42, '#dfc8a1');
  g.addColorStop(0.74, '#cdb085');
  g.addColorStop(1, '#a88a62');
  return g;
}

/**
 * A blotch as a sidewinder's are: not solid but a soft tan-brown wash laid
 * over a paler halo, its heart lifted, flecked inside with darker grains,
 * the pigment gathered at its drying edge, a broken brown rim and a fine ink
 * hairline.
 */
export function paintSideBlotch(ctx: CanvasRenderingContext2D, shape: readonly Pt[], seed: number, ink: string, rim = 1, halo = 0.45): void {
  const pen = new Pen(ctx, seed, 0.35);
  const { cx, cy, rx, ry } = centreOf(shape);
  if (halo > 0) glaze(ctx, cx, cy, rx + 2.4, ry + 1.8, 0, P.pale, halo);
  pen.fill(shape, P.blotch, 0.82);
  pen.clipped(shape, () => {
    glaze(ctx, cx - rx * 0.18, cy - ry * 0.3, rx * 0.85, ry * 0.65, 0, P.blotchLit, 0.55);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(P.blotchDeep, 0.55);
    ctx.lineWidth = rim * 2.4;
    pathOf(ctx, shape);
    ctx.stroke();
    ctx.restore();
    const rng = createRng(seed * 7 + 3);
    const n = Math.round(rx * ry * 1.1);
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU;
      const r = Math.sqrt(rng());
      ctx.fillStyle = rgba(P.fleck, 0.25 + 0.45 * rng());
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, 0.2 + rng() * 0.38, 0, TAU);
      ctx.fill();
    }
  });
  pen.stroke(closed(shape), rim * 0.9, P.blotchDeep, 0.7, false);
  pen.hair(closed(shape), 0.28, ink, 0.32);
}

/** A small pale spot (the cream flecks between the sidewinder's blotches). */
export function paleSpot(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  glaze(ctx, x, y, rx * 1.5, ry * 1.5, 0, P.pale, 0.55);
  glaze(ctx, x, y, rx, ry, 0, PAPER_FILL, 0.3);
}

/** The fine dark grains peppering the skin: dots over x0..x0+w, repeated every `w` when `wrap`, denser low on the flanks. */
export function pepper(ctx: CanvasRenderingContext2D, x0: number, w: number, yTop: number, seed: number, count: number, wrap: boolean): void {
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * w;
    const v = rng();
    const y = yTop + 1.2 + v * 21.6;
    const r = 0.14 + rng() * 0.3;
    const a = 0.12 + 0.3 * rng() + 0.15 * v;
    ctx.fillStyle = rng() < 0.12 ? rgba(PAPER_FILL, 0.4) : rgba(P.fleck, a);
    for (const k of wrap ? [-w, 0, w] : [0]) {
      ctx.beginPath();
      ctx.arc(x + k, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}
