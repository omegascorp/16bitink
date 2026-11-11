import type Phaser from 'phaser';
import { INK } from '../../art/palette';
import { DPR } from '../hidpi';
import { freePaper, HAND, paperCard } from '../uiPaint';

const SEED = 5;
const PAD_X = 16;
const KICKER = '#8a6230';
const SOFT_INK = '#3e4168';
/** Cards bake in sizes of these steps, so a resize or a new level reuses one. */
const STEP_W = 16;
const STEP_H = 8;

/**
 * The level's page from Nib's field journal, in the top-left corner,
 * taped to the board: its number and ruin, its name, and the goal.
 */
export class TitleCard {
  readonly root: Phaser.GameObjects.Container;
  private readonly kicker: Phaser.GameObjects.Text;
  private readonly name: Phaser.GameObjects.Text;
  private readonly goal: Phaser.GameObjects.Text;
  private card: Phaser.GameObjects.Image | null = null;
  private size = { w: 0, h: 0 };
  /** The level's name, and its number and name on one line. */
  private full = { name: '', line: '' };

  constructor(private readonly scene: Phaser.Scene) {
    const text = (size: number, color: string, bold: boolean): Phaser.GameObjects.Text =>
      scene.add.text(PAD_X, 0, '', { fontFamily: HAND, fontSize: `${size}px`, fontStyle: bold ? '700' : '500', color, padding: { x: 3, y: 2 } }).setResolution(DPR);
    this.kicker = text(16, KICKER, true);
    this.name = text(30, INK, true);
    this.goal = text(18, SOFT_INK, false);
    this.root = scene.add.container(0, 0, [this.kicker, this.name, this.goal]);
  }

  get height(): number {
    return this.size.h;
  }

  get width(): number {
    return this.size.w;
  }

  /** The level's ruin and number, its name, its goal, and `line`: the number and name on one line, for a touch screen. */
  set(kicker: string, name: string, goal: string, line = name): void {
    this.full = { name, line };
    this.kicker.setText(kicker);
    this.name.setText(name);
    this.goal.setText(goal);
  }

  /**
   * Lays the card out `w` wide (or narrower, if its words are short), its
   * top-left corner at (x, y). `oneLine` (a touch screen, where the haul
   * says the goal) keeps just the level's number and name.
   */
  layout(x: number, y: number, w: number, narrow: boolean, oneLine = false): void {
    this.kicker.setVisible(!oneLine).setFontSize(narrow ? 15 : 16).setY(7);
    this.goal.setVisible(!oneLine);
    this.name.setText(oneLine ? this.full.line : this.full.name);
    let ch: number;
    let words: number;
    if (oneLine) {
      this.name.setFontSize(23).setY(5);
      // A long name is cut short rather than wrapped onto the board.
      while (this.name.width + PAD_X * 2 > w && this.name.text.length > 4) this.name.setText(`${this.name.text.slice(0, -2)}…`);
      words = this.name.width + PAD_X * 2;
      ch = Math.ceil((this.name.y + this.name.height + 4) / STEP_H) * STEP_H;
    } else {
      this.name.setFontSize(narrow ? 27 : 31).setY(narrow ? 21 : 22);
      this.goal.setFontSize(narrow ? 16 : 18).setWordWrapWidth(w - PAD_X * 2 - 6).setY(this.name.y + this.name.height - 6);
      words = Math.max(this.kicker.width, this.name.width, this.goal.width) + PAD_X * 2;
      ch = Math.ceil((this.goal.y + this.goal.height + 6) / STEP_H) * STEP_H;
    }
    const cw = Math.ceil(Math.min(w, words) / STEP_W) * STEP_W;
    this.root.setPosition(x, y);
    if (cw === this.size.w && ch === this.size.h && this.card) return;
    if (this.card) {
      this.card.destroy();
      freePaper(this.scene, this.size.w, this.size.h, SEED);
    }
    this.size = { w: cw, h: ch };
    this.card = paperCard(this.scene, cw / 2, ch / 2, cw, ch, SEED, { radius: 5, rough: 1.1, shadow: 0.5, tapes: ['tl'], tapeLen: 40, tint: 'parchment' });
    this.root.addAt(this.card, 0);
  }
}
