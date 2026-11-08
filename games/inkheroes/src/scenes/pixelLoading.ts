import Phaser from 'phaser';
import { SCENERY } from '../art/pixel/scenery';
import { heroArt, nearest, PX_TEX } from './battle/pixelAssets';
import { FIGURE_DEPTH, PixelFigure } from './battle/pixelFigure';
import { FILLS } from './battle/pixelFrames';
import { renderPixelText } from './battle/pixelFont';
import { PixelBuffer, type Rgba } from './battle/pixelRaster';
import { DriftingScenery } from './battle/driftingScenery';
import { HORIZON_Y } from './battle/pixelScenery';
import { PixelFrame, PixelImage, TextLabel, texturePixels } from './battle/pixelUi';
import { drawWordmark } from './menu/wordmark';
import { townScenery } from './town/pixelTownView';

const TERRAIN = 'grass';
const SEED = 3041;
/** Where the horizon sits down the screen, the wordmark's middle, and the bar's top. */
const HORIZON_AT = 0.52;
const MARK_AT = 0.26;
const BAR_AT = 0.74;
const BAR = { maxW: 300, h: 12, inset: 3 } as const;
const GOLD: Rgba = [240, 196, 84, 255];
const GOLD_LIT: Rgba = [255, 236, 160, 255];
/** How far above the bar the rider's feet are. */
const RIDE_ABOVE = 3;

/** Queues the loading screen's own art (the grass scenery, the hero's ride); resolves once it is in. */
export function loadLoadingArt(scene: Phaser.Scene): Promise<void> {
  const hero = heroArt();
  const atlas = PX_TEX.scenery(TERRAIN);
  const ride = PX_TEX.hero(hero.id, 'walk');
  if (!scene.textures.exists(atlas)) scene.load.image(atlas, SCENERY[TERRAIN]!.url);
  if (!scene.textures.exists(ride)) scene.load.spritesheet(ride, hero.art.url.walk, { frameWidth: hero.art.w, frameHeight: hero.art.h });
  const done = (): void => [atlas, ride].forEach((k) => nearest(scene, k));
  if (!scene.load.list.size) {
    done();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      done();
      resolve();
    });
    scene.load.start();
  });
}

/**
 * The game's loading screen in its pixel art: the grass country under a
 * clear sky, its clouds drifting, the gold wordmark, a bronze bar filling with gold and the
 * hero riding along it as it fills, the step named under it. UI pixels at
 * the UI camera's whole zoom; call update() every frame for the ride.
 */
export class PixelLoading {
  private readonly owned: { destroy(): void }[] = [];
  private readonly country: DriftingScenery;
  private readonly layer: Phaser.GameObjects.Layer;
  private readonly rider: PixelFigure;
  private readonly label: TextLabel;
  private fill: PixelImage | null = null;
  private bar = { x: 0, y: 0, w: 0 };
  private shown = 0;

  constructor(private readonly scene: Phaser.Scene, size: { w: number; h: number }, text: string, drift = 0) {
    const { w, h } = size;
    const horizon = Math.floor(h * HORIZON_AT);
    this.country = new DriftingScenery(scene, { atlas: texturePixels(scene, PX_TEX.scenery(TERRAIN)), art: townScenery(), seed: SEED, area: { x: 0, y: HORIZON_Y - horizon, w, h }, at: { x: 0, y: 0 }, depth: 0, drift });
    const mask = renderPixelText({ lines: ['INKHEROES'] }, { ink: [255, 255, 255, 255] });
    const scale = Math.max(2, Math.min(5, Math.floor((w - 24) / mask.w)));
    const mark = new PixelImage(scene, drawWordmark(mask, scale), { x: 0.5, y: 0.5 }).setPosition(Math.floor(w / 2), Math.floor(h * MARK_AT));
    mark.img.setDepth(2);
    this.owned.push(mark);
    const bw = Math.min(BAR.maxW, w - 40);
    this.bar = { x: Math.floor((w - bw) / 2), y: Math.floor(h * BAR_AT), w: bw };
    const frame = new PixelFrame(scene, bw, BAR.h, { rim: 'bronze', fill: FILLS.plate }).setPosition(this.bar.x, this.bar.y);
    frame.img.setDepth(2);
    this.owned.push(frame);
    this.label = new TextLabel(scene, { outline: true, anchor: { x: 0.5, y: 0 } }).setText(text).setPosition(Math.floor(w / 2), this.bar.y + BAR.h + 6);
    this.label.img.setDepth(2);
    this.owned.push(this.label);
    this.layer = scene.add.layer().setDepth(3);
    const hero = heroArt();
    this.rider = new PixelFigure(scene, this.layer, hero.art, (pose) => PX_TEX.hero(hero.id, pose), this.feet(0), false);
    this.rider.walk();
    this.draw();
  }

  private feet(f: number): { x: number; y: number } {
    return { x: this.bar.x + Math.round(f * this.bar.w), y: this.bar.y - RIDE_ABOVE };
  }

  /** The bar at `f` (0..1, never going back), and the step's name if it changes. */
  setProgress(f: number, text?: string): void {
    const next = Math.max(this.shown, Math.min(1, f));
    if (text) this.label.setText(text);
    if (next === this.shown) return;
    this.shown = next;
    this.draw();
  }

  private draw(): void {
    const inner = this.bar.w - BAR.inset * 2;
    const n = Math.round(inner * this.shown);
    this.fill?.destroy();
    this.fill = null;
    if (n > 0) {
      const b = new PixelBuffer(n, BAR.h - BAR.inset * 2);
      for (let y = 0; y < b.h; y++) for (let x = 0; x < n; x++) b.put(x, y, y === 0 ? GOLD_LIT : GOLD);
      this.fill = new PixelImage(this.scene, b).setPosition(this.bar.x + BAR.inset, this.bar.y + BAR.inset);
      this.fill.img.setDepth(2);
    }
    const at = this.feet(this.shown);
    this.rider.setFeet(at.x, at.y);
    this.rider.sprite.setDepth(FIGURE_DEPTH);
  }

  /** How far the clouds have drifted (carry it into a redrawn screen). */
  get drift(): number {
    return this.country.drift;
  }

  update(delta: number): void {
    this.rider.update(delta);
    this.country.update(delta);
  }

  destroy(): void {
    this.fill?.destroy();
    for (const o of this.owned) o.destroy();
    this.rider.destroy();
    this.layer.destroy();
    this.country.destroy();
  }
}

