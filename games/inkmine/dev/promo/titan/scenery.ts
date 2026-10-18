import { makeDraw, oval, pt } from '../../../src/art/kit';
import { mix, rgba, SHADOW } from '../../../src/art/paint';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { createRng, type Rng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { HAZE_PERIOD } from './story';

/**
 * Titan, painted: thick orange nitrogen haze that hides the sky (and
 * Saturn), darker overhead; a lake of liquid methane and ethane, mirror
 * smooth and nearly black close to, holding the haze's glow along its far
 * edge, low dark hills across it; and a shore of rounded water-ice cobbles
 * stained by the haze's tholins. Baked once as watercolour washes with pen
 * marks, then laid down each frame where the camera puts them.
 */
const W = VIDEO.width;
const H = VIDEO.height;
export const HAZE_TOP = '#22120b';
export const HAZE_MID = '#6a3414';
export const HAZE_GLOW = '#c27a38';
export const LAKE_DEEP = '#0d0908';

/** A soft round blotch of pigment. */
function blotch(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/** Paper grain over a wash. */
function granulate(ctx: CanvasRenderingContext2D, rng: Rng, w: number, h: number, n: number, dark: string, light: string): void {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.04 + rng() * 0.08;
    ctx.fillStyle = rng() < 0.6 ? dark : light;
    ctx.fillRect(rng() * w, rng() * h, 1.6, 1.6);
  }
  ctx.globalAlpha = 1;
}

/** The haze filling the frame: dark umber overhead, warming to a glow low down, pigment pooled unevenly. */
export function bakeSky(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  const rng = createRng(61);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, HAZE_TOP);
  g.addColorStop(0.3, '#4a230f');
  g.addColorStop(0.5, HAZE_MID);
  g.addColorStop(0.62, '#9a5622');
  g.addColorStop(0.75, HAZE_GLOW);
  g.addColorStop(1, '#8f4f22');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // The sun's light, faint and spread wide through the haze, upper left.
  blotch(ctx, 180, 380, 620, 520, '#d58a44', 0.32);
  for (let i = 0; i < 46; i++) {
    const y = rng() * H;
    const dark = rng() < 0.55;
    blotch(ctx, rng() * W, y, 90 + rng() * 260, 40 + rng() * 120, dark ? '#1c0e08' : '#e29a52', dark ? 0.22 : 0.14);
  }
  granulate(ctx, rng, W, H, 26000, '#140a06', '#f0c08a');
  return canvas;
}

/** Long soft streaks of thicker haze, tiling every HAZE_PERIOD px down, to scroll past as it climbs. */
export function bakeHazeBands(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, HAZE_PERIOD);
  const rng = createRng(83);
  for (let i = 0; i < 16; i++) {
    const y = rng() * HAZE_PERIOD;
    const lit = rng() < 0.55;
    for (const dy of [-HAZE_PERIOD, 0, HAZE_PERIOD]) {
      blotch(ctx, rng() * W, y + dy, 380 + rng() * 520, 26 + rng() * 60, lit ? '#f0b26a' : '#2a140a', lit ? 0.3 : 0.28);
    }
  }
  return canvas;
}

/** How far the lake canvas reaches above the horizon (the far hills). */
export const LAKE_HEADROOM = 70;
const LAKE_H = 1560;

/** Low dark hills across the lake, flattened by the haze. */
function farShore(ctx: CanvasRenderingContext2D, rng: Rng, horizon: number): void {
  const crest: Pt[] = [];
  for (let x = -20; x <= W + 20; x += 24) {
    const hill = 18 + 22 * Math.sin(x * 0.006 + 1.3) + 14 * Math.sin(x * 0.017) + rng() * 5;
    crest.push(pt(x, horizon - Math.max(4, hill)));
  }
  const shape = [...crest, pt(W + 20, horizon + 3), pt(-20, horizon + 3)];
  const d = makeDraw(ctx, 9, 0, 0);
  d.pen.fill(shape, '#5c3018', 0.85);
  d.pen.stroke(crest, 1.6, mix('#5c3018', SHADOW, 0.5), 0.5, false);
}

/** The lake from its horizon down: the haze's glow mirrored far off, near-black close to, slow swells and dim glints. */
export function bakeLake(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, LAKE_H + LAKE_HEADROOM);
  const rng = createRng(97);
  const top = LAKE_HEADROOM;
  const at = (px: number): number => Math.min(1, px / LAKE_H);
  const g = ctx.createLinearGradient(0, top, 0, top + LAKE_H);
  g.addColorStop(0, '#d08a48');
  g.addColorStop(at(26), '#8a4a20');
  g.addColorStop(at(120), '#3a1f12');
  g.addColorStop(at(360), '#1a0f0b');
  g.addColorStop(1, LAKE_DEEP);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, LAKE_H);
  // Long streaks: the haze mirrored where a breath of wind dulls the surface, darker calm lanes between.
  for (let i = 0; i < 60; i++) {
    const depth = rng() ** 1.5;
    const y = top + 6 + depth * (LAKE_H - 10);
    const len = 160 + rng() * 520;
    blotch(ctx, rng() * W, y, len, 2 + depth * 22, rng() < 0.45 ? '#c07038' : '#050303', 0.12 + 0.12 * (1 - depth));
  }
  granulate(ctx, rng, W, LAKE_H + top, 12000, '#000000', '#c88a50');
  farShore(ctx, rng, top);
  // The bright sheen along the far edge.
  const sheen = ctx.createLinearGradient(0, top - 1, 0, top + 10);
  sheen.addColorStop(0, rgba('#f4c48a', 0.8));
  sheen.addColorStop(1, rgba('#f4c48a', 0));
  ctx.fillStyle = sheen;
  ctx.fillRect(0, top - 1, W, 11);
  // Pen ripple marks, sparse: the lake is nearly glass.
  for (let i = 0; i < 60; i++) {
    const depth = 0.05 + rng() * 0.95;
    const y = top + depth ** 1.4 * LAKE_H;
    const x = rng() * W;
    const len = 10 + depth * 60;
    makeDraw(ctx, 300 + i, 0, 0).pen.hair([pt(x - len / 2, y), pt(x, y - 1.5), pt(x + len / 2, y)], 1 + depth, '#e3a668', 0.12 + 0.12 * (1 - depth));
  }
  return canvas;
}

/** One cobble: its wash, lit from the upper left, dark under, a fine broken pen line, a shadow on the sand. */
function cobble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, tone: number, depth: number): void {
  const ry = r * (0.45 + 0.15 * depth);
  const wash = mix('#7a6656', '#b0703e', tone);
  const rng = createRng(1000 + Math.floor(x * 7 + y));
  // Lumpy, not a perfect oval: worn cobbles.
  const shape = oval(x, y, r, ry, 18).map((p) => {
    const k = 0.86 + rng() * 0.22;
    return pt(x + (p.x - x) * k, y + (p.y - y) * k + (p.y < y ? -ry * 0.12 : 0));
  });
  const d = makeDraw(ctx, 1000 + Math.floor(x * 7 + y), 0, 0);
  d.pen.fill(oval(x + r * 0.2, y + ry * 0.55, r * 1.05, ry * 0.55, 14), '#0c0603', 0.45);
  d.pen.fill(shape, wash, 0.95);
  d.pen.clipped(shape, () => {
    const g = ctx.createRadialGradient(x - r * 0.35, y - ry * 0.45, 0, x, y, r * 1.1);
    g.addColorStop(0, rgba('#f2c48e', 0.55));
    g.addColorStop(0.55, rgba('#f2c48e', 0));
    g.addColorStop(1, rgba('#1a0c06', 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - ry, r * 2, ry * 2);
  });
  d.pen.stroke([...shape.slice(4, 16)], 0.8 + depth * 1.2, '#1c0f08', 0.55, false);
}

/** The shore at the lake's edge: wet dark sand and rounded water-ice cobbles, bigger nearer. */
export function bakeShore(): HTMLCanvasElement {
  const SH = 900;
  const { canvas, ctx } = makeCanvas(W, SH);
  const rng = createRng(131);
  const g = ctx.createLinearGradient(0, 0, 0, SH);
  g.addColorStop(0, '#5a3420');
  g.addColorStop(0.15, '#4a2a18');
  g.addColorStop(1, '#2a170e');
  ctx.fillStyle = g;
  const edge = Array.from({ length: 46 }, (_, i) => pt(i * 24 - 12, 4 * Math.sin(i * 0.9) + rng() * 4));
  const ground = [...edge, pt(W + 12, SH), pt(-12, SH)];
  ctx.beginPath();
  ground.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  const d = makeDraw(ctx, 140, 0, 0);
  d.pen.stroke(edge, 2.4, '#1c0f08', 0.7, false);
  // A lap of methane at the edge, glinting.
  d.pen.stroke(edge.map((p) => pt(p.x, p.y + 3)), 1.4, '#e2a468', 0.4, false);
  // Patches of darker wet sand and lighter grit.
  for (let i = 0; i < 40; i++) blotch(ctx, rng() * W, 20 + rng() * SH, 120 + rng() * 200, 20 + rng() * 40, rng() < 0.5 ? '#1a0d06' : '#8a5a34', 0.25);
  // Cobbles of water ice, rounded by the methane, stained with the haze's tholins: far ones small, near ones big.
  const stones = Array.from({ length: 160 }, () => {
    const depth = rng() ** 0.9;
    return { x: rng() * W, y: 14 + depth * (SH - 40), r: (5 + depth * 30) * (0.5 + rng() * 0.9), tone: rng(), depth };
  }).sort((a, b) => a.y - b.y);
  for (const s of stones) cobble(ctx, s.x, s.y, s.r, s.tone, s.depth);
  granulate(ctx, rng, W, SH, 8000, '#0c0603', '#e0a870');
  return canvas;
}
