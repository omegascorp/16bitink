import Phaser from 'phaser';
import type { SceneryArt } from '../../art/pixel/scenery';
import { CLOUD_SPEED, putTexture } from './pixelBackdrop';
import { CLOUD_BAND, CLOUD_PERIOD, composeClouds, composeScenery, composeSky, type Pixels } from './pixelScenery';
import { putBuffer } from './pixelUi';

let serial = 0;

export interface DriftingSceneryOpts {
  readonly atlas: Pixels;
  readonly art: SceneryArt;
  readonly seed: number;
  /** The part of the scenery's world shown. */
  readonly area: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  /** Where the area's top-left goes (in `into`, or the scene). */
  readonly at: { readonly x: number; readonly y: number };
  readonly into?: Phaser.GameObjects.Container;
  readonly depth?: number;
  /** Paints more over the front layer (its pixels, the area) before it is made a texture: the town's city. */
  readonly paint?: (front: Pixels) => void;
  /** How far the clouds have drifted already (carried over from the screen before). */
  readonly drift?: number;
}

/**
 * A terrain's scenery as the battle shows it, for any screen: the sky, a
 * looping strip of clouds drifting slowly right over it (by fractions of a
 * pixel, its pixels kept square), and the land in front. Call update
 * every frame.
 */
export class DriftingScenery {
  /** The land in front (the town taps it for its plots). */
  readonly front: Phaser.GameObjects.Image;
  private readonly sky: Phaser.GameObjects.Image;
  private readonly clouds: Phaser.GameObjects.TileSprite;
  private readonly keys: string[];
  private readonly cloudKey = `px-drift-clouds-${serial++}`;
  /** Native pixels the clouds have drifted. */
  drift: number;

  constructor(private readonly scene: Phaser.Scene, private readonly opts: DriftingSceneryOpts) {
    const { area, at, art } = opts;
    this.drift = opts.drift ?? 0;
    const skyKey = putBuffer(scene, composeSky(art, area));
    const front = composeScenery(opts.atlas, art, area, opts.seed, 'front');
    opts.paint?.(front);
    const frontKey = putBuffer(scene, front);
    this.keys = [skyKey, frontKey];
    putTexture(scene, this.cloudKey, composeClouds(opts.atlas, art, opts.seed), true);
    this.sky = scene.add.image(at.x, at.y, skyKey).setOrigin(0);
    this.clouds = scene.add.tileSprite(at.x, at.y + CLOUD_BAND.top - area.y, area.w, CLOUD_BAND.bottom - CLOUD_BAND.top, this.cloudKey).setOrigin(0);
    this.front = scene.add.image(at.x, at.y, frontKey).setOrigin(0);
    const parts = [this.sky, this.clouds, this.front];
    if (opts.into) opts.into.add(parts);
    if (opts.depth !== undefined) for (const p of parts) p.setDepth(opts.depth);
    this.place();
  }

  update(delta: number): void {
    this.drift = (this.drift + (CLOUD_SPEED * delta) / 1000) % CLOUD_PERIOD;
    this.place();
  }

  /** The cloud strip's scroll: its loop starts at world x = drift, so the clouds move right. */
  private place(): void {
    this.clouds.setTilePosition((((this.opts.area.x - this.drift) % CLOUD_PERIOD) + CLOUD_PERIOD) % CLOUD_PERIOD, 0);
  }

  destroy(): void {
    for (const o of [this.sky, this.clouds, this.front]) o.destroy();
    for (const k of [...this.keys, this.cloudKey]) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
