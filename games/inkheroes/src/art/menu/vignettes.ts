import { createRng } from '../../logic/rng';
import { pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { VIGNETTE, type VignetteId } from './types';
import { paintAshford, paintBlackBanner, paintThornwood } from './vignetteScenes';
import { onLayer, rgba, soft } from './vistaKit';

/**
 * The maps' vignettes: a small painted scene of each, set into its card
 * like a watercolour sketch on the page: the scene fades out through a
 * soft, ragged oval where the wash ran thin, a darker tide line of pigment
 * just inside the edge, the cream paper (#f3ecd9) showing round it.
 */
const { w: W, h: H } = VIGNETTE;

const SCENES: Readonly<Record<VignetteId, (ctx: CanvasRenderingContext2D, seed: number) => void>> = {
  ashford: paintAshford,
  thornwood: paintThornwood,
  blackBanner: paintBlackBanner,
};

/** A ragged oval inside the frame: an ellipse with slow swells and a fine tremble, like a wash's dried edge. */
function raggedOval(seed: number, inset: number): Pt[] {
  const rng = createRng(seed);
  const ph = [rng() * TAU, rng() * TAU, rng() * TAU];
  const rx = W / 2 - inset;
  const ry = H / 2 - inset;
  return Array.from({ length: 120 }, (_, i) => {
    const a = (i / 120) * TAU;
    // A squarer oval than an ellipse, so the scene fills the card.
    const c = Math.cos(a);
    const s = Math.sin(a);
    const sq = 1 / Math.pow(Math.abs(c) ** 3.2 + Math.abs(s) ** 3.2, 1 / 3.2);
    const k = 1 + 0.035 * Math.sin(a * 3 + ph[0]!) + 0.025 * Math.sin(a * 7 + ph[1]!) + 0.012 * Math.sin(a * 19 + ph[2]!) + (rng() - 0.5) * 0.012;
    return pt(W / 2 + c * sq * rx * k, H / 2 + s * sq * ry * k);
  });
}

function fill(ctx: CanvasRenderingContext2D, shape: readonly Pt[]): void {
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

export function drawVignette(ctx: CanvasRenderingContext2D, id: VignetteId, seed: number): void {
  const edge = raggedOval(seed * 31 + 7, 7);
  onLayer(ctx, (c) => {
    c.save();
    c.beginPath();
    c.rect(0, 0, W, H);
    c.clip();
    SCENES[id](c, seed);
    c.restore();
  }, (c) => {
    // The tide line: pigment pooled where the wash dried at its edge.
    c.save();
    c.globalCompositeOperation = 'source-atop';
    soft(c, 1.6, () => {
      c.strokeStyle = rgba('#2a2c48', 0.32);
      c.lineWidth = 3;
      c.beginPath();
      edge.forEach((p, i) => (i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y)));
      c.closePath();
      c.stroke();
    });
    c.restore();
    // The wash runs thin past the edge: keep the inside, feather it out.
    c.globalCompositeOperation = 'destination-in';
    soft(c, 2.2, () => {
      c.fillStyle = '#000';
      fill(c, edge);
    });
  });
}
