import Phaser from 'phaser';
import type { SceneryArt } from '../../art/pixel/scenery';
import type { WorldFit } from './pixelLayout';
import { WORLD } from './pixelLayout';
import { clampExtend } from './pixelRaster';
import { CLOUD_BAND, CLOUD_PERIOD, composeClouds, composeScenery, composeSky, type Pixels } from './pixelScenery';

const KEY = 'px-battle-backdrop';
const SKY_KEY = 'px-battle-sky';
const CLOUD_KEY = 'px-battle-clouds';
/** Margins grow in steps of this many native pixels, so a resize rarely rebuilds the texture. */
const STEP = 32;
/** How fast the clouds drift right, native pixels a second (moved a whole pixel at a time). */
const CLOUD_SPEED = 3;

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

/** Puts `p` into the canvas texture `key` (replacing it), filtered NEAREST. */
function putTexture(scene: Phaser.Scene, key: string, p: Pixels): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, p.w, p.h)!;
  tex.context.putImageData(new ImageData(new Uint8ClampedArray(p.data), p.w, p.h), 0, 0);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/**
 * The battle's background, covering the world and every native pixel of
 * screen round it. From scenery parts it is composed for exactly the area
 * the screen shows (a wider screen gets more scenery, never stretched or
 * repeated), in three layers back to front: the sky, a looping strip of
 * clouds that drifts slowly by whole pixels, and everything else. From a
 * painting (a terrain without parts) the painting is centred on the world
 * and its edge rows and columns repeat outward. Textures are native
 * (NEAREST) and rebuilt only when the canvas needs wider margins.
 */
export class Backdrop {
  /** Back to front; add them all to the world layer. */
  readonly objects: readonly Phaser.GameObjects.GameObject[];
  private readonly sky: Phaser.GameObjects.Image | null = null;
  private readonly clouds: Phaser.GameObjects.TileSprite | null = null;
  private readonly front: Phaser.GameObjects.Image;
  /** Pixels added round the world on each side. */
  private margin: Margin = { left: 0, right: 0, top: 0, bottom: 0 };
  private readonly src: Pixels;
  /** A painting's top-left in the world: centred, from its size (never stretched). */
  private readonly at: { x: number; y: number };
  /** Native pixels the clouds have drifted (fractional; drawn whole). */
  private drift = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly source: BackdropSource, depth: number) {
    const scenery = 'scenery' in source;
    this.src = pixelsOf(scene, scenery ? source.atlasKey : source.paintingKey);
    this.at = scenery ? { x: 0, y: 0 } : { x: Math.floor((WORLD.w - this.src.w) / 2), y: Math.floor((WORLD.h - this.src.h) / 2) };
    if (scenery) {
      putTexture(scene, CLOUD_KEY, composeClouds(this.src, source.scenery, source.seed));
      this.sky = scene.add.image(0, 0, '__DEFAULT').setOrigin(0).setDepth(depth);
      this.clouds = scene.add.tileSprite(0, CLOUD_BAND.top, WORLD.w, CLOUD_BAND.bottom - CLOUD_BAND.top, CLOUD_KEY).setOrigin(0).setDepth(depth);
    }
    this.front = scene.add.image(0, 0, '__DEFAULT').setOrigin(0).setDepth(depth);
    this.objects = [this.sky, this.clouds, this.front].filter((o): o is NonNullable<typeof o> => o !== null);
  }

  /** Covers the world and at least `need` native pixels round it. */
  fit(need: Margin): void {
    const cur = this.margin;
    if (need.left <= cur.left && need.right <= cur.right && need.top <= cur.top && need.bottom <= cur.bottom && this.scene.textures.exists(KEY)) return;
    const up = (v: number, have: number): number => Math.max(have, Math.ceil(Math.max(0, v) / STEP) * STEP);
    this.margin = { left: up(need.left, cur.left), right: up(need.right, cur.right), top: up(need.top, cur.top), bottom: up(need.bottom, cur.bottom) };
    const m = this.margin;
    const area = { x: -m.left, y: -m.top, w: WORLD.w + m.left + m.right, h: WORLD.h + m.top + m.bottom };
    for (const o of [this.sky, this.front]) o?.setTexture('__DEFAULT');
    if ('scenery' in this.source) {
      putTexture(this.scene, SKY_KEY, composeSky(this.source.scenery, area));
      this.sky!.setTexture(SKY_KEY).setPosition(area.x, area.y);
      this.clouds!.setPosition(area.x, CLOUD_BAND.top).setSize(area.w, CLOUD_BAND.bottom - CLOUD_BAND.top);
      this.placeClouds();
      putTexture(this.scene, KEY, composeScenery(this.src, this.source.scenery, area, this.source.seed, 'front'));
    } else {
      putTexture(this.scene, KEY, this.painting(area));
    }
    this.front.setTexture(KEY).setPosition(area.x, area.y);
  }

  /** Drifts the clouds (call every frame). */
  update(delta: number): void {
    if (!this.clouds) return;
    const before = Math.floor(this.drift);
    this.drift = (this.drift + (CLOUD_SPEED * delta) / 1000) % CLOUD_PERIOD;
    if (Math.floor(this.drift) !== before) this.placeClouds();
  }

  /** The cloud strip's scroll: its loop starts at world x = drift, so the clouds move right. */
  private placeClouds(): void {
    const x = (((-this.margin.left - Math.floor(this.drift)) % CLOUD_PERIOD) + CLOUD_PERIOD) % CLOUD_PERIOD;
    this.clouds!.setTilePosition(x, 0);
  }

  /** The painting over `area`, its edges repeated outward where the area reaches past it. */
  private painting(area: { x: number; y: number; w: number; h: number }): Pixels {
    const { w, h } = this.src;
    const ext = {
      left: -area.x + this.at.x, right: area.x + area.w - WORLD.w + WORLD.w - w - this.at.x,
      top: -area.y + this.at.y, bottom: area.y + area.h - WORLD.h + WORLD.h - h - this.at.y,
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
    for (const o of this.objects) o.destroy();
    for (const k of [KEY, SKY_KEY, CLOUD_KEY]) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
