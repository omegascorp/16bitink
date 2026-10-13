import { INK } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { HOLE } from './story';

/**
 * The shallows: pale sand along the bottom with a few pebbles and shells,
 * and the moray's rock, drawn in for its scene, with the dark mouth of its
 * hole on the side facing the puffer.
 */

export const FLOOR_Y = 1120;
const SAND = '#ead9a8';
const ROCK = '#9a958b';
const ROCK_DARK = '#7d776d';
const WEED = '#6f8f4a';

const edge = (x: number): number => FLOOR_Y + 8 * Math.sin(x / 75) + 5 * Math.sin(x / 21 + 1);

/** Sand from FLOOR_Y down: a wavy inked edge, a stipple, pebbles and a shell or two, made once. */
export function makeFloor(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const rng = createRng(4242);
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  for (let x = 0; x <= VIDEO.width; x += 8) ctx.lineTo(x, edge(x));
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  ctx.fillStyle = SAND;
  ctx.globalAlpha = 0.75;
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= VIDEO.width; x += 8) (x === 0 ? ctx.moveTo(x, edge(x)) : ctx.lineTo(x, edge(x)));
  ctx.stroke();
  ctx.fillStyle = INK;
  for (let i = 0; i < 380; i++) {
    const x = rng() * VIDEO.width;
    const y = edge(x) + 14 + rng() * (VIDEO.height - FLOOR_Y);
    ctx.globalAlpha = 0.25 + 0.35 * rng();
    ctx.beginPath();
    ctx.arc(x, y, 1 + rng() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  for (const [x, rx] of [[70, 16], [460, 11], [905, 18], [1010, 10]] as const) {
    ctx.beginPath();
    ctx.ellipse(x, edge(x) + 6, rx, rx * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c9c0ad';
    ctx.fill();
    ctx.stroke();
  }
  drawShell(ctx, 700, edge(700) + 10);
  return canvas;
}

/** A little scallop shell on the sand. */
function drawShell(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.arc(0, 6, 22, Math.PI * 1.1, Math.PI * 1.9);
  ctx.closePath();
  ctx.fillStyle = '#f0c9a8';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(Math.sin(k * 0.3) * 20, 6 - Math.cos(k * 0.3) * 20);
    ctx.stroke();
  }
  ctx.restore();
}

/** The rock's outline, left edge to the sand. */
export const ROCK_OUTLINE: readonly { readonly x: number; readonly y: number }[] = [
  { x: -10, y: 560 }, { x: 60, y: 548 }, { x: 140, y: 575 }, { x: 205, y: 612 }, { x: 250, y: 650 },
  { x: 272, y: 700 }, { x: 278, y: 760 }, { x: 272, y: 820 }, { x: 300, y: 890 }, { x: 345, y: 960 }, { x: 380, y: 1040 },
  { x: 400, y: FLOOR_Y + 15 }, { x: -10, y: FLOOR_Y + 15 },
];

export function rockPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ROCK_OUTLINE.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

export function holePath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.ellipse(HOLE.x, HOLE.y, HOLE.rx, HOLE.ry, -0.15, 0, Math.PI * 2);
}

/** The rock made once: fill, hatching, weed, and the dark hole. */
export function makeRock(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const rng = createRng(909);
  ctx.lineJoin = 'round';
  rockPath(ctx);
  ctx.fillStyle = ROCK;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Shade on the lower right and cross hatching.
  ctx.fillStyle = ROCK_DARK;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(300, 1000, 140, 220, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  for (let k = 0; k < 26; k++) {
    const x = 120 + k * 11;
    ctx.beginPath();
    ctx.moveTo(x, 860 + k * 4);
    ctx.lineTo(x + 40, 1000 + k * 4);
    ctx.stroke();
  }
  // Pits and cracks.
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 18; i++) {
    const x = 20 + rng() * 300;
    const y = 620 + rng() * 460;
    ctx.beginPath();
    ctx.arc(x, y, 2 + rng() * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  rockPath(ctx);
  ctx.stroke();
  // The hole: dark, with a shadowed lip.
  holePath(ctx);
  ctx.fillStyle = '#1e1a1c';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  // Weed on top.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (const [x, y, h, lean] of [[40, 556, 90, -0.2], [70, 552, 120, 0.1], [100, 560, 80, 0.3], [180, 600, 70, 0.4]] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 4);
    ctx.quadraticCurveTo(x + lean * h - 10, y - h * 0.6, x + lean * h * 1.4, y - h);
    ctx.quadraticCurveTo(x + lean * h + 10, y - h * 0.5, x + 7, y + 4);
    ctx.closePath();
    ctx.fillStyle = WEED;
    ctx.fill();
    ctx.stroke();
  }
  return canvas;
}
