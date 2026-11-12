import { bezier, C, FISH_TEX, PAPER_FILL, ring } from '../../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, Pen, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { LUNGFISH } from './big';

/**
 * The lungfish asleep in its dry-season mud cocoon: a lumpy, cracked ball of
 * dried mud with the fish's head peeking out of a hole on the right, eyes
 * shut. Drawn in a FISH_TEX square, centred, like a fish texture, with the
 * game's pen (so boil frames come from the seed, as the fish's do).
 */

/** Half width and half height of the mud ball in texture px, for framing (like a fish's hl/hh). */
export const COCOON = { hl: 80, hh: 46 } as const;

const MUD = '#7b5b3b';
const MUD_DARK = '#4a3522';
const MUD_DRY = '#c9ab82';

/** The ball's edge: lumps fixed by angle (the same on every boil frame), a flatter bottom where it sits. */
function rim(): Pt[] {
  const n = 64;
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const lump = 1 + 0.06 * Math.sin(a * 5 + 0.7) + 0.04 * Math.sin(a * 9 + 2.1) + 0.03 * Math.sin(a * 14 + 4);
    const y = Math.sin(a) * COCOON.hh * lump;
    return { x: C - 6 + Math.cos(a) * COCOON.hl * lump, y: C + (y > 0 ? y * 0.82 : y) };
  });
}

/** The lungfish's head, coming out of the hole to the right. */
function head(pen: Pen, awake: boolean): void {
  const hx = C + 66;
  const hy = C - 6;
  const shape = [
    ...bezier({ x: hx - 14, y: hy - 9 }, { x: hx + 6, y: hy - 12 }, { x: hx + 18, y: hy - 2 }, 10),
    ...bezier({ x: hx + 18, y: hy - 2 }, { x: hx + 21, y: hy + 4 }, { x: hx + 14, y: hy + 7 }, 6),
    ...bezier({ x: hx + 14, y: hy + 7 }, { x: hx, y: hy + 11 }, { x: hx - 14, y: hy + 9 }, 8),
  ];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, LUNGFISH.wash, 0.4);
  pen.clipped(shape, () => {
    for (let i = 0; i < 6; i++) pen.fill(ellipse(hx - 8 + pen.rng() * 20, hy - 6 + pen.rng() * 12, 2.4, 1.6, 8), '#3e3426', 0.35);
    pen.stipple(shape, 300, (_x, y) => (y < hy ? 0.5 : 0.15), 0.45, INK);
    pen.hair(bezier({ x: hx - 12, y: hy + 6 }, { x: hx + 2, y: hy + 9 }, { x: hx + 14, y: hy + 5 }, 6), 0.5, INK, 0.4);
  });
  pen.stroke(shape, 1.5, INK, 1, false);
  // A long, closed-lipped mouth and a sleepy eye.
  pen.stroke(bezier({ x: hx + 19, y: hy + 2 }, { x: hx + 12, y: hy + 4.5 }, { x: hx + 4, y: hy + 3.5 }, 6), 0.9, INK, 1, false);
  const ex = hx + 7;
  const ey = hy - 4;
  if (awake) {
    pen.fill(ellipse(ex, ey, 2.6, 2.6, 12), PAPER_FILL, 1);
    pen.hair(ring(ex, ey, 2.6, 2.6, 12), 0.7, INK, 1);
    pen.dot(ex + 0.4, ey, 1.2, INK);
  } else {
    pen.stroke(bezier({ x: ex - 3, y: ey - 0.5 }, { x: ex, y: ey + 1.8 }, { x: ex + 3, y: ey - 0.5 }, 6), 0.9, INK, 1, false);
    for (const dx of [-2, 0, 2]) pen.hair([{ x: ex + dx, y: ey + 1.2 }, { x: ex + dx * 1.3, y: ey + 2.8 }], 0.4, INK, 0.7);
  }
  pen.dot(hx + 16, hy - 3, 0.7, INK, 0.8);
}

/** Cracks over the dry crust: a few branching hairlines, fixed in place (the pen only boils them). */
function cracks(pen: Pen): void {
  const roots: readonly (readonly [number, number, number])[] = [[-40, -20, 0.9], [-10, -34, 1.3], [22, -26, 0.4], [-52, 10, -0.2], [8, 4, 2.4], [40, 18, -0.6]];
  for (const [dx, dy, ang] of roots) {
    let p = { x: C + dx, y: C + dy };
    let a = ang;
    const pts = [p];
    for (let i = 0; i < 4; i++) {
      a += Math.sin(dx * 0.3 + i * 1.7) * 0.7;
      p = { x: p.x + Math.cos(a) * 7, y: p.y + Math.sin(a) * 5 };
      pts.push(p);
      if (i === 1) pen.hair([p, { x: p.x + Math.cos(a + 1.2) * 6, y: p.y + Math.sin(a + 1.2) * 4 }], 0.5, MUD_DARK, 0.8);
    }
    pen.hair(pts, 0.7, MUD_DARK, 0.85);
  }
}

/** One boil frame of the cocoon, in a FISH_TEX square (scale the context to draw it bigger). `awake` opens the eye. */
export function drawCocoon(ctx: CanvasRenderingContext2D, seed: number, opts: { readonly awake?: boolean } = {}): void {
  const pen = new Pen(ctx, seed, 0.55);
  const ball = rim();
  pen.fill(ball, PAPER_FILL, 1);
  pen.fill(ball, MUD, 0.62);
  pen.clipped(ball, () => {
    // Darker underneath, dry and pale on top, a gritty stipple all over.
    pen.fill(ellipse(C - 6, C + 40, COCOON.hl * 1.1, 34, 20), MUD_DARK, 0.45);
    pen.fill(ellipse(C - 16, C - 34, COCOON.hl * 0.75, 18, 20), MUD_DRY, 0.45);
    for (let i = 0; i < 40; i++) {
      const a = pen.rng() * Math.PI * 2;
      const r = pen.rng() * 0.9;
      pen.fill(ellipse(C - 6 + Math.cos(a) * COCOON.hl * r, C + Math.sin(a) * COCOON.hh * r, 2 + pen.rng() * 4, 1.5 + pen.rng() * 2.5, 8), pen.rng() < 0.5 ? MUD_DARK : MUD_DRY, 0.25);
    }
    pen.stipple(ball, 2400, (_x, y) => (y > C ? 0.6 : 0.3), 0.5, INK);
    // Contour hatching round the belly of the ball.
    for (let r = 1; r <= 6; r++) {
      const arc: Pt[] = [];
      for (let a = 0.15; a <= Math.PI - 0.15; a += 0.1) arc.push({ x: C - 6 + Math.cos(a) * (COCOON.hl - r * 3), y: C + Math.sin(a) * (COCOON.hh * 0.82 - r * 3.2) });
      pen.hair(arc, 0.55, INK, 0.5 - r * 0.05);
    }
    cracks(pen);
    // The dark hole the head comes out of.
    pen.fill(ellipse(C + 60, C - 6, 16, 21, 16), '#21170e', 0.88);
  });
  pen.stroke(ball, 2.1, INK);
  // The head on top, a size up about its neck so it reads at a glance.
  ctx.save();
  ctx.translate(C + 56, C - 6);
  ctx.scale(1.4, 1.4);
  ctx.translate(-(C + 56), -(C - 6));
  head(pen, opts.awake ?? false);
  ctx.restore();
  // The crumbly mud lip over its neck.
  const lip = [...bezier({ x: C + 50, y: C - 27 }, { x: C + 61, y: C - 6 }, { x: C + 50, y: C + 15 }, 10)];
  const lipShape = [...lip, ...[...lip].reverse().map((p) => ({ x: p.x - 9, y: p.y }))];
  pen.fill(lipShape, PAPER_FILL, 1);
  pen.fill(lipShape, MUD, 0.62);
  pen.stipple(lipShape, 120, () => 0.5, 0.5, INK);
  pen.stroke(lip, 2.2, INK, 1, false);
}

/** Boil frames of the cocoon, FISH_TEX * res square, like dev/promo/sprites.ts makeSprite (the same frame seeds). */
export function makeCocoon(res = 4, opts: { readonly awake?: boolean } = {}): { readonly frames: readonly HTMLCanvasElement[]; readonly res: number } {
  const side = FISH_TEX * res;
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(side, side);
    ctx.scale(res, res);
    drawCocoon(ctx, 101 + f * 977, opts);
    return canvas;
  });
  return { frames, res };
}
