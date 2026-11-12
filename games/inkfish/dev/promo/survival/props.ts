import { INK, PAPER } from '../../../src/art/pen';
import { clamp01, smooth } from '../short';
import { drawCard, drawText, INK_ON_PAPER, PAPER_ON_INK, RED, YELLOW, YELLOW_ON_INK } from '../swallowyou/text';
import { BOWL, LOG, type Rect } from './layout';
import { inkPath } from './tank';
import { T } from './timeline';

/**
 * What each round adds to the tank: the thermometer (°F big, °C under it),
 * the salt shaker and its gauge, the drained tank's log and the 24-hour
 * clock, round 1's sign and stopwatch, the goldfish's bowl, and the final's
 * VS badge and 4-day calendar.
 */

interface Key { readonly t: number; readonly v: number }

function curve(keys: readonly Key[], t: number): number {
  if (t <= keys[0]!.t) return keys[0]!.v;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    if (t < b.t) return a.v + (b.v - a.v) * smooth((t - a.t) / Math.max(1e-6, b.t - a.t));
  }
  return keys[keys.length - 1]!.v;
}

const HEAT: readonly Key[] = [
  { t: T.warm, v: 60 }, { t: T.f72, v: 72 }, { t: T.f57 - 0.05, v: 72 }, { t: T.f57 + 0.35, v: 57 },
  { t: T.f79 - 1.5, v: 57 }, { t: T.f79 + 0.4, v: 79 }, { t: T.salmonOut + 0.4, v: 79 }, { t: T.f99, v: 99 }, { t: T.f100, v: 100 },
];

/** The water's temperature, °F: round 2 only (60 °F outside it). */
export function tempF(t: number): number {
  if (t < T.heat || t > T.round3 - 0.6) return 60;
  return curve(HEAT, t);
}

export const toC = (f: number): number => ((f - 32) * 5) / 9;

/** Salt, ppt: the sea in round 3; brine (2x) then fresh water in the final. */
export function saltAt(t: number): number {
  if (t >= T.final - 0.6) return curve([{ t: T.brine, v: 0 }, { t: T.brine + 1.6, v: 70 }, { t: T.fresh, v: 70 }, { t: T.fresh + 1.6, v: 0 }], t);
  if (t >= T.round3 - 0.6 && t < T.drain) return curve([{ t: T.into, v: 0 }, { t: T.into + 2.2, v: 35 }], t);
  return 0;
}

/** The thermometer standing in the tank's right side, sliding in on "turn up the heat". */
export function drawThermometer(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const f = tempF(t);
  const slide = (1 - alpha) * 260;
  const x = 1745 + slide;
  const top = 300;
  const bulb = 860;
  const lo = 50;
  const hi = 110;
  const yOf = (v: number): number => bulb - 50 - ((v - lo) / (hi - lo)) * (bulb - 50 - top - 20);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(x - 24, top, 48, bulb - top, 24);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, bulb, 40, 0, Math.PI * 2);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.fillRect(x - 11, yOf(f), 22, bulb - yOf(f));
  // Marks every 10 °F, the 100 °F line in red.
  for (let v = 60; v <= 110; v += 10) {
    const y = yOf(v);
    ctx.strokeStyle = v === 100 ? RED : INK;
    ctx.lineWidth = v === 100 ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 24, y);
    ctx.lineTo(x + 40, y);
    ctx.stroke();
  }
  ctx.restore();
  // The reading: °F big, °C under it.
  const shown = f >= 99.95 ? '100.0' : Math.round(f).toString();
  drawCard(ctx, x - 250 + slide * 0, 270, 190, 140, alpha);
  drawText(ctx, `${shown} °F`, { x: x - 155, y: 322, size: 60, maxWidth: 170 }, 700, alpha, INK_ON_PAPER);
  drawText(ctx, `${toC(f).toFixed(f >= 99.95 ? 1 : 0)} °C`, { x: x - 155, y: 376, size: 40, maxWidth: 170 }, 700, alpha, INK_ON_PAPER);
  // Heat shimmer over the water.
  const hot = clamp01((f - 75) / 25);
  if (hot > 0) {
    ctx.save();
    ctx.globalAlpha = alpha * hot * 0.35;
    ctx.strokeStyle = '#fff1c8';
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const x0 = 200 + i * 180;
      const rise = (t * 60 + i * 97) % 500;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const y = 880 - rise - k * 14;
        const xx = x0 + Math.sin(k * 0.9 + t * 3 + i) * 10;
        if (k === 0) ctx.moveTo(xx, y);
        else ctx.lineTo(xx, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** The salt shaker tipping over the tank and pouring. */
export function drawShaker(ctx: CanvasRenderingContext2D, t: number, from: number, x = 960): void {
  const a = smooth((t - from + 0.4) / 0.4) * (1 - smooth((t - from - 2.6) / 0.4));
  if (a <= 0) return;
  const tip = smooth((t - from) / 0.5) * 2.3;
  ctx.save();
  ctx.globalAlpha = a;
  // Grains falling from the holes.
  if (t > from + 0.4) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 70; i++) {
      const life = ((t - from) * 1.6 + i * 0.137) % 1;
      const gx = x + 70 + Math.sin(i * 12.9) * 34 + life * 20;
      const gy = 250 + life * 560;
      ctx.globalAlpha = a * (1 - life);
      ctx.fillRect(gx, gy, 5, 5);
    }
    ctx.globalAlpha = a;
  }
  ctx.translate(x, 170);
  ctx.rotate(tip);
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-50, -90, 100, 170, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b9c2cc';
  ctx.beginPath();
  ctx.roundRect(-50, 60, 100, 40, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  for (const [hx, hy] of [[-18, 80], [0, 76], [18, 80], [-9, 90], [9, 90]] as const) {
    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.rotate(-Math.PI / 2);
  drawText(ctx, 'SALT', { x: 10, y: 0, size: 40, maxWidth: 140 }, 700, a, INK_ON_PAPER);
  ctx.restore();
}

/** A salinity gauge in a tank's right side: 0–80 ppt, the sea marked, and its reading. */
export function drawGauge(ctx: CanvasRenderingContext2D, r: Rect, ppt: number, alpha: number, line20 = 0): void {
  if (alpha <= 0) return;
  const x = r.x + r.w - 70;
  const top = 300;
  const bottom = 840;
  const yOf = (v: number): number => bottom - (v / 80) * (bottom - top);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,250,240,0.9)';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(x - 22, top, 44, bottom - top, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(x - 13, yOf(ppt), 26, bottom - yOf(ppt) - 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 13, yOf(ppt), 26, bottom - yOf(ppt) - 4);
  // The sea's mark.
  ctx.strokeStyle = '#1d6fb8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 34, yOf(35));
  ctx.lineTo(x + 34, yOf(35));
  ctx.stroke();
  if (line20 > 0) {
    ctx.save();
    ctx.globalAlpha = alpha * line20;
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = RED;
    ctx.beginPath();
    ctx.moveTo(x - 160, yOf(20));
    ctx.lineTo(x + 34, yOf(20));
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  drawText(ctx, 'the sea · 35 ppt', { x: x - 150, y: yOf(35) - 28, size: 36, maxWidth: 240 }, 700, alpha, PAPER_ON_INK);
  if (line20 > 0) drawText(ctx, '20 ppt', { x: x - 110, y: yOf(20) - 24, size: 34, maxWidth: 140 }, 700, alpha * line20, { fill: RED, halo: PAPER });
  const twice = ppt >= 69;
  const reading = twice ? '2x · 70 ppt' : `${Math.round(ppt)} ppt`;
  drawCard(ctx, x - 120, bottom + 6, 170, 56, alpha);
  drawText(ctx, reading, { x: x - 35, y: bottom + 36, size: 38, maxWidth: 150 }, 700, alpha, INK_ON_PAPER);
  drawText(ctx, 'SALT', { x, y: top - 26, size: 36, maxWidth: 120 }, 700, alpha, PAPER_ON_INK);
}

/** Round 1's sign over the tank and its staged 5-minute stopwatch. */
export function drawStopSign(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const swing = Math.sin(t * 1.3) * 0.03;
  ctx.save();
  ctx.translate(960, 196);
  ctx.rotate(swing);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (const sx of [-200, 200]) {
    ctx.beginPath();
    ctx.moveTo(sx, -60);
    ctx.lineTo(sx * 0.9, 30);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.translate(960, 196);
  ctx.rotate(swing);
  drawCard(ctx, -260, 30, 520, 96, alpha, RED);
  drawText(ctx, 'STOP SWIMMING', { x: 0, y: 80, size: 64, maxWidth: 480 }, 700, alpha, { fill: PAPER, halo: '#5a0d0a' });
  ctx.restore();
  // The stopwatch: 5:00 counting down, staged.
  const left = Math.max(0, 300 * (1 - clamp01((t - T.fiveMin) / (T.eight - T.fiveMin))));
  const m = Math.floor(left / 60);
  const s = Math.floor(left % 60).toString().padStart(2, '0');
  const a = alpha * smooth((t - T.fiveMin + 0.2) / 0.3);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(1360, 290, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(1348, 214, 24, 16);
  ctx.strokeRect(1348, 214, 24, 16);
  ctx.restore();
  drawText(ctx, `${m}:${s}`, { x: 1360, y: 294, size: 50, maxWidth: 110 }, 700, a, INK_ON_PAPER);
}

/** The goldfish's bowl on the stage, behind its fish. */
export function drawBowlBack(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(BOWL.x, BOWL.y, BOWL.r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(210,235,245,0.35)';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#5ec3ec';
  ctx.fillRect(BOWL.x - BOWL.r, BOWL.y - BOWL.r * 0.45, BOWL.r * 2, BOWL.r * 2);
  ctx.restore();
  ctx.restore();
}

/** The bowl's glass over its fish. */
export function drawBowlFront(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(BOWL.x, BOWL.y, BOWL.r, -Math.PI * 0.32, Math.PI * 1.32);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(BOWL.x, BOWL.y - BOWL.r * 0.85, BOWL.r * 0.5, 12, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(BOWL.x, BOWL.y, BOWL.r * 0.78, Math.PI * 1.05, Math.PI * 1.35);
  ctx.stroke();
  ctx.restore();
}

/** The log the drained tank leaves: its body, then whatever hides in its hollow end, then the rim. */
export function drawLog(ctx: CanvasRenderingContext2D, alpha: number, inside: () => void): void {
  if (alpha <= 0) return;
  const { x0, x1, y, r } = LOG;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#7a5434';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x0, y - r);
  ctx.lineTo(x1, y - r);
  ctx.ellipse(x1, y, r * 0.45, r, 0, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x0, y + r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Bark.
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(30,16,6,0.7)';
  for (let i = 0; i < 9; i++) {
    const bx = x0 + 50 + i * 46;
    ctx.beginPath();
    ctx.moveTo(bx, y - r + 8);
    ctx.quadraticCurveTo(bx + 14, y, bx - 4, y + r - 10);
    ctx.stroke();
  }
  // The hollow end.
  ctx.fillStyle = '#4a3120';
  ctx.beginPath();
  ctx.ellipse(x0, y, r * 0.5, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  inside();
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.fillStyle = '#c8a27a';
  ctx.beginPath();
  ctx.ellipse(x0, y, r * 0.5, r, 0, 0, Math.PI * 2);
  ctx.ellipse(x0, y, r * 0.36, r * 0.8, 0, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.stroke();
  ctx.restore();
}

/** Round 4's clock: hours of damp air ticking up to 24, then days spinning by for the rivulus. */
export function drawClock(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const hours = 24 * smooth((t - T.h24) / (T.mudFine4 - T.h24));
  const days = 1 + 65 * smooth((t - T.tiny - 0.6) / (T.days66 - T.tiny - 0.6));
  const spinning = t > T.tiny + 0.6;
  const turns = spinning ? 2 + days * 2 : hours / 12;
  const x = 960;
  const y = 320;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, 66, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * 52, y - Math.cos(a) * 52);
    ctx.lineTo(x + Math.sin(a) * 60, y - Math.cos(a) * 60);
    ctx.stroke();
  }
  const a = turns * Math.PI * 2;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.sin(a) * 46, y - Math.cos(a) * 46);
  ctx.stroke();
  ctx.restore();
  const label = spinning ? `DAY ${Math.floor(days)}` : `${Math.floor(hours)} h`;
  drawCard(ctx, x - 90, y + 76, 180, 60, alpha);
  drawText(ctx, label, { x, y: y + 108, size: 44, maxWidth: 160 }, 700, alpha, INK_ON_PAPER);
}

/** The final's VS badge between the two tanks. */
export function drawVs(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  const k = 0.7 + 0.3 * alpha;
  ctx.save();
  ctx.translate(960, 560);
  ctx.scale(k, k);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = RED;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawText(ctx, 'VS', { x: 960, y: 566, size: 80 * k, maxWidth: 120 }, 700, alpha, { fill: PAPER, halo: '#5a0d0a' });
}

/** The final's calendar over the mudskipper's tank: four days flipping by. */
export function drawCalendar(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const day = Math.min(4, 1 + Math.floor(3.999 * clamp01((t - T.mudFresh - 0.9) / (T.fourDays + 0.3 - T.mudFresh - 0.9))));
  const flip = ((t - T.mudFresh - 0.9) * (3 / (T.fourDays + 0.3 - T.mudFresh - 0.9))) % 1;
  drawCard(ctx, 120, 250, 230, 200, alpha);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = RED;
  ctx.fillRect(120, 250, 230, 52);
  ctx.restore();
  drawText(ctx, 'FRESH WATER', { x: 235, y: 278, size: 32, maxWidth: 210 }, 700, alpha, { fill: PAPER, halo: '#5a0d0a' });
  const k = day < 4 && flip > 0.8 ? 1 - (flip - 0.8) * 5 : 1;
  drawText(ctx, `DAY ${day}`, { x: 235, y: 380 - (1 - k) * 20, size: 76, maxWidth: 210 }, 700, alpha * Math.max(0.2, k), INK_ON_PAPER);
}

/** The hero tuna's breathing, drawn on: water rushing in at the mouth and out over the gills. */
export function drawFlow(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const nose = x + len / 2;
  const gill = x + len * 0.22;
  const dash = (t * 120) % 40;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.setLineDash([22, 18]);
  ctx.lineDashOffset = -dash;
  ctx.beginPath();
  ctx.moveTo(nose + 200, y);
  ctx.lineTo(nose + 10, y);
  ctx.moveTo(gill, y - len * 0.06);
  ctx.quadraticCurveTo(gill - 60, y - len * 0.3, gill - 190, y - len * 0.32);
  ctx.moveTo(gill, y + len * 0.06);
  ctx.quadraticCurveTo(gill - 60, y + len * 0.3, gill - 190, y + len * 0.32);
  ctx.stroke();
  ctx.restore();
  drawText(ctx, 'in at the mouth', { x: nose + 130, y: y - 46, size: 38, maxWidth: 300 }, 700, alpha, YELLOW_ON_INK);
  drawText(ctx, 'out over the gills', { x: gill - 120, y: y - len * 0.32 - 44, size: 38, maxWidth: 320 }, 700, alpha, YELLOW_ON_INK);
  void inkPath;
}
