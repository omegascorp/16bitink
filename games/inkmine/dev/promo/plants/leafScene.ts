import { createRng } from '../../../src/logic/rng';
import { rgba } from '../../../src/art/paint';
import { pathOf, type Pt } from '../../../src/art/pen';
import { drawSprite, type Sprite } from '../sprites';
import { bakeBlack } from './blackPaint';
import { BIG_LEAF_ART, bigLeafShape, drawBigLeaf } from './flora';
import { drawRay } from './rays';
import { deepAt, glintAt, LEAF, leafRays, leafSceneAt, RAY_COLOURS, sinkAt, wave } from './story';

/**
 * "A plant there would soak up EVERY colour of light it gets… and look
 * pitch black": one black leaf, close, under the red sun's glow; rays of
 * every colour fall on it and sink in, each leaving a brief bloom of its
 * colour where it went in; then a slow violet glint sweeps the leaf as it
 * settles to pitch black. Quiet, tender.
 */
/** Units from the leaf's stalk to the middle of its blade. */
const BLADE_MID = 70.5;
const SCALE = LEAF.length / 136;

interface Bokeh {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly c: string;
  readonly k: number;
}
const BOKEH: readonly Bokeh[] = (() => {
  const rng = createRng(88);
  return Array.from({ length: 16 }, () => ({ x: rng() * 1080, y: 200 + rng() * 1100, r: 30 + rng() * 70, c: rng() < 0.7 ? '#a52a1c' : '#5a3d8a', k: 1 + Math.floor(rng() * 3) }));
})();

export interface LeafScene {
  draw(ctx: CanvasRenderingContext2D, t: number, boil: number): void;
}

/** Where on screen a point of the leaf's drawing lands. */
function placeOf(angle: number): (p: Pt) => Pt {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const ox = LEAF.x - c * BLADE_MID * SCALE;
  const oy = LEAF.y - s * BLADE_MID * SCALE;
  return (p) => ({ x: ox + (p.x * c - p.y * s) * SCALE, y: oy + (p.x * s + p.y * c) * SCALE });
}

function backdrop(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.fillStyle = '#07050c';
  ctx.fillRect(0, 0, 1080, 1920);
  const g = ctx.createRadialGradient(540, -260, 100, 540, -260, 1500);
  g.addColorStop(0, 'rgba(190, 52, 30, 0.75)');
  g.addColorStop(0.5, 'rgba(110, 24, 20, 0.35)');
  g.addColorStop(1, 'rgba(20, 6, 12, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, 1920);
  for (const b of BOKEH) {
    const y = b.y + 14 * wave(t, b.k, b.x);
    const r = ctx.createRadialGradient(b.x, y, 0, b.x, y, b.r);
    r.addColorStop(0, rgba(b.c, 0.16));
    r.addColorStop(0.8, rgba(b.c, 0.08));
    r.addColorStop(1, rgba(b.c, 0));
    ctx.fillStyle = r;
    ctx.fillRect(b.x - b.r, y - b.r, b.r * 2, b.r * 2);
  }
}

/** Light sinking in where each ray lands: a bloom of its colour that spreads and fades into the black. */
function sinks(ctx: CanvasRenderingContext2D, t: number, shape: readonly Pt[]): void {
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  leafRays(t).forEach((r, i) => {
    const u = sinkAt(i, t);
    if (u <= 0 || u >= 1) return;
    const rad = 40 + 150 * u;
    const g = ctx.createRadialGradient(r.hx, r.hy, 0, r.hx, r.hy, rad);
    g.addColorStop(0, rgba(RAY_COLOURS[i]!, 0.5 * (1 - u) ** 1.5));
    g.addColorStop(1, rgba(RAY_COLOURS[i]!, 0));
    ctx.fillStyle = g;
    ctx.fillRect(r.hx - rad, r.hy - rad, rad * 2, rad * 2);
  });
  ctx.restore();
}

/** "pitch black": the leaf deepening, and a violet glint sweeping along it. */
function settle(ctx: CanvasRenderingContext2D, t: number, shape: readonly Pt[], at: (p: Pt) => Pt): void {
  const deep = deepAt(t);
  const glint = glintAt(t);
  if (deep <= 0) return;
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  ctx.globalAlpha = 0.35 * deep;
  ctx.fillStyle = '#020104';
  ctx.fillRect(0, 0, 1080, 1920);
  if (glint > 0 && glint < 1) {
    const p = at({ x: -10 + glint * 160, y: 0 });
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 170);
    g.addColorStop(0, 'rgba(150, 110, 230, 0.28)');
    g.addColorStop(1, 'rgba(150, 110, 230, 0)');
    ctx.globalAlpha = Math.sin(Math.PI * glint);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(p.x - 170, p.y - 170, 340, 340);
  }
  ctx.restore();
}

export function makeLeafScene(): LeafScene {
  const leaf: Sprite = bakeBlack(BIG_LEAF_ART, 6, 6100, drawBigLeaf, { to: { x: 0.15, y: -1 }, alpha: 0.9, px: 6 * 1.2 });
  const outline = bigLeafShape();
  return {
    draw(ctx, t, boil): void {
      const a = leafSceneAt(t);
      if (a <= 0) return;
      const angle = LEAF.angle + 0.015 * wave(t, 5);
      const at = placeOf(angle);
      const shape = outline.map(at);
      ctx.save();
      ctx.globalAlpha = a;
      backdrop(ctx, t);
      for (const r of leafRays(t)) drawRay(ctx, r, 1, 1.15);
      const o = at({ x: 0, y: 0 });
      drawSprite(ctx, leaf, boil, { x: o.x, y: o.y, scale: SCALE, rotation: angle });
      sinks(ctx, t, shape);
      settle(ctx, t, shape, at);
      ctx.restore();
    },
  };
}
