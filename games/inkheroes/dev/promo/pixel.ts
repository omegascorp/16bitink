import { UNIT_ART, type UnitArt } from '../../src/art/pixel/manifest';

/**
 * Pixel art at video size: the game's PixelLab battle sprites and the shorts'
 * own PixelLab art, always drawn with smoothing off at whole-number scales,
 * so every art pixel is a crisp square of video pixels.
 */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode().catch(() => {
    throw new Error(`could not load ${url}`);
  });
  return img;
}

/** A strip of `frames` frames, each w × h, left to right (the manifest's layout). */
export interface Strip {
  readonly img: HTMLImageElement;
  readonly w: number;
  readonly h: number;
  readonly frames: number;
}

export interface Unit {
  readonly art: UnitArt;
  readonly idle: Strip;
  readonly walk: Strip;
  readonly attack: Strip;
}

/** One of the game's battle units by its manifest key (the Cyclops is `ogre`). */
export async function loadUnit(key: string): Promise<Unit> {
  const art = UNIT_ART[key];
  if (!art) throw new Error(`no unit art "${key}"`);
  const strip = async (kind: 'idle' | 'walk' | 'attack'): Promise<Strip> => ({ img: await loadImage(art.url[kind]), w: art.w, h: art.h, frames: art.frames[kind] });
  const [idle, walk, attack] = await Promise.all([strip('idle'), strip('walk'), strip('attack')]);
  return { art, idle, walk, attack };
}

/** A still image as a one-frame strip. */
export const still = (img: HTMLImageElement): Strip => ({ img, w: img.width, h: img.height, frames: 1 });

export interface Place {
  /** Where the anchor lands on the video, px. */
  readonly x: number;
  readonly y: number;
  /** Whole video pixels per art pixel. */
  readonly scale: number;
  /** The anchor, in the art's own pixels (default: bottom centre). */
  readonly ax?: number;
  readonly ay?: number;
  /** Mirror it (the units all face right). */
  readonly flip?: boolean;
  readonly alpha?: number;
  /** Only this part of the frame, in art pixels (default all of it). */
  readonly crop?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}

const wholeScale = (s: number): number => {
  if (!Number.isInteger(s) || s < 1) throw new Error(`pixel art scale must be a whole number, not ${s}`);
  return s;
};

/** Frame `frame` of a strip (wrapped), placed by its anchor. */
export function drawFrame(ctx: CanvasRenderingContext2D, strip: Strip, frame: number, p: Place): void {
  const alpha = p.alpha ?? 1;
  if (alpha <= 0) return;
  const s = wholeScale(p.scale);
  const f = ((Math.floor(frame) % strip.frames) + strip.frames) % strip.frames;
  const c = p.crop ?? { x: 0, y: 0, w: strip.w, h: strip.h };
  const ax = p.ax ?? strip.w / 2;
  const ay = p.ay ?? strip.h;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(p.x), Math.round(p.y));
  if (p.flip) ctx.scale(-1, 1);
  ctx.drawImage(strip.img, f * strip.w + c.x, c.y, c.w, c.h, (c.x - ax) * s, (c.y - ay) * s, c.w * s, c.h * s);
  ctx.restore();
}

/** Frame index of a loop played at `fps` on clock `t` (negative times wrap too). */
export const loopFrame = (t: number, fps: number, frames: number): number => (((Math.floor(t * fps) % frames) + frames) % frames);

/**
 * The attack strip played once from `t` = 0: a quick wind-up, the strike frame
 * held (the blow lands, the rock leaves the hand), a brisk recovery. Before 0
 * it holds frame 0; after the last frame it holds the last.
 */
export function attackFrame(t: number, frames: number, strike: number, step = 0.085, hold = 0.22): number {
  if (t <= 0) return 0;
  const upTo = strike * step;
  if (t < upTo) return Math.floor(t / step);
  if (t < upTo + hold) return strike;
  return Math.min(frames - 1, strike + 1 + Math.floor((t - upTo - hold) / step));
}

/** How long attackFrame takes to reach its last frame. */
export const attackLength = (frames: number, strike: number, step = 0.085, hold = 0.22): number => strike * step + hold + (frames - strike - 1) * step;

// ---------------------------------------------------------------- the pixel dissolve

/** A 4 × 4 ordered-dither threshold (Bayer), 0..15. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;
export const DISSOLVE_STEPS = 16;

/** The level the dissolve shows at `k` (0 none .. 16 all), whole steps so frames repeat exactly. */
export const dissolveLevel = (k: number): number => Math.round(Math.max(0, Math.min(1, k)) * DISSOLVE_STEPS);

const dissolved = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

/**
 * Part of an image with only the art pixels whose dither threshold is under
 * `level` kept: the game's pixels appearing or going a few at a time, as an
 * old console fades (a transition, not a drawing). Cached per level.
 */
function dissolvedFrame(strip: Strip, frame: number, level: number): HTMLCanvasElement {
  let cache = dissolved.get(strip.img);
  if (!cache) dissolved.set(strip.img, (cache = new Map()));
  const key = `${frame}:${level}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = strip.w;
  c.height = strip.h;
  const g = c.getContext('2d')!;
  g.drawImage(strip.img, frame * strip.w, 0, strip.w, strip.h, 0, 0, strip.w, strip.h);
  const data = g.getImageData(0, 0, strip.w, strip.h);
  for (let y = 0; y < strip.h; y++) {
    for (let x = 0; x < strip.w; x++) if (BAYER[(y % 4) * 4 + (x % 4)]! >= level) data.data[(y * strip.w + x) * 4 + 3] = 0;
  }
  g.putImageData(data, 0, 0);
  cache.set(key, c);
  return c;
}

/** drawFrame, with only `k` (0..1) of its pixels showing, in dither order. */
export function drawDissolved(ctx: CanvasRenderingContext2D, strip: Strip, frame: number, k: number, p: Place): void {
  const level = dissolveLevel(k);
  if (level <= 0) return;
  if (level >= DISSOLVE_STEPS) return drawFrame(ctx, strip, frame, p);
  const f = ((Math.floor(frame) % strip.frames) + strip.frames) % strip.frames;
  const img = dissolvedFrame(strip, f, level) as unknown as HTMLImageElement;
  drawFrame(ctx, { img, w: strip.w, h: strip.h, frames: 1 }, 0, p);
}

// ---------------------------------------------------------------- backdrops

/**
 * A backdrop filling the video at a whole-number scale, its point (fx, fy)
 * (0..1 of the image) on the video's centre, clamped so no edge shows.
 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, img: HTMLImageElement, scale: number, fx: number, fy: number, w: number, h: number): void {
  const s = wholeScale(scale);
  const dw = img.width * s;
  const dh = img.height * s;
  const x = Math.round(Math.min(0, Math.max(w - dw, w / 2 - fx * dw)));
  const y = Math.round(Math.min(0, Math.max(h - dh, h / 2 - fy * dh)));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, dw, dh);
  ctx.restore();
}

/** Darkens the frame's edges (a lamp-lit or torch-lit look); `k` 0..1. */
export function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, cx = w / 2, cy = h * 0.45): void {
  if (k <= 0) return;
  const g = ctx.createRadialGradient(cx, cy, h * 0.18, cx, cy, h * 0.75);
  g.addColorStop(0, 'rgba(8,5,3,0)');
  g.addColorStop(1, `rgba(8,5,3,${0.85 * k})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A flat wash over the frame (dimming a scene, a flash). */
export function wash(ctx: CanvasRenderingContext2D, w: number, h: number, colour: string, k: number): void {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------- a whole shot dissolving in

const masks = new Map<string, HTMLCanvasElement>();
let sceneCanvas: HTMLCanvasElement | null = null;

/** A video-sized mask with the dither cells under `level` opaque, cells `block` video px wide. */
function screenMask(w: number, h: number, block: number, level: number): HTMLCanvasElement {
  const key = `${w}x${h}:${block}:${level}`;
  const hit = masks.get(key);
  if (hit) return hit;
  const cw = Math.ceil(w / block);
  const ch = Math.ceil(h / block);
  const small = document.createElement('canvas');
  small.width = cw;
  small.height = ch;
  const g = small.getContext('2d')!;
  const data = g.createImageData(cw, ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) data.data[(y * cw + x) * 4 + 3] = BAYER[(y % 4) * 4 + (x % 4)]! < level ? 255 : 0;
  g.putImageData(data, 0, 0);
  const big = document.createElement('canvas');
  big.width = w;
  big.height = h;
  const b = big.getContext('2d')!;
  b.imageSmoothingEnabled = false;
  b.drawImage(small, 0, 0, cw * block, ch * block);
  masks.set(key, big);
  return big;
}

/** Draws a whole shot over the frame with only `k` (0..1) of it showing, in dither cells `block` px wide. */
export function drawShotDissolved(ctx: CanvasRenderingContext2D, k: number, block: number, drawShot: (c: CanvasRenderingContext2D) => void): void {
  const level = dissolveLevel(k);
  if (level <= 0) return;
  if (level >= DISSOLVE_STEPS) return drawShot(ctx);
  const { width: w, height: h } = ctx.canvas;
  if (!sceneCanvas || sceneCanvas.width !== w || sceneCanvas.height !== h) {
    sceneCanvas = document.createElement('canvas');
    sceneCanvas.width = w;
    sceneCanvas.height = h;
  }
  const g = sceneCanvas.getContext('2d')!;
  g.save();
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, w, h);
  drawShot(g);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(screenMask(w, h, block, level), 0, 0);
  g.restore();
  ctx.drawImage(sceneCanvas, 0, 0);
}
