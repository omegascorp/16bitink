import Phaser from 'phaser';
import { INK } from '../../art/palette';
import { freePaper, paintedButton, paperCard, roundButton } from '../uiPaint';

const FONT = 'Caveat';
const SOFT_INK = '#4a463e';
const CARD_W = 420;
const SEED = 43;

export interface ChapterCardOpts {
  readonly title: string;
  readonly lines: readonly string[];
  /** The one button, if any: the full game's offer, or a retry. */
  readonly action?: { readonly label: string; readonly run: () => void; /** The full game's offer: a gold plate. */ readonly offer?: boolean };
}

/**
 * The note over the map on a chapter this player can't play: the full game's
 * offer, a retry for an owner whose chapters did not load, or "on the way".
 * Tapping outside it, Esc or × closes it; Enter takes the button.
 */
export class ChapterCard {
  private readonly root: Phaser.GameObjects.Container;
  private readonly onKey: (e: KeyboardEvent) => void;
  private readonly h: number;

  constructor(private readonly scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, view: { width: number; height: number }, o: ChapterCardOpts, private readonly onClose: () => void) {
    const shade = scene.add.rectangle(0, 0, view.width, view.height, 0xf5f0e1, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());
    const h = o.action ? 330 : 270;
    const fit = Math.min(1, (view.height - 24) / h, (view.width - 16) / CARD_W);
    const card = scene.add.container(view.width / 2, view.height / 2);
    this.h = h;
    const bg = paperCard(scene, 0, 0, CARD_W, h, SEED, { tint: 'parchment', rule: true, tapes: ['tl', 'tr'], tapeLen: 66 });
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
      parts.push(paintedButton(scene, 0, h / 2 - 58, action.label, take, { kind: action.offer ? 'gold' : 'leaf', width: 260, height: 58, size: 32 }).root);
    }
    parts.push(roundButton(scene, CARD_W / 2 - 30, top + 30, 'close', () => this.close(), 38));
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
    freePaper(this.scene, CARD_W, this.h, SEED);
    this.onClose();
  }
}
