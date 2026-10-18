import { makeDraw, pt, type Draw } from '../../../src/art/kit';
import { mix, rgba, soft } from '../../../src/art/paint';
import { BOIL, INK } from '../../../src/art/palette';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { createRng, type Rng } from '../../../src/logic/rng';
import { VIDEO } from '../short';

/**
 * The two skies, painted once per boil frame at video size: the heavy
 * world (a dark, low, heavy sky over a flat plain; under three times our
 * gravity mountains stay low, so the horizon is a few worn-down mesas and a
 * dim sun smouldering behind a cloud deck), and Earth at dusk for the
 * elephant (blue sky, a warm horizon, savanna grass, an acacia).
 */
export const HORIZON = 880;
const W = VIDEO.width;
const H = VIDEO.height;

interface Sky {
  readonly top: string;
  readonly mid: string;
  readonly low: string;
  readonly glow: string;
  readonly ground: string;
  readonly deep: string;
  readonly hills: string;
}
const HEAVY: Sky = { top: '#0c0b1a', mid: '#1b1630', low: '#3a2836', glow: '#9a5a3c', ground: '#2c2530', deep: '#141119', hills: '#2a2030' };
const EARTH: Sky = { top: '#1a2a52', mid: '#3d5786', low: '#a9a6b4', glow: '#f0c58c', ground: '#3a3a2a', deep: '#1c1d16', hills: '#40466a' };

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

function skyWash(ctx: CanvasRenderingContext2D, s: Sky, rng: Rng, heavy: boolean): void {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, s.top);
  g.addColorStop(0.5, s.mid);
  g.addColorStop(0.88, s.low);
  g.addColorStop(1, s.glow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON + 2);
  // The sun low behind the haze, lighting the horizon from the right.
  blotch(ctx, 760, HORIZON - 30, 620, 260, s.glow, heavy ? 0.42 : 0.5);
  blotch(ctx, 760, HORIZON - 10, 200, 70, mix(s.glow, '#fff2d8', 0.5), heavy ? 0.5 : 0.6);
  // Heavy cloud: long flat bands pressed low, darker on top, lit underneath.
  for (let i = 0; i < (heavy ? 14 : 7); i++) {
    const y = 260 + rng() * (HORIZON - 380);
    const x = rng() * W;
    const rx = 260 + rng() * 420;
    blotch(ctx, x, y, rx, 26 + rng() * 30, heavy ? '#07060f' : '#2a3a66', heavy ? 0.55 : 0.35);
    blotch(ctx, x + 40, y + 22, rx * 0.8, 10, mix(s.glow, s.low, 0.4), heavy ? 0.16 : 0.25);
  }
  for (let i = 0; i < 9000; i++) {
    const y = rng() * HORIZON;
    ctx.globalAlpha = 0.04 + rng() * 0.06;
    ctx.fillStyle = rng() < 0.6 ? '#05040c' : '#c8b8b0';
    ctx.fillRect(rng() * W, y, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;
}

/** Low worn hills along the horizon, two ranges in aerial perspective, inked lightly. */
function hills(d: Draw, s: Sky, rng: Rng, heavy: boolean): void {
  for (const [far, k] of [[true, 0.55], [false, 1]] as const) {
    const pts: Pt[] = [pt(-20, HORIZON + 4)];
    let x = -20;
    while (x < W + 40) {
      const w = 120 + rng() * 260;
      const h = (heavy ? 18 + rng() * 34 : 30 + rng() * 70) * k;
      pts.push(pt(x + w * 0.2, HORIZON - h * 0.9), pt(x + w * 0.5, HORIZON - h), pt(x + w * 0.8, HORIZON - h * 0.85));
      x += w;
    }
    pts.push(pt(W + 40, HORIZON + 4));
    const color = far ? mix(s.hills, s.low, 0.45) : s.hills;
    soft(d.pen.ctx, far ? 2 : 0.6, () => d.pen.fill(pts, color, 0.95));
    d.pen.stroke(pts.slice(1, -1), far ? 1.2 : 1.8, INK, far ? 0.25 : 0.45, false);
  }
}

function groundWash(d: Draw, s: Sky, rng: Rng, heavy: boolean): void {
  const ctx = d.pen.ctx;
  const g = ctx.createLinearGradient(0, HORIZON, 0, H);
  g.addColorStop(0, mix(s.ground, s.glow, 0.25));
  g.addColorStop(0.12, s.ground);
  g.addColorStop(1, s.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);
  // Pigment lying unevenly, and long flat strata lines in perspective.
  for (let i = 0; i < 40; i++) blotch(ctx, rng() * W, HORIZON + 40 + rng() * 1000, 120 + rng() * 260, 18 + rng() * 30, rng() < 0.5 ? s.deep : mix(s.ground, s.glow, 0.3), 0.35);
  for (let i = 0; i < 26; i++) {
    const y = HORIZON + Math.pow(rng(), 1.6) * (H - HORIZON);
    const x = rng() * W;
    const len = 60 + (y - HORIZON) * (0.3 + rng() * 0.5);
    d.pen.hair([pt(x - len / 2, y), pt(x, y + rng() * 3), pt(x + len / 2, y + 1)], 1 + (y - HORIZON) / 500, INK, 0.3);
  }
  if (heavy) pebbles(d, s, rng);
  else grass(d, s, rng);
}

/** Pebbles pressed flat: in heavy gravity loose stuff lies low. */
function pebbles(d: Draw, s: Sky, rng: Rng): void {
  for (let i = 0; i < 26; i++) {
    const y = HORIZON + 20 + Math.pow(rng(), 1.3) * (H - HORIZON - 20);
    const r = 3 + ((y - HORIZON) / (H - HORIZON)) * 16 * (0.5 + rng());
    const x = rng() * W;
    const shape = Array.from({ length: 9 }, (_, k) => pt(x + Math.cos((k / 9) * Math.PI * 2) * r, y + Math.sin((k / 9) * Math.PI * 2) * r * 0.32));
    d.pen.fill(shape, mix(s.ground, '#6a5c58', 0.5), 0.9);
    d.pen.fill(shape.map((p) => pt(p.x - r * 0.15, p.y - r * 0.08)), mix(s.glow, '#a89080', 0.5), 0.14);
    d.pen.stroke([...shape, shape[0]!], 0.8 + r / 14, INK, 0.5);
  }
}

/** Dry savanna grass in tufts, and a far acacia. */
function grass(d: Draw, s: Sky, rng: Rng): void {
  for (let i = 0; i < 90; i++) {
    const y = HORIZON + 10 + Math.pow(rng(), 1.4) * (H - HORIZON - 10);
    const k = 0.4 + ((y - HORIZON) / (H - HORIZON)) * 2.2;
    const x = rng() * W;
    for (let b = 0; b < 5; b++) {
      const lean = (b - 2) * 3 * k + (rng() - 0.5) * 4;
      d.pen.hair([pt(x + b * 2 * k, y), pt(x + b * 2 * k + lean * 0.6, y - 9 * k), pt(x + b * 2 * k + lean, y - 16 * k)], 0.9 * k, mix(s.ground, '#c9b27a', 0.55), 0.8);
    }
  }
  const tree = pt(150, HORIZON - 4);
  d.pen.stroke([tree, pt(tree.x + 4, tree.y - 50), pt(tree.x - 6, tree.y - 82)], 4, '#1a1c22', 0.9, false);
  d.pen.stroke([pt(tree.x + 3, tree.y - 52), pt(tree.x + 30, tree.y - 84)], 3, '#1a1c22', 0.9, false);
  for (const [cx, w] of [[tree.x - 10, 60], [tree.x + 34, 52]] as const) d.pen.fill(Array.from({ length: 12 }, (_, k) => pt(cx + Math.cos((k / 12) * Math.PI * 2) * w, tree.y - 92 + Math.sin((k / 12) * Math.PI * 2) * 12)), '#1a1c22', 0.92);
  // The moon, early.
  d.pen.fill(Array.from({ length: 24 }, (_, k) => pt(820 + Math.cos((k / 24) * Math.PI * 2) * 30, 420 + Math.sin((k / 24) * Math.PI * 2) * 30)), '#f5ecd6', 0.92);
  blotch(d.pen.ctx, 820, 420, 110, 110, '#f5ecd6', 0.18);
}

function paintSky(s: Sky, heavy: boolean, f: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  const d = makeDraw(ctx, (heavy ? 5100 : 5200) + f, f, 0);
  skyWash(ctx, s, createRng(heavy ? 31 : 37), heavy);
  hills(d, s, createRng(heavy ? 41 : 43), heavy);
  groundWash(d, s, createRng(heavy ? 51 : 53), heavy);
  return canvas;
}

export interface Backdrops {
  readonly heavy: readonly HTMLCanvasElement[];
  readonly earth: readonly HTMLCanvasElement[];
}
export function makeBackdrops(): Backdrops {
  const frames = Array.from({ length: BOIL }, (_, f) => f);
  return { heavy: frames.map((f) => paintSky(HEAVY, true, f)), earth: frames.map((f) => paintSky(EARTH, false, f)) };
}

/** The backdrop, shaken with the picture (drawn a little oversize so its edges never show), Earth's faded in by `earth`. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, b: Backdrops, boil: number, earth: number, shake: Pt): void {
  const pad = 34;
  const draw = (c: HTMLCanvasElement, alpha: number): void => {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(c, -pad + shake.x, -pad + shake.y, W + pad * 2, H + pad * 2);
  };
  draw(b.heavy[boil % BOIL]!, 1);
  draw(b.earth[boil % BOIL]!, earth);
  ctx.globalAlpha = 1;
}
