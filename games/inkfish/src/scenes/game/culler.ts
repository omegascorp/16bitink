import type Phaser from 'phaser';

/** How far past the edge of the view things stay drawn, world px (the view lags the camera by a frame). */
export const CULL_MARGIN = 160;

interface Entry {
  readonly obj: Phaser.GameObjects.Image;
  /** Furthest any pixel of the image can reach from its position, in any rotation. */
  readonly reach: number;
}

/**
 * Phaser draws every object in the scene each frame, on screen or not. The
 * Culler hides scenery that is out of view, so the GPU only gets what can be
 * seen. Only for objects nothing else shows or hides: their glow twins copy
 * the visibility, so they come and go with them.
 */
export class Culler {
  private readonly entries: Entry[] = [];

  /** Registers things that stay put (they may sway or fade in place). */
  add(objs: readonly Phaser.GameObjects.Image[]): void {
    for (const obj of objs) {
      if (obj.scrollFactorX !== 1 || obj.scrollFactorY !== 1) continue;
      this.entries.push({ obj, reach: Math.hypot(obj.displayWidth, obj.displayHeight) });
    }
  }

  update(view: Phaser.Geom.Rectangle): void {
    for (const { obj, reach } of this.entries) {
      if (!obj.active) continue;
      const seen = inView(view, obj.x, obj.y, reach + CULL_MARGIN);
      if (obj.visible !== seen) obj.setVisible(seen);
    }
  }
}

/** A circle of `reach` around (x, y) overlaps the view. */
export function inView(view: Phaser.Geom.Rectangle, x: number, y: number, reach: number): boolean {
  return x + reach > view.x && x - reach < view.right && y + reach > view.y && y - reach < view.bottom;
}
