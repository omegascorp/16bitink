import { INK, PAPER, PALE_SAND, SAND_DEEP, SAND_DRY, SAND_WET } from '../../../src/art/palette';
import { makeCanvas } from '../../../src/art/pen';
import { makeSandPatterns } from '../../../src/art/sand';
import { VIDEO } from '../short';
import { GROUND_Y } from './story';

/**
 * The beach, baked once: a washed sky, a strip of sea, a far dune, and the
 * game's own hatched sand in front, its top edge inked where the crab walks.
 */
const SEA_TOP = 700;
const SEA_BOTTOM = 880;
const DUNE_TOP = 900;

const seeded = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/** A wobbly pen line along y = base + wave(x). */
function inkLine(ctx: CanvasRenderingContext2D, y: number, wave: (x: number) => number, width: number, alpha: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = -10; x <= VIDEO.width + 10; x += 12) {
    const py = y + wave(x);
    if (x === -10) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();
  ctx.restore();
}

function sky(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, SEA_TOP);
  g.addColorStop(0, '#8fbad2');
  g.addColorStop(0.7, '#c9dfe2');
  g.addColorStop(1, '#eaf0e6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, SEA_TOP + 2);
  const rnd = seeded(7);
  // Soft clouds and the long thin strokes of a pen sky.
  for (const [x, y, w, h] of [[820, 330, 520, 70], [180, 500, 460, 56], [700, 560, 380, 40], [120, 220, 360, 44]] as const) {
    const cg = ctx.createRadialGradient(x, y, 4, x, y, w / 2);
    cg.addColorStop(0, 'rgba(255,255,255,0.7)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, h / (w / 2));
    ctx.translate(-x, -y);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, y, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const x = rnd() * VIDEO.width;
    const y = 120 + rnd() * (SEA_TOP - 160);
    ctx.globalAlpha = 0.05 + rnd() * 0.08;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40 + rnd() * 90, y - 2 + rnd() * 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function sea(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, SEA_TOP, 0, SEA_BOTTOM);
  g.addColorStop(0, '#7fb0c6');
  g.addColorStop(1, '#a6cfd6');
  ctx.fillStyle = g;
  ctx.fillRect(0, SEA_TOP, VIDEO.width, SEA_BOTTOM - SEA_TOP + DUNE_TOP);
  const rnd = seeded(21);
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const y = SEA_TOP + 14 + rnd() * rnd() * (SEA_BOTTOM - SEA_TOP - 20);
    const x = rnd() * VIDEO.width;
    ctx.globalAlpha = 0.35 + rnd() * 0.4;
    ctx.lineWidth = 2 + rnd() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 30 + rnd() * 70, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  inkLine(ctx, SEA_TOP, (x) => Math.sin(x / 90) * 1.5, 3, 0.55);
}

function dune(ctx: CanvasRenderingContext2D): void {
  const wave = (x: number): number => Math.sin(x / 210 + 1) * 16 + Math.sin(x / 73) * 4;
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  for (let x = 0; x <= VIDEO.width; x += 12) ctx.lineTo(x, DUNE_TOP + wave(x));
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, DUNE_TOP, 0, GROUND_Y);
  g.addColorStop(0, '#f1e3bd');
  g.addColorStop(1, '#e5d3a4');
  ctx.fillStyle = g;
  ctx.fill();
  inkLine(ctx, DUNE_TOP, wave, 3.4, 0.65);
  // Sea oats on the dune.
  const rnd = seeded(5);
  ctx.strokeStyle = '#6d8f5a';
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const x = 20 + rnd() * (VIDEO.width - 40);
    const y = DUNE_TOP + wave(x) + 12 + rnd() * 30;
    for (let b = 0; b < 5; b++) {
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (b - 2) * 6, y - 20, x + (b - 2) * 15, y - 36 - rnd() * 18);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function foreground(ctx: CanvasRenderingContext2D): void {
  const RES = 2.4;
  const wave = (x: number): number => Math.sin(x / 140) * 3 + Math.sin(x / 41) * 1.4;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  for (let x = 0; x <= VIDEO.width; x += 10) ctx.lineTo(x, GROUND_Y + wave(x));
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, VIDEO.height);
  g.addColorStop(0, SAND_DRY);
  g.addColorStop(0.18, SAND_WET);
  g.addColorStop(1, SAND_DEEP);
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND_Y - 10, VIDEO.width, VIDEO.height);
  const patterns = makeSandPatterns(ctx, RES, PALE_SAND);
  ctx.scale(RES, RES);
  ctx.fillStyle = patterns.sand;
  ctx.fillRect(0, GROUND_Y / RES - 4, VIDEO.width / RES, VIDEO.height / RES);
  ctx.fillStyle = patterns.deep;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(0, (GROUND_Y + 260) / RES, VIDEO.width / RES, VIDEO.height / RES);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = patterns.grain;
  ctx.fillRect(0, GROUND_Y / RES - 4, VIDEO.width / RES, VIDEO.height / RES);
  ctx.restore();
  // The pebbles lying about, the surface inked.
  const rnd = seeded(33);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * VIDEO.width;
    const y = GROUND_Y + 40 + rnd() * rnd() * 700;
    const r = 5 + rnd() * rnd() * 20;
    ctx.fillStyle = PALE_SAND.pebbles[Math.floor(rnd() * PALE_SAND.pebbles.length)]!;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  inkLine(ctx, GROUND_Y, wave, 4.4, 0.9);
}

/** The whole beach as one 1080x1920 canvas. */
export function makeBeach(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  sky(ctx);
  sea(ctx);
  dune(ctx);
  foreground(ctx);
  return canvas;
}
