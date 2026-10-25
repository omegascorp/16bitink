import { INK, type Pt } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { clamp01, lerp, ramp, VIDEO } from '../short';
import { TEXT } from './script';
import { css, drawRays, drawSnow, drawVignette, drawWater, glow, mixRgb, type Rgb, wash } from './sea';
import {
  cycles, depthAt, depthReadoutAt, fallAt, MONTHS_AT, PLUNGED_AT, tempAt, thermoAt, TURNED_AT, WARM_AT, warmAt, wrap,
} from './story';
import { drawShark, drawTag, poseWith, TAG_ON_FIN } from './tag';

/**
 * Months later: the tag on the fin, close up; then the plunge, the camera
 * falling with the tag (the shark fading into the dark, snow streaking up,
 * a depth line from the surface, the readout counting to 580 m); then the
 * water around it turning warm: a thermometer shooting from 8 °C to 26 °C
 * and the cold blue giving way to a red-orange glow.
 */

/** Where the tag sits on screen throughout. */
export const TAG_AT: Pt = { x: 560, y: 780 };

const SPOKEN = '#f5c84a';
const ICE = '#dff0ff';
const HALO = '#050914';

/** The water by depth: mid blue at the surface's months-later calm, near black at 580 m; then warm. */
const MID_TOP: Rgb = [30, 70, 120];
const MID_MID: Rgb = [16, 42, 84];
const MID_BOTTOM: Rgb = [6, 18, 42];
const DEEP_TOP: Rgb = [6, 10, 24];
const DEEP_MID: Rgb = [3, 6, 15];
const DEEP_BOTTOM: Rgb = [1, 2, 6];
const WARM_TOP: Rgb = [70, 16, 10];
const WARM_MID: Rgb = [120, 34, 14];
const WARM_BOTTOM: Rgb = [40, 8, 6];

const ftOf = (m: number): string => (Math.round((m * 3.281) / 10) * 10).toLocaleString('en-US');

function drawDepthLine(ctx: CanvasRenderingContext2D, alpha: number, t: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  const g = ctx.createLinearGradient(0, 0, 0, TAG_AT.y);
  g.addColorStop(0, 'rgba(160,220,255,0)');
  g.addColorStop(1, `rgba(190,235,255,${0.85 * alpha})`);
  ctx.strokeStyle = g;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(TAG_AT.x + 30, 0);
  ctx.lineTo(TAG_AT.x + 30, TAG_AT.y - 20);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255,255,255,${0.7 * alpha})`;
  ctx.stroke();
  // A ruler on the right, its ticks running up past as the tag falls.
  const off = (depthAt(t) * 9) % 120;
  ctx.strokeStyle = `rgba(200,225,250,${0.55 * alpha})`;
  for (let y = -off; y < VIDEO.height; y += 120) {
    for (let k = 0; k < 4; k++) {
      const yy = y + k * 30;
      ctx.lineWidth = k === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(1010, yy);
      ctx.lineTo(k === 0 ? 950 : 980, yy);
      ctx.stroke();
    }
  }
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(1010, 0);
  ctx.lineTo(1010, VIDEO.height);
  ctx.stroke();
  ctx.restore();
}

/** A glass thermometer by the tag, its column at `c` °C (scale 0 .. 30 °C). */
function drawThermometer(ctx: CanvasRenderingContext2D, c: number, alpha: number, warm: number): void {
  if (alpha <= 0) return;
  const x = 200;
  const top = 520;
  const bottom = 1020;
  const level = lerp(bottom - 40, top + 30, clamp01(c / 30));
  const red = css(mixRgb([90, 170, 230], [235, 70, 40], warm));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  // Glass.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 50;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(235,245,255,0.92)';
  ctx.lineWidth = 42;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, bottom + 28, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.arc(x, bottom + 28, 37, 0, Math.PI * 2);
  ctx.fill();
  // The column.
  ctx.strokeStyle = red;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(x, bottom + 10);
  ctx.lineTo(x, level);
  ctx.stroke();
  // Ticks and a glint.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (let d = 0; d <= 30; d += 5) {
    const y = lerp(bottom - 40, top + 30, d / 30);
    ctx.beginPath();
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + 20, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x - 12, top + 20);
  ctx.lineTo(x - 12, bottom - 30);
  ctx.stroke();
  ctx.restore();
  if (warm > 0.2) glow(ctx, x, bottom + 28, 160 * warm, '255,120,60', 0.5 * warm * alpha);
}

/** Rings of warmth pulsing out from the tag. */
function drawHeat(ctx: CanvasRenderingContext2D, warm: number, t: number): void {
  if (warm <= 0.01) return;
  ctx.save();
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const p = ((t * 0.9 + i / 4) % 1 + 1) % 1;
    ctx.strokeStyle = `rgba(255,190,120,${(0.45 * warm * (1 - p)).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(TAG_AT.x + 30, TAG_AT.y, 80 + p * 420, 60 + p * 320, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawDive(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number, _boil: number): void {
  const u = wrap(t);
  const depth = depthAt(t);
  const deep = clamp01(depth / 300);
  const warm = warmAt(t);
  const top = mixRgb(mixRgb(MID_TOP, DEEP_TOP, deep), WARM_TOP, warm);
  const mid = mixRgb(mixRgb(MID_MID, DEEP_MID, deep), WARM_MID, warm);
  const bottom = mixRgb(mixRgb(MID_BOTTOM, DEEP_BOTTOM, deep), WARM_BOTTOM, warm);
  drawWater(ctx, sheet, top, mid, bottom);
  drawRays(ctx, t, 1 - deep);
  const fall = fallAt(t);
  drawSnow(ctx, t, warm > 0.5 ? '#ffd9b8' : '#dfe8ff', 1, depth * 9, fall * 90);
  // The shark, pushing in to the fin, then nosing down into the plunge and fading into the dark.
  const push = ramp(u, MONTHS_AT - 0.25, MONTHS_AT + 0.6);
  const len = lerp(1500, 2300, push) * (1 - 0.25 * ramp(u, PLUNGED_AT, PLUNGED_AT + 1));
  const dive = 0.55 * ramp(u, PLUNGED_AT - 0.1, PLUNGED_AT + 0.6);
  const pose = poseWith(TAG_AT, TAG_ON_FIN, len, dive + 0.02 * Math.sin(cycles(4, t)), false);
  const fade = ramp(u, PLUNGED_AT + 0.2, PLUNGED_AT + 1.4);
  drawShark(ctx, pose, t, { tail: cycles(21, t) }, { swing: 0.12 * Math.sin(cycles(17, t)) });
  wash(ctx, 'source-over', css(mid), 0.9 * fade);
  drawHeat(ctx, warm, u);
  // The tag again, over the dark, glowing as a beacon.
  if (fade > 0) {
    const back = poseWith(TAG_AT, TAG_ON_FIN, len, dive, false);
    const angle = Math.PI + dive + 0.1;
    drawTag(ctx, TAG_AT.x, TAG_AT.y, (78 * back.length) / 1000, angle, { glow: (0.4 + 0.6 * warm) * fade, swing: 0.1 * Math.sin(cycles(17, t)), alpha: fade });
  }
  drawDepthLine(ctx, fall * (1 - warm), t);
  drawThermometer(ctx, tempAt(t), thermoAt(t), warm);
  wash(ctx, 'soft-light', '#ff8a3a', 0.35 * warm);
  drawVignette(ctx, 0.6, warm > 0.5 ? '20,2,0' : '1,4,10');
  // The readouts at the top.
  const dr = depthReadoutAt(t);
  if (dr > 0) {
    const m = Math.round(depth / 10) * 10;
    const done = depth > 579;
    drawTextLine(ctx, `${done ? 580 : m} m`, VIDEO.width / 2 - 40, TEXT.depth.y, TEXT.depth.size, 700, dr, { fill: done ? SPOKEN : ICE, halo: HALO });
    drawTextLine(ctx, `(${done ? '1,900' : ftOf(m)} ft)`, VIDEO.width / 2 - 40, TEXT.depthFt.y, TEXT.depthFt.size, 700, dr, { fill: done ? SPOKEN : ICE, halo: HALO });
  }
  const th = thermoAt(t);
  if (th > 0) {
    const c = tempAt(t);
    const f = Math.round(lerp(46, 78, (c - 8) / 18));
    const hot = ramp(u, TURNED_AT, WARM_AT + 0.3);
    const fill = css(mixRgb([223, 240, 255], [255, 170, 80], hot));
    drawTextLine(ctx, `${Math.round(c)} °C (${f} °F)`, VIDEO.width / 2 + 60, TEXT.temp.y, TEXT.temp.size, 700, th, { fill, halo: HALO });
  }
}
