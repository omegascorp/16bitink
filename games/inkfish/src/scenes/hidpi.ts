import Phaser from 'phaser';
import { ART_RES } from '../art/propArt';

/**
 * Device pixels per CSS pixel the canvas renders at. Capped at the resolution
 * textures are baked at: beyond that only lines and text gain, at a steep
 * fill-rate cost on phones.
 */
export const DPR = typeof window === 'undefined' ? 1 : Math.min(ART_RES, Math.max(1, window.devicePixelRatio || 1));

/**
 * The game is sized in device pixels so it renders crisply, but every layout
 * is written in CSS pixels. This is the viewport in those layout units.
 */
export function viewSize(scene: Phaser.Scene): { width: number; height: number } {
  return { width: scene.scale.width / DPR, height: scene.scale.height / DPR };
}

/** A screen position (pointer x/y, downX/downY) in CSS pixels. */
export function toView(x: number, y: number): { x: number; y: number } {
  return { x: x / DPR, y: y / DPR };
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

/** Sets up a scene whose main camera is a plain fixed screen (menus, HUD, cards). */
export function screenScene(scene: Phaser.Scene): void {
  uiCamera(scene.cameras.main);
  crispText(scene);
}
