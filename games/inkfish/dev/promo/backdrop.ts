import { INK } from '../../src/art/pen';
import { drawPaper } from '../../src/art/propArt';
import { createRng } from '../../src/logic/rng';
import { VIDEO } from './short';

/** A full-frame sheet of the game's sketchbook paper. */
export function makePaper(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const tile = document.createElement('canvas');
  tile.width = tile.height = 512;
  drawPaper(tile.getContext('2d')!, 512);
  ctx.save();
  ctx.scale(2, 2);
  ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
  ctx.fillRect(0, 0, VIDEO.width / 2, VIDEO.height / 2);
  ctx.restore();
  return canvas;
}

/** Paper with a watery wash, `top` colour fading to `bottom` (deeper water towards the bottom). */
export function makeBackdrop(wash: { readonly top: string; readonly bottom: string }): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  gradient.addColorStop(0, wash.top);
  gradient.addColorStop(1, wash.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

/** Current marks ("~", as in the game's water) and specks of marine snow, for a still camera. */
export interface Mark { readonly x: number; readonly y: number; readonly size: number; readonly wave: boolean; readonly phase: number; readonly sways: number }

export function makeMarks(count: number, seed: number): readonly Mark[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => ({
    x: rng() * VIDEO.width,
    y: rng() * VIDEO.height,
    size: 0.6 + rng() * 0.8,
    wave: rng() < 0.6,
    phase: rng() * Math.PI * 2,
    sways: 1 + Math.floor(rng() * 2),
  }));
}

/** The marks sway with the current; `loop` runs 0 → 1 over the video, and each sways a whole number of times, so they loop. */
export function drawMarks(ctx: CanvasRenderingContext2D, marks: readonly Mark[], loop: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  for (const m of marks) {
    const swing = Math.sin(2 * Math.PI * loop * m.sways + m.phase);
    const x = m.x + 26 * swing;
    const y = m.y + 10 * Math.cos(2 * Math.PI * loop * m.sways + m.phase);
    const len = 60 * m.size;
    ctx.globalAlpha = m.wave ? 0.2 : 0.25;
    if (!m.wave) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.2, len * 0.035), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.lineWidth = Math.max(1, len * 0.03);
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = x - len / 2 + (k / 6) * len;
      const py = y + Math.sin(k * 1.4 + m.phase + swing * 0.6) * len * 0.06;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}
