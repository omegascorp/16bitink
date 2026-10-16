import { INK, makeCanvas, Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';

/** The sea around the tuna: the current streaming past, and the night that falls over it. */

interface Mark { readonly x: number; readonly y: number; readonly size: number; readonly wave: boolean; readonly laps: number }

const MARKS: readonly Mark[] = (() => {
  const rng = createRng(4150);
  return Array.from({ length: 36 }, () => ({ x: rng(), y: 280 + rng() * 1000, size: 0.6 + rng() * 0.9, wave: rng() < 0.7, laps: 4 + Math.floor(rng() * 3) }));
})();

/**
 * The sea streaming past to the left as the tuna swims right: "~" marks and
 * specks, each lapping the frame a whole number of times a loop. `phase`
 * runs 0 → 1 over the loop, slowing when the tuna stops.
 */
export function drawStream(ctx: CanvasRenderingContext2D, phase: number, alpha: number): void {
  if (alpha <= 0) return;
  const span = VIDEO.width + 240;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  for (const m of MARKS) {
    const x = span - ((((m.x * span + m.laps * span * phase) % span) + span) % span) - 120;
    const len = 70 * m.size;
    ctx.globalAlpha = alpha * (m.wave ? 0.22 : 0.28);
    if (!m.wave) {
      ctx.beginPath();
      ctx.arc(x, m.y, Math.max(1.5, len * 0.035), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.lineWidth = Math.max(1, len * 0.03);
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = x - len / 2 + (k / 6) * len;
      const py = m.y + Math.sin(k * 1.4 + m.y) * len * 0.06;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- night

const NIGHT = 'rgba(14,24,58,1)';
const MOONLIGHT = 'rgba(226,232,255,1)';
export const MOON = { x: 905, y: 335, r: 48 } as const;

/** The night's wash over the sea and the tuna (`night` 0 .. 1). */
export function drawNightWash(ctx: CanvasRenderingContext2D, night: number): void {
  if (night <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.6 * night;
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** Shafts of moonlight slanting down from the moon, swaying slowly (`loop` runs 0 → 1 over the video). */
export function drawMoonbeams(ctx: CanvasRenderingContext2D, night: number, loop: number): void {
  if (night <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    const sway = 18 * Math.sin(2 * Math.PI * (2 * loop + k * 0.23));
    const top = MOON.x - 40 - k * 120 + sway;
    const w = 50 + 26 * (k % 3);
    const drop = 1500;
    const lean = -0.42;
    const g = ctx.createLinearGradient(0, MOON.y, 0, MOON.y + drop);
    g.addColorStop(0, MOONLIGHT);
    g.addColorStop(1, 'rgba(226,232,255,0)');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.07 * night;
    ctx.beginPath();
    ctx.moveTo(top, MOON.y);
    ctx.lineTo(top + w, MOON.y);
    ctx.lineTo(top + w * 2.2 + lean * drop, MOON.y + drop);
    ctx.lineTo(top + lean * drop, MOON.y + drop);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A crescent moon with its glow, inked round its edge; one canvas per boil frame. */
export function makeMoon(frames: number): readonly HTMLCanvasElement[] {
  const side = MOON.r * 5;
  const c = side / 2;
  return Array.from({ length: frames }, (_, f) => {
    const { canvas, ctx } = makeCanvas(side, side);
    const glow = ctx.createRadialGradient(c, c, MOON.r * 0.6, c, c, MOON.r * 2.4);
    glow.addColorStop(0, 'rgba(240,236,210,0.45)');
    glow.addColorStop(1, 'rgba(240,236,210,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, side, side);
    // The crescent: a disc with a second disc taken out of it.
    const { canvas: disc, ctx: d } = makeCanvas(side, side);
    d.fillStyle = '#f5f0d8';
    d.beginPath();
    d.arc(c, c, MOON.r, 0, Math.PI * 2);
    d.fill();
    new Pen(d, 300 + f * 977, 0.9).circle(c, c, MOON.r, 2.2);
    d.globalCompositeOperation = 'destination-out';
    d.beginPath();
    d.arc(c + MOON.r * 0.48, c - MOON.r * 0.3, MOON.r * 0.86, 0, Math.PI * 2);
    d.fill();
    ctx.drawImage(disc, 0, 0);
    return canvas;
  });
}
