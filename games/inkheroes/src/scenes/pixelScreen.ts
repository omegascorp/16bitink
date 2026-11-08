import type Phaser from 'phaser';
import { DPR } from './hidpi';

/**
 * The pixel size the map, its HUD, the cards and the menu draw at: device
 * pixels per art pixel, always a whole number so every art pixel is the
 * same square. About fourteen map tiles fit the screen's short side, the
 * same pixel the battle uses on a laptop (2 on a 1512 × 751 Retina screen,
 * 1 on 1366 × 768, 3 on 4K), and never less than one CSS pixel, so text
 * on a phone stays readable (the canvas there is 2 device pixels a CSS pixel).
 */
const SHORT_SIDE_PER_K = 672;

export function pixelZoom(scale: { width: number; height: number }): number {
  return Math.max(1, Math.round(DPR), Math.round(Math.min(scale.width, scale.height) / SHORT_SIDE_PER_K));
}

/** The canvas in UI pixels at zoom `k` (a part pixel at the right or bottom edge is left out). */
export function uiSizeAt(scale: { width: number; height: number }, k: number): { w: number; h: number } {
  return { w: Math.floor(scale.width / k), h: Math.floor(scale.height / k) };
}

/**
 * Sets a scene's main camera to draw the pixel UI: UI pixels from the
 * canvas's top-left at the whole zoom, following resizes. `onResize` runs
 * after each (re)fit with the new size in UI pixels.
 */
export function pixelUiCamera(scene: Phaser.Scene, onResize?: (size: { w: number; h: number; k: number }) => void): () => { w: number; h: number; k: number } {
  const fit = (): { w: number; h: number; k: number } => {
    const k = pixelZoom(scene.scale);
    scene.cameras.main.setOrigin(0).setRoundPixels(true).setZoom(k).setScroll(0, 0);
    return { ...uiSizeAt(scene.scale, k), k };
  };
  const onResizeEvent = (): void => onResize?.(fit());
  fit();
  scene.scale.on('resize', onResizeEvent);
  scene.events.once('shutdown', () => scene.scale.off('resize', onResizeEvent));
  return fit;
}
