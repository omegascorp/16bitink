import { oval, pt } from '../../../src/art/kit';
import { ICE_DEEP, INK, PAPER, PAPER_FILL } from '../../../src/art/palette';
import { makeCanvas, Pen } from '../../../src/art/pen';
import { LAB_SEA, LAB_SEA_FAR } from '../../../src/art/backdrop/packIce';
import { clamp01, VIDEO } from '../short';
import type { Sprite } from '../sprites';
import { cycle } from './timing';

/**
 * The cold seafloor of the eastern Bering Sea, in the frost beach's colours
 * (the Labrador Sea's grey-blue, ice-blue washes, shingle greys): dim water
 * above, the floor stretching away below, pale light coming down, and flecks
 * of ice drifting through it. Plus the empty dashed outline a crab leaves.
 */
export const HORIZON_Y = 500;
const FLOOR_NEAR = '#8e9aa0';
const FLOOR_FAR = '#a9b6bb';
const PEBBLES = ['#8b8f8c', '#a99f8c', '#62686a', '#c9c1ae', '#77808a'];
/** The warm wash a heatwave lays over the cold water. */
export const WARM = '#d9784e';

/** A colour as rgba() at alpha a. */
const rgba = (hex: string, a: number): string =>
  `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${a})`;

/** A vertical gradient from y0 to y1 through colour stops [where 0 .. 1, colour, alpha]. */
function band(ctx: CanvasRenderingContext2D, y0: number, y1: number, stops: readonly (readonly [number, string, number])[]): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, colour, a] of stops) g.addColorStop(at, rgba(colour, a));
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, VIDEO.width, y1 - y0);
}

/** The still part of the scene, baked once: paper, water, the floor and its stones. */
export function makeSeafloor(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // Deep water, darkest at the top, paling to a haze where the floor fades into it; then the floor, far and
  // pale at the horizon, nearer and greyer below, washed out under the captions.
  band(ctx, 0, HORIZON_Y + 40, [[0, LAB_SEA, 0.8], [0.6, LAB_SEA, 0.62], [0.9, LAB_SEA_FAR, 0.6], [1, ICE_DEEP, 0.45]]);
  band(ctx, HORIZON_Y - 20, VIDEO.height, [
    [0, ICE_DEEP, 0], [0.04, FLOOR_FAR, 0.55], [0.18, FLOOR_FAR, 0.7], [0.42, FLOOR_NEAR, 0.78], [0.6, FLOOR_NEAR, 0.75], [1, FLOOR_NEAR, 0.4],
  ]);
  const pen = new Pen(ctx, 1871, 0.6);
  // Silt ripples, closer together towards the horizon.
  for (let k = 0; k < 26; k++) {
    const y = HORIZON_Y + 12 + Math.pow(k / 25, 1.6) * 600;
    const s = 0.5 + (y - HORIZON_Y) / 600;
    for (let x = -40 + ((k * 137) % 90); x < VIDEO.width; x += 150 * s + pen.jitter(30)) {
      const w = 60 * s + pen.jitter(15);
      pen.hair([pt(x, y), pt(x + w * 0.5, y - 3 * s), pt(x + w, y)], 0.8 + 0.6 * s, INK, 0.22);
    }
  }
  // Stones and grit, bigger near the front; none under the caption band.
  for (let i = 0; i < 220; i++) {
    const u = pen.rng();
    const y = HORIZON_Y + 20 + u * u * 580;
    const s = 0.4 + (y - HORIZON_Y) / 420;
    const x = pen.rng() * VIDEO.width;
    const r = (3 + pen.rng() * 5) * s;
    const stone = oval(x, y, r * 1.4, r * 0.7, 12);
    pen.fill(stone, PAPER_FILL, 0.7);
    pen.fill(stone, PEBBLES[i % PEBBLES.length]!, 0.65);
    pen.fill(oval(x + r * 0.3, y + r * 0.45, r * 1.3, r * 0.3, 10), INK, 0.12);
    pen.stroke([...stone, stone[0]!], 0.7 + 0.4 * s, INK, 0.45, false);
  }
  pen.stipple([pt(0, HORIZON_Y), pt(VIDEO.width, HORIZON_Y), pt(VIDEO.width, 1110), pt(0, 1110)], 2600, (_, y) => 0.3 + (y - HORIZON_Y) / 900, 0.9, INK);
  return canvas;
}

/** Pale light coming down from the surface, swaying slowly. */
export function drawRays(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  [[180, 0.06, 2], [470, 0.05, 3], [760, 0.07, 2], [980, 0.04, 4]].forEach(([x, a, turns], i) => {
    const sway = 40 * cycle(t, turns!, i * 1.7);
    const g = ctx.createLinearGradient(0, 0, 0, 900);
    g.addColorStop(0, `rgba(230, 240, 245, ${a! * (0.8 + 0.2 * cycle(t, turns! + 1, i))})`);
    g.addColorStop(1, 'rgba(230, 240, 245, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x! - 40 + sway * 0.3, 0);
    ctx.lineTo(x! + 40 + sway * 0.3, 0);
    ctx.lineTo(x! + 170 + sway, 900);
    ctx.lineTo(x! + 20 + sway, 900);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

/** The heatwave's wash over the water. */
export function drawWarmth(ctx: CanvasRenderingContext2D, warmth: number): void {
  if (warmth <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.32 * warmth;
  ctx.fillStyle = WARM;
  ctx.fillRect(0, 0, VIDEO.width, 1110);
  ctx.restore();
}

/** Flecks drifting down through the water, round the loop once or twice each. */
export const FLECKS = Array.from({ length: 34 }, (_, i) => ({
  x: ((i * 397) % 1000) + 40,
  y0: ((i * 263) % 840) + 260,
  r: 5 + ((i * 53) % 7),
  turns: 1 + (i % 2),
  spin: (i * 1.3) % (Math.PI * 2),
}));
const FLECK_TOP = 260;
const FLECK_SPAN = 860;

/** Where fleck i is at loop time t. */
export function fleckAt(i: number, t: number, loop: number): { readonly x: number; readonly y: number } {
  const f = FLECKS[i]!;
  const y = FLECK_TOP + ((((f.y0 - FLECK_TOP + (FLECK_SPAN * f.turns * t) / loop) % FLECK_SPAN) + FLECK_SPAN) % FLECK_SPAN);
  return { x: f.x + 18 * cycle(t, 3 + (i % 3), f.spin), y };
}

/** The flecks: six-armed ice crystals while the water is icy (`ice` 1), shrinking to soft specks as it warms. */
export function drawFlecks(ctx: CanvasRenderingContext2D, t: number, loop: number, ice: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  FLECKS.forEach((f, i) => {
    const { x, y } = fleckAt(i, t, loop);
    // Thin out at the top and bottom of their run, so none pops in or out.
    const edge = clamp01((y - FLECK_TOP) / 60) * clamp01((FLECK_TOP + FLECK_SPAN - y) / 60);
    if (edge <= 0) return;
    ctx.globalAlpha = 0.75 * edge;
    ctx.strokeStyle = PAPER_FILL;
    ctx.fillStyle = PAPER_FILL;
    const r = f.r * (0.35 + 0.65 * ice);
    if (ice > 0.05) {
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = f.spin + (k * Math.PI) / 3 + t * 0.4;
        ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.globalAlpha = 0.75 * edge * ice;
      ctx.stroke();
    }
    ctx.globalAlpha = 0.6 * edge;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + 1.2 * (1 - ice), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/**
 * The outline a crab leaves as it fades: the sprite's silhouette traced as a
 * dashed ink line, `width` canvas px wide, with nothing inside.
 */
export function ghostOf(sprite: Sprite, width = 5, dash = 9): Sprite {
  const frames = sprite.frames.map((src) => {
    const w = src.width;
    const h = src.height;
    const data = src.getContext('2d')!.getImageData(0, 0, w, h).data;
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) solid[i] = data[i * 4 + 3]! >= 140 ? 1 : 0;
    // Grow the silhouette by `width` (rows, then columns), keep only the ring outside it.
    const grow = (src0: Uint8Array, dx: number, dy: number): Uint8Array => {
      const out = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let on = 0;
          for (let k = -width; k <= width && !on; k++) {
            const xx = x + k * dx;
            const yy = y + k * dy;
            if (xx >= 0 && yy >= 0 && xx < w && yy < h) on = src0[yy * w + xx]!;
          }
          out[y * w + x] = on;
        }
      }
      return out;
    };
    const fat = grow(grow(solid, 1, 0), 0, 1);
    const { canvas, ctx } = makeCanvas(w, h);
    const img = ctx.createImageData(w, h);
    const [r, g, b] = [0x26, 0x31, 0x6a];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!fat[i] || solid[i] || Math.floor((x + y) / dash) % 2) continue;
        img.data.set([r, g, b, 255], i * 4);
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  });
  return { ...sprite, frames };
}
