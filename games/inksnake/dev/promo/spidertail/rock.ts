import { makeCanvas, Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { fbm, hex, jointDistance, mixRgb, ridged, type Rgb, sstep, vnoise } from './noise';

/**
 * The stone itself, baked once a pixel at a time: a height field of bedded
 * limestone (ledges, joints, pits) lit by a low sun, so that it reads as rock
 * with a real depth: seen from rock level (`low`, the ledges shrink towards
 * the far edge, far and near stone out of focus) and from above (`top`, the
 * bird's eye). `noon` is the same rock under another day's light.
 */

export const LOW = { x0: -170, y0: 300, w: 1420, h: 1620 } as const;
export const TOP = { x0: -60, y0: 0, w: 1200, h: 1920 } as const;
/** The far lip of the rock, in world y, and where its ledges would meet. */
const LIP = 446;
const VANISH = 330;

export type RockLight = 'dawn' | 'noon' | 'top';

interface Field {
  readonly w: number;
  readonly h: number;
  readonly height: Float32Array;
  readonly crack: Float32Array;
  readonly band: Float32Array;
  readonly lichen: Float32Array;
  readonly slope: Float32Array;
}

const newField = (w: number, h: number): Field => {
  const n = w * h;
  return { w, h, height: new Float32Array(n), crack: new Float32Array(n), band: new Float32Array(n), lichen: new Float32Array(n), slope: new Float32Array(n) };
};

/** One pixel of stone at surface coordinates (u, v): long beds of limestone, stepped and worn, a few joints running through them. */
function stone(f: Field, i: number, u: number, v: number): void {
  const wu = u + 0.5 * fbm(u * 0.5, v * 0.5 + 3, 3);
  const wv = v + 0.55 * fbm(u * 0.42 + 9, v * 0.42, 3);
  const tt = wv * 0.62 + 0.3 * fbm(u * 0.3, 1.7, 3);
  const bed = Math.floor(tt);
  const fr = tt - bed;
  const riser = sstep(0, 0.07, fr);
  const plate = vnoise(bed * 3.7, Math.floor(wu * 0.7 + bed * 0.7) * 2.1);
  const gate = sstep(0.52, 0.62, fbm(u * 0.6 + 40, v * 0.6, 3)) * sstep(5.2, 6, v);
  const joint = (1 - sstep(0, 0.018 + 0.008 * Math.min(1, v / 5), jointDistance(wu * 0.8, wv * 0.5))) * gate;
  const wear = fbm(u * 4, v * 4, 5);
  const rough = ridged(u * 1.3, v * 1.1, 4);
  const pits = sstep(0.64, 0.8, fbm(u * 10, v * 10, 2));
  f.height[i] = -(bed + riser + fr * 0.3) * 0.5 + plate * 0.16 + rough * 0.5 + wear * 0.62 + fbm(u * 16, v * 11, 3) * 0.1 - joint * 0.2 - pits * 0.08;
  f.crack[i] = Math.max(joint, (1 - riser) * 0.55);
  f.band[i] = 0.5 * vnoise(bed * 5.1, 0.3) + 0.5 * fbm(u * 0.4, wv * 3.4, 3);
  const crust = fbm(u * 4.2 + 21, v * 3 - 4, 4);
  const grain = fbm(u * 30, v * 30, 2);
  const orange = sstep(0.67, 0.7, crust + (grain - 0.5) * 0.12);
  const sage = fbm(u * 5 - 8, v * 3.4 + 30, 3) + (grain - 0.5) * 0.12 > 0.68 ? 1 : 0;
  const pale = fbm(u * 3 + 60, v * 2.6, 3) + (grain - 0.5) * 0.1 > 0.665 ? 1 : 0;
  f.lichen[i] = orange > 0.5 ? 2 : sage ? 1 : pale ? 3 : 0;
}

function fieldLow(): Field {
  const f = newField(LOW.w, LOW.h);
  for (let y = 0; y < f.h; y++) {
    const d = Math.max(60, LOW.y0 + y - VANISH);
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x;
      const wx = LOW.x0 + x;
      stone(f, i, ((wx - 540) / d) * 1.5, 2300 / d);
      f.slope[i] = d / 560;
    }
  }
  return f;
}

function fieldTop(): Field {
  const f = newField(TOP.w, TOP.h);
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x;
      stone(f, i, x * 0.0052, y * 0.0062 + 2);
      f.slope[i] = 0.72;
    }
  }
  return f;
}

interface Sun {
  readonly dir: readonly [number, number, number];
  readonly key: Rgb;
  readonly fill: Rgb;
  readonly gain: number;
}

const unit = (v: readonly [number, number, number]): readonly [number, number, number] => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};

const SUNS: Readonly<Record<RockLight, Sun>> = {
  dawn: { dir: unit([-0.74, -0.3, 0.6]), key: [0.98, 0.84, 0.66], fill: [0.5, 0.48, 0.54], gain: 1 },
  noon: { dir: unit([0.5, -0.38, 0.78]), key: [0.88, 0.86, 0.8], fill: [0.4, 0.44, 0.52], gain: 0.95 },
  top: { dir: unit([-0.72, -0.5, 0.55]), key: [0.96, 0.84, 0.68], fill: [0.5, 0.49, 0.54], gain: 0.98 },
};

const STONE = hex('#cfc3aa');
const BUFF = hex('#c2ad8b');
const COOL = hex('#ada392');
const RUST = hex('#b6966e');
const ORANGE = hex('#bf9a60');
const SAGE = hex('#a3a578');
const CRUST = hex('#dcd5c2');

function albedo(f: Field, i: number): Rgb {
  const b = f.band[i]!;
  let c = mixRgb(mixRgb(COOL, STONE, sstep(0.3, 0.55, b)), BUFF, sstep(0.45, 0.7, b));
  c = mixRgb(c, RUST, 0.5 * sstep(0.6, 0.8, b));
  const l = f.lichen[i]!;
  if (l === 3) return mixRgb(c, CRUST, 0.55);
  if (l === 2) return mixRgb(c, ORANGE, 0.62);
  return l === 1 ? mixRgb(c, SAGE, 0.55) : c;
}

function light(f: Field, sun: Sun, lip: (x: number) => number, y0: number, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(f.w, f.h);
  const out = img.data;
  const rng = createRng(99);
  const [lx, ly, lz] = sun.dir;
  for (let y = 1; y < f.h - 1; y++) {
    for (let x = 1; x < f.w - 1; x++) {
      const i = y * f.w + x;
      const s = 4.8 * f.slope[i]!;
      const nx = (f.height[i - 1]! - f.height[i + 1]!) * s * 8;
      const ny = (f.height[i - f.w]! - f.height[i + f.w]!) * s * 8;
      const nl = 1 / Math.hypot(nx, ny, 1);
      const diff = Math.max(0, (nx * lx + ny * ly + lz) * nl);
      const ao = 1 - 0.72 * f.crack[i]!;
      const a = albedo(f, i);
      const grit = 0.97 + rng() * 0.06;
      const o = i * 4;
      out[o] = a[0] * (sun.fill[0] + sun.key[0] * diff) * ao * grit * sun.gain;
      out[o + 1] = a[1] * (sun.fill[1] + sun.key[1] * diff) * ao * grit * sun.gain;
      out[o + 2] = a[2] * (sun.fill[2] + sun.key[2] * diff) * ao * grit * sun.gain;
      out[o + 3] = 255 * sstep(-1.5, 1.5, y0 + y - lip(x));
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** A soft copy of a canvas, for the depth of field. */
function blurred(src: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(src.width, src.height);
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(src, 0, 0);
  ctx.filter = 'none';
  return canvas;
}

export { blurred };

/** Loose stones lying on the rock: a soft contact shadow, a lit top, a thin ink edge. */
function pebbles(ctx: CanvasRenderingContext2D, pen: Pen, seed: number, count: number, area: { readonly x0: number; readonly y0: number; readonly w: number; readonly h: number }, size: (y: number) => number, side: number): void {
  const rng = createRng(seed);
  const list = Array.from({ length: count }, () => ({ x: area.x0 + rng() * area.w, y: area.y0 + rng() * area.h, a: rng(), b: rng() })).sort((p, q) => p.y - q.y);
  for (const p of list) {
    const r = size(p.y) * (0.45 + p.a * p.a * 1.5);
    const n = 9;
    const pts = Array.from({ length: n }, (_, j) => {
      const a = (j / n) * Math.PI * 2;
      const w = r * (0.7 + 0.5 * vnoise(p.x + j * 3.4, p.b * 40));
      return { x: p.x + Math.cos(a) * w, y: p.y + Math.sin(a) * w * 0.68 };
    });
    ctx.save();
    ctx.fillStyle = 'rgba(38,26,18,0.5)';
    ctx.filter = `blur(${Math.max(1.5, r * 0.22)}px)`;
    ctx.beginPath();
    ctx.ellipse(p.x + side * r * 0.42, p.y + r * 0.34, r * 1.2, r * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const g = ctx.createRadialGradient(p.x - side * r * 0.35, p.y - r * 0.42, r * 0.08, p.x, p.y, r * 1.1);
    const warm = p.b < 0.3;
    g.addColorStop(0, warm ? '#d9c4a2' : '#d3c9b4');
    g.addColorStop(0.55, warm ? '#a98d6c' : '#a2957f');
    g.addColorStop(1, warm ? '#5e4634' : '#5c5044');
    ctx.fillStyle = g;
    ctx.beginPath();
    pts.forEach((q, j) => (j === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
    ctx.closePath();
    ctx.fill();
    pen.hair([...pts.slice(1, 7)], Math.max(0.8, r * 0.05), '#33261c', 0.55);
  }
}

const lipAt = (x: number): number => LIP + 26 * (fbm(x * 0.0035, 2.5, 4) - 0.5) + 7 * (vnoise(x * 0.03, 6) - 0.5);

/** The focus falls off above and below the band the story happens in. */
function focusMask(ctx: CanvasRenderingContext2D, soft: HTMLCanvasElement, h: number, stops: readonly (readonly [number, number])[]): void {
  const { canvas, ctx: m } = makeCanvas(soft.width, soft.height);
  m.drawImage(soft, 0, 0);
  m.globalCompositeOperation = 'destination-in';
  const g = m.createLinearGradient(0, 0, 0, h);
  for (const [at, a] of stops) g.addColorStop(at, `rgba(0,0,0,${a})`);
  m.fillStyle = g;
  m.fillRect(0, 0, soft.width, h);
  ctx.drawImage(canvas, 0, 0);
}

let fieldL: Field | null = null;

function bakeLow(kind: 'dawn' | 'noon'): HTMLCanvasElement {
  fieldL ??= fieldLow();
  const { canvas, ctx } = makeCanvas(LOW.w, LOW.h);
  light(fieldL, SUNS[kind], (x) => lipAt(LOW.x0 + x), LOW.y0, canvas);
  ctx.save();
  ctx.translate(-LOW.x0, -LOW.y0);
  const side = kind === 'dawn' ? 1 : 0.15;
  const pen = new Pen(ctx, 8, 0.5);
  const sizeAt = (y: number): number => (y - VANISH) / 84;
  pebbles(ctx, pen, 41, 90, { x0: LOW.x0, y0: 470, w: LOW.w, h: 340 }, sizeAt, side);
  pebbles(ctx, pen, 43, 30, { x0: LOW.x0, y0: 800, w: LOW.w, h: 760 }, sizeAt, side);
  ctx.restore();
  const soft = blurred(canvas, 5);
  const softer = blurred(canvas, 13);
  const h = LOW.h;
  focusMask(ctx, soft, h, [[0, 1], [(560 - LOW.y0) / h, 0.9], [(700 - LOW.y0) / h, 0], [(1230 - LOW.y0) / h, 0], [(1420 - LOW.y0) / h, 1], [1, 1]]);
  focusMask(ctx, softer, h, [[0, 0], [(1400 - LOW.y0) / h, 0], [(1640 - LOW.y0) / h, 1], [1, 1]]);
  return canvas;
}

function bakeTop(): HTMLCanvasElement {
  const f = fieldTop();
  const { canvas, ctx } = makeCanvas(TOP.w, TOP.h);
  light(f, SUNS.top, () => -9, 0, canvas);
  ctx.save();
  ctx.translate(-TOP.x0, -TOP.y0);
  pebbles(ctx, new Pen(ctx, 9, 0.5), 47, 70, TOP, () => 10, 1);
  ctx.restore();
  return canvas;
}

const baked = new Map<RockLight, HTMLCanvasElement>();

export function rockImage(kind: RockLight): HTMLCanvasElement {
  const have = baked.get(kind);
  if (have) return have;
  const made = kind === 'top' ? bakeTop() : bakeLow(kind);
  baked.set(kind, made);
  return made;
}

export function drawRock(ctx: CanvasRenderingContext2D, kind: RockLight): void {
  const r = kind === 'top' ? TOP : LOW;
  ctx.drawImage(rockImage(kind), r.x0, r.y0, r.w, r.h);
}

/** A few pebbles scattered over the snake where it hides, on its camouflage layer. */
export function hidingPebbles(ctx: CanvasRenderingContext2D, seed: number, area: { readonly x0: number; readonly y0: number; readonly w: number; readonly h: number }, size: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  pebbles(ctx, new Pen(ctx, seed, 0.5), seed, 60, area, () => size, 1);
  ctx.restore();
}
