import { makeCanvas } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import type { Pt } from '../sprites';

/**
 * The cave, painted once per framing: dark rock in layered brown washes and
 * pen hatching, the passage's walls lit warm towards its mouth, and the
 * mouth itself an irregular opening on a dusk sky (orange to gold, the
 * forest's edge in silhouette at its foot) whose light spills out over the
 * rock. The ceiling is its own layer, drawn over the boas so their bodies
 * go up into it: a band of rock with an irregular lower lip and a few
 * stalactites, lit along the lip.
 */
export interface Mouth {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
}

export interface CaveFrame {
  readonly width: number;
  readonly height: number;
  readonly mouth: Mouth;
}

type Rng = () => number;

/** An irregular closed outline round (x, y): a rough ellipse. */
function rough(rng: Rng, x: number, y: number, rx: number, ry: number, k: number, n = 48): Pt[] {
  const ph = [rng() * 6, rng() * 6, rng() * 6];
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + k * (0.5 * Math.sin(a * 3 + ph[0]!) + 0.3 * Math.sin(a * 7 + ph[1]!) + 0.2 * Math.sin(a * 13 + ph[2]!)) + k * 0.25 * (rng() - 0.5);
    return { x: x + Math.cos(a) * rx * r, y: y + Math.sin(a) * ry * r };
  });
}

function path(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

/** Rock texture: soft blotches of warm and cool brown, then a fine pen hatch and a few cracks. */
function rockTexture(ctx: CanvasRenderingContext2D, rng: Rng, w: number, h: number, light: number): void {
  for (let i = 0; i < 420; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = 20 + rng() * 90;
    const warm = rng() < 0.6;
    const v = 20 + rng() * 26 * light;
    ctx.fillStyle = warm ? `rgba(${v + 14},${v + 4},${v - 4},${0.12 + rng() * 0.16})` : `rgba(${v - 4},${v - 2},${v + 2},${0.1 + rng() * 0.12})`;
    path(ctx, rough(rng, x, y, r, r * (0.5 + rng() * 0.5), 0.3, 18));
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 2600; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const l = 10 + rng() * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + l, y - l * 0.8);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(8,4,3,0.55)';
  for (let i = 0; i < 46; i++) {
    let x = rng() * w;
    let y = rng() * h;
    ctx.lineWidth = 1.5 + rng() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (rng() - 0.5) * 60;
      y += 10 + rng() * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** An irregular rock opening, wider than tall: a flatter, broken floor and a jagged top edge with rock teeth hanging into it. */
function opening(rng: Rng, m: Mouth): Pt[] {
  const n = 120;
  const ph = [rng() * 6, rng() * 6];
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const topSide = Math.sin(a) < 0;
    const wobble = 0.05 * Math.sin(a * 3 + ph[0]!) + 0.035 * Math.sin(a * 7 + ph[1]!);
    const jag = topSide ? 0.035 * Math.abs(Math.sin(a * 9 + ph[1]!)) + 0.03 * Math.abs(Math.sin(a * 21)) + 0.03 * rng() + (i % 17 === 5 ? 0.09 : 0) : 0.015 * (rng() - 0.5);
    const r = 1 + wobble - jag;
    const y = Math.sin(a) * (topSide ? 1 : 0.72);
    return { x: m.x + Math.cos(a) * m.rx * r, y: m.y + y * m.ry * r };
  });
}

/** The opening onto the dusk: the sky, low sun glow, the forest's edge, then its light spilling onto the rock round it. */
function paintMouth(ctx: CanvasRenderingContext2D, rng: Rng, m: Mouth): void {
  const hole = opening(rng, m);
  ctx.save();
  path(ctx, hole);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, m.y - m.ry, 0, m.y + m.ry);
  sky.addColorStop(0, '#c8603a');
  sky.addColorStop(0.45, '#f29a48');
  sky.addColorStop(0.78, '#ffd283');
  sky.addColorStop(1, '#f7b45e');
  ctx.fillStyle = sky;
  ctx.fillRect(m.x - m.rx * 1.6, m.y - m.ry * 1.6, m.rx * 3.2, m.ry * 3.2);
  const sun = ctx.createRadialGradient(m.x + m.rx * 0.15, m.y + m.ry * 0.45, 4, m.x, m.y + m.ry * 0.4, m.rx * 0.9);
  sun.addColorStop(0, 'rgba(255,244,200,0.95)');
  sun.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(m.x - m.rx * 1.6, m.y - m.ry * 1.6, m.rx * 3.2, m.ry * 3.2);
  // The forest's edge outside, dark against the glow.
  ctx.fillStyle = 'rgba(46,22,18,0.92)';
  ctx.beginPath();
  const base = m.y + m.ry * 0.62;
  ctx.moveTo(m.x - m.rx * 1.5, m.y + m.ry * 1.5);
  // Tree crowns, rounded bumps of two sizes, and here and there a palm's thin trunk and fronds over them.
  for (let x = -1.5; x <= 1.5; x += 0.012) ctx.lineTo(m.x + x * m.rx, base - (22 + 26 * Math.abs(Math.sin(x * 11 + 1)) ** 0.6 + 12 * Math.abs(Math.sin(x * 31 + 2)) ** 0.8) * (m.ry / 240));
  ctx.lineTo(m.x + m.rx * 1.5, m.y + m.ry * 1.5);
  ctx.closePath();
  ctx.fill();
  for (const px of [-0.62, 0.18, 0.7]) {
    const bx = m.x + px * m.rx;
    const by = base - 30 * (m.ry / 240);
    const h = 120 * (m.ry / 240);
    ctx.strokeStyle = 'rgba(46,22,18,0.92)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + 10, by - h * 0.5, bx + 6, by - h);
    ctx.stroke();
    ctx.lineWidth = 6;
    for (const f of [-1.1, -0.5, 0.2, 0.8, 1.4]) {
      ctx.beginPath();
      ctx.moveTo(bx + 6, by - h);
      ctx.quadraticCurveTo(bx + 6 + Math.cos(f - 1.6) * 30, by - h - 18, bx + 6 + Math.sin(f) * 48, by - h + 22 + Math.abs(f) * 6);
      ctx.stroke();
    }
  }
  ctx.restore();
  // The light on the rock round the opening.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const spill = ctx.createRadialGradient(m.x, m.y + m.ry * 0.2, m.rx * 0.6, m.x, m.y, m.rx * 2.3);
  spill.addColorStop(0, 'rgba(150,70,26,0.55)');
  spill.addColorStop(0.45, 'rgba(90,36,14,0.28)');
  spill.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spill;
  ctx.fillRect(m.x - m.rx * 2.5, m.y - m.ry * 3, m.rx * 5, m.ry * 6);
  ctx.restore();
  // Its rough rock lip, inked.
  ctx.strokeStyle = 'rgba(20,9,6,0.6)';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  path(ctx, hole);
  ctx.stroke();
}

export function paintCave(f: CaveFrame, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(f.width, f.height);
  const rng = createRng(seed);
  const m = f.mouth;
  const g = ctx.createRadialGradient(m.x, m.y, 60, m.x, m.y, f.height * 0.9);
  g.addColorStop(0, '#4a2c1c');
  g.addColorStop(0.35, '#26170f');
  g.addColorStop(1, '#0b0706');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, f.width, f.height);
  // The passage's walls, closing in on the mouth: lit planes, darker towards the camera.
  for (const s of [-1, 1]) {
    const wall = [
      { x: m.x + s * m.rx * 0.9, y: m.y - m.ry * 1.2 },
      { x: m.x + s * (f.width * 0.75), y: -100 },
      { x: m.x + s * (f.width * 0.9), y: f.height + 100 },
      { x: m.x + s * m.rx * 1.05, y: m.y + m.ry * 1.3 },
    ];
    const wg = ctx.createLinearGradient(m.x + s * m.rx, 0, m.x + s * f.width * 0.8, 0);
    wg.addColorStop(0, 'rgba(110,58,30,0.55)');
    wg.addColorStop(0.4, 'rgba(52,30,20,0.4)');
    wg.addColorStop(1, 'rgba(8,5,4,0.6)');
    ctx.fillStyle = wg;
    path(ctx, wall);
    ctx.fill();
  }
  rockTexture(ctx, rng, f.width, f.height, 1);
  paintMouth(ctx, rng, m);
  // The floor falling away into the dark at the foot of the frame.
  const floor = ctx.createLinearGradient(0, f.height * 0.72, 0, f.height);
  floor.addColorStop(0, 'rgba(8,5,4,0)');
  floor.addColorStop(1, 'rgba(8,5,4,0.85)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, f.width, f.height);
  return canvas;
}

/** The ceiling: rock down to an irregular lip about `lip` px down, with a few stalactites, lit warm along the lip from the mouth. */
export function paintCeiling(width: number, lip: number, seed: number, mouthX: number): HTMLCanvasElement {
  const h = lip + 260;
  const { canvas, ctx } = makeCanvas(width, h);
  const rng = createRng(seed);
  const edge: Pt[] = [];
  for (let x = -20; x <= width + 20; x += 18) {
    const y = lip + 34 * Math.sin(x * 0.011 + 1) + 22 * Math.sin(x * 0.037 + 2) + (rng() - 0.5) * 16;
    edge.push({ x, y });
  }
  const shape: Pt[] = [{ x: -20, y: -20 }, ...edge, { x: width + 20, y: -20 }];
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, lip + 60);
  g.addColorStop(0, '#0b0706');
  g.addColorStop(0.6, '#24160e');
  g.addColorStop(1, '#4a2c1a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, h);
  rockTexture(ctx, rng, width, h, 0.8);
  // Warm light along the lip, strongest over the mouth.
  const lit = ctx.createLinearGradient(0, lip - 70, 0, lip + 50);
  lit.addColorStop(0, 'rgba(160,80,34,0)');
  lit.addColorStop(1, 'rgba(176,92,40,0.5)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = lit;
  ctx.fillRect(0, 0, width, h);
  const hot = ctx.createRadialGradient(mouthX, lip + 60, 20, mouthX, lip + 60, width * 0.6);
  hot.addColorStop(0, 'rgba(120,56,20,0.45)');
  hot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hot;
  ctx.fillRect(0, 0, width, h);
  ctx.restore();
  // Stalactites hanging from the lip, each a lit cone.
  for (let i = 0; i < 9; i++) {
    const at = edge[Math.floor(rng() * edge.length)]!;
    const len = 40 + rng() * 120;
    const half = 12 + rng() * 18;
    const cone = [{ x: at.x - half, y: at.y - 10 }, { x: at.x - half * 0.35, y: at.y + len * 0.6 }, { x: at.x + (rng() - 0.5) * 6, y: at.y + len }, { x: at.x + half * 0.4, y: at.y + len * 0.55 }, { x: at.x + half, y: at.y - 10 }];
    const cg = ctx.createLinearGradient(at.x - half, 0, at.x + half, 0);
    cg.addColorStop(0, '#1a0f0a');
    cg.addColorStop(0.6, '#5a3620');
    cg.addColorStop(1, '#2a1a10');
    ctx.fillStyle = cg;
    path(ctx, cone);
    ctx.fill();
    ctx.strokeStyle = 'rgba(12,6,4,0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(12,6,4,0.9)';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  edge.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  return canvas;
}

/** Darkness closing in from the frame's edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number): void {
  const g = ctx.createRadialGradient(w / 2, h * 0.52, h * 0.25, w / 2, h * 0.52, h * 0.72);
  g.addColorStop(0, 'rgba(5,3,2,0)');
  g.addColorStop(1, `rgba(5,3,2,${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, w + 80, h + 80);
}
