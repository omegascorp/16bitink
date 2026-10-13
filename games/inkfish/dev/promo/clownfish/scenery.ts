import { INK } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { ANEMONE, EGGS, FLOOR_Y, LOOP_S, SWAYS } from './story';

/**
 * The reef the family lives on: sand, the rock with their eggs, and the
 * anemone, its tentacles swaying in the current (a whole number of sways a
 * loop) and swelling when the narrator names it.
 */

const SAND = '#e6d6aa';
const ROCK = '#8f9aa6';
const FLESH = '#f0c2cf';
const FLESH_BACK = '#d9a3b6';
const TIPS = '#d06f96';
const EGG = '#f08a3c';

/** Sand from FLOOR_Y down: a wavy inked edge and a stipple, made once. */
export function makeFloor(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const rng = createRng(611);
  const edge = (x: number): number => FLOOR_Y + 9 * Math.sin(x / 70) + 5 * Math.sin(x / 23 + 1);
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
  for (let i = 0; i < 420; i++) {
    const x = rng() * VIDEO.width;
    const y = edge(x) + 14 + rng() * (VIDEO.height - FLOOR_Y);
    ctx.globalAlpha = 0.25 + 0.35 * rng();
    ctx.beginPath();
    ctx.arc(x, y, 1 + rng() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  drawRock(ctx);
  return canvas;
}

/** The rock beside the anemone, where the eggs are laid. */
function drawRock(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(77);
  const cx = 900;
  const cy = FLOOR_Y - 10;
  const pts = Array.from({ length: 18 }, (_, i) => {
    const a = Math.PI + (i / 17) * Math.PI;
    const r = 1 + 0.08 * (rng() - 0.5);
    return { x: cx + Math.cos(a) * 125 * r, y: cy + Math.sin(a) * 78 * r };
  });
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = ROCK;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Hatching on its shady side.
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.5;
  for (let k = 0; k < 9; k++) {
    const x = cx + 30 + k * 10;
    ctx.beginPath();
    ctx.moveTo(x, cy - 50 + k * 5);
    ctx.lineTo(x + 18, cy - 4);
    ctx.stroke();
  }
  ctx.restore();
}

/** The clutch: little orange eggs, each `shown` 0 .. 1 (popping as it hatches, filling in as it is laid). */
export function drawEggs(ctx: CanvasRenderingContext2D, shown: (i: number) => number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  EGGS.forEach((e, i) => {
    const s = shown(i);
    if (s <= 0) return;
    ctx.globalAlpha = s;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, 9 * s, 7 * s, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = EGG;
    ctx.fill();
    ctx.stroke();
    // An eye spot in each: they're nearly ready.
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(e.x + 2, e.y - 1, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/** A ring popping out of a hatching egg, `u` 0 .. 1. */
export function drawPop(ctx: CanvasRenderingContext2D, x: number, y: number, u: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 1 - u;
  ctx.beginPath();
  ctx.arc(x, y, 10 + 50 * u, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

interface Tentacle {
  /** Across the disc, -1 .. 1. */
  readonly across: number;
  readonly len: number;
  readonly phase: number;
  readonly back: boolean;
}

const TENTACLES: readonly Tentacle[] = (() => {
  const rng = createRng(2024);
  return Array.from({ length: 52 }, (_, i) => {
    const back = i % 2 === 0;
    return { across: (i / 51) * 2 - 1 + (rng() - 0.5) * 0.04, len: (back ? 170 : 140) + rng() * 70, phase: rng() * Math.PI * 2, back };
  });
})();

const DISC_RX = 235;
const DISC_RY = 32;

/** One tentacle: a tapering, curling finger from the disc's rim, swaying with the current. */
function drawTentacle(ctx: CanvasRenderingContext2D, tn: Tentacle, t: number, swell: number): void {
  const base = { x: ANEMONE.x + tn.across * DISC_RX, y: ANEMONE.y - DISC_RY * Math.sqrt(1 - tn.across ** 2) * (tn.back ? 1 : -0.2) };
  const sway = 0.22 * Math.sin((2 * Math.PI * SWAYS * t) / LOOP_S - tn.across * 1.8 + tn.phase * 0.3);
  const lean = tn.across * 1.05;
  const len = tn.len * (1 + 0.12 * swell);
  const n = 10;
  const spine = Array.from({ length: n + 1 }, (_, k) => k / n);
  let x = base.x;
  let y = base.y;
  const pts = spine.map((u) => {
    const a = -Math.PI / 2 + lean * (0.55 + 0.6 * u) + sway * u * 1.6;
    if (u > 0) {
      x += Math.cos(a) * (len / n);
      y += Math.sin(a) * (len / n);
    }
    return { x, y, a, w: (1 - 0.65 * u) * 11 * (1 + 0.15 * swell) };
  });
  const left = pts.map((p) => ({ x: p.x + Math.sin(p.a) * p.w, y: p.y - Math.cos(p.a) * p.w }));
  const right = pts.map((p) => ({ x: p.x - Math.sin(p.a) * p.w, y: p.y + Math.cos(p.a) * p.w }));
  const tip = pts[n]!;
  ctx.beginPath();
  left.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.arc(tip.x, tip.y, tip.w, tip.a - Math.PI / 2, tip.a + Math.PI / 2);
  [...right].reverse().forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fillStyle = tn.back ? FLESH_BACK : FLESH;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = TIPS;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, tip.w * 0.9, 0, Math.PI * 2);
  ctx.fill();
}

/** The anemone: its column on the sand, the back row of tentacles, the disc, the front row. */
export function drawAnemone(ctx: CanvasRenderingContext2D, t: number, swell: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  // The column.
  ctx.beginPath();
  ctx.moveTo(ANEMONE.x - DISC_RX + 70, ANEMONE.y);
  ctx.quadraticCurveTo(ANEMONE.x - 150, FLOOR_Y - 20, ANEMONE.x - 185, FLOOR_Y + 8);
  ctx.lineTo(ANEMONE.x + 185, FLOOR_Y + 8);
  ctx.quadraticCurveTo(ANEMONE.x + 150, FLOOR_Y - 20, ANEMONE.x + DISC_RX - 70, ANEMONE.y);
  ctx.closePath();
  ctx.fillStyle = FLESH_BACK;
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  for (let k = -4; k <= 4; k++) {
    ctx.beginPath();
    ctx.moveTo(ANEMONE.x + k * 30, ANEMONE.y + 10);
    ctx.lineTo(ANEMONE.x + k * 38, FLOOR_Y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const tn of TENTACLES) if (tn.back) drawTentacle(ctx, tn, t, swell);
  ctx.beginPath();
  ctx.ellipse(ANEMONE.x, ANEMONE.y, DISC_RX, DISC_RY, 0, 0, Math.PI * 2);
  ctx.fillStyle = FLESH;
  ctx.fill();
  ctx.stroke();
  for (const tn of TENTACLES) if (!tn.back) drawTentacle(ctx, tn, t, swell);
  ctx.restore();
}
