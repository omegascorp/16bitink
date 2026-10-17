import Phaser from 'phaser';
import { toView, viewSize } from '../hidpi';

/** On a screen too short for a page `contentH` tall, drag or wheel to scroll it, starting at `startY`. */
export function dragScroll(scene: Phaser.Scene, contentH: number, startY: number): void {
  const { height } = viewSize(scene);
  if (contentH <= height) return;
  const cam = scene.cameras.main;
  // Clamped by hand: camera bounds don't sit right with this zoomed, top-left-origin camera.
  const to = (y: number): void => {
    cam.setScroll(0, Phaser.Math.Clamp(y, 0, contentH - height));
  };
  to(startY);
  scene.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => to(cam.scrollY + dy));
  let last: number | null = null;
  scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
    last = toView(ptr.x, ptr.y, scene).y;
  });
  scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
    if (last === null || !ptr.isDown) return;
    const now = toView(ptr.x, ptr.y, scene).y;
    to(cam.scrollY - (now - last));
    last = now;
  });
  scene.input.on('pointerup', () => {
    last = null;
  });
}
