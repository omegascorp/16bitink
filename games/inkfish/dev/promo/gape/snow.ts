import { createRng } from '../../../src/logic/rng';
import type { View } from '../gameplay/fish';
import type { MarkField } from '../gameplay/marks';
import { VIDEO } from '../short';

/**
 * Marine snow for the midnight zone, after ../gameplay/marks.ts: specks
 * (and a few faint "~" current marks) fixed in the world at every zoom
 * scale, pale on the dark water as the game draws its deep snow. As the
 * camera pulls back they shrink and fade while bigger ones fade in, so
 * after a whole loop (`scale` times further back) the field is the same.
 */

interface Flake { readonly x: number; readonly y: number; readonly size: number; readonly wave: boolean; readonly phase: number }

const FLAKES: readonly Flake[] = (() => {
  const rng = createRng(808);
  return Array.from({ length: 70 }, () => ({ x: rng(), y: rng(), size: 0.5 + rng() * 0.9, wave: rng() < 0.18, phase: rng() * Math.PI * 2 }));
})();
/** One tile of the world, world px (game px in this short); each zoom layer repeats it `scale` times bigger. */
const TILE = { w: 150, h: 260 } as const;
const PALE = '#dfe8ff';

const wrapTo = (v: number, size: number): number => v - size * Math.floor(v / size + 0.5);

export function drawSnow(ctx: CanvasRenderingContext2D, field: MarkField, v: View, pull: number, t: number): void {
  const { focus, scale, loopS } = field;
  ctx.save();
  ctx.strokeStyle = PALE;
  ctx.fillStyle = PALE;
  ctx.lineCap = 'round';
  for (const layer of [-1, 0, 1, 2]) {
    const size = scale ** layer;
    const onScreenScale = scale ** (layer - pull);
    for (const m of FLAKES) {
      const len = 70 * m.size * onScreenScale;
      const fade = Math.max(0, Math.min(1, (len - 12) / 30)) * Math.max(0, Math.min(1, (260 - len) / 120));
      if (fade <= 0) continue;
      // Drifting down a little and swaying, twice round a loop.
      const sway = 10 * onScreenScale * Math.sin(((2 * Math.PI * t) / loopS) * 2 + m.phase);
      const x = focus.x + v.zoom * wrapTo(m.x * TILE.w * size - v.x, TILE.w * size) + sway;
      const y = focus.y + v.zoom * wrapTo(m.y * TILE.h * size - v.y, TILE.h * size);
      if (x < -len || x > VIDEO.width + len || y < -len || y > VIDEO.height + len) continue;
      if (!m.wave) {
        ctx.globalAlpha = fade * 0.32;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.2, len * 0.04), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.globalAlpha = fade * 0.1;
      ctx.lineWidth = Math.max(1, len * 0.03);
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const px = x - len / 2 + (k / 6) * len;
        const py = y + Math.sin(k * 1.4 + m.phase) * len * 0.06;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
