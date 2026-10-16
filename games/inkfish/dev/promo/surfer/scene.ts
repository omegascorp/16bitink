import { INK, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { drawTextLine, type TextInk } from '../captions';
import { VIDEO } from '../short';
import { SEABED_Y, SURFACE_Y } from './story';

/**
 * The view from below: the bright surface overhead with the sun's rays
 * coming down through it, the blue deepening towards a sandy seabed, the
 * scientists' camera on the bottom, and the marks written over it all
 * (sight lines, the shark's view, the "=", the ring round its eye).
 */

export const RED = '#c8452c';
export const RED_ON_PAPER: TextInk = { fill: RED, halo: PAPER };
const SAND = '#d8c69a';
const HOUSING = '#e9e2cf';

const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 31 + boil * 977, 1.2);

/** Paper, bright and warm above the surface (the sky seen through it), blue below, deepening down to the sand. */
export function makeSea(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
  sky.addColorStop(0, 'rgba(160,205,230,0.30)');
  sky.addColorStop(1, 'rgba(255,248,225,0.55)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, SURFACE_Y);
  const sea = ctx.createLinearGradient(0, SURFACE_Y, 0, VIDEO.height);
  sea.addColorStop(0, 'rgba(90,170,215,0.16)');
  sea.addColorStop(0.45, 'rgba(40,110,170,0.34)');
  sea.addColorStop(1, 'rgba(18,60,110,0.55)');
  ctx.fillStyle = sea;
  ctx.fillRect(0, SURFACE_Y, VIDEO.width, VIDEO.height - SURFACE_Y);
  // The sand: lit where the rays reach it, shading off into the blue nearer to us.
  const sand = ctx.createLinearGradient(0, SEABED_Y, 0, VIDEO.height);
  sand.addColorStop(0, SAND);
  sand.addColorStop(1, '#7d8a8c');
  ctx.fillStyle = sand;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, SEABED_Y, VIDEO.width, VIDEO.height - SEABED_Y);
  return canvas;
}

/** The sun's rays fanning down from the surface, swaying `sways` whole times a loop (`loop` 0 .. 1). */
export function drawRays(ctx: CanvasRenderingContext2D, loop: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 7; k++) {
    const sway = 40 * Math.sin(2 * Math.PI * (loop * (1 + (k % 2)) + k * 0.37));
    const x = 60 + k * 160 + sway;
    const spread = 70 + 30 * Math.sin(k * 2.1);
    const g = ctx.createLinearGradient(0, SURFACE_Y, 0, SEABED_Y);
    g.addColorStop(0, 'rgba(255,250,225,0.16)');
    g.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 30, SURFACE_Y);
    ctx.lineTo(x + 30, SURFACE_Y);
    ctx.lineTo(x + spread + 120, SEABED_Y);
    ctx.lineTo(x - spread + 120, SEABED_Y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The surface's height at x: a slow swell rolling along (`loop` 0 .. 1), whole waves a loop. */
export const surfaceAt = (x: number, loop: number): number =>
  SURFACE_Y + 7 * Math.sin(x / 70 - 2 * Math.PI * 3 * loop) + 4 * Math.sin(x / 31 + 2 * Math.PI * 2 * loop);

/** The underside of the surface: a wobbly inked line, and light dancing on the ripples just above it. */
export function drawSurface(ctx: CanvasRenderingContext2D, loop: number, boil: number): void {
  const pen = penFor(ctx, 3, boil);
  const line: Pt[] = [];
  for (let x = -20; x <= VIDEO.width + 20; x += 24) line.push({ x, y: surfaceAt(x, loop) });
  pen.stroke(line, 3.2, INK, 0.85);
  pen.hair(line.map((p) => ({ x: p.x, y: p.y + 9 })), 1.4, INK, 0.25);
  // Ripples catching the sky: short arcs just over the line.
  const rng = createRng(77);
  for (let k = 0; k < 22; k++) {
    const x = rng() * VIDEO.width;
    const w = 18 + rng() * 30;
    const y = surfaceAt(x, loop) - 10 - rng() * 70;
    pen.hair([{ x: x - w / 2, y: y + 3 }, { x, y }, { x: x + w / 2, y: y + 3 }], 1.4, '#5a8fb0', 0.45);
  }
}

/** The sandy bottom: a soft inked edge, a few ripples in the sand, stones and a tuft of weed. */
export function drawSeabed(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = penFor(ctx, 5, boil);
  const edge: Pt[] = [];
  for (let x = -20; x <= VIDEO.width + 20; x += 30) edge.push({ x, y: SEABED_Y + 8 * Math.sin(x / 140) + 4 * Math.sin(x / 47) });
  pen.stroke(edge, 3, INK, 0.75);
  const rng = createRng(31);
  for (let k = 0; k < 9; k++) {
    const x = 80 + rng() * 920;
    const y = SEABED_Y + 40 + rng() * 120;
    pen.hair([{ x: x - 40, y }, { x, y: y - 6 }, { x: x + 40, y }], 1.5, '#8a7650', 0.6);
  }
  for (const s of [{ x: 360, r: 22 }, { x: 395, r: 14 }, { x: 930, r: 26 }]) {
    const pts = Array.from({ length: 12 }, (_, i) => ({ x: s.x + Math.cos((i / 12) * Math.PI) * s.r * 1.3, y: SEABED_Y + 6 - Math.sin((i / 12) * Math.PI) * s.r }));
    pen.fill(pts, '#9a9183', 0.9);
    pen.stroke(pts, 2.4, INK, 0.9);
  }
}

/**
 * The scientists' camera: a boxy underwater housing on a short tripod,
 * its lens tipped up at the surface, a red light while it records. It rises
 * up out of the sand as it comes in (`shown` 0 .. 1).
 */
export function drawCamera(ctx: CanvasRenderingContext2D, at: Pt, shown: number, rec: boolean, boil: number): Pt {
  const lens = { x: at.x + 58, y: at.y - 128 };
  if (shown <= 0) return lens;
  const pen = penFor(ctx, 9, boil);
  ctx.save();
  ctx.globalAlpha = Math.min(1, shown * 1.4);
  ctx.translate(0, 40 * (1 - shown));
  for (const dx of [-46, 0, 44]) pen.stroke([{ x: at.x, y: at.y - 70 }, { x: at.x + dx, y: at.y + 4 }], 4, INK);
  ctx.save();
  ctx.translate(at.x, at.y - 96);
  ctx.rotate(-0.55);
  const box = [{ x: -52, y: -30 }, { x: 40, y: -30 }, { x: 40, y: 30 }, { x: -52, y: 30 }];
  pen.fill(box, HOUSING, 0.95);
  pen.hatch(box, 8, 0.9, 0.8, { alpha: 0.18 });
  pen.closed(box, 3.4, INK);
  const port = [{ x: 40, y: -22 }, { x: 68, y: -26 }, { x: 68, y: 26 }, { x: 40, y: 22 }];
  pen.fill(port, '#4f5b66', 0.95);
  pen.closed(port, 3, INK);
  pen.dot(70, 0, 15, '#1d2833', 1);
  pen.dot(66, -6, 4, '#c9dbe6', 0.9);
  pen.stroke([{ x: -30, y: -30 }, { x: -24, y: -44 }, { x: 6, y: -44 }, { x: 12, y: -30 }], 3, INK);
  if (rec) pen.dot(-34, -14, 7, RED, 1);
  ctx.restore();
  ctx.restore();
  return lens;
}

/** Dashed lines from `from` to each target, `alpha` faded. */
export function drawSightLines(ctx: CanvasRenderingContext2D, from: Pt, to: readonly Pt[], alpha: number, colour = RED): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.8 * alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.setLineDash([16, 14]);
  for (const p of to) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** The shark's field of view: a wedge from its eye up past the surface, wide enough to take in the whole width of it. */
export function viewCone(eye: Pt): readonly Pt[] {
  const top = 230;
  const through = (x: number): Pt => {
    const y = SURFACE_Y - 60;
    return { x: eye.x + ((x - eye.x) * (eye.y - top)) / (eye.y - y), y: top };
  };
  return [eye, through(-80), through(VIDEO.width + 80)];
}

export function drawConeEdges(ctx: CanvasRenderingContext2D, cone: readonly Pt[], alpha: number): void {
  drawSightLines(ctx, cone[0]!, [cone[1]!, cone[2]!].map((p) => ({ x: (p.x + cone[0]!.x) / 2, y: (p.y + cone[0]!.y) / 2 })), alpha, INK);
}

/** A dashed red "=" (two strokes, drawn out left to right by `u`). */
export function drawEquals(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, u: number, alpha: number): void {
  if (alpha <= 0 || u <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.setLineDash([w * 0.22, w * 0.14]);
  for (const dy of [-w * 0.2, w * 0.2]) {
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + dy);
    ctx.lineTo(x - w / 2 + w * u, y + dy);
    ctx.stroke();
    ctx.strokeStyle = RED;
    ctx.lineWidth = 9;
    ctx.stroke();
  }
  ctx.restore();
}

/** A red ring drawn round (`u` 0 .. 1) a point. */
export function drawRing(ctx: CanvasRenderingContext2D, at: Pt, r: number, u: number, alpha: number): void {
  if (alpha <= 0 || u <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2.1 * u);
  ctx.stroke();
  ctx.restore();
}

/** A big handwritten "?" (pops in over 1, settles at 1). */
export function drawQuestion(ctx: CanvasRenderingContext2D, x: number, y: number, pop: number): void {
  if (pop <= 0) return;
  drawTextLine(ctx, '?', x, y, 150 * pop, 700, Math.min(1, pop * 1.5), RED_ON_PAPER);
}

/** Shark vision: the same picture grey and coarse, as a young white shark's eyes would see it (one kind of cone cell, little sharpness). */
export const VISION_DOWN = 12;
export function drawVision(ctx: CanvasRenderingContext2D, scene: HTMLCanvasElement, small: HTMLCanvasElement, cone: readonly Pt[], alpha: number): void {
  if (alpha <= 0) return;
  const sctx = small.getContext('2d')!;
  sctx.filter = 'grayscale(1) contrast(0.85) brightness(1.05)';
  sctx.drawImage(scene, 0, 0, small.width, small.height);
  sctx.filter = 'none';
  ctx.save();
  ctx.beginPath();
  cone.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.filter = 'blur(12px)';
  ctx.drawImage(small, 0, 0, VIDEO.width, VIDEO.height);
  ctx.filter = 'none';
  // Darker towards the edges of its view.
  const eye = cone[0]!;
  const g = ctx.createRadialGradient(eye.x, eye.y, 200, eye.x, eye.y, 900);
  g.addColorStop(0, 'rgba(20,24,30,0)');
  g.addColorStop(1, 'rgba(20,24,30,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}
