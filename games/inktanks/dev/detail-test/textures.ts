import Phaser from 'phaser';
import { pixelsOf, putPixels, rotateFrom, upscale8 } from '../art-test/rotsprite';

/** One density's parts, as install_detail.py writes them (assets/<D>/manifest.json). */
export interface Manifest {
  density: 'A' | 'B' | 'C';
  /** Native pixels per model unit: 1, 4/3 or 2. */
  unit: number;
  /** The square part canvas, its centre the pivot. */
  size: number;
  ring: Record<string, [number, number]>;
  stripe: string[];
  hulls: string[];
  drives: string[];
  turrets: string[];
}

export const STEPS = 32;
const COLS = 8;
const TEAM_INK_BLUE = 0x3c6cc8;

const url = (m: Manifest, file: string): string => `detail-test/assets/${m.density}/${file}`;

export function preloadDensity(scene: Phaser.Scene, m: Manifest): void {
  scene.load.image('ground', url(m, 'ground.png'));
  for (const k of [...m.hulls, ...m.drives, ...m.turrets]) scene.load.image(`src:${k}`, url(m, `${k}.png`));
  for (const k of m.drives) for (const f of [1, 2]) scene.load.image(`src:${k}-f${f}`, url(m, `${k}-f${f}.png`));
  for (const k of m.stripe) scene.load.image(`mask:${k}`, url(m, `${k}-stripe.png`));
}

function canvasOf(scene: Phaser.Scene, key: string): HTMLCanvasElement {
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return c;
}

/** The art's flat grey stripe becomes the team colour, its shading kept (as the art test). */
function tint(part: HTMLCanvasElement, mask: HTMLCanvasElement): void {
  const ctx = part.getContext('2d')!;
  const img = ctx.getImageData(0, 0, part.width, part.height);
  const m = mask.getContext('2d')!.getImageData(0, 0, mask.width, mask.height).data;
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (m[i]! < 128) continue;
    const lum = (d[i]! + d[i + 1]! + d[i + 2]!) / 3 / 128;
    d[i] = Math.min(255, ((TEAM_INK_BLUE >> 16) & 255) * lum);
    d[i + 1] = Math.min(255, ((TEAM_INK_BLUE >> 8) & 255) * lum);
    d[i + 2] = Math.min(255, (TEAM_INK_BLUE & 255) * lum);
  }
  ctx.putImageData(img, 0, 0);
}

/** A part's RotSprite sheet `rot:<key>`, frames '0'..'31' clockwise from north. */
function addRot(scene: Phaser.Scene, key: string, c: HTMLCanvasElement): void {
  const { width: w, height: h } = c;
  const sheet = document.createElement('canvas');
  sheet.width = w * COLS;
  sheet.height = h * Math.ceil(STEPS / COLS);
  const big = upscale8(pixelsOf(c));
  for (let i = 0; i < STEPS; i++) putPixels(sheet, rotateFrom(big, w, h, (i / STEPS) * Math.PI * 2), (i % COLS) * w, Math.floor(i / COLS) * h);
  const tex = scene.textures.addCanvas(`rot:${key}`, sheet)!;
  for (let i = 0; i < STEPS; i++) tex.add(String(i), 0, (i % COLS) * w, Math.floor(i / COLS) * h, w, h);
}

export function buildDensity(scene: Phaser.Scene, m: Manifest, bodies: ReadonlyArray<{ id: string; drive: string; hull: string }>): void {
  const canvases = new Map<string, HTMLCanvasElement>();
  for (const k of [...m.hulls, ...m.turrets, ...m.drives, ...m.drives.flatMap((d) => [`${d}-f1`, `${d}-f2`])]) {
    const c = canvasOf(scene, `src:${k}`);
    if (m.stripe.includes(k)) tint(c, canvasOf(scene, `mask:${k}`));
    canvases.set(k, c);
    addRot(scene, k, c);
  }
  for (const b of bodies) {
    const c = document.createElement('canvas');
    c.width = c.height = m.size;
    c.getContext('2d')!.drawImage(canvases.get(b.drive)!, 0, 0);
    c.getContext('2d')!.drawImage(canvases.get(b.hull)!, 0, 0);
    addRot(scene, `body:${b.id}`, c);
  }
}

export function stepOf(angle: number): number {
  const i = Math.round((angle / (Math.PI * 2)) * STEPS);
  return ((i % STEPS) + STEPS) % STEPS;
}
