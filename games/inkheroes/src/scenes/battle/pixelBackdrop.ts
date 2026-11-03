import Phaser from 'phaser';
import type { SceneryArt } from '../../art/pixel/scenery';
import type { WorldFit } from './pixelLayout';
import { WORLD } from './pixelLayout';
import { clampExtend } from './pixelRaster';
import { composeScenery, type Pixels } from './pixelScenery';

const KEY = 'px-battle-backdrop';
/** Margins grow in steps of this many native pixels, so a resize rarely rebuilds the texture. */
const STEP = 32;

/** What the backdrop is made from: a terrain's scenery parts (laid out per battle) or a fixed painting. */
export type BackdropSource =
  | { readonly scenery: SceneryArt; readonly atlasKey: string; readonly seed: number }
  | { readonly paintingKey: string };

type Margin = WorldFit['margin'];

function pixelsOf(scene: Phaser.Scene, key: string): Pixels {
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return { data: ctx.getImageData(0, 0, img.width, img.height).data, w: img.width, h: img.height };
}

/**
 * The battle's background, covering the world and every native pixel of
 * screen round it. From scenery parts it is composed for exactly the area
 * the screen shows (a wider screen gets more scenery, never stretched or
 * repeated). From a painting (terrains without parts yet) the painting is
 * centred on the world and its edge rows and columns repeat outward. One
 * native texture (NEAREST), rebuilt only when the canvas needs wider margins.
 */
export class Backdrop {
  readonly image: Phaser.GameObjects.Image;
  /** Pixels added round the world on each side. */
  private margin: Margin = { left: 0, right: 0, top: 0, bottom: 0 };
  private readonly src: Pixels;
  /** A painting's top-left in the world: centred, from its size (never stretched). */
  private readonly at: { x: number; y: number };

  constructor(private readonly scene: Phaser.Scene, private readonly source: BackdropSource, depth: number) {
    this.src = pixelsOf(scene, 'scenery' in source ? source.atlasKey : source.paintingKey);
    this.at = 'scenery' in source ? { x: 0, y: 0 } : { x: Math.floor((WORLD.w - this.src.w) / 2), y: Math.floor((WORLD.h - this.src.h) / 2) };
    this.image = scene.add.image(0, 0, '__DEFAULT').setOrigin(0).setDepth(depth);
  }

  /** Covers the world and at least `need` native pixels round it. */
  fit(need: Margin): void {
    const cur = this.margin;
    if (need.left <= cur.left && need.right <= cur.right && need.top <= cur.top && need.bottom <= cur.bottom && this.scene.textures.exists(KEY)) return;
    const up = (v: number, have: number): number => Math.max(have, Math.ceil(Math.max(0, v) / STEP) * STEP);
    this.margin = { left: up(need.left, cur.left), right: up(need.right, cur.right), top: up(need.top, cur.top), bottom: up(need.bottom, cur.bottom) };
    const out = this.render(this.margin);
    if (this.scene.textures.exists(KEY)) {
      this.image.setTexture('__DEFAULT');
      this.scene.textures.remove(KEY);
    }
    const tex = this.scene.textures.createCanvas(KEY, out.w, out.h)!;
    tex.context.putImageData(new ImageData(new Uint8ClampedArray(out.data), out.w, out.h), 0, 0);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.image.setTexture(KEY).setPosition(-this.margin.left, -this.margin.top);
  }

  /** The texture for the world plus margin `m`, its top-left at world (-m.left, -m.top). */
  private render(m: Margin): Pixels {
    const area = { x: -m.left, y: -m.top, w: WORLD.w + m.left + m.right, h: WORLD.h + m.top + m.bottom };
    if ('scenery' in this.source) return composeScenery(this.src, this.source.scenery, area, this.source.seed);
    const { w, h } = this.src;
    const ext = {
      left: m.left + this.at.x, right: m.right + WORLD.w - w - this.at.x,
      top: m.top + this.at.y, bottom: m.bottom + WORLD.h - h - this.at.y,
    };
    // A painting larger than the area is cropped by negative margins: clampExtend wants them >= 0.
    const grown = clampExtend(this.src.data, w, h, {
      left: Math.max(0, ext.left), right: Math.max(0, ext.right), top: Math.max(0, ext.top), bottom: Math.max(0, ext.bottom),
    });
    const ox = Math.max(0, -ext.left);
    const oy = Math.max(0, -ext.top);
    const data = new Uint8ClampedArray(area.w * area.h * 4);
    for (let y = 0; y < area.h; y++) {
      const s = ((y + oy) * grown.w + ox) * 4;
      data.set(grown.data.subarray(s, s + area.w * 4), y * area.w * 4);
    }
    return { data, w: area.w, h: area.h };
  }

  destroy(): void {
    this.image.destroy();
    if (this.scene.textures.exists(KEY)) this.scene.textures.remove(KEY);
  }
}
