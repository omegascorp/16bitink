import Phaser from 'phaser';
import { getSound } from '../host';
import { INK } from '../art/pen';
import { createRng } from '../logic/rng';

export const HAND_FONT = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';
export const INK_HEX = 0x1b1a1f;
export const BLUE_INK = '#1f3f8a';
export const RED_INK = '#a3342b';

export function inkText(
  scene: Phaser.Scene, x: number, y: number, text: string, size: number, color: string = INK,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: HAND_FONT, fontSize: `${size}px`, color, padding: { x: size * 0.2, y: 4 } }).setOrigin(0.5);
}

/** Hand-drawn rectangle: each side slightly crooked, corners overshoot. */
export function wobblyRect(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, seed: number, width = 2.2, color = INK_HEX,
): void {
  const rng = createRng(seed);
  const j = (): number => (rng() - 0.5) * 4;
  const corners = [
    [x, y], [x + w, y], [x + w, y + h], [x, y + h],
  ] as const;
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
  readonly color?: string;
  readonly fill?: number;
  readonly seed?: number;
}

export function inkButton(
  scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, opts: ButtonOpts = {},
): Phaser.GameObjects.Container {
  const w = opts.width ?? 220;
  const h = opts.height ?? 56;
  const g = scene.add.graphics();
  g.fillStyle(opts.fill ?? 0xfffaf0, 0.92);
  g.fillRect(-w / 2, -h / 2, w, h);
  wobblyRect(g, -w / 2, -h / 2, w, h, opts.seed ?? label.length * 31);
  const t = inkText(scene, 0, 0, label, opts.size ?? 30, opts.color ?? INK);
  const c = scene.add.container(x, y, [g, t]).setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => c.setScale(1.05));
  // Fire only for a press that started on this button and didn't drag,
  // so lifting a steering finger or a scroll gesture never triggers it.
  let pressedAt: { x: number; y: number } | null = null;
  c.on('pointerout', () => {
    c.setScale(1);
    pressedAt = null;
  });
  c.on('pointerdown', (p: Phaser.Input.Pointer) => {
    pressedAt = { x: p.x, y: p.y };
  });
  c.on('pointerup', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    const start = pressedAt;
    pressedAt = null;
    if (!start || Phaser.Math.Distance.Between(start.x, start.y, p.x, p.y) > 12) return;
    ev.stopPropagation();
    getSound(scene)?.play('click');
    onClick();
  });
  return c;
}

/** Paper background that fills the current viewport. */
export function paperBackdrop(scene: Phaser.Scene): Phaser.GameObjects.TileSprite {
  const { width, height } = scene.scale;
  return scene.add.tileSprite(0, 0, width, height, 'paper').setOrigin(0).setScrollFactor(0);
}

/** Ink blot rating glyph, filled or hollow. */
export function drawBlot(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, filled: boolean, seed: number): void {
  const rng = createRng(seed);
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = r * (i % 2 ? 0.75 + rng() * 0.15 : 1 + rng() * 0.25);
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  if (filled) {
    g.fillStyle(INK_HEX, 1);
    g.fillPoints(pts, true);
  } else {
    g.lineStyle(1.5, INK_HEX, 0.5);
    g.strokePoints(pts, true);
  }
}

/** Uniform UI scale so menus fit small phones in landscape. */
export function uiScale(scene: Phaser.Scene, designW = 760, designH = 560): number {
  return Math.min(1, scene.scale.width / designW, scene.scale.height / designH);
}
