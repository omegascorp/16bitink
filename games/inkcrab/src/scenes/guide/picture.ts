import type Phaser from 'phaser';

interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Alpha below this counts as empty paper. */
const INKED = 24;
/** Pixels skipped between samples: drawings are big, a coarse scan finds their edges. */
const STEP = 2;
const measured = new Map<string, Bounds>();

/** The inked part of a baked drawing, measured once per texture. */
function inkBounds(scene: Phaser.Scene, key: string): Bounds {
  const known = measured.get(key);
  if (known) return known;
  const source = scene.textures.get(key).getSourceImage() as HTMLCanvasElement;
  const { width, height } = source;
  const data = source.getContext('2d')?.getImageData(0, 0, width, height).data;
  let x0 = width;
  let y0 = height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; data && y < height; y += STEP) {
    for (let x = 0; x < width; x += STEP) {
      if (data[(y * width + x) * 4 + 3]! < INKED) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  const b = x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0 + STEP, h: y1 - y0 + STEP } : { x: 0, y: 0, w: width, h: height };
  measured.set(key, b);
  return b;
}

/**
 * Baked drawings layered in order (all the same frame size, like a crab's
 * back, its shell and its front), centred on (x, y) and scaled to fit inside
 * w × h by what's actually drawn on them, not their frame.
 */
export function fittedPicture(scene: Phaser.Scene, keys: readonly string[], x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
  const all = keys.map((key) => inkBounds(scene, key));
  const x0 = Math.min(...all.map((b) => b.x));
  const y0 = Math.min(...all.map((b) => b.y));
  const bw = Math.max(...all.map((b) => b.x + b.w)) - x0;
  const bh = Math.max(...all.map((b) => b.y + b.h)) - y0;
  const images = keys.map((key) => {
    const img = scene.add.image(0, 0, key);
    return img.setOrigin((x0 + bw / 2) / img.width, (y0 + bh / 2) / img.height);
  });
  return scene.add.container(x, y, images).setScale(Math.min(w / bw, h / bh));
}
