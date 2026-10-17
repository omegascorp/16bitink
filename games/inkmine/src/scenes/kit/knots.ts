import type Phaser from 'phaser';
import { createRng, type Rng } from '../../logic/rng';
import { bakeUi, type Ctx } from './paint';

/**
 * Lamplighter writing (spec, "The Lamplighters"): knotted words strung on a
 * cord, in a darker, steadier ink than the prospector's hand. Each word is
 * one knot shape (a loop, a figure of eight, a coil, a pretzel, a bead),
 * seeded, so the same line always reads the same. Nobody can read it yet.
 */
const KNOT_INK = '#141a33';
const STEP = 30;
const H = 40;
/** Drawn this much bigger than its layout units: knots read as words, not specks. */
const SIZE = 1.6;

type Knot = (ctx: Ctx, x: number, y: number, rng: Rng) => void;

const loop: Knot = (ctx, x, y, rng) => {
  const r = 6 + rng() * 3;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.bezierCurveTo(x - r, y - r * 2, x + r, y - r * 2, x + r * 0.3, y);
  ctx.lineTo(x + r, y + r * 0.8);
  ctx.stroke();
};
const eight: Knot = (ctx, x, y, rng) => {
  const r = 4 + rng() * 2;
  for (const dy of [-r, r * 0.9]) {
    ctx.beginPath();
    ctx.ellipse(x, y + dy, r * 0.9, r, 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }
};
const coil: Knot = (ctx, x, y, rng) => {
  const n = 3 + Math.floor(rng() * 2);
  for (let k = 0; k < n; k++) {
    ctx.beginPath();
    ctx.ellipse(x - 6 + k * 4, y, 2.4, 6, -0.25, 0, Math.PI * 2);
    ctx.stroke();
  }
};
const pretzel: Knot = (ctx, x, y) => {
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 6);
  ctx.bezierCurveTo(x - 12, y - 12, x + 8, y - 10, x, y + 2);
  ctx.bezierCurveTo(x - 8, y - 10, x + 12, y - 12, x + 8, y + 6);
  ctx.stroke();
};
const bead: Knot = (ctx, x, y, rng) => {
  ctx.beginPath();
  ctx.ellipse(x, y, 4 + rng() * 2, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y + 3);
  ctx.lineTo(x + (rng() - 0.5) * 6, y + 11);
  ctx.stroke();
};
const KNOTS: readonly Knot[] = [loop, eight, coil, pretzel, bead];

/** A line of `words` knots on a cord, `seed`ed; returns its texture key (STEP × words wide, H tall). */
export function knotLine(scene: Phaser.Scene, words: number, seed: number): string {
  const w = words * STEP + 16;
  return bakeUi(scene, `ui-knots-${words}-${seed}`, w * SIZE, H * SIZE, (ctx) => {
    ctx.scale(SIZE, SIZE);
    const rng = createRng(seed);
    const mid = H / 2 + 2;
    ctx.strokeStyle = KNOT_INK;
    ctx.fillStyle = KNOT_INK;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // The cord, sagging a little between the words.
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(2, mid);
    for (let k = 0; k < words; k++) {
      const x = 8 + k * STEP + STEP / 2;
      ctx.quadraticCurveTo(x - STEP / 2, mid + 3, x, mid);
    }
    ctx.lineTo(w - 2, mid);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.7;
    for (let k = 0; k < words; k++) {
      const knot = KNOTS[Math.floor(rng() * KNOTS.length)]!;
      knot(ctx, 8 + k * STEP + STEP / 2, mid, rng);
    }
  });
}
