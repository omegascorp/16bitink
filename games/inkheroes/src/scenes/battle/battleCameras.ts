import type Phaser from 'phaser';
import { BACKDROP } from '../../art/palette';
import { DPR, uiCamera } from '../hidpi';
import { fitWorld, WORLD, type WorldFit } from './pixelLayout';

/** Device pixels per CSS pixel, rounded: the least zoom for a native or UI pixel (1 at a laptop's 125%, 2 on a phone). */
const MIN_K = Math.round(DPR);

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
 * The battle's cameras. The world camera shows the 960 × 540 pixel world at
 * a whole-number zoom, centred, rounding to whole pixels, and fills the rest
 * of the canvas with the background round it (no letterbox). The UI camera
 * draws the pixel interface (buttons, turn order, messages, cards) over it,
 * also at a whole-number zoom from the canvas's top-left: the world's own
 * zoom, so a UI pixel is an art pixel and lands on the same grid, or a
 * bigger one where the world is shown small (a phone held upright). The HUD
 * camera draws the few things left at screen resolution (the loading line).
 * Each sees only its own layer.
 */
export class BattleCameras {
  readonly world: Phaser.GameObjects.Layer;
  readonly hud: Phaser.GameObjects.Container;
  /** The pixel UI, in UI pixels from the canvas's top-left. */
  readonly ui: Phaser.GameObjects.Container;
  private readonly worldCam: Phaser.Cameras.Scene2D.Camera;
  private readonly hudCam: Phaser.Cameras.Scene2D.Camera;
  private readonly uiCam: Phaser.Cameras.Scene2D.Camera;
  private fit: WorldFit = fitWorld(WORLD.w, WORLD.h);
  /** Device pixels per UI pixel. */
  private uiK = 1;

  constructor(private readonly scene: Phaser.Scene) {
    this.worldCam = scene.cameras.main;
    this.worldCam.setRoundPixels(true).setOrigin(0).setBackgroundColor(BACKDROP);
    this.hudCam = uiCamera(scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'hud'));
    this.uiCam = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'ui').setOrigin(0).setRoundPixels(true);
    this.world = scene.add.layer();
    this.hud = scene.add.container(0, 0).setDepth(1);
    // A container, not a layer: input checks a container child against its parent's cameras.
    this.ui = scene.add.container(0, 0).setDepth(2);
    this.worldCam.ignore([this.hud, this.ui]);
    this.hudCam.ignore([this.world, this.ui]);
    this.uiCam.ignore([this.world, this.hud]);
    this.refit();
  }

  /** Fits the world to the canvas as it is now (call on resize). */
  refit(): void {
    const { width, height } = this.scene.scale;
    // A wide screen stands the field on its bottom edge (the spare height is sky); a tall one centres it, room below for the bar.
    // A native pixel never under a CSS pixel: a phone fills its screen at a fractional zoom instead.
    this.fit = fitWorld(width, height, width >= height ? 'bottom' : 'center', MIN_K);
    const { k, x, y } = this.fit;
    // The camera fills the canvas; the world's corner lands on (x, y) and the extended background covers the rest.
    this.worldCam.setViewport(0, 0, width, height).setZoom(k).setScroll(-x / k, -y / k);
    this.hudCam.setSize(width, height);
    this.setUiZoom(Math.floor(k));
  }

  /** Device pixels per UI pixel (a whole number, never a UI pixel under a CSS one); the world's own zoom unless the layout wants bigger. */
  setUiZoom(z: number): void {
    this.uiK = Math.max(MIN_K, Math.round(z));
    const { width, height } = this.scene.scale;
    this.uiCam.setViewport(0, 0, width, height).setZoom(this.uiK).setScroll(0, 0);
  }

  /** The canvas in UI pixels (whole ones; a part pixel at the right or bottom edge is left out). */
  uiSize(): { w: number; h: number; k: number } {
    const { width, height } = this.scene.scale;
    return { w: Math.floor(width / this.uiK), h: Math.floor(height / this.uiK), k: this.uiK };
  }

  /** A native world point in UI pixels: whole when the UI shares the world's zoom. */
  worldToUi(x: number, y: number): { x: number; y: number } {
    const { k, x: ox, y: oy } = this.fit;
    return { x: (ox + x * k) / this.uiK, y: (oy + y * k) / this.uiK };
  }

  /** Whether a UI pixel is exactly a world pixel (the UI is on the art's grid). */
  uiOnWorldGrid(): boolean {
    return this.uiK === this.fit.k;
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
