import type Phaser from 'phaser';
import { INK } from '../../art/palette';
import { DPR } from '../hidpi';
import { HEARTS } from '../GameScene';
import { freePaper, HAND, paperCard } from '../uiPaint';

const SEED = 17;
export const HEART_SCALE = 0.44;
const HEART_GAP = 26;
const TAG_H = 44;
const GREEN = '#2f7a3a';
const STEP_W = 16;

/**
 * The haul so far on a slip of paper: the hearts left, the chest (ticked
 * once Nib has it) and the coins against the goal. Its width is set once
 * per level, from the widest count it will show, so it never re-bakes as
 * the coins come in.
 */
export class StatusTag {
  readonly root: Phaser.GameObjects.Container;
  readonly hearts: Phaser.GameObjects.Image[];
  readonly chest: Phaser.GameObjects.Image;
  private readonly tick: Phaser.GameObjects.Text;
  private readonly coin: Phaser.GameObjects.Image;
  private readonly count: Phaser.GameObjects.Text;
  private card: Phaser.GameObjects.Image | null = null;
  private w = 0;
  private hasChest = true;

  constructor(private readonly scene: Phaser.Scene) {
    this.hearts = Array.from({ length: HEARTS }, (_, i) => scene.add.image(20 + i * HEART_GAP, TAG_H / 2, 'heart').setScale(HEART_SCALE));
    this.chest = scene.add.image(0, TAG_H / 2 + 1, 'chest-closed').setScale(0.24);
    this.tick = scene.add.text(0, TAG_H / 2 + 5, '✓', { fontFamily: HAND, fontSize: '24px', fontStyle: '700', color: GREEN }).setOrigin(0.5).setResolution(DPR).setVisible(false);
    this.coin = scene.add.image(0, TAG_H / 2, 'coins', 0).setScale(0.46);
    this.count = scene.add.text(0, TAG_H / 2, '', { fontFamily: HAND, fontSize: '25px', fontStyle: '700', color: INK, padding: { x: 3, y: 2 } }).setOrigin(0, 0.5).setResolution(DPR);
    this.root = scene.add.container(0, 0, [...this.hearts, this.chest, this.tick, this.coin, this.count]);
  }

  get width(): number {
    return this.w;
  }

  static get height(): number {
    return TAG_H;
  }

  /** A new level: whether it has a chest, and the widest count it will show. */
  reset(hasChest: boolean, widest: string): void {
    this.hasChest = hasChest;
    this.chest.setVisible(hasChest).setTexture('chest-closed').setScale(0.24);
    this.tick.setVisible(false);
    this.count.setText(widest);
    const heartsEnd = 20 + (HEARTS - 1) * HEART_GAP + 14;
    const chestX = heartsEnd + 22;
    this.chest.setX(chestX);
    this.tick.setX(chestX + 9);
    const coinX = (hasChest ? chestX + 30 : heartsEnd + 14);
    this.coin.setX(coinX);
    this.count.setX(coinX + 13);
    const w = Math.ceil((this.count.x + this.count.width + 12) / STEP_W) * STEP_W;
    if (w !== this.w || !this.card) {
      if (this.card) {
        this.card.destroy();
        freePaper(this.scene, this.w, TAG_H, SEED);
      }
      this.w = w;
      this.card = paperCard(this.scene, w / 2, TAG_H / 2, w, TAG_H, SEED, { radius: 6, rough: 1, shadow: 0.45 });
      this.root.addAt(this.card, 0);
    }
  }

  setCount(label: string, done: boolean): void {
    this.count.setText(label).setColor(done ? GREEN : INK);
  }

  /** Nib has the chest (or not, after a rewind). */
  setChest(taken: boolean): void {
    if (!this.hasChest || taken === this.tick.visible) return;
    this.tick.setVisible(taken);
    this.chest.setTexture(taken ? 'chest-open' : 'chest-closed');
    if (taken) this.scene.tweens.add({ targets: this.chest, scale: 0.34, duration: 160, yoyo: true });
  }
}
