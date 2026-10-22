import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine } from '../captions';
import { clamp01, VIDEO } from '../short';
import { CHALK, INK_BG } from './scene';
import { cycles, LOOP_S, onWhale, toScreen, type View, type WhalePose } from './story';
import { headOutline, rimsOf } from './whale';

/**
 * The water and the marks in pale chalk: water pouring off the jaws and the
 * ballooned throat, the white churn where the whale breaks the surface, the
 * burst's spray, the spit's jet and the kayak's landing splash; then the
 * "!" of alarm, coughs, the bonk, the stopwatch and the ⏪ of a rewind.
 */

const GRAVITY = 2400;

/**
 * Water streaming off the lips and throat down to the surface: from each
 * point of the rims above the water, a faint thread all the way down and a
 * few brighter streaks falling along it, tapering, faster as they fall, and
 * drops breaking off. `amount` 0 .. 1.
 */
export function drawPouring(ctx: CanvasRenderingContext2D, v: View, w: WhalePose, amount: number, t: number): void {
  if (amount <= 0.01) return;
  const rims = rimsOf(w);
  const from = [...rims.lower.filter((_, i) => i % 2 === 0), ...rims.throat.filter((_, i) => i % 2 === 1 && i < 16), ...rims.upper.filter((_, i) => i % 3 === 1)];
  ctx.save();
  ctx.lineCap = 'round';
  from.forEach((local, i) => {
    const p = onWhale(w, local);
    if (p.y > -12) return;
    const drop = -p.y;
    const top = toScreen(v, p);
    const sway = 5 * Math.sin(i * 2.7);
    const bottom = toScreen(v, { x: p.x + sway, y: 0 });
    const width = (3 + 2.5 * ((i * 7) % 3)) * v.zoom;
    ctx.globalAlpha = amount * 0.16;
    ctx.strokeStyle = CHALK;
    ctx.lineWidth = width * 1.8;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(top.x + sway * 0.3 * v.zoom, (top.y + bottom.y) / 2, bottom.x, bottom.y);
    ctx.stroke();
    for (let k = 0; k < 3; k++) {
      // Each streak falls the whole way a whole number of times a loop, accelerating.
      const f = ((t * (18 + 3 * ((i + k) % 3))) / LOOP_S + k / 3 + i * 0.137) % 1;
      const y0 = drop * f * f;
      const len = Math.min(drop - y0, 30 + 120 * f);
      if (len < 6) continue;
      const a = toScreen(v, { x: p.x + sway * f, y: p.y + y0 });
      const b = toScreen(v, { x: p.x + sway * Math.min(1, f + 0.1), y: p.y + y0 + len });
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, 'rgba(236,242,240,0)');
      g.addColorStop(0.6, 'rgba(236,242,240,0.85)');
      g.addColorStop(1, 'rgba(236,242,240,0.3)');
      ctx.globalAlpha = amount * 0.85;
      ctx.strokeStyle = g;
      ctx.lineWidth = width * (0.6 + 0.5 * f);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (k === 0 && f > 0.4) {
        ctx.fillStyle = CHALK;
        ctx.beginPath();
        ctx.ellipse(b.x + (8 + 6 * (i % 2)) * v.zoom, b.y + 10 * v.zoom, 2.5 * v.zoom, 4.5 * v.zoom, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  ctx.restore();
}

/** The white churn where the whale's head meets the surface, `amount` 0 .. 1. */
export function drawChurn(ctx: CanvasRenderingContext2D, v: View, w: WhalePose, amount: number, t: number, boil: number): void {
  if (amount <= 0.01) return;
  const near = headOutline(w).map((p) => onWhale(w, p)).filter((p) => Math.abs(p.y) < 90);
  if (near.length === 0) return;
  const left = Math.min(...near.map((p) => p.x)) - 70;
  const right = Math.max(...near.map((p) => p.x)) + 70;
  const pen = new Pen(ctx, 811 + boil * 977, 1.2);
  ctx.save();
  for (let x = left, i = 0; x <= right; x += 17, i++) {
    const edge = clamp01(Math.min((x - left) / 90, (right - x) / 90));
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const rnd = seed - Math.floor(seed);
    const r = (9 + 16 * rnd + 6 * Math.abs(Math.sin(i * 1.3 + cycles(9, t)))) * edge * amount;
    if (r < 2) continue;
    const lift = 4 + 10 * rnd * Math.abs(Math.sin(i * 1.7 + cycles(7, t)));
    const p = toScreen(v, { x, y: -lift });
    // A grey underside, a bright top, a stroke of ink along its upper edge.
    pen.dot(p.x, p.y + r * 0.35 * v.zoom, r * v.zoom, '#9fb0ae', 0.75);
    pen.dot(p.x, p.y, r * 0.9 * v.zoom, '#f1f5f3', 0.92);
    if (i % 2) pen.hair([{ x: p.x - r * 0.8 * v.zoom, y: p.y - r * 0.2 * v.zoom }, { x: p.x, y: p.y - r * 0.85 * v.zoom }, { x: p.x + r * 0.7 * v.zoom, y: p.y - r * 0.35 * v.zoom }], 1.3, INK, 0.45);
    if (rnd > 0.6) pen.dot(p.x + r * v.zoom, p.y - (r + 18 * rnd) * v.zoom, 3 * v.zoom, '#f1f5f3', 0.85);
  }
  ctx.restore();
}

const SPRAY = (() => {
  const rng = createRng(25);
  return Array.from({ length: 46 }, () => ({ angle: -Math.PI / 2 + (rng() - 0.5) * 2.4, speed: 500 + rng() * 900, r: 3 + rng() * 7, delay: rng() * 0.12 }));
})();

/** Spray thrown up and out from `at` (world), `d` seconds after (0 .. ~1), `scale` its size. */
export function drawSpray(ctx: CanvasRenderingContext2D, v: View, at: Pt, d: number, scale = 1): void {
  if (d < 0 || d > 1.2) return;
  ctx.save();
  ctx.fillStyle = CHALK;
  for (const s of SPRAY) {
    const u = d - s.delay;
    if (u < 0) continue;
    const x = at.x + Math.cos(s.angle) * s.speed * scale * u;
    const y = at.y + Math.sin(s.angle) * s.speed * scale * u + 0.5 * GRAVITY * u * u;
    if (y > 10) continue;
    const p = toScreen(v, { x, y });
    ctx.globalAlpha = 0.85 * clamp01(1 - u / 1.1);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s.r * v.zoom * scale, s.r * 1.6 * v.zoom * scale, s.angle + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A crown of water splashing up round `at` (world, on the surface) as something lands, `d` seconds after, `width` across. */
export function drawSplashRing(ctx: CanvasRenderingContext2D, v: View, at: Pt, d: number, width: number): void {
  if (d < 0 || d > 0.6) return;
  const rise = Math.sin(Math.PI * clamp01(d / 0.5));
  const spread = 1 + 0.8 * d;
  const crown: Pt[] = [];
  const n = 11;
  for (let i = 0; i <= n; i++) {
    const f = i / n - 0.5;
    const peak = i % 2 === 0 ? 1 : 0.55;
    const h = 85 * rise * peak * (1 - (2 * f) ** 2 * 0.75);
    crown.push({ x: at.x + f * width * spread, y: at.y - h });
  }
  const base = [{ x: at.x + width * spread * 0.55, y: at.y + 8 }, { x: at.x - width * spread * 0.55, y: at.y + 8 }];
  const pts = [...crown, ...base].map((p) => toScreen(v, p));
  ctx.save();
  ctx.globalAlpha = 0.7 * (1 - ramp01(d, 0.3, 0.6));
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(236,242,240,0.6)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, 2 * v.zoom);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
  drawSpray(ctx, v, at, d, 0.55);
}

const ramp01 = (x: number, a: number, b: number): number => clamp01((x - a) / (b - a));

/** A jet of water out of the open mouth, from `from` along `dir` (world), `d` seconds into the spit. */
export function drawJet(ctx: CanvasRenderingContext2D, v: View, from: Pt, dir: Pt, d: number): void {
  if (d < 0 || d > 0.6) return;
  const len = 520 * Math.min(1, d * 5);
  const fade = 1 - d / 0.6;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = CHALK;
  for (let k = -3; k <= 3; k++) {
    const a = toScreen(v, from);
    const spread = k * 0.07;
    const c = Math.cos(spread);
    const s = Math.sin(spread);
    const dd = { x: dir.x * c - dir.y * s, y: dir.x * s + dir.y * c };
    const b = toScreen(v, { x: from.x + dd.x * len, y: from.y + dd.y * len + 0.5 * GRAVITY * 0.1 * d });
    ctx.globalAlpha = 0.5 * fade;
    ctx.lineWidth = (14 - Math.abs(k) * 3) * v.zoom;
    ctx.setLineDash([40 * v.zoom, 14 * v.zoom]);
    ctx.lineDashOffset = -d * 2000;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Little puffs of cough from `at` (screen), `d` seconds into the coughing. */
export function drawCough(ctx: CanvasRenderingContext2D, at: Pt, size: number, d: number, boil: number): void {
  if (d < 0 || d > 0.55) return;
  const pen = new Pen(ctx, 977 + boil * 31, 1);
  for (const [k, delay] of [[0, 0], [1, 0.2]] as const) {
    const u = d - delay;
    if (u < 0 || u > 0.35) continue;
    const x = at.x + size * (0.6 + 1.6 * u);
    const y = at.y - size * (0.2 + k * 0.4) - size * u;
    const r = size * (0.25 + 0.6 * u);
    ctx.save();
    ctx.globalAlpha = 1 - u / 0.35;
    for (const [dx, dy] of [[0, 0], [r * 0.7, -r * 0.3], [r * 0.5, r * 0.4]] as const) pen.dot(x + dx, y + dy, r * 0.55, CHALK, 0.95);
    pen.circle(x, y, r * 0.6, 1.6, INK);
    ctx.restore();
  }
}

/** A "!" popping up over a head (screen), `pop` 0 .. ~1.2. */
export function drawAlarm(ctx: CanvasRenderingContext2D, at: Pt, pop: number): void {
  if (pop <= 0) return;
  drawTextLine(ctx, '!', at.x, at.y, 110 * pop, 700, Math.min(1, pop * 2), { fill: '#f5c84a', halo: INK_BG });
}

/** The star of a bonk at `at` (screen), `b` 1 at the bonk falling to 0. */
export function drawBonk(ctx: CanvasRenderingContext2D, at: Pt, size: number, b: number): void {
  if (b <= 0.02) return;
  ctx.save();
  ctx.fillStyle = '#f5c84a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.globalAlpha = Math.min(1, b * 1.5);
  const r1 = size * (0.6 + 0.6 * (1 - b));
  const r0 = r1 * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2;
    const r = i % 2 ? r0 : r1;
    const p = { x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r };
    if (i) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A stopwatch (screen px), ticking a step a tick, popping in with `shown`. */
export function drawStopwatch(ctx: CanvasRenderingContext2D, at: Pt, r: number, shown: number, ticks: number, boil: number): void {
  if (shown <= 0.01) return;
  const pen = new Pen(ctx, 1213 + boil * 977, 1.1);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(shown, shown);
  ctx.rotate(0.05 * Math.sin(ticks * 2.1));
  pen.fill([{ x: -14, y: -r - 26 }, { x: 14, y: -r - 26 }, { x: 14, y: -r + 4 }, { x: -14, y: -r + 4 }], '#c9c3b2', 1);
  pen.closed([{ x: -14, y: -r - 26 }, { x: 14, y: -r - 26 }, { x: 14, y: -r + 4 }, { x: -14, y: -r + 4 }], 3, INK);
  pen.dot(0, 0, r, '#f4eddc', 1);
  pen.dot(0, 0, r * 0.86, '#fbf7ec', 1);
  pen.circle(0, 0, r, 4, INK);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pen.hair([{ x: Math.sin(a) * r * 0.72, y: -Math.cos(a) * r * 0.72 }, { x: Math.sin(a) * r * 0.84, y: -Math.cos(a) * r * 0.84 }], 3, INK, 0.9);
  }
  const hand = (ticks / 12) * Math.PI * 2;
  pen.stroke([{ x: 0, y: 0 }, { x: Math.sin(hand) * r * 0.7, y: -Math.cos(hand) * r * 0.7 }], 5, '#c8452c');
  pen.dot(0, 0, 6, INK, 1);
  ctx.restore();
}

/** Tape running back: a ⏪ at the top left, and faint streaks rolling down the picture. `amount` 0 .. 1. */
export function drawRewind(ctx: CanvasRenderingContext2D, amount: number, t: number): void {
  if (amount <= 0) return;
  ctx.save();
  ctx.fillStyle = CHALK;
  for (let i = 0; i < 3; i++) {
    const y = ((t * 1400 + i * 640) % (VIDEO.height + 200)) - 100;
    ctx.globalAlpha = 0.08 * amount;
    ctx.fillRect(0, y, VIDEO.width, 10 + i * 6);
  }
  const x = 150;
  const y = 380;
  const h = 76;
  ctx.globalAlpha = amount * (0.85 + 0.15 * Math.sin(t * 38));
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK_BG;
  for (const pass of ['halo', 'fill'] as const) {
    for (const dx of [0, h * 0.62]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y);
      ctx.lineTo(x + dx + h * 0.66, y - h / 2);
      ctx.lineTo(x + dx + h * 0.66, y + h / 2);
      ctx.closePath();
      if (pass === 'halo') ctx.stroke();
      else ctx.fill();
    }
  }
  ctx.restore();
}
