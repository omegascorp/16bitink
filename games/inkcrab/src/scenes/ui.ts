import Phaser from 'phaser';
import { BLUE } from '../art/palette';
import { createRng } from '../logic/rng';

export const HAND_FONT = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';

export function inkText(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color: string = BLUE): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: HAND_FONT, fontSize: `${size}px`, color, padding: { x: size * 0.2, y: 4 } }).setOrigin(0.5);
}

/** Hand-drawn rectangle: each side slightly crooked, corners overshoot. */
export function wobblyRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, seed: number, width: number, color: number): void {
  const rng = createRng(seed);
  const j = (): number => (rng() - 0.5) * 3;
  const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] as const;
  g.lineStyle(width, color, 1);
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = corners[i]!;
    const [bx, by] = corners[(i + 1) % 4]!;
    const ox = (bx - ax) * 0.03;
    const oy = (by - ay) * 0.03;
    g.lineBetween(ax - ox + j(), ay - oy + j(), bx + ox + j(), by + oy + j());
  }
}
