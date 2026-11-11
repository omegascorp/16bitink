import Phaser from 'phaser';
import { BLUE, RED } from '../../art/palette';
import { clock } from '../ui';
import { HAND, paperCard, UI_RES, UI_TEX } from '../uiPaint';

const TAG_H = 60;
const SOFT_INK = '#4a463e';
/** Past par, the clock turns this ochre: the time blot is gone, nothing worse. */
const LATE = '#a0622c';
const PAPER_STROKE = '#fffaf0';
/** Tags are baked in widths of this step, so a few sizes serve every name. */
const STEP = 24;

/** The compact tag's size, units. */
export const COMPACT_TAG = { w: 92, h: 54 } as const;

/**
 * The level's paper tag in the top-left corner: its number and name, the
 * clock against par under it, and any charms at work beneath the tag.
 * `compact` (touch screens, whose pause card names the level) keeps the
 * clock alone: the time, and par under it.
 */
export class LevelTag {
  readonly root: Phaser.GameObjects.Container;
  private readonly name: Phaser.GameObjects.Text | null;
  private readonly time: Phaser.GameObjects.Text;
  private readonly charms: Phaser.GameObjects.Text;
  private readonly w: number;

  constructor(scene: Phaser.Scene, title: string, private readonly par: number, private readonly compact = false) {
    const h = compact ? COMPACT_TAG.h : TAG_H;
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (compact) {
      this.name = null;
      this.w = COMPACT_TAG.w;
      parts.push(scene.add.image(18, 19, UI_TEX.icon('clock')).setScale(0.6 / UI_RES));
      this.time = scene.add.text(30, 19, '', { fontFamily: HAND, fontSize: '23px', color: BLUE, padding: { x: 4, y: 4 } }).setOrigin(0, 0.5);
      parts.push(scene.add.text(this.w / 2, 40, `par ${clock(par)}`, { fontFamily: HAND, fontSize: '17px', color: SOFT_INK, padding: { x: 4, y: 4 } }).setOrigin(0.5));
    } else {
      this.name = scene.add.text(16, 19, title, { fontFamily: HAND, fontSize: '25px', color: BLUE, padding: { x: 4, y: 4 } }).setOrigin(0, 0.5);
      parts.push(this.name, scene.add.image(26, 43, UI_TEX.icon('clock')).setScale(0.6 / UI_RES));
      this.time = scene.add.text(38, 43, '', { fontFamily: HAND, fontSize: '19px', color: SOFT_INK, padding: { x: 4, y: 4 } }).setOrigin(0, 0.5);
      this.w = Math.max(150, Math.ceil((this.name.width + 30) / STEP) * STEP);
    }
    const card = paperCard(scene, this.w / 2, h / 2, this.w, h, 5, { radius: 5, rough: 1.1, shadow: 0.45, tapes: ['tl'], tapeLen: compact ? 30 : 38 });
    this.charms = scene.add.text(6, h + 4, '', {
      fontFamily: HAND, fontSize: '20px', color: BLUE, stroke: PAPER_STROKE, strokeThickness: 5, padding: { x: 4, y: 4 }, lineSpacing: -4,
    });
    this.root = scene.add.container(0, 0, [card, ...parts, this.time, this.charms]);
  }

  get width(): number {
    return this.w;
  }

  update(elapsed: number, danger: boolean, charms: readonly string[]): void {
    const late = elapsed > this.par;
    if (this.name) {
      this.name.setColor(danger ? RED : BLUE);
      this.time.setText(`${clock(elapsed)} / ${clock(this.par)}`).setColor(late ? LATE : SOFT_INK);
    } else this.time.setText(clock(elapsed)).setColor(danger ? RED : late ? LATE : BLUE);
    // A narrow tag stacks its charms down the paper beside the board.
    this.charms.setText(charms.join(this.compact ? '\n' : '  ·  '));
  }
}
