import Phaser from 'phaser';
import { ART_RES } from '../art/palette';

/**
 * Device pixels per CSS pixel the canvas renders at. Capped at the resolution
 * textures are baked at: beyond that only lines and text gain, at a steep
 * fill-rate cost on phones.
 */
export const DPR = typeof window === 'undefined' ? 1 : Math.min(ART_RES, Math.max(1, window.devicePixelRatio || 1));

/** The screen size the interface is laid out for; smaller screens (phones) draw it smaller, as InkFish's uiScale does. */
const UI_DESIGN = { w: 760, h: 560 } as const;
/** Never smaller than this, so buttons stay big enough for a finger. */
const MIN_UI = 0.55;
/** Scenes drawn at a reduced interface scale (see screenScene). */
const uiScales = new WeakMap<Phaser.Scene, number>();

/** The interface scale `scene` draws at (1 unless set up scaled by screenScene). */
export function uiScaleOf(scene: Phaser.Scene): number {
  return uiScales.get(scene) ?? 1;
}

/** The screen in CSS pixels, whatever scale the scene's interface draws at. */
export function screenSize(scene: Phaser.Scene): { width: number; height: number } {
  return { width: scene.scale.width / DPR, height: scene.scale.height / DPR };
}

/** How big the interface draws on a screen of this CSS size: 1 on a laptop, less on a phone. */
export function uiScaleFor(width: number, height: number): number {
  return Phaser.Math.Clamp(Math.min(width / UI_DESIGN.w, height / UI_DESIGN.h), MIN_UI, 1);
}

/**
 * The game is sized in device pixels so it renders crisply, but every layout
 * is written in CSS pixels. This is the viewport in those layout units, or,
 * for a scene drawn at a reduced interface scale, in its larger layout units.
 */
export function viewSize(scene: Phaser.Scene): { width: number; height: number } {
  const s = uiScales.get(scene) ?? 1;
  return { width: scene.scale.width / DPR / s, height: scene.scale.height / DPR / s };
}

/** A screen position (pointer x/y, downX/downY) in CSS pixels, or in `scene`'s layout units when given. */
export function toView(x: number, y: number, scene?: Phaser.Scene): { x: number; y: number } {
  const s = (scene && uiScales.get(scene)) ?? 1;
  return { x: x / DPR / s, y: y / DPR / s };
}

/** Camera zoom as seen on screen, without the device-pixel factor. */
export function screenZoom(cam: Phaser.Cameras.Scene2D.Camera): number {
  return cam.zoom / DPR;
}

/** A fixed overlay camera: CSS-pixel coordinates from the top-left, drawn at device resolution. */
export function uiCamera(cam: Phaser.Cameras.Scene2D.Camera): Phaser.Cameras.Scene2D.Camera {
  return cam.setOrigin(0).setZoom(DPR);
}

/** Rasterizes every Text the scene creates at device resolution, so it stays sharp. */
export function crispText(scene: Phaser.Scene): void {
  if (DPR === 1) return;
  const onAdded = (obj: Phaser.GameObjects.GameObject): void => {
    if (obj instanceof Phaser.GameObjects.Text && obj.style.resolution < DPR) obj.setResolution(DPR);
  };
  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded));
}

/**
 * Sets up a scene whose main camera is a plain fixed screen (menus, HUD, cards).
 * `scaled` draws it smaller on small screens (see uiScaleFor), following the
 * screen as it resizes or turns: its layout then works in viewSize's units.
 */
export function screenScene(scene: Phaser.Scene, scaled = false): void {
  crispText(scene);
  if (!scaled) {
    uiScales.delete(scene);
    uiCamera(scene.cameras.main);
    return;
  }
  const apply = (): void => {
    const s = uiScaleFor(scene.scale.width / DPR, scene.scale.height / DPR);
    uiScales.set(scene, s);
    scene.cameras.main.setOrigin(0).setZoom(DPR * s);
  };
  apply();
  scene.scale.on('resize', apply);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off('resize', apply));
}
