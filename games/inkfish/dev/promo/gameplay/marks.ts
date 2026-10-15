import { INK } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import type { View } from './fish';

interface Mark { readonly x: number; readonly y: number; readonly size: number; readonly wave: boolean; readonly phase: number }

/** Marks on one tile of the world, in tile widths; each zoom layer repeats the tile `scale` times bigger. */
const MARKS: readonly Mark[] = (() => {
  const rng = createRng(1717);
  return Array.from({ length: 34 }, () => ({ x: rng(), y: rng(), size: 0.6 + rng() * 0.8, wave: rng() < 0.6, phase: rng() * Math.PI * 2 }));
})();
const TILE = { w: 1500, h: 2600 } as const;

const wrapTo = (v: number, size: number): number => v - size * Math.floor(v / size + 0.5);

export interface MarkField {
  /** The screen point the view centres on. */
  readonly focus: { readonly x: number; readonly y: number };
  /** How many times the camera pulls back over the loop (1 for a camera that never zooms). */
  readonly scale: number;
  readonly loopS: number;
}

/**
 * The game's "~" current marks and specks of marine snow at every scale:
 * as the camera pulls back they shrink and fade, and bigger ones fade in,
 * so after a whole loop (`scale` times further back) the field is the same.
 * They are fixed in the world, so they slide by as the camera pans.
 * `pull` is how far the camera has pulled back, 0 .. 1 over the loop
 * (the view's zoom is base * scale ** -pull).
 */
export function drawZoomMarks(ctx: CanvasRenderingContext2D, field: MarkField, v: View, pull: number, t: number): void {
  const { focus, scale, loopS } = field;
  // A camera that never zooms keeps a single layer.
  const layers = scale > 1.0001 ? [-1, 0, 1, 2] : [0];
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  for (const layer of layers) {
    const size = scale ** layer;
    const onScreenScale = scale ** (layer - pull);
    for (const m of MARKS) {
      const len = 70 * m.size * onScreenScale;
      // Fade in while small, out while big: no mark pops.
      const fade = layers.length === 1 ? 1 : Math.max(0, Math.min(1, (len - 10) / 30)) * Math.max(0, Math.min(1, (300 - len) / 140));
      if (fade <= 0) continue;
      const sway = 10 * onScreenScale * Math.sin(((2 * Math.PI * t) / loopS) * 2 + m.phase);
      const x = focus.x + v.zoom * wrapTo(m.x * TILE.w * size - v.x, TILE.w * size) + sway;
      const y = focus.y + v.zoom * wrapTo(m.y * TILE.h * size - v.y, TILE.h * size);
      if (x < -len || x > VIDEO.width + len || y < -len || y > VIDEO.height + len) continue;
      ctx.globalAlpha = fade * (m.wave ? 0.2 : 0.24);
      if (!m.wave) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, len * 0.035), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
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
