import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { cycles, LOOP_S, wrap } from './beats';
import { BOLTS, boltAt, floatBob, type Pt } from './story';

/**
 * The Gulf, side-on, in chalk and wash, its colours changing with the mood
 * of each beat: a black storm, a warm sunset, the dark under the surface,
 * the brighter water of the cheeky end. The sky, the sun, clouds, rain and
 * lightning are drawn in screen px around where the surface is on screen;
 * the water over things in the sea, the waterline and the swell in world px,
 * under the camera's transform (`px` is one screen px in world px).
 */

type Rgb = readonly [number, number, number];

interface Palette {
  readonly skyTop: Rgb;
  readonly skyMid: Rgb;
  readonly skyLow: Rgb;
  readonly seaTop: Rgb;
  readonly seaDeep: Rgb;
  readonly cloud: Rgb;
  readonly rim: Rgb;
  /** The sun on the horizon, 0 .. 1. */
  readonly sun: number;
  /** Light shafts under the surface, 0 .. 1. */
  readonly shafts: number;
}

const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const STORM: Palette = {
  skyTop: hex('#070b12'), skyMid: hex('#18202c'), skyLow: hex('#3a4350'), seaTop: hex('#1d3b3f'), seaDeep: hex('#04110f'),
  cloud: hex('#05080d'), rim: hex('#7d8ea0'), sun: 0, shafts: 0.2,
};
const SUNSET: Palette = {
  skyTop: hex('#262a58'), skyMid: hex('#b0597a'), skyLow: hex('#f6a65a'), seaTop: hex('#40406a'), seaDeep: hex('#121733'),
  cloud: hex('#5a3253'), rim: hex('#ffb478'), sun: 1, shafts: 0.4,
};
const UNDER: Palette = { ...STORM, seaTop: hex('#183a3a'), seaDeep: hex('#010807'), shafts: 0.35 };
const CHEEKY: Palette = {
  skyTop: hex('#6d8ea6'), skyMid: hex('#a9c2c8'), skyLow: hex('#e6dcc0'), seaTop: hex('#2f7378'), seaDeep: hex('#0a2a30'),
  cloud: hex('#8ea6b4'), rim: hex('#fff3d6'), sun: 0, shafts: 1,
};

/** The palette through the loop: held between keys, blended across them. */
const KEYS: readonly (readonly [number, Palette])[] = [
  [0, STORM], [2.8, STORM], [3.45, SUNSET], [6.7, SUNSET], [7.6, STORM], [10.0, STORM], [10.5, UNDER], [15.6, UNDER], [16.25, CHEEKY], [18.55, CHEEKY], [19.25, STORM],
  [LOOP_S, STORM],
];

const mixRgb = (a: Rgb, b: Rgb, u: number): Rgb => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const css = (c: Rgb, alpha = 1): string => `rgba(${c[0].toFixed(0)},${c[1].toFixed(0)},${c[2].toFixed(0)},${alpha.toFixed(3)})`;

export function paletteAt(t: number): Palette {
  const u = wrap(t);
  for (let i = 1; i < KEYS.length; i++) {
    const [t0, a] = KEYS[i - 1]!;
    const [t1, b] = KEYS[i]!;
    if (u > t1) continue;
    const k = Math.max(0, Math.min(1, (u - t0) / (t1 - t0)));
    const e = k * k * (3 - 2 * k);
    return {
      skyTop: mixRgb(a.skyTop, b.skyTop, e), skyMid: mixRgb(a.skyMid, b.skyMid, e), skyLow: mixRgb(a.skyLow, b.skyLow, e),
      seaTop: mixRgb(a.seaTop, b.seaTop, e), seaDeep: mixRgb(a.seaDeep, b.seaDeep, e), cloud: mixRgb(a.cloud, b.cloud, e), rim: mixRgb(a.rim, b.rim, e),
      sun: a.sun + (b.sun - a.sun) * e, shafts: a.shafts + (b.shafts - a.shafts) * e,
    };
  }
  return STORM;
}

export const CHALK = '#e4ece6';
export const FOAM = '#f1f6f4';
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- the sky and the deep, screen px

/** Sky above the surface (`surface` px down the screen) and the sea below it, at `zoom`. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, pal: Palette, surface: number, zoom: number, t: number): void {
  if (surface > 0) {
    const top = surface - 1500 * Math.max(0.45, zoom);
    const sky = ctx.createLinearGradient(0, top, 0, surface);
    sky.addColorStop(0, css(pal.skyTop));
    sky.addColorStop(0.6, css(pal.skyMid));
    sky.addColorStop(1, css(pal.skyLow));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIDEO.width, Math.min(VIDEO.height, surface + 2));
    drawClouds(ctx, pal, surface, zoom, t);
    drawSun(ctx, pal, surface, t);
  }
  if (surface < VIDEO.height) {
    const top = Math.max(0, surface);
    const deep = ctx.createLinearGradient(0, surface, 0, surface + 1300 * zoom);
    deep.addColorStop(0, css(pal.seaTop));
    deep.addColorStop(1, css(pal.seaDeep));
    ctx.fillStyle = deep;
    ctx.fillRect(0, top, VIDEO.width, VIDEO.height - top);
    if (pal.sun > 0.01 && surface > 0) drawGlitter(ctx, pal, surface, t);
  }
}

const SUN_X = 770;

function drawSun(ctx: CanvasRenderingContext2D, pal: Palette, surface: number, t: number): void {
  if (pal.sun <= 0.01) return;
  const r = 150;
  const y = surface + 30;
  ctx.save();
  const glow = ctx.createRadialGradient(SUN_X, y, r * 0.6, SUN_X, y, r * 4.5);
  glow.addColorStop(0, `rgba(255,214,140,${(0.55 * pal.sun).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(255,170,110,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, y - r * 4.5, VIDEO.width, r * 4.5);
  ctx.globalAlpha = pal.sun;
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.arc(SUN_X, y, r, Math.PI, TAU);
  ctx.fill();
  // An inked rim, wobbling with the boil, as the game draws its sun.
  ctx.strokeStyle = 'rgba(120,60,40,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI + (i / 40) * Math.PI;
    const rr = r + 1.5 * Math.sin(a * 7 + Math.floor(t * 8));
    const x = SUN_X + Math.cos(a) * rr;
    const yy = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
  ctx.restore();
}

/** The sun's road across the water: short strokes of light, shimmering. */
function drawGlitter(ctx: CanvasRenderingContext2D, pal: Palette, surface: number, t: number): void {
  const rng = createRng(31);
  ctx.save();
  ctx.strokeStyle = '#ffd98a';
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const d = rng();
    const y = surface + 8 + d * d * 700;
    const spread = 40 + d * 240;
    const x = SUN_X + (rng() - 0.5) * 2 * spread;
    const len = 18 + d * 70;
    const twinkle = 0.5 + 0.5 * Math.sin(cycles(5 + (i % 4), t) + i);
    ctx.globalAlpha = pal.sun * (0.25 + 0.5 * twinkle) * (1 - d * 0.7);
    ctx.lineWidth = 2 + d * 3;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.lineTo(x + len / 2, y);
    ctx.stroke();
  }
  ctx.restore();
}

const CLOUDS = (() => {
  const rng = createRng(905);
  return Array.from({ length: 9 }, (_, i) => ({ x: -200 + i * 170 + rng() * 120, up: 140 + rng() * 1100, w: 360 + rng() * 420, h: 40 + rng() * 50, drift: 10 + rng() * 20 }));
})();

/** Long banks of cloud, lit underneath by `rim`; low and heavy in the storm. */
function drawClouds(ctx: CanvasRenderingContext2D, pal: Palette, surface: number, zoom: number, t: number): void {
  ctx.save();
  ctx.filter = 'blur(8px)';
  for (const [i, c] of CLOUDS.entries()) {
    const x = c.x + c.drift * Math.sin(cycles(1, t) + i);
    const y = surface - c.up * Math.max(0.5, zoom) * 0.85;
    if (y < -120 || y > surface - 20) continue;
    ctx.fillStyle = css(pal.cloud, 0.75);
    ctx.beginPath();
    ctx.ellipse(x, y, c.w / 2, c.h, 0, 0, TAU);
    ctx.ellipse(x - c.w * 0.2, y - c.h * 0.6, c.w * 0.26, c.h * 0.85, 0, 0, TAU);
    ctx.ellipse(x + c.w * 0.18, y - c.h * 0.4, c.w * 0.2, c.h * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = css(pal.rim, 0.28);
    ctx.beginPath();
    ctx.ellipse(x, y + c.h * 0.65, c.w * 0.4, c.h * 0.22, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- rain and lightning, screen px

const DROPS = (() => {
  const rng = createRng(4401);
  return Array.from({ length: 170 }, () => ({ x: rng() * (VIDEO.width + 500) - 250, y: rng() * 2200, len: 40 + rng() * 60, alpha: 0.18 + rng() * 0.3, falls: 22 + Math.floor(rng() * 6) }));
})();

/** Rain slanting down over the sky, `amount` 0 .. 1, cut off at the surface. */
export function drawRain(ctx: CanvasRenderingContext2D, amount: number, surface: number, t: number): void {
  if (amount <= 0.01 || surface < 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, VIDEO.width, Math.min(VIDEO.height, surface + 4));
  ctx.clip();
  ctx.strokeStyle = '#cfdbe4';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.2;
  for (const d of DROPS) {
    // Whole falls a loop, so the rain is where it was at the seam.
    const y = ((d.y + (2200 * d.falls * wrap(t)) / LOOP_S) % 2200) - 150;
    const x = d.x - 0.32 * y;
    ctx.globalAlpha = d.alpha * amount;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 0.32 * d.len, y + d.len);
    ctx.stroke();
  }
  ctx.restore();
}

/** A jagged bolt from the cloud base down to the sea, with a branch or two. */
function boltPath(seed: number, x: number, top: number, bottom: number): Pt[][] {
  const rng = createRng(seed);
  const main: Pt[] = [];
  let px = x;
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const y = top + ((bottom - top) * i) / steps;
    main.push({ x: px, y });
    px += (rng() - 0.5) * 70;
  }
  const branches = [5, 9].map((k) => {
    const from = main[k]!;
    const dir = rng() < 0.5 ? -1 : 1;
    const out: Pt[] = [from];
    let bx = from.x;
    for (let i = 1; i <= 5; i++) {
      bx += dir * (20 + rng() * 30);
      out.push({ x: bx, y: from.y + i * (bottom - top) * 0.035 });
    }
    return out;
  });
  return [main, ...branches];
}

/** Every bolt striking at time t, and the flash it throws over the picture (returned, 0 .. 1). */
export function drawLightning(ctx: CanvasRenderingContext2D, surface: number, t: number): number {
  let flash = 0;
  if (surface < 40) return 0;
  for (const b of BOLTS) {
    const now = boltAt(t, b.t);
    flash = Math.max(flash, now.flash);
    if (now.bolt <= 0.01) continue;
    const paths = boltPath(b.seed, b.x, Math.max(-40, surface - 1100), surface);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [width, colour, alpha] of [[20, 'rgba(170,200,255,1)', 0.12], [8, 'rgba(210,225,255,1)', 0.3], [3.2, '#ffffff', 0.9]] as const) {
      ctx.strokeStyle = colour;
      ctx.globalAlpha = alpha * now.bolt;
      paths.forEach((p, i) => {
        ctx.lineWidth = i === 0 ? width : width * 0.55;
        ctx.beginPath();
        p.forEach((q, k) => (k === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
        ctx.stroke();
      });
    }
    ctx.restore();
  }
  return flash;
}

/** The lightning's flash over everything. */
export function drawFlash(ctx: CanvasRenderingContext2D, flash: number): void {
  if (flash <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(150,170,210,${(0.35 * flash).toFixed(3)})`;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

// ---------------------------------------------------------------- the water, world px

/** The surface's height at world x, time t: the swell, three rolls a loop. */
export const waterlineAt = (x: number, t: number): number => floatBob(x, t) + 2.5 * Math.sin(x * 0.0047 + cycles(3, t));

/** Faint shafts of light slanting down from the surface. */
const SHAFTS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 12 }, (_, i) => ({ x: -1600 + i * 290 + rng() * 120, w: 50 + rng() * 80, phase: rng() * TAU }));
})();

export function drawShafts(ctx: CanvasRenderingContext2D, pal: Palette, t: number): void {
  if (pal.shafts <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of SHAFTS) {
    const a = pal.shafts * (0.05 + 0.03 * Math.sin(cycles(2, t) + s.phase));
    const g = ctx.createLinearGradient(0, 0, 0, 1100);
    g.addColorStop(0, `rgba(170,220,210,${a.toFixed(3)})`);
    g.addColorStop(1, 'rgba(170,220,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(s.x, 0);
    ctx.lineTo(s.x + s.w, 0);
    ctx.lineTo(s.x + s.w + 300, 1100);
    ctx.lineTo(s.x + 230, 1100);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const SPECKS = (() => {
  const rng = createRng(6060);
  return Array.from({ length: 220 }, () => ({ x: -1700 + rng() * 3400, y: 30 + rng() * 1500, r: 1 + rng() * 2.2, phase: rng() * TAU }));
})();

/** Specks drifting in the water. */
export function drawSpecks(ctx: CanvasRenderingContext2D, t: number, px: number): void {
  ctx.save();
  ctx.fillStyle = CHALK;
  for (const s of SPECKS) {
    ctx.globalAlpha = 0.16 + 0.1 * Math.sin(s.phase * 3);
    ctx.beginPath();
    ctx.arc(s.x + 12 * Math.sin(cycles(1, t) + s.phase), s.y + 9 * Math.cos(cycles(2, t) + s.phase), Math.max(s.r, 1.2 * px), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** The water over whatever is under the surface: tinted the sea's colour, deeper going darker. */
export function drawWash(ctx: CanvasRenderingContext2D, pal: Palette, t: number, left: number, right: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left, 3200);
  for (let x = left; x <= right; x += 12) ctx.lineTo(x, waterlineAt(x, t));
  ctx.lineTo(right, 3200);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, 1500);
  g.addColorStop(0, css(pal.seaTop, 0.28));
  g.addColorStop(0.35, css(mixRgb(pal.seaTop, pal.seaDeep, 0.5), 0.45));
  g.addColorStop(1, css(pal.seaDeep, 0.72));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** The waterline in chalk, with wavelets on the swell. */
const WAVELETS = (() => {
  const rng = createRng(818);
  return Array.from({ length: 40 }, (_, i) => ({ x: -2600 + i * 130 + rng() * 60, dy: 26 + rng() * 110, size: 0.6 + rng() * 0.6 }));
})();

export function drawWaterline(ctx: CanvasRenderingContext2D, t: number, left: number, right: number, px: number): void {
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3.4 * px;
  ctx.beginPath();
  for (let x = left; x <= right; x += 8) {
    if (x === left) ctx.moveTo(x, waterlineAt(x, t));
    else ctx.lineTo(x, waterlineAt(x, t));
  }
  ctx.stroke();
  ctx.lineWidth = 2 * px;
  for (const w of WAVELETS) {
    if (w.x < left - 80 || w.x > right + 80) continue;
    ctx.globalAlpha = 0.4 - 0.2 * (w.dy / 140);
    const len = 70 * w.size;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const x = w.x - len / 2 + (k / 6) * len;
      const y = w.dy + Math.sin(k * 1.4 + cycles(3, t)) * 4;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Rings spreading round something afloat, one every `every` s (a whole number a loop). */
export function drawFloatRings(ctx: CanvasRenderingContext2D, x: number, t: number, size: number, alpha: number, px: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 2.2 * px;
  const every = LOOP_S / 13;
  for (let k = 0; k < 3; k++) {
    const s = (((wrap(t) + k * every) % (3 * every)) / (3 * every));
    const rx = size * (0.55 + 1.3 * s);
    ctx.globalAlpha = alpha * 0.5 * (1 - s);
    ctx.beginPath();
    ctx.ellipse(x, 4, rx, rx * 0.08, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/** Water flung off the shark as it bursts out: drops in flight (world px, their velocity for the streak). */
export interface Drop {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly r: number;
  readonly alpha: number;
}

/** One drop: round at the front, drawn out behind while it's fast. */
export function drawDrop(ctx: CanvasRenderingContext2D, d: Drop, px: number): void {
  const speed = Math.hypot(d.vx, d.vy);
  const rr = Math.max(1.4 * px, d.r);
  const stretch = 1 + Math.min(2.4, speed / 650);
  ctx.save();
  ctx.globalAlpha *= d.alpha;
  ctx.translate(d.x, d.y);
  ctx.rotate(Math.atan2(d.vy, d.vx));
  ctx.beginPath();
  ctx.arc(0, 0, rr, -Math.PI / 2, Math.PI / 2);
  ctx.quadraticCurveTo(-rr * stretch * 0.9, rr * 0.5, -rr * stretch * 1.6, 0);
  ctx.quadraticCurveTo(-rr * stretch * 0.9, -rr * 0.5, 0, -rr);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawDrops(ctx: CanvasRenderingContext2D, drops: readonly Drop[], px: number): void {
  ctx.save();
  ctx.fillStyle = FOAM;
  ctx.globalAlpha = 0.85;
  for (const d of drops) drawDrop(ctx, d, px);
  ctx.restore();
}

/** Drops breaking off the sheets' torn edges: which sheet, how far along past the tip, how far off it, how big. */
const CROWN_DROPS = (() => {
  const rng = createRng(3131);
  return Array.from({ length: 40 }, (_, i) => ({ sheet: i % 6, along: 0.1 + rng() * 0.9, off: (rng() - 0.5) * 70, r: 3 + rng() * 7, kick: 0.6 + rng() * 0.9 }));
})();
const SHEETS = [[1, 1], [0.72, 0.8], [0.45, 0.55]] as const;

/** The sheets of water and foam thrown up where the shark breaks through the surface (world x, `since` in the lunge's seconds, `size` scales it). */
export function drawCrown(ctx: CanvasRenderingContext2D, x: number, half: number, since: number, size: number, px: number): void {
  const life = 1.4;
  if (since < 0 || since > life) return;
  const fade = 1 - Math.max(0, (since - 0.8) / (life - 0.8));
  const lift = 270 * size * Math.sin(Math.PI * Math.min(1, since / 0.75)) ** 0.8;
  const tips: { x: number; y: number; side: number }[] = [];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const side of [-1, 1]) {
    for (const [spread, w] of SHEETS) {
      // A curling sheet of water, thick at its foot, tapering to a ragged tip.
      const foot = x + side * half * (0.8 + 0.25 * spread);
      const tip = { x: foot + side * 180 * size * spread * (0.35 + 0.65 * Math.min(1, since * 2.2)), y: -lift * spread * w };
      const ctrl = { x: foot + side * 25 * size * spread, y: -lift * 0.9 * spread };
      tips.push({ ...tip, side });
      const shape = new Path2D();
      shape.moveTo(foot - side * 14 * size, 8);
      shape.quadraticCurveTo(ctrl.x - side * 10 * size, ctrl.y, tip.x, tip.y);
      shape.quadraticCurveTo(ctrl.x + side * 26 * size, ctrl.y * 0.75 + 16 * size, foot + side * 44 * size * spread, 8);
      shape.closePath();
      ctx.globalAlpha = fade * 0.85;
      ctx.fillStyle = FOAM;
      ctx.fill(shape);
      // Blue-grey shade down its inner side, and an inked edge.
      ctx.globalAlpha = fade * 0.3;
      ctx.strokeStyle = '#7d98a0';
      ctx.lineWidth = 10 * px;
      ctx.stroke(shape);
      ctx.globalAlpha = fade * 0.7;
      ctx.strokeStyle = '#1b1a1f';
      ctx.lineWidth = 2.2 * px;
      ctx.stroke(shape);
    }
  }
  // Drops tearing off the tips and flying on.
  ctx.fillStyle = FOAM;
  for (const d of CROWN_DROPS) {
    const tip = tips[d.sheet % tips.length]!;
    const fly = since * d.kick;
    const dx = tip.x + tip.side * (d.along * 90 + fly * 260) * size;
    const dy = tip.y + d.off * size * 0.5 - fly * 120 * size + fly * fly * 900 * size;
    if (dy > 0) continue;
    ctx.globalAlpha = fade;
    ctx.beginPath();
    ctx.arc(dx, dy, d.r * size, 0, TAU);
    ctx.fill();
  }
  // Foam heaped round the body.
  ctx.globalAlpha = fade * 0.9;
  ctx.beginPath();
  ctx.ellipse(x, 2, half * 1.6 + 60 * size * Math.min(1, since * 3), 30 * size * (1 - 0.6 * since / life), 0, Math.PI, TAU);
  ctx.fill();
  ctx.restore();
}

/** Rings spreading out from a splash, flattened. */
export function drawRipples(ctx: CanvasRenderingContext2D, x: number, since: number, size: number, px: number): void {
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 2.6 * px;
  for (const delay of [0, 0.3, 0.6]) {
    const s = since - delay;
    if (s < 0 || s > 2.2) continue;
    const rx = (60 + 320 * (s / 2.2) ** 0.7) * size;
    ctx.globalAlpha = 0.55 * (1 - s / 2.2);
    ctx.beginPath();
    ctx.ellipse(x, 6, rx, rx * 0.08, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

const BUBBLES = (() => {
  const rng = createRng(616);
  return Array.from({ length: 24 }, () => ({ dx: (rng() - 0.5) * 260, depth: 80 + rng() * 360, r: 5 + rng() * 11, rise: 180 + rng() * 240, phase: rng() * TAU }));
})();

/** Bubbles rising where it went back in. */
export function drawBubbles(ctx: CanvasRenderingContext2D, x: number, since: number, px: number): void {
  if (since < 0 || since > 1.8) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 2 * px;
  for (const b of BUBBLES) {
    const y = b.depth - b.rise * since;
    if (y < 8) continue;
    ctx.globalAlpha = 0.6 * (1 - since / 1.8) * Math.min(1, since * 6);
    const bx = x + b.dx * (0.4 + since) + 6 * Math.sin(since * 7 + b.phase);
    ctx.beginPath();
    ctx.arc(bx, y, b.r, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D, strength: number): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 820, 380, VIDEO.width / 2, 860, 1250);
  g.addColorStop(0, 'rgba(2,6,8,0)');
  g.addColorStop(1, `rgba(2,6,8,${(0.62 * strength).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}
