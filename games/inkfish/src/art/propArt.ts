import { createRng } from '../logic/rng';
import { ellipse, INK, PAPER, Pen, type Pt } from './pen';

export function drawJelly(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 1);
  const cx = 64;
  const top = 26;
  const bell: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI;
    bell.push({ x: cx + Math.cos(a) * 36, y: top + 30 + Math.sin(a) * 30 });
  }
  for (let i = 0; i <= 6; i++) bell.push({ x: cx + 36 - i * 12, y: top + 30 + (i % 2) * 5 });
  pen.fill(bell, '#fffaf0', 0.9);
  pen.fill(bell, '#9b6fc4', 0.3);
  pen.hatch(bell, 6, Math.PI / 3, 0.8, { onlyBelow: top + 20, alpha: 0.5 });
  pen.closed(bell, 2.2);
  for (let t = 0; t < 5; t++) {
    const x0 = cx - 26 + t * 13;
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) pts.push({ x: x0 + Math.sin(i * 0.9 + t + seed) * 5, y: top + 34 + i * 9 });
    pen.stroke(pts, 1.3, INK, 0.85);
  }
}

export function drawHook(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 0.8);
  const hook: Pt[] = [
    { x: 32, y: 4 }, { x: 32, y: 52 }, { x: 30, y: 62 }, { x: 22, y: 68 }, { x: 13, y: 64 },
    { x: 10, y: 54 }, { x: 14, y: 48 },
  ];
  pen.stroke(hook, 3.2);
  pen.stroke([{ x: 14, y: 48 }, { x: 18, y: 56 }], 2.2);
  pen.circle(32, 6, 4, 2);
  // A sad wriggling worm as bait.
  pen.stroke([{ x: 28, y: 30 }, { x: 22, y: 34 }, { x: 28, y: 40 }, { x: 22, y: 46 }], 4, '#b0574f', 0.85);
}

export function drawPowerUp(ctx: CanvasRenderingContext2D, kind: 'speed' | 'shrink', seed: number): void {
  const pen = new Pen(ctx, seed, 0.9);
  const c = 40;
  pen.fill(ellipse(c, c, 30, 30, 20), '#fffaf0', 0.85);
  pen.circle(c, c, 30, 2.2);
  pen.circle(c, c, 26, 0.8);
  if (kind === 'speed') {
    // A quill nib with motion lines.
    pen.fill([{ x: 52, y: 20 }, { x: 30, y: 46 }, { x: 26, y: 58 }, { x: 36, y: 52 }, { x: 58, y: 26 }], '#d9a441', 0.8);
    pen.closed([{ x: 52, y: 20 }, { x: 30, y: 46 }, { x: 26, y: 58 }, { x: 36, y: 52 }, { x: 58, y: 26 }], 2);
    for (let i = 0; i < 3; i++) pen.stroke([{ x: 14, y: 30 + i * 8 }, { x: 26, y: 26 + i * 8 }], 1.4);
  } else {
    // An ink splat.
    const splat: Pt[] = [];
    const rng = createRng(seed);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = i % 2 ? 9 + rng() * 4 : 15 + rng() * 6;
      splat.push({ x: c + Math.cos(a) * r, y: c + Math.sin(a) * r });
    }
    pen.fill(splat, INK, 0.95);
    pen.dot(c + 20, c - 14, 2.5);
    pen.dot(c - 18, c + 16, 2);
  }
}

export function drawBubble(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 0.4);
  pen.circle(8, 8, 6, 1.2);
  pen.stroke([{ x: 5, y: 6 }, { x: 7, y: 4 }], 1);
}

export function drawWeed(ctx: CanvasRenderingContext2D, seed: number, h: number): void {
  const pen = new Pen(ctx, seed, 1.4);
  const rng = createRng(seed * 7 + 1);
  for (let s = 0; s < 3; s++) {
    const x0 = 30 + s * 20 + rng() * 10;
    const stem: Pt[] = [];
    const height = h * (0.5 + rng() * 0.32);
    for (let i = 0; i <= 12; i++) stem.push({ x: x0 + Math.sin(i * 0.7 + s) * 8, y: h - (i / 12) * height });
    pen.stroke(stem, 2, '#2f4a32');
    stem.forEach((p, i) => {
      if (i % 2 || i === 0) return;
      const dir = i % 4 ? 1 : -1;
      const leaf: Pt[] = [p, { x: p.x + dir * 14, y: p.y - 8 }, { x: p.x + dir * 20, y: p.y - 4 }, p];
      pen.fill(leaf, '#6f8f5f', 0.35);
      pen.stroke(leaf, 1.2, '#2f4a32');
    });
  }
}

export function drawRock(ctx: CanvasRenderingContext2D, seed: number, w: number, h: number): void {
  const pen = new Pen(ctx, seed, 1.5);
  const rng = createRng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push({ x: 8 + t * (w - 16), y: h - 6 - Math.sin(Math.PI * t) * (h - 20) * (0.75 + rng() * 0.3) });
  }
  pts.push({ x: w - 8, y: h - 4 }, { x: 8, y: h - 4 });
  pen.fill(pts, '#fffaf0', 1);
  pen.fill(pts, '#8a7f70', 0.3);
  pen.hatch(pts, 5, Math.PI / 4, 0.9, { onlyBelow: h * 0.45, alpha: 0.6 });
  pen.closed(pts, 2.4);
}

/** Tileable sketchbook paper: fibres and speckles on cream. */
export function drawPaper(ctx: CanvasRenderingContext2D, size: number): void {
  const rng = createRng(16);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = rng() < 0.5 ? 'rgba(120,100,70,0.06)' : 'rgba(255,255,255,0.25)';
    ctx.fillRect(rng() * size, rng() * size, 1 + rng() * 2, 1 + rng() * 2);
  }
  ctx.strokeStyle = 'rgba(110,90,60,0.07)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 140; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const a = rng() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
    ctx.stroke();
  }
}
