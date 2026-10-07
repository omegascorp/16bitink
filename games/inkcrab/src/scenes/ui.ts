import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER_HEX } from '../art/palette';
import { createRng } from '../logic/rng';
import { toView } from './hidpi';

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

export interface ButtonOpts {
  readonly width?: number;
  readonly height?: number;
  readonly size?: number;
  /** Fill behind the label (default paper) and the label's ink (default blue). */
  readonly fill?: number;
  readonly color?: string;
}

/**
 * A paper button with a hand-drawn border (after InkFish's). It fires only
 * for a press that started on it and didn't drag, so lifting a steering
 * finger never triggers it.
 */
export function inkButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, opts: ButtonOpts = {}): Phaser.GameObjects.Container {
  const w = opts.width ?? 200;
  const h = opts.height ?? 52;
  const g = scene.add.graphics();
  g.fillStyle(opts.fill ?? PAPER_HEX, 0.95).fillRect(-w / 2, -h / 2, w, h);
  wobblyRect(g, -w / 2, -h / 2, w, h, label.length * 31, 1.8, BLUE_HEX);
  const t = inkText(scene, 0, 0, label, opts.size ?? 28, opts.color);
  const c = scene.add.container(x, y, [g, t]).setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  let pressedAt: { x: number; y: number } | null = null;
  c.on('pointerover', () => c.setScale(1.04));
  c.on('pointerout', () => {
    c.setScale(1);
    pressedAt = null;
  });
  c.on('pointerdown', (p: Phaser.Input.Pointer) => {
    pressedAt = toView(p.x, p.y);
  });
  c.on('pointerup', (p: Phaser.Input.Pointer) => {
    const start = pressedAt;
    pressedAt = null;
    const end = toView(p.x, p.y);
    if (!start || Math.hypot(start.x - end.x, start.y - end.y) > 12) return;
    onClick();
  });
  return c;
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

export { clock } from '../logic/clock';
