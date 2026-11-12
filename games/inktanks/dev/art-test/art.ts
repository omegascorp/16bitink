import Phaser from 'phaser';
import art from './assets/art.json';
import { pixelsOf, putPixels, rotateFrom, upscale8 } from './rotsprite';

/** The player's team colour, put on each hull's grey stripe. */
export const TEAM_INK_BLUE = 0x3c6cc8;
/** RotSprite mode's steps round the circle. */
export const STEPS = 32;
const SHEET_COLS = 8;

export const ART = art;
export type PartKey = string;

// Served by the dev server from dev/ (the page is dev/art-test.html).
const assetUrl = (path: string): string => `art-test/assets/${path}`;

/** Queues every image the art test uses. */
export function preloadArt(scene: Phaser.Scene): void {
  scene.load.image('ground', assetUrl('ground.png'));
  for (const key of art.parts) scene.load.image(`src:${key}`, assetUrl(`parts/${key}.png`));
  for (const key of art.drives) for (const f of [1, 2]) scene.load.image(`src:${key}-f${f}`, assetUrl(`parts/${key}-f${f}.png`));
  for (const key of art.stripe) scene.load.image(`mask:${key}`, assetUrl(`parts/${key}-stripe.png`));
  for (const key of Object.keys(art.props)) scene.load.image(`prop:${key}`, assetUrl(`props/${key}.png`));
  for (const key of Object.keys(art.shadows)) scene.load.image(`shadow:${key}`, assetUrl(`props/${key}-shadow.png`));
}

function canvasOf(scene: Phaser.Scene, key: string): HTMLCanvasElement {
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return c;
}

/** The team colour on the stripe: the art's flat grey (about 50%) becomes the team colour, its shading kept. */
function tintStripe(part: HTMLCanvasElement, mask: HTMLCanvasElement, colour: number): void {
  const ctx = part.getContext('2d')!;
  const img = ctx.getImageData(0, 0, part.width, part.height);
  const m = mask.getContext('2d')!.getImageData(0, 0, mask.width, mask.height).data;
  const r = (colour >> 16) & 255;
  const g = (colour >> 8) & 255;
  const b = colour & 255;
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (m[i]! < 128) continue;
    const lum = (d[i]! + d[i + 1]! + d[i + 2]!) / 3 / 128;
    d[i] = Math.min(255, r * lum);
    d[i + 1] = Math.min(255, g * lum);
    d[i + 2] = Math.min(255, b * lum);
  }
  ctx.putImageData(img, 0, 0);
}

/** Free mode's texture `free:<key>` and RotSprite mode's sheet `rot:<key>` with frames '0'..'31'. */
function addPart(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  scene.textures.addCanvas(`free:${key}`, canvas);
  const { width: w, height: h } = canvas;
  const sheet = document.createElement('canvas');
  sheet.width = w * SHEET_COLS;
  sheet.height = h * Math.ceil(STEPS / SHEET_COLS);
  const big = upscale8(pixelsOf(canvas));
  for (let i = 0; i < STEPS; i++) {
    putPixels(sheet, rotateFrom(big, w, h, (i / STEPS) * Math.PI * 2), (i % SHEET_COLS) * w, Math.floor(i / SHEET_COLS) * h);
  }
  const tex = scene.textures.addCanvas(`rot:${key}`, sheet)!;
  for (let i = 0; i < STEPS; i++) tex.add(String(i), 0, (i % SHEET_COLS) * w, Math.floor(i / SHEET_COLS) * h, w, h);
}

/** Builds every part's textures in both rotation modes, the stripe in the team colour; plus each build's body outline for its shadow. */
export function buildPartTextures(scene: Phaser.Scene, bodies: ReadonlyArray<{ id: string; drive: string; hull: string }>): void {
  const canvases = new Map<string, HTMLCanvasElement>();
  const keys = [...art.parts, ...art.drives.flatMap((d) => [`${d}-f1`, `${d}-f2`])];
  for (const key of keys) {
    const c = canvasOf(scene, `src:${key}`);
    if (art.stripe.includes(key)) tintStripe(c, canvasOf(scene, `mask:${key}`), TEAM_INK_BLUE);
    canvases.set(key, c);
    addPart(scene, key, c);
  }
  // A drive and its hull turn together, so their shadow is one outline: no darker band where they overlap.
  for (const b of bodies) {
    const c = document.createElement('canvas');
    c.width = c.height = art.partSize;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(canvases.get(b.drive)!, 0, 0);
    ctx.drawImage(canvases.get(b.hull)!, 0, 0);
    addPart(scene, `body:${b.id}`, c);
  }
}

/** The RotSprite frame nearest a turn of `angle` radians (clockwise from the art's north). */
export function stepOf(angle: number): number {
  const i = Math.round((angle / (Math.PI * 2)) * STEPS);
  return ((i % STEPS) + STEPS) % STEPS;
}

export function stepAngle(step: number): number {
  return (step / STEPS) * Math.PI * 2;
}
