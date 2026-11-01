import { makeCanvas } from '../../../src/art/pen';
import { drawCapeFurSeal, prepareSeal, type SealLook } from '../seal/art/capeFurSeal';
import { VIDEO } from '../short';
import type { Placed } from '../seal/story';

/**
 * The sea lion: the Cape fur seal's painted drawing (../seal/art/capeFurSeal.ts,
 * a fur seal is a close relative) with a warmer chocolate brown laid over it.
 * Drawn nose right in its own units (310 long, middle at 0,0), placed by a Placed.
 */

const WARM = 'rgba(122,66,28,0.34)';
let scratch: ReturnType<typeof makeCanvas> | null = null;

export function drawSeaLion(ctx: CanvasRenderingContext2D, p: Placed, look: SealLook, boil: number): void {
  scratch ??= makeCanvas(VIDEO.width, VIDEO.height);
  const s = scratch.ctx;
  const r = p.len * 1.1;
  const x0 = Math.max(0, Math.floor(p.x - r));
  const y0 = Math.max(0, Math.floor(p.y - r));
  const w = Math.min(VIDEO.width, Math.ceil(p.x + r)) - x0;
  const h = Math.min(VIDEO.height, Math.ceil(p.y + r)) - y0;
  if (w <= 0 || h <= 0) return;
  s.save();
  s.globalCompositeOperation = 'source-over';
  s.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawCapeFurSeal(s, p, look, boil);
  s.globalCompositeOperation = 'source-atop';
  s.fillStyle = WARM;
  s.fillRect(x0, y0, w, h);
  s.restore();
  ctx.drawImage(scratch.canvas, x0, y0, w, h, x0, y0, w, h);
}

export function prepareAnimals(): void {
  prepareSeal();
}
