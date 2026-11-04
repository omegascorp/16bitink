import { createRng } from '../../../src/logic/rng';
import { makeDesk } from './art/desk';
import { mix } from '../seal/art/paint';
import { VIDEO } from '../short';

/** The places the short happens in, each painted once: dark water, bright water, deep water, the cold Danish shore. */

interface WaterLook {
  readonly top: string;
  readonly mid: string;
  readonly deep: string;
}

const DARK: WaterLook = { top: '#22688a', mid: '#0f3a55', deep: '#04121c' };
const BRIGHT_SEA: WaterLook = { top: '#a4e6de', mid: '#3fb4bf', deep: '#0d5f7c' };
const DEEP: WaterLook = { top: '#123f5c', mid: '#0a2639', deep: '#030c15' };

export interface Backdrops {
  readonly dark: HTMLCanvasElement;
  readonly bright: HTMLCanvasElement;
  readonly deep: HTMLCanvasElement;
  /** Soft shafts of light, baked small and drawn stretched (drawRays). */
  readonly rays: HTMLCanvasElement;
  readonly shore: HTMLCanvasElement;
  readonly shingle: HTMLCanvasElement;
  readonly parchment: HTMLCanvasElement;
  /** His work table across the bottom of the frame, with the tally book. */
  readonly desk: HTMLCanvasElement;
}

function canvas(): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = VIDEO.width;
  c.height = VIDEO.height;
  return { c, ctx: c.getContext('2d')! };
}

/** Open water, painted: a deep gradient with broad soft clouds of lighter and darker tone, no floor, no hard edges. */
function makeWater(look: WaterLook, seed: number): HTMLCanvasElement {
  const { c, ctx } = canvas();
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, look.top);
  g.addColorStop(0.3, look.mid);
  g.addColorStop(1, look.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const rng = createRng(seed);
  for (let i = 0; i < 26; i++) {
    const [x, y, r] = [rng() * VIDEO.width, rng() * VIDEO.height, 160 + rng() * 340];
    const tone = rng() < 0.5 ? '255,255,255' : '0,10,18';
    const w = ctx.createRadialGradient(x, y, 0, x, y, r);
    w.addColorStop(0, `rgba(${tone},${(0.035 + rng() * 0.04).toFixed(3)})`);
    w.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = w;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  return c;
}

const RAY_SCALE = 5;

/** One slanting shaft: many stacked faint shapes, widest first, so it has no edge at all. */
function shaft(ctx: CanvasRenderingContext2D, x: number, lean: number, wide: number, alpha: number): void {
  const layers = 22;
  const h = VIDEO.height / RAY_SCALE;
  ctx.fillStyle = `rgba(226,250,246,${(alpha / layers).toFixed(4)})`;
  for (let i = 0; i < layers; i++) {
    const f = (1 - i / layers) ** 1.4;
    ctx.beginPath();
    ctx.moveTo(x - wide * f * 0.7, -4);
    ctx.lineTo(x + wide * f * 0.7, -4);
    ctx.lineTo(x + lean + wide * f * 1.9, h);
    ctx.lineTo(x + lean - wide * f * 1.9, h);
    ctx.closePath();
    ctx.fill();
  }
}

/** The shafts of sun, baked very small so stretching them softens them further, and fading out with depth. */
function makeRays(): HTMLCanvasElement {
  const [w, h] = [Math.ceil((VIDEO.width * 1.3) / RAY_SCALE), Math.ceil(VIDEO.height / RAY_SCALE)];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const rng = createRng(12);
  for (let i = 0; i < 8; i++) shaft(ctx, w * (0.02 + i * 0.13 + rng() * 0.05), 22 + rng() * 26, 7 + rng() * 15, 0.3 + rng() * 0.34);
  ctx.globalCompositeOperation = 'destination-in';
  const fade = ctx.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.5, 'rgba(0,0,0,0.5)');
  fade.addColorStop(0.95, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
  return c;
}

/** The light over the water, swaying a whole number of times a loop (`loop` 0 .. 1). */
export function drawRays(ctx: CanvasRenderingContext2D, rays: HTMLCanvasElement, loop: number, strength: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const sway = (k: number, n: number): number => -90 + 46 * Math.sin(2 * Math.PI * (n * loop + k * 0.37));
  ctx.globalAlpha = strength;
  ctx.drawImage(rays, sway(0, 1), 0, VIDEO.width * 1.3, VIDEO.height);
  ctx.globalAlpha = strength * 0.5;
  ctx.drawImage(rays, VIDEO.width * 1.2 + sway(1, 2), 0, -VIDEO.width * 1.3, VIDEO.height);
  ctx.restore();
}

/** Pebbles scattered over a band, a seeded mix of greys and browns, lit from above. */
function pebbles(ctx: CanvasRenderingContext2D, y0: number, y1: number, count: number, seed: number, size: number): void {
  const rng = createRng(seed);
  const tones = ['#8a847a', '#6f6a62', '#a39b8d', '#585650', '#b7ad9a', '#7a7468', '#9b9488'];
  for (let i = 0; i < count; i++) {
    const [x, y] = [rng() * VIDEO.width, y0 + (y1 - y0) * rng()];
    const r = size * (0.5 + rng() * 0.9) * (0.6 + 0.6 * ((y - y0) / (y1 - y0)));
    const tone = tones[Math.floor(rng() * tones.length)]!;
    const g = ctx.createLinearGradient(x, y - r * 0.8, x, y + r * 0.8);
    g.addColorStop(0, mix(tone, '#ffffff', 0.22));
    g.addColorStop(0.55, tone);
    g.addColorStop(1, mix(tone, '#000000', 0.38));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.25, r * 0.8, rng() * 0.4 - 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(27,26,31,0.55)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

/** The cold shore: an overcast sky, far hills, a grey-green sea, the shingle running down to us. */
function makeShore(): HTMLCanvasElement {
  const { c, ctx } = canvas();
  const sky = ctx.createLinearGradient(0, 0, 0, 760);
  sky.addColorStop(0, '#7f93a6');
  sky.addColorStop(0.6, '#b9c7d1');
  sky.addColorStop(1, '#dbe3e6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, 800);
  const rng = createRng(3);
  // Low clouds, soft and flat.
  for (let i = 0; i < 14; i++) {
    const [x, y, w] = [rng() * 1200 - 60, 80 + rng() * 520, 240 + rng() * 360];
    const g = ctx.createRadialGradient(x, y, 10, x, y, w);
    g.addColorStop(0, 'rgba(236,241,244,0.45)');
    g.addColorStop(1, 'rgba(236,241,244,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w, y - w * 0.3, w * 2, w * 0.6);
  }
  // Far dunes and a sea below them.
  ctx.fillStyle = '#7d8e98';
  ctx.beginPath();
  ctx.moveTo(0, 730);
  for (let x = 0; x <= VIDEO.width; x += 40) ctx.lineTo(x, 712 - 16 * Math.sin(x / 170) - 8 * Math.sin(x / 61));
  ctx.lineTo(VIDEO.width, 780);
  ctx.lineTo(0, 780);
  ctx.fill();
  const sea = ctx.createLinearGradient(0, 740, 0, 930);
  sea.addColorStop(0, '#7d9aa3');
  sea.addColorStop(1, '#4a6a78');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 740, VIDEO.width, 200);
  ctx.strokeStyle = 'rgba(235,245,248,0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const [x, y] = [rng() * VIDEO.width, 770 + rng() * 150];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40 + rng() * 60, y + rng() * 3);
    ctx.stroke();
  }
  // The shingle, small stones far off and bigger stones near.
  const beach = ctx.createLinearGradient(0, 900, 0, VIDEO.height);
  beach.addColorStop(0, '#9a9488');
  beach.addColorStop(1, '#5d5a54');
  ctx.fillStyle = beach;
  ctx.beginPath();
  ctx.moveTo(0, 940);
  for (let x = 0; x <= VIDEO.width; x += 30) ctx.lineTo(x, 926 + 12 * Math.sin(x / 130) + 5 * Math.sin(x / 41));
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.lineTo(0, VIDEO.height);
  ctx.fill();
  pebbles(ctx, 930, 1300, 700, 8, 8);
  // A line of foam where the sea meets the stones.
  ctx.strokeStyle = 'rgba(245,250,250,0.75)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (let x = 0; x <= VIDEO.width; x += 20) ctx.lineTo(x, 928 + 12 * Math.sin(x / 130) + 5 * Math.sin(x / 41));
  ctx.stroke();
  return c;
}

/** Big stones across the bottom, drawn over the animal's underside so it lies on the shingle. */
function makeShingle(): HTMLCanvasElement {
  const { c, ctx } = canvas();
  const g = ctx.createLinearGradient(0, 1210, 0, 1330);
  g.addColorStop(0, 'rgba(110,106,98,0)');
  g.addColorStop(1, 'rgba(110,106,98,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 1210, VIDEO.width, VIDEO.height - 1210);
  ctx.fillStyle = 'rgba(96,93,86,0.97)';
  ctx.fillRect(0, 1330, VIDEO.width, VIDEO.height - 1330);
  pebbles(ctx, 1260, 1920, 520, 17, 14);
  return c;
}

/** A warm lamp-lit study wall: the funny beat after the cold shore, soft glow and no hard edges. */
function makeParchment(): HTMLCanvasElement {
  const { c, ctx } = canvas();
  const g = ctx.createRadialGradient(540, 760, 60, 540, 900, 1150);
  g.addColorStop(0, '#f9e6b2');
  g.addColorStop(0.45, '#e6c47a');
  g.addColorStop(0.8, '#b78a48');
  g.addColorStop(1, '#7c5730');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const rng = createRng(31);
  for (let i = 0; i < 30; i++) {
    const [x, y, r] = [rng() * VIDEO.width, rng() * VIDEO.height, 90 + rng() * 240];
    const tone = rng() < 0.5 ? '255,244,214' : '96,60,24';
    const w = ctx.createRadialGradient(x, y, 0, x, y, r);
    w.addColorStop(0, `rgba(${tone},${(0.05 + rng() * 0.06).toFixed(3)})`);
    w.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = w;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  return c;
}

export function makeBackdrops(): Backdrops {
  return {
    dark: makeWater(DARK, 5),
    bright: makeWater(BRIGHT_SEA, 6),
    deep: makeWater(DEEP, 8),
    rays: makeRays(),
    shore: makeShore(),
    shingle: makeShingle(),
    parchment: makeParchment(),
    desk: makeDesk(),
  };
}
