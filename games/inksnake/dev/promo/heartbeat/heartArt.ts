import { closed, type Draw, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';
import { glaze } from '../../../src/art/snakes/cornPaint';

/**
 * The heart: one plain, big red heart in washes and pen, the shape anyone
 * knows at a glance, lit from the upper left, with a soft gloss, hatching on
 * its shadow side and a thin dark line. `dead` is the same heart gone dark.
 */
const K = 2.9;
const TILT = -0.1;

/** About 100 art units across. */
export const HEART_W = 16 * K * 2;

export const HEART_SHAPE: readonly Pt[] = Array.from({ length: 96 }, (_, i) => {
  const a = (i / 96) * Math.PI * 2;
  const x = 16 * Math.sin(a) ** 3 * K;
  const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * K;
  return pt(x * Math.cos(TILT) - y * Math.sin(TILT), x * Math.sin(TILT) + y * Math.cos(TILT));
});

const STOPS = {
  live: { hot: '#ff6a52', red: '#e01f26', deep: '#7c0c16', line: '#2c060c', gloss: 0.55, hatch: '#4a0810' },
  dead: { hot: '#6a3236', red: '#4a1f26', deep: '#26101a', line: '#120608', gloss: 0.12, hatch: '#120608' },
} as const;

function drawHeart(d: Draw, pose: 'live' | 'dead'): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = STOPS[pose];
  pen.fill(HEART_SHAPE, PAPER_FILL, 1);
  pen.clipped(HEART_SHAPE, () => {
    const g = ctx.createRadialGradient(-16, -18, 4, 2, 4, 66);
    g.addColorStop(0, c.hot);
    g.addColorStop(0.42, c.red);
    g.addColorStop(1, c.deep);
    ctx.fillStyle = g;
    ctx.fillRect(-60, -60, 120, 120);
    glaze(ctx, 18, 20, 30, 22, 0.5, c.deep, 0.7);
    for (let i = 0; i < 34; i++) {
      const y = -16 + i * 2.1;
      pen.hair([pt(44 - i * 0.7, y), pt(8 + i * 0.5, y + 7)], 0.34, c.hatch, 0.5);
    }
    glaze(ctx, -21, -20, 13, 8, -0.55, PAPER_FILL, c.gloss);
    glaze(ctx, 21, -21, 7, 4, 0.4, PAPER_FILL, c.gloss * 0.55);
  });
  pen.stroke(closed(HEART_SHAPE), 1.15, c.line, 1, false);
}

export const HEART: SpriteArt<'live' | 'dead'> = { frame: 130, res: 7, poses: ['live', 'dead'], draw: drawHeart };
