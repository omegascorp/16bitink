import { halo } from '../../../src/art/glowArt';
import { INK, Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine } from '../captions';
import { CHALK, INK_BG, PAPER_ON_INK, SPOKEN } from '../gulper/scenery';
import { VIDEO } from '../short';
import type { Mood } from './story';
import type { Pt } from './whale';

/**
 * The sea round the fight: the game's paper under a wash whose colour is the
 * beat's mood (cold near-black for the epic hook, blue near the surface,
 * red-black when it turns tense, violet for the sly ending), daylight
 * shrinking above as we sink, a faint light from above on the fight, marine
 * snow, the surface and its sky, the days racing over it, and the chalk
 * notes, paper on ink like the other deep shorts.
 */
export { CHALK, INK_BG, PAPER_ON_INK, SPOKEN };

type Rgb = readonly [number, number, number];
interface Wash {
  readonly top: Rgb;
  readonly mid: Rgb;
  readonly bottom: Rgb;
}

const EPIC: Wash = { top: [12, 20, 40], mid: [5, 9, 22], bottom: [2, 4, 10] };
const SHALLOW: Wash = { top: [62, 104, 140], mid: [28, 58, 92], bottom: [10, 26, 52] };
const TENSE: Wash = { top: [40, 12, 18], mid: [18, 6, 11], bottom: [6, 2, 4] };
const SURPRISED: Wash = { top: [28, 30, 74], mid: [14, 14, 44], bottom: [5, 5, 18] };
const SARCASTIC: Wash = { top: [10, 30, 32], mid: [5, 16, 18], bottom: [2, 7, 8] };
const MISCHIEVOUS: Wash = { top: [32, 12, 50], mid: [13, 6, 26], bottom: [4, 2, 10] };

const mixRgb = (a: Rgb, b: Rgb, u: number): Rgb => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const mixWash = (a: Wash, b: Wash, u: number): Wash => ({ top: mixRgb(a.top, b.top, u), mid: mixRgb(a.mid, b.mid, u), bottom: mixRgb(a.bottom, b.bottom, u) });
const css = (c: Rgb, alpha: number): string => `rgba(${c.map((v) => Math.round(v)).join(',')},${alpha})`;

/** The water's colour for a mood, lit by `daylight` (1 just under the surface). */
export function washOf(mood: Mood, daylight: number): Wash {
  let w = EPIC;
  w = mixWash(w, TENSE, mood.tense);
  w = mixWash(w, SURPRISED, mood.surprised);
  w = mixWash(w, SARCASTIC, mood.sarcastic);
  w = mixWash(w, MISCHIEVOUS, mood.mischievous);
  return mixWash(w, SHALLOW, daylight);
}

export function drawWater(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, wash: Wash): void {
  ctx.drawImage(sheet, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, css(wash.top, 0.95));
  g.addColorStop(0.55, css(wash.mid, 0.96));
  g.addColorStop(1, css(wash.bottom, 0.97));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** The daylight above as we sink: a glow at the top of the screen that shrinks and fades with depth, and a shaft of it down the water. */
export function drawDaylight(ctx: CanvasRenderingContext2D, daylight: number, x: number, waterline: number): void {
  if (daylight <= 0.01) return;
  const top = Math.max(-300, waterline);
  const r = 250 + 1300 * daylight;
  // Only under the water: the sky has its own light.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, Math.max(0, waterline), VIDEO.width, VIDEO.height);
  ctx.clip();
  halo(ctx, x, top - r * 0.25, r, '#cfe3f0', 0.35 * daylight);
  ctx.restore();
  // The shaft: a soft column of light narrowing into the dark.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(40px)';
  const len = 2400;
  const g = ctx.createLinearGradient(0, top, 0, top + len);
  g.addColorStop(0, `rgba(200,225,240,${(0.2 * daylight).toFixed(3)})`);
  g.addColorStop(1, 'rgba(200,225,240,0)');
  ctx.fillStyle = g;
  const w = 160 + 420 * daylight;
  ctx.beginPath();
  ctx.moveTo(x - w, top);
  ctx.lineTo(x + w, top);
  ctx.lineTo(x + w * 0.35, top + len);
  ctx.lineTo(x - w * 0.35, top + len);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The faint light from above on the fight: a pale cone down to it and a pool round it (screen px). */
export function drawPool(ctx: CanvasRenderingContext2D, at: Pt, r: number, strength: number): void {
  if (strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // A soft-edged cone from above, fading out before it reaches the bottom of the pool.
  ctx.filter = 'blur(50px)';
  const cone = ctx.createLinearGradient(0, at.y - 1700, 0, at.y + r * 0.3);
  cone.addColorStop(0, 'rgba(150,175,215,0)');
  cone.addColorStop(0.75, `rgba(150,175,215,${(0.09 * strength).toFixed(3)})`);
  cone.addColorStop(1, 'rgba(150,175,215,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(at.x + 120, at.y - 1700);
  ctx.lineTo(at.x + 380, at.y - 1700);
  ctx.lineTo(at.x + r * 0.8, at.y + r * 0.3);
  ctx.lineTo(at.x - r * 0.8, at.y + r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.filter = 'none';
  const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, r);
  g.addColorStop(0, `rgba(160,180,220,${(0.24 * strength).toFixed(3)})`);
  g.addColorStop(0.5, `rgba(140,160,210,${(0.09 * strength).toFixed(3)})`);
  g.addColorStop(1, 'rgba(140,160,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(at.x - r, at.y - r, 2 * r, 2 * r);
  ctx.restore();
}

/** The sky over the surface, when the waterline is on screen. */
export function drawSky(ctx: CanvasRenderingContext2D, waterline: number): void {
  if (waterline < -10) return;
  const sky = ctx.createLinearGradient(0, 0, 0, waterline);
  sky.addColorStop(0, '#e2d7bf');
  sky.addColorStop(1, '#f6efdf');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, waterline);
  halo(ctx, 860, waterline - 260, 260, '#fff3cf', 0.5);
}

/** Over the picture under the waterline: a veil of water on whatever is below it, and the inked waterline. */
export function drawSurfaceFilm(ctx: CanvasRenderingContext2D, waterline: number, boil: number, loop: number): void {
  if (waterline < -10 || waterline > VIDEO.height) return;
  ctx.save();
  ctx.fillStyle = 'rgba(40,82,120,0.2)';
  ctx.fillRect(0, waterline, VIDEO.width, VIDEO.height - waterline);
  const band = ctx.createLinearGradient(0, waterline, 0, waterline + 80);
  band.addColorStop(0, 'rgba(190,215,232,0.35)');
  band.addColorStop(1, 'rgba(190,215,232,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, waterline, VIDEO.width, 80);
  const pen = new Pen(ctx, 9001 + boil * 977, 0.8);
  const wave = Array.from({ length: 28 }, (_, i) => ({ x: (i / 27) * (VIDEO.width + 40) - 20, y: waterline + 4 * Math.sin(i * 1.3 + 2 * Math.PI * loop * 6) }));
  pen.stroke(wave, 2.6, INK, 1, true);
  ctx.restore();
}

const SPRAY = (() => {
  const rng = createRng(77);
  return Array.from({ length: 46 }, () => ({ a: (rng() - 0.5) * 0.5, d: 0.3 + rng() * 0.7, r: 3 + rng() * 6, lag: rng() * 0.25 }));
})();

/** The blow: a bushy spout angled forward and up from the blowhole (screen px), `u` 0 → 1 over its life, `size` px for its full height. */
export function drawBlow(ctx: CanvasRenderingContext2D, at: Pt, dir: number, size: number, u: number): void {
  if (u <= 0 || u >= 1) return;
  ctx.save();
  ctx.fillStyle = '#f4f1ea';
  for (const s of SPRAY) {
    const life = Math.max(0, Math.min(1, (u - s.lag) / (1 - s.lag)));
    if (life <= 0) continue;
    const reach = size * s.d * Math.min(1, life * 2.2);
    const a = dir + s.a * (0.6 + life);
    const x = at.x + Math.cos(a) * reach;
    const y = at.y + Math.sin(a) * reach + size * 0.12 * life * life;
    ctx.globalAlpha = 0.75 * (1 - life) ** 0.8;
    ctx.beginPath();
    ctx.arc(x, y, s.r * (1 + 2.5 * life) * (size / 300), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Bubbles, screen px, as chalk rings with a glint. */
export function drawBubbles(ctx: CanvasRenderingContext2D, bubbles: readonly { readonly x: number; readonly y: number; readonly r: number; readonly alpha: number }[]): void {
  ctx.save();
  ctx.strokeStyle = CHALK;
  for (const b of bubbles) {
    if (b.alpha <= 0) continue;
    ctx.globalAlpha = b.alpha;
    ctx.lineWidth = Math.max(1.5, b.r * 0.2);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, b.r * 0.12);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.6, -2.4, -1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** The bite's snap: chalk wedges bursting from the jaws at `at` (screen px), `size` px across, `u` 0 → 1 over the burst. */
export function drawChomp(ctx: CanvasRenderingContext2D, at: Pt, size: number, u: number): void {
  if (u < 0 || u > 1) return;
  const grow = 1 - (1 - u) ** 3;
  const r0 = size * (0.12 + 0.12 * grow);
  const r1 = size * (0.3 + 0.25 * grow);
  ctx.save();
  ctx.fillStyle = CHALK;
  ctx.globalAlpha = u < 0.6 ? 1 : (1 - u) / 0.4;
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.2;
    const w = size * 0.025 * (1 - u * 0.7) * (k % 2 ? 0.7 : 1);
    const len = k % 2 ? 0.75 : 1;
    const d = { x: Math.cos(a), y: Math.sin(a) };
    const pt = (r: number, side: number): [number, number] => [at.x + d.x * r - d.y * side, at.y + d.y * r + d.x * side];
    ctx.beginPath();
    ctx.moveTo(...pt(r0, 0));
    ctx.lineTo(...pt(r0 + (r1 - r0) * len * 0.35, w));
    ctx.lineTo(...pt(r0 + (r1 - r0) * len, 0));
    ctx.lineTo(...pt(r0 + (r1 - r0) * len * 0.35, -w));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, strength: number): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 760, 360, VIDEO.width / 2, 800, 1250);
  g.addColorStop(0, 'rgba(1,2,6,0)');
  g.addColorStop(1, `rgba(1,2,6,${(0.75 * strength).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** Depth, ticking down as it dives. */
export function drawReadout(ctx: CanvasRenderingContext2D, metres: number, alpha: number): void {
  if (alpha <= 0) return;
  drawTextLine(ctx, `${metres.toLocaleString('en-US')} m`, VIDEO.width / 2, 400, 124, 700, alpha, PAPER_ON_INK);
  drawTextLine(ctx, 'down', VIDEO.width / 2, 472, 60, 700, 0.8 * alpha, PAPER_ON_INK);
}

// ---------------------------------------------------------------- the days

const SKY_H = 560;
const DAY_SKY: Rgb = [240, 226, 192];
const DUSK_SKY: Rgb = [231, 160, 104];
const NIGHT_SKY: Rgb = [24, 30, 70];
const STARS = (() => {
  const rng = createRng(31);
  return Array.from({ length: 34 }, () => ({ x: rng() * VIDEO.width, y: rng() * 0.75, r: 1 + rng() * 2.2 }));
})();

/**
 * The surface seen from far below, sliding in at the top (`show` 0 .. 1):
 * the sun and the moon racing across the sky (`days`: the sun rises at each
 * whole number, the moon at each half), the sea under it lit by day and dark
 * by night.
 */
export function drawDays(ctx: CanvasRenderingContext2D, show: number, days: number, boil: number): void {
  if (show <= 0) return;
  const base = SKY_H * (show - 1) + SKY_H;
  const phase = ((days % 1) + 1) % 1;
  const sunUp = phase < 0.5;
  const arc = sunUp ? phase * 2 : (phase - 0.5) * 2;
  // How light the sky is: full at noon, dark at midnight, dusky between.
  const light = Math.max(0, Math.sin(Math.PI * 2 * phase));
  const dusk = 1 - Math.abs(Math.cos(Math.PI * 2 * phase)) ** 0.5;
  const sky = mixRgb(mixRgb(NIGHT_SKY, DAY_SKY, light), DUSK_SKY, 0.5 * dusk * (sunUp ? 1 : 0.3));
  ctx.save();
  ctx.fillStyle = css(sky, 1);
  ctx.fillRect(0, 0, VIDEO.width, base);
  // Stars come out at night.
  const night = sunUp ? 0 : Math.sin(Math.PI * arc);
  ctx.fillStyle = '#fff8e2';
  for (const s of STARS) {
    ctx.globalAlpha = 0.8 * night;
    ctx.beginPath();
    ctx.arc(s.x, base - SKY_H + s.y * SKY_H, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const pen = new Pen(ctx, 6101 + boil * 977, 0.9);
  const x = 110 + arc * (VIDEO.width - 220);
  const y = base - 80 - 300 * Math.sin(Math.PI * arc);
  if (sunUp) {
    halo(ctx, x, y, 200, '#ffe7a3', 0.6);
    const disc = Array.from({ length: 24 }, (_, i) => ({ x: x + 48 * Math.cos((i / 24) * Math.PI * 2), y: y + 48 * Math.sin((i / 24) * Math.PI * 2) }));
    pen.fill(disc, '#f5c84a', 1);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + days;
      pen.stroke([{ x: x + Math.cos(a) * 62, y: y + Math.sin(a) * 62 }, { x: x + Math.cos(a) * (k % 2 ? 80 : 92), y: y + Math.sin(a) * (k % 2 ? 80 : 92) }], 3, INK, 1, false);
    }
    pen.stroke([...disc, disc[0]!], 3, INK, 1, true);
  } else {
    halo(ctx, x, y, 150, '#e8ecff', 0.4);
    const outer = Array.from({ length: 24 }, (_, i) => ({ x: x + 40 * Math.cos((i / 24) * Math.PI * 2), y: y + 40 * Math.sin((i / 24) * Math.PI * 2) }));
    pen.fill(outer, '#f3efe2', 1);
    // The dark of the moon, cut out of the disc only.
    pen.clipped(outer, () => pen.fill(Array.from({ length: 24 }, (_, i) => ({ x: x + 16 + 36 * Math.cos((i / 24) * Math.PI * 2), y: y - 8 + 36 * Math.sin((i / 24) * Math.PI * 2) })), css(sky, 1), 1));
    pen.stroke(Array.from({ length: 16 }, (_, i) => ({ x: x + 40 * Math.cos(0.9 + (i / 15) * 4.2), y: y + 40 * Math.sin(0.9 + (i / 15) * 4.2) })), 2.4, INK, 1, true);
  }
  // The sea below the waterline: lit by day, gone dark by night, fading into the deep.
  const sea = ctx.createLinearGradient(0, base, 0, base + 420);
  sea.addColorStop(0, css(mixRgb([12, 22, 50], [70, 120, 160], light), 1));
  sea.addColorStop(1, css(mixRgb([12, 22, 50], [70, 120, 160], light), 0));
  ctx.fillStyle = sea;
  ctx.fillRect(0, base, VIDEO.width, 420);
  const wave = Array.from({ length: 28 }, (_, i) => ({ x: (i / 27) * (VIDEO.width + 40) - 20, y: base + 5 * Math.sin(i * 1.3 + days * 9) }));
  pen.stroke(wave, 2.8, INK, 1, true);
  ctx.restore();
}

// ---------------------------------------------------------------- the submarine

/**
 * A little yellow research submarine (world px about its middle, `size` long
 * on screen), its searchlight and its camera; `facing` -1 .. 1 squashes it
 * as it turns.
 */
export function drawSub(ctx: CanvasRenderingContext2D, at: Pt, size: number, facing: number, prop: number, boil: number): void {
  const k = size / 520;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(k * (Math.abs(facing) < 0.12 ? 0.12 * Math.sign(facing || 1) : facing), k);
  const pen = new Pen(ctx, 7301 + boil * 977, 1.2);
  const hull = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return { x: 255 * Math.sign(c) * Math.abs(c) ** 0.7, y: 92 * Math.sign(s) * Math.abs(s) ** 0.8 };
  });
  const tower = [{ x: -70, y: -82 }, { x: -60, y: -150 }, { x: 60, y: -150 }, { x: 90, y: -82 }];
  const fin = [{ x: -230, y: -40 }, { x: -320, y: -120 }, { x: -330, y: 110 }, { x: -235, y: 45 }];
  for (const part of [fin, tower]) {
    pen.fill(part, '#fffaf0', 1);
    pen.fill(part, '#e0a92a', 0.8);
    pen.stroke([...part, part[0]!], 4, INK, 1, false);
  }
  // The propeller, spinning.
  const blade = 70 * Math.abs(Math.sin(prop));
  pen.fill([{ x: -335, y: -blade }, { x: -350, y: 0 }, { x: -335, y: blade }, { x: -322, y: 0 }], '#8b8577', 1);
  pen.fill(hull, '#fffaf0', 1);
  pen.fill(hull, '#e9b82e', 0.82);
  pen.clipped(hull, () => {
    ctx.fillStyle = 'rgba(40,24,10,0.35)';
    ctx.fillRect(-300, 30, 600, 90);
    for (let y = 40; y < 95; y += 9) pen.hair([{ x: -240, y }, { x: 230, y: y + 3 }], 1.4, INK, 0.45);
    pen.hair([{ x: -250, y: -20 }, { x: 240, y: -20 }], 2, INK, 0.5);
  });
  pen.stroke([...hull, hull[0]!], 5, INK, 1, true);
  // The big front window, dark glass with a glint.
  const win = Array.from({ length: 24 }, (_, i) => ({ x: 150 + 58 * Math.cos((i / 24) * Math.PI * 2), y: -12 + 58 * Math.sin((i / 24) * Math.PI * 2) }));
  pen.fill(win, '#1d2a3a', 1);
  pen.hair([{ x: 125, y: -45 }, { x: 160, y: -55 }], 5, '#cfe0ee', 0.8);
  pen.stroke([...win, win[0]!], 7, '#8b8577', 1, false);
  pen.stroke([...win, win[0]!], 3, INK, 1, false);
  // The searchlight and the camera under the bow.
  pen.fill([{ x: 205, y: 55 }, { x: 260, y: 45 }, { x: 262, y: 85 }, { x: 205, y: 82 }], '#5d5a52', 1);
  pen.stroke([{ x: 205, y: 55 }, { x: 260, y: 45 }, { x: 262, y: 85 }, { x: 205, y: 82 }, { x: 205, y: 55 }], 3, INK, 1, false);
  pen.fill([{ x: 110, y: 88 }, { x: 170, y: 88 }, { x: 170, y: 125 }, { x: 110, y: 125 }], '#3a3833', 1);
  pen.dot(170, 106, 13, '#11161d');
  pen.stroke([{ x: 110, y: 88 }, { x: 170, y: 88 }, { x: 170, y: 125 }, { x: 110, y: 125 }, { x: 110, y: 88 }], 3, INK, 1, false);
  ctx.restore();
}

/** The searchlight's beam from `from` (screen px) at `angle`, `reach` px long, `on` 0 .. 1. */
export function drawBeam(ctx: CanvasRenderingContext2D, from: Pt, angle: number, reach: number, on: number): void {
  if (on <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const spread = 0.2;
  const g = ctx.createLinearGradient(from.x, from.y, from.x + Math.cos(angle) * reach, from.y + Math.sin(angle) * reach);
  g.addColorStop(0, `rgba(255,240,196,${(0.5 * on).toFixed(3)})`);
  g.addColorStop(0.7, `rgba(255,240,196,${(0.16 * on).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,240,196,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(from.x + Math.cos(angle - spread) * reach, from.y + Math.sin(angle - spread) * reach);
  ctx.lineTo(from.x + Math.cos(angle + spread) * reach, from.y + Math.sin(angle + spread) * reach);
  ctx.closePath();
  ctx.fill();
  const pool = { x: from.x + Math.cos(angle) * reach * 0.62, y: from.y + Math.sin(angle) * reach * 0.62 };
  halo(ctx, pool.x, pool.y, reach * 0.35, '#fff0c4', 0.35 * on);
  ctx.restore();
}

/** The camera's viewfinder round `at` (screen px): corner marks, a blinking red dot and REC. */
export function drawRec(ctx: CanvasRenderingContext2D, at: Pt, alpha: number, t: number): void {
  if (alpha <= 0) return;
  const w = 400;
  const h = 300;
  const x0 = Math.max(110, Math.min(VIDEO.width - 110 - w, at.x - w / 2));
  const y0 = Math.max(300, Math.min(1080 - h, at.y - h / 2));
  const arm = 54;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  for (const pass of [{ colour: INK_BG, width: 13 }, { colour: '#f4eddc', width: 6 }]) {
    ctx.strokeStyle = pass.colour;
    ctx.lineWidth = pass.width;
    for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x0 + w, y0, -1, 1], [x0, y0 + h, 1, -1], [x0 + w, y0 + h, -1, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * arm);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * arm, cy);
      ctx.stroke();
    }
  }
  const blink = Math.sin(t * Math.PI * 4) > -0.3 ? 1 : 0.15;
  ctx.globalAlpha = alpha * blink;
  ctx.fillStyle = '#e8423b';
  ctx.strokeStyle = INK_BG;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x0 + 44, y0 + 46, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  ctx.restore();
  drawTextLine(ctx, 'REC', x0 + 106, y0 + 64, 60, 700, alpha, PAPER_ON_INK);
}

