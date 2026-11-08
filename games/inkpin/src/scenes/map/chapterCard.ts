import Phaser from 'phaser';
import { INK, PAPER } from '../../art/palette';

const FONT = 'Caveat';
const SOFT_INK = '#4a463e';
const CARD_W = 420;

export interface ChapterCardOpts {
  readonly title: string;
  readonly lines: readonly string[];
  /** The one button, if any: the full game's offer, or a retry. */
  readonly action?: { readonly label: string; readonly run: () => void };
}

/**
 * The note over the map on a chapter this player can't play: the full game's
 * offer, a retry for an owner whose chapters did not load, or "on the way".
 * Tapping outside it, Esc or × closes it; Enter takes the button.
 */
export class ChapterCard {
  private readonly root: Phaser.GameObjects.Container;
  private readonly onKey: (e: KeyboardEvent) => void;

  constructor(private readonly scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, view: { width: number; height: number }, o: ChapterCardOpts, private readonly onClose: () => void) {
    const shade = scene.add.rectangle(0, 0, view.width, view.height, 0xf5f0e1, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());
    const h = o.action ? 330 : 270;
    const fit = Math.min(1, (view.height - 24) / h, (view.width - 16) / CARD_W);
    const card = scene.add.container(view.width / 2, view.height / 2);
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.12).fillRoundedRect(-CARD_W / 2 + 6, -h / 2 + 8, CARD_W, h, 14);
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(PAPER).color, 1).fillRoundedRect(-CARD_W / 2, -h / 2, CARD_W, h, 14);
    bg.lineStyle(3, 0x26316a, 1).strokeRoundedRect(-CARD_W / 2, -h / 2, CARD_W, h, 14);
    const body = scene.add.zone(0, 0, CARD_W, h).setInteractive();
    const text = (y: number, s: string, size: number, color = INK, bold = true): Phaser.GameObjects.Text =>
      scene.add.text(0, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: bold ? '700' : '500', color, align: 'center', wordWrap: { width: CARD_W - 50 }, padding: { x: 6, y: 3 } }).setOrigin(0.5).setResolution(window.devicePixelRatio * 2);
    const top = -h / 2;
    const parts: Phaser.GameObjects.GameObject[] = [bg, body, text(top + 44, o.title, 38)];
    const lines = text(top + 78, o.lines.join('\n'), 23, SOFT_INK, false).setOrigin(0.5, 0);
    parts.push(lines);
    let take = (): void => undefined;
    if (o.action) {
      const action = o.action;
      let fired = false;
      take = (): void => {
        if (fired) return;
        fired = true;
        this.close();
        action.run();
      };
      const button = text(h / 2 - 54, action.label, 34, '#ffffff').setBackgroundColor('#2f7a3a').setPadding(30, 4, 30, 4);
      button.setInteractive({ useHandCursor: true }).on('pointerup', take);
      parts.push(button);
    }
    const close = text(top + 26, '×', 36, INK).setX(CARD_W / 2 - 26).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.close());
    parts.push(close);
    card.add(parts);
    this.root = scene.add.container(0, 0, [shade, card]);
    layer.add(this.root);
    card.setScale(fit * 0.92).setAlpha(0);
    scene.tweens.add({ targets: card, scale: fit, alpha: 1, duration: 140, ease: 'Back.Out' });
    this.onKey = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      if (e.code === 'Escape') this.close();
      else if (e.code === 'Enter' || e.code === 'Space') take();
    };
    scene.input.keyboard?.on('keydown', this.onKey);
  }

  close(): void {
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.root.destroy();
    this.onClose();
  }
}
