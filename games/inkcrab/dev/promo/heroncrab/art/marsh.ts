import { makeCanvas, type Pt } from '../../../../src/art/pen';
import { seeded, spline } from '../../crabbird/art/paint';
import { dab, inkLine, softLine } from './ink';

/**
 * The salt marsh at low tide, painted once: a hazy sky, a far line of trees,
 * a band of cordgrass, then wide wet mud cut by shining channels of shallow
 * water. The wide shots use it sharp; the close-up uses a soft, out-of-focus
 * copy, so the heron's head and the crab stand out against it.
 */
export interface Backdrop {
  readonly canvas: HTMLCanvasElement;
  /** World box it covers. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

interface MarshSpec {
  readonly horizon: number;
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  /** Canvas px per world px (below 1 bakes it soft). */
  readonly res: number;
  readonly seed: number;
}

function paintSky(ctx: CanvasRenderingContext2D, s: MarshSpec): void {
  const { box, horizon } = s;
  const g = ctx.createLinearGradient(0, box.y, 0, horizon + 20);
  g.addColorStop(0, '#9fbcd0');
  g.addColorStop(0.55, '#cddbdc');
  g.addColorStop(0.9, '#efe6cf');
  g.addColorStop(1, '#f4e8c8');
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, horizon - box.y + 40);
  const rnd = seeded(s.seed);
  for (let i = 0; i < 9; i++) {
    const x = box.x + rnd() * box.w;
    const y = box.y + (horizon - box.y) * (0.2 + rnd() * 0.6);
    dab(ctx, x, y, 160 + rnd() * 220, '255,252,244', 0.5, 0.22);
  }
}

function paintFar(ctx: CanvasRenderingContext2D, s: MarshSpec): void {
  const { box, horizon } = s;
  const rnd = seeded(s.seed + 1);
  // A low, blue-green line of trees far off.
  const trees: Pt[] = [{ x: box.x, y: horizon + 10 }];
  for (let x = box.x; x <= box.x + box.w; x += 34) trees.push({ x, y: horizon - 8 - rnd() * 9 - (Math.sin(x * 0.006) + 1) * 4 });
  trees.push({ x: box.x + box.w, y: horizon + 10 });
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#71857b';
  ctx.beginPath();
  spline(trees, 4).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The cordgrass band: olive and gold, a stroke per tuft.
  const band = ctx.createLinearGradient(0, horizon - 6, 0, horizon + 96);
  band.addColorStop(0, '#b3ad6c');
  band.addColorStop(0.6, '#9a9558');
  band.addColorStop(1, '#7f7d4c');
  ctx.fillStyle = band;
  ctx.fillRect(box.x, horizon - 4, box.w, 100);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 1400; i++) {
    const x = box.x + rnd() * box.w;
    const y = horizon + rnd() * 96;
    const h = 8 + rnd() * 18 * (0.6 + (y - horizon) / 96);
    ctx.strokeStyle = ['#cbc17a', '#8b8a4e', '#6f7343', '#d9cf92'][Math.floor(rnd() * 4)]!;
    ctx.globalAlpha = 0.5 + rnd() * 0.4;
    ctx.lineWidth = 1.4 + rnd() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.4) * 5, y - h);
    ctx.stroke();
  }
  ctx.restore();
}

function paintMud(ctx: CanvasRenderingContext2D, s: MarshSpec): void {
  const { box, horizon } = s;
  const top = horizon + 92;
  const g = ctx.createLinearGradient(0, top, 0, box.y + box.h);
  g.addColorStop(0, '#9b8f78');
  g.addColorStop(0.3, '#857864');
  g.addColorStop(1, '#5f5446');
  ctx.fillStyle = g;
  ctx.fillRect(box.x, top, box.w, box.y + box.h - top);
  const rnd = seeded(s.seed + 2);
  // Channels of shallow water, shining with the sky, wider nearer.
  const depth = (y: number): number => (y - top) / (box.y + box.h - top);
  for (let i = 0; i < 16; i++) {
    const y = top + 10 + Math.pow(i / 15, 1.6) * (box.y + box.h - top - 40);
    const near = depth(y);
    const x0 = box.x + rnd() * box.w * 0.6 - 200;
    const len = 300 + rnd() * 900 * (0.5 + near);
    const pts = spline([{ x: x0, y }, { x: x0 + len * 0.3, y: y + (rnd() - 0.5) * 30 * (1 + near * 3) }, { x: x0 + len * 0.7, y: y + (rnd() - 0.5) * 30 * (1 + near * 3) }, { x: x0 + len, y: y + (rnd() - 0.5) * 20 }], 8);
    const w = 6 + 110 * near * (0.5 + rnd());
    // Broad soft sheen on the wet mud.
    softLine(ctx, pts, w * 2, '#a9bcc0', 0.26, 6);
    softLine(ctx, pts, w * 0.9, '#c9d7d8', 0.22, 5);
  }
  // Wet texture: small glints and dark pocks in the mud.
  for (let i = 0; i < 900; i++) {
    const y = top + Math.pow(rnd(), 0.8) * (box.y + box.h - top);
    const near = depth(y);
    const x = box.x + rnd() * box.w;
    const r = 1 + near * 5 * rnd();
    ctx.globalAlpha = 0.25 + 0.3 * rnd();
    ctx.fillStyle = rnd() < 0.4 ? '#e8eee8' : '#3f362c';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 2.2, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A clump of cordgrass at the near edge, its blades leaning. */
function paintTuft(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, seed: number): void {
  const rnd = seeded(seed);
  for (let i = 0; i < 26; i++) {
    const bx = x + (rnd() - 0.5) * h * 0.5;
    const lean = (rnd() - 0.5) * h * 0.5;
    const blade = [{ x: bx, y }, { x: bx + lean * 0.4, y: y - h * (0.5 + rnd() * 0.2) }, { x: bx + lean, y: y - h * (0.7 + rnd() * 0.4) }];
    softLine(ctx, blade, 7 + rnd() * 5, ['#8f8d4f', '#b9b06c', '#6b6f3e'][i % 3]!, 0.95, 3);
    inkLine(ctx, blade, 1, 0.35, 0);
  }
}

function bakeMarsh(s: MarshSpec, extra?: (ctx: CanvasRenderingContext2D) => void): Backdrop {
  const { canvas, ctx } = makeCanvas(Math.ceil(s.box.w * s.res), Math.ceil(s.box.h * s.res));
  ctx.scale(s.res, s.res);
  ctx.translate(-s.box.x, -s.box.y);
  paintSky(ctx, s);
  paintFar(ctx, s);
  paintMud(ctx, s);
  extra?.(ctx);
  return { canvas, ...s.box };
}

/** The wide marsh, world px (the rest camera shows x 0..1080, y 0..1920). */
export const makeWideMarsh = (): Backdrop => bakeMarsh({ horizon: 560, box: { x: -320, y: -320, w: 1840, h: 2720 }, res: 1, seed: 12 }, (ctx) => {
  paintTuft(ctx, -40, 1330, 300, 3);
  paintTuft(ctx, 40, 1420, 360, 4);
  paintTuft(ctx, 1120, 1380, 340, 5);
  paintTuft(ctx, 1240, 1120, 260, 6);
  paintTuft(ctx, -210, 1000, 220, 7);
});

/** The close-up's marsh, soft (baked small and drawn big). */
export const makeSoftMarsh = (): Backdrop => {
  const sharp = bakeMarsh({ horizon: 900, box: { x: -80, y: -80, w: 1240, h: 2500 }, res: 0.14, seed: 21 });
  // A second, slightly larger soft pass smooths the blockiness of the tiny bake.
  const { canvas, ctx } = makeCanvas(310, 625);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sharp.canvas, 0, 0, 310, 625);
  return { ...sharp, canvas };
};

export function drawBackdrop(ctx: CanvasRenderingContext2D, b: Backdrop): void {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(b.canvas, b.x, b.y, b.w, b.h);
  ctx.restore();
}

/** Shallow water over the feet (and the crab's legs): a see-through band with ripples, from `y` down. */
export function drawShallows(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, depth: number, t: number, seed: number): void {
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 20) edge.push({ x, y: y + 5 * Math.sin(x * 0.011 + t * 1.3 + seed) + 3 * Math.sin(x * 0.031 - t * 0.9) });
  const shape = [...edge, { x: x1, y: y + depth }, { x: x0, y: y + depth }];
  const g = ctx.createLinearGradient(0, y - 6, 0, y + depth);
  g.addColorStop(0, 'rgba(206,222,224,0.82)');
  g.addColorStop(0.3, 'rgba(164,184,186,0.66)');
  g.addColorStop(1, 'rgba(120,128,116,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const rnd = seeded(seed);
  for (let i = 0; i < 14; i++) {
    const yy = y + 10 + Math.pow(rnd(), 1.4) * depth * 0.6;
    const x = x0 + rnd() * (x1 - x0) + 30 * Math.sin(t * 0.8 + i);
    const w = 50 + rnd() * 150;
    softLine(ctx, [{ x: x - w / 2, y: yy }, { x: x + w / 2, y: yy + 2 }], 3 + 3 * rnd(), '#f6faf6', 0.45, 3);
  }
  softLine(ctx, edge, 7, '#ffffff', 0.55, 3);
}

/** Rings spreading on the water where something stands or lands, `u` 0 .. 1 over their life. */
export function drawRings(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, u: number, boil: number): void {
  if (u <= 0 || u >= 1) return;
  for (let i = 0; i < 3; i++) {
    const v = u - i * 0.18;
    if (v <= 0) continue;
    const rr = r * (0.3 + v * 1.3);
    const pts = Array.from({ length: 33 }, (_, k) => ({ x: x + Math.cos((k / 32) * Math.PI * 2) * rr, y: y + Math.sin((k / 32) * Math.PI * 2) * rr * 0.18 }));
    inkLine(ctx, pts, 2.2, (1 - v) * 0.6, boil, true, '#f8fbf8');
    inkLine(ctx, pts.map((p) => ({ x: p.x, y: p.y + 4 })), 1.2, (1 - v) * 0.4, boil, true);
  }
}
