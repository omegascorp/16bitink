import { drawTextLine } from '../captions';
import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { drawOrca } from '../foodchain/art/orca';
import { lerp, ramp, VIDEO } from '../short';
import { tinted } from './paint';
import { placeLabel, TEXT } from './script';
import { drawRays, drawSnow, drawVignette, drawWater, type Rgb } from './sea';
import { A_AT, cycles, OFF_AT, until, wrap } from './story';

/**
 * "Off Mexico," (tension): wide on the blue water of the Gulf of California,
 * the bright surface rippling at the top. The pod, small and hazy, cruises in
 * from the right; a young great white swims on, unaware, lower left. The
 * camera creeps in. "Gulf of California" / "Mexico" written over the water.
 */

const GULF_TOP: Rgb = [40, 112, 160];
const GULF_MID: Rgb = [16, 58, 104];
const GULF_BOTTOM: Rgb = [4, 18, 44];
const HAZE = '#1d4f80';
const SPOKEN = '#f5c84a';
const HALO = '#06142a';

/** The surface: a bright, rippling band at the top. */
function drawSurface(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, 170);
  g.addColorStop(0, 'rgba(200,236,255,0.55)');
  g.addColorStop(1, 'rgba(200,236,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, 170);
  ctx.strokeStyle = 'rgba(235,250,255,0.6)';
  ctx.lineWidth = 4;
  for (let row = 0; row < 3; row++) {
    ctx.beginPath();
    for (let x = -20; x <= VIDEO.width + 20; x += 20) {
      const y = 40 + row * 34 + 8 * Math.sin(x / 70 + cycles(6, t) + row) + 4 * Math.sin(x / 31 - cycles(9, t));
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.globalAlpha = 0.7 - row * 0.2;
    ctx.stroke();
  }
  ctx.restore();
}

/** The pod: three orcas, small and hazy, swimming left. */
const POD = [
  { x: 820, y: 700, len: 430, phase: 0 },
  { x: 1000, y: 830, len: 360, phase: 1.7 },
  { x: 700, y: 900, len: 300, phase: 3.1 },
] as const;

export function drawGulf(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number): void {
  const u = wrap(t);
  const span = ramp(u, OFF_AT - 0.4, A_AT + 0.1) * until(u, A_AT + 0.1);
  const zoom = lerp(1, 1.08, span);
  drawWater(ctx, sheet, GULF_TOP, GULF_MID, GULF_BOTTOM);
  drawSurface(ctx, t);
  drawRays(ctx, t, 1.3, -60, '215,240,255');
  drawSnow(ctx, t, '#e0f0ff', 0.7);
  ctx.save();
  ctx.translate(540, 820);
  ctx.scale(zoom, zoom);
  ctx.translate(-540, -820);
  // The pod cruising in from the right.
  const drift = lerp(60, -120, span);
  tinted(ctx, (c) => {
    for (const o of POD) {
      drawOrca(c, o.x + drift, o.y + 6 * Math.sin(cycles(3, t) + o.phase), o.len, Math.PI + 0.04 * Math.sin(cycles(2, t) + o.phase), t, { tail: cycles(13, t) + o.phase }, true);
    }
  }, HAZE, 0.42);
  // The young great white, lower left, heading right, unaware.
  tinted(ctx, (c) => drawGreatWhite(c, lerp(200, 300, span), 1010 + 8 * Math.sin(cycles(3, t)), 320, -0.03, t, { tail: cycles(19, t) }), HAZE, 0.3);
  ctx.restore();
  // The place.
  const a = placeLabel(t);
  drawTextLine(ctx, 'Gulf of California', VIDEO.width / 2, TEXT.place.y, TEXT.place.size, 700, a, { fill: '#f4eddc', halo: HALO });
  drawTextLine(ctx, 'Mexico', VIDEO.width / 2, TEXT.placeSub.y, TEXT.placeSub.size, 700, a, { fill: SPOKEN, halo: HALO });
  drawVignette(ctx, 0.5, '2,8,22');
}
