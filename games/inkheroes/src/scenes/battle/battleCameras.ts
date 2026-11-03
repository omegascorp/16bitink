import type Phaser from 'phaser';
import { BACKDROP } from '../../art/palette';
import { DPR, uiCamera } from '../hidpi';
import { fitWorld, WORLD, type WorldFit } from './pixelLayout';

/** The world's place on screen in CSS pixels (the HUD's units). */
export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** CSS pixels per native pixel. */
  readonly k: number;
}

/**
 * The battle's two cameras. The world camera shows the 960 × 540 pixel world
 * at a whole-number zoom, centred, rounding to whole pixels, and fills the
 * rest of the canvas with the background painting round it (no letterbox);
 * the HUD camera draws the interface over it at screen resolution so text
 * stays crisp. Each sees only its own layer: the world layer holds the field
 * and the figures, the HUD container the buttons, messages and floats.
 */
export class BattleCameras {
  readonly world: Phaser.GameObjects.Layer;
  readonly hud: Phaser.GameObjects.Container;
  private readonly worldCam: Phaser.Cameras.Scene2D.Camera;
  private readonly hudCam: Phaser.Cameras.Scene2D.Camera;
  private fit: WorldFit = fitWorld(WORLD.w, WORLD.h);

  constructor(private readonly scene: Phaser.Scene) {
    this.worldCam = scene.cameras.main;
    this.worldCam.setRoundPixels(true).setOrigin(0).setBackgroundColor(BACKDROP);
    this.hudCam = uiCamera(scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'hud'));
    this.world = scene.add.layer();
    this.hud = scene.add.container(0, 0).setDepth(1);
    this.worldCam.ignore(this.hud);
    this.hudCam.ignore(this.world);
    this.refit();
  }

  /** Fits the world to the canvas as it is now (call on resize). */
  refit(): void {
    const { width, height } = this.scene.scale;
    this.fit = fitWorld(width, height);
    const { k, x, y } = this.fit;
    // The camera fills the canvas; the world's corner lands on (x, y) and the extended background covers the rest.
    this.worldCam.setViewport(0, 0, width, height).setZoom(k).setScroll(-x / k, -y / k);
    this.hudCam.setSize(width, height);
  }

  /** Native pixels of canvas beyond each edge of the world. */
  margin(): WorldFit['margin'] {
    return this.fit.margin;
  }

  /** The world on screen, CSS pixels. */
  rect(): ScreenRect {
    const { k, x, y } = this.fit;
    return { x: x / DPR, y: y / DPR, w: (WORLD.w * k) / DPR, h: (WORLD.h * k) / DPR, k: k / DPR };
  }

  /** A native world point on screen, CSS pixels (for HUD things that follow a unit). */
  toScreen(x: number, y: number): { x: number; y: number } {
    const { k, x: ox, y: oy } = this.fit;
    return { x: (ox + x * k) / DPR, y: (oy + y * k) / DPR };
  }

  /** A pointer's position (device pixels) in native world pixels. */
  toWorld(px: number, py: number): { x: number; y: number } {
    const { k, x, y } = this.fit;
    return { x: (px - x) / k, y: (py - y) / k };
  }
}
