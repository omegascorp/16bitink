import type Phaser from 'phaser';
import { INK } from '../../art/palette';
import { DPR } from '../hidpi';
import { freePaper, HAND, paperCard } from '../uiPaint';

const SEED = 9;
const PAD_X = 22;
const PAD_Y = 12;
const STEP_W = 24;
const STEP_H = 8;

/**
 * The tip along the bottom of the screen, on a slip of sage paper taped
 * at the top: how to play, the level's hint, and what just happened.
 */
export class TipNote {
  readonly root: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private card: Phaser.GameObjects.Image | null = null;
  private size = { w: 0, h: 0 };
  private bottom = { x: 0, y: 0 };
  private maxW = 400;

  constructor(private readonly scene: Phaser.Scene) {
    this.text = scene.add.text(0, 0, '', { fontFamily: HAND, fontSize: '21px', color: INK, align: 'center', padding: { x: 3, y: 2 } }).setOrigin(0.5).setResolution(DPR);
    this.root = scene.add.container(0, 0, [this.text]);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  /** The note's alpha: the HUD fades the level's tip once play starts. */
  get alpha(): number {
    return this.root.alpha;
  }

  /** Where the note's bottom edge sits (centred on x), and how wide it may grow. */
  place(x: number, bottomY: number, maxW: number, narrow: boolean): void {
    this.bottom = { x, y: bottomY };
    this.maxW = maxW;
    this.text.setFontSize(narrow ? 18 : 21);
    this.fit();
  }

  /** Shows `line` at `alpha` (cancelling a fade under way). */
  show(line: string, alpha = 1): void {
    this.scene.tweens.killTweensOf(this.root);
    this.text.setText(line);
    this.root.setVisible(true).setAlpha(alpha);
    this.fit();
    if (this.card) this.scene.tweens.add({ targets: this.card, angle: { from: -1.6, to: -0.4 }, duration: 300, ease: 'Back.Out' });
  }

  /** Fades the note out after `delay` ms. */
  fade(delay = 0, duration = 500): void {
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, alpha: 0, delay, duration, onComplete: () => this.root.setVisible(false) });
  }

  hide(): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setVisible(false);
  }

  private fit(): void {
    this.text.setWordWrapWidth(this.maxW - PAD_X * 2);
    const w = Math.min(this.maxW, Math.ceil((this.text.width + PAD_X * 2) / STEP_W) * STEP_W);
    const h = Math.ceil((this.text.height + PAD_Y * 2) / STEP_H) * STEP_H;
    this.root.setPosition(this.bottom.x, this.bottom.y - h / 2);
    this.text.setPosition(0, 2);
    if (w === this.size.w && h === this.size.h && this.card) return;
    if (this.card) {
      this.card.destroy();
      freePaper(this.scene, this.size.w, this.size.h, SEED);
    }
    this.size = { w, h };
    this.card = paperCard(this.scene, 0, 0, w, h, SEED, { radius: 4, rough: 1.2, shadow: 0.55, tapes: ['top'], tapeLen: 46, tint: 'sage' });
    this.root.addAt(this.card, 0);
  }
}
