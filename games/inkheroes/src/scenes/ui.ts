import Phaser from 'phaser';
import { INK, BLUE_HEX } from '../art/palette';
import { createRng } from '../logic/rng';
import type { PlateKind } from '../art/uiArtParts';
import { paintedButton } from './uiPaint';

export const HAND_FONT = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';

export function inkText(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color: string = INK): Phaser.GameObjects.Text {
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

export interface ButtonOpts {
  readonly width?: number;
  readonly height?: number;
  readonly size?: number;
  /** The plate's wash: paper (default), leaf green for the main action, or sky blue. */
  readonly kind?: PlateKind;
  /** The label's ink (default blue on paper, cream on a coloured wash). */
  readonly color?: string;
}

/**
 * A painted button (see paintedButton): a washed plate, pen contour, soft
 * shadow. It fires only for a press that started on it and didn't drag,
 * so lifting a steering finger never triggers it. Its label is list[1].
 */
export function inkButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, opts: ButtonOpts = {}): Phaser.GameObjects.Container {
  return paintedButton(scene, x, y, label, onClick, opts);
}

/** Ink blots (the stars): `earned` filled, the rest as empty rings. */
export function drawBlots(g: Phaser.GameObjects.Graphics, cx: number, cy: number, earned: number, r: number, of = 3): void {
  const gap = r * 2.8;
  for (let i = 0; i < of; i++) {
    const x = cx + (i - (of - 1) / 2) * gap;
    if (i < earned) g.fillStyle(BLUE_HEX, 0.85).fillCircle(x, cy, r);
    g.lineStyle(Math.max(1.2, r * 0.18), BLUE_HEX, i < earned ? 1 : 0.45).strokeCircle(x, cy, r);
  }
}

/** Seconds as m:ss. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
