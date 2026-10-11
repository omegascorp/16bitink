import Phaser from 'phaser';
import { BLUE_HEX, HIGHLIGHT_HEX } from '../art/palette';
import { wobblyRect } from './ui';

const CARD_FILL = 0xfffaf0;
/** When the note slides in, ms after the screen opens. */
const SLIDE_AT = 900;

/** Two strips of highlighter tape pinning the card to the page. */
function tape(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  for (const side of [-1, 1]) {
    const cx = side * (w / 2 - 34);
    const cy = -h / 2 + 2;
    const a = side * 0.6;
    const pts = [[-34, -11], [34, -11], [34, 11], [-34, 11]].map(([px, py]) =>
      new Phaser.Math.Vector2(cx + px! * Math.cos(a) - py! * Math.sin(a), cy + px! * Math.sin(a) + py! * Math.cos(a)));
    g.fillStyle(HIGHLIGHT_HEX, 0.55).fillPoints(pts, true);
  }
}

/**
 * A sheet of paper taped beside the scene, tilted a touch, holding `parts`
 * (laid out around its centre). It slides in a moment after the screen opens.
 */
export function noteCard(scene: Phaser.Scene, cx: number, cy: number, w: number, h: number, parts: readonly Phaser.GameObjects.GameObject[]): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.08).fillRect(-w / 2 + 6, -h / 2 + 8, w, h);
  g.fillStyle(CARD_FILL, 1).fillRect(-w / 2, -h / 2, w, h);
  wobblyRect(g, -w / 2, -h / 2, w, h, 4242, 2, BLUE_HEX);
  tape(g, w, h);
  // Only the paper is tilted: text on a rotated texture samples its (stale) mipmaps and smears.
  g.setRotation(-0.018);
  const card = scene.add.container(cx, cy, [g, ...parts]);
  card.setAlpha(0).setX(cx + 60);
  scene.tweens.add({ targets: card, x: cx, alpha: 1, delay: SLIDE_AT, duration: 520, ease: 'Cubic.Out' });
  return card;
}
