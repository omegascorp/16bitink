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

/**
 * The level's paper tag in the top-left corner: its number and name, the
 * clock against par under it, and any charms at work beneath the tag.
 */
export class LevelTag {
  readonly root: Phaser.GameObjects.Container;
  private readonly name: Phaser.GameObjects.Text;
  private readonly time: Phaser.GameObjects.Text;
  private readonly charms: Phaser.GameObjects.Text;
  private readonly w: number;

  constructor(scene: Phaser.Scene, title: string, private readonly par: number) {
    this.name = scene.add.text(16, 19, title, { fontFamily: HAND, fontSize: '25px', color: BLUE, padding: { x: 4, y: 4 } }).setOrigin(0, 0.5);
    const icon = scene.add.image(26, 43, UI_TEX.icon('clock')).setScale(0.6 / UI_RES);
    this.time = scene.add.text(38, 43, '', { fontFamily: HAND, fontSize: '19px', color: SOFT_INK, padding: { x: 4, y: 4 } }).setOrigin(0, 0.5);
    this.w = Math.max(150, Math.ceil((this.name.width + 30) / STEP) * STEP);
    const card = paperCard(scene, this.w / 2, TAG_H / 2, this.w, TAG_H, 5, { radius: 5, rough: 1.1, shadow: 0.45, tapes: ['tl'], tapeLen: 38 });
    this.charms = scene.add.text(6, TAG_H + 16, '', {
      fontFamily: HAND, fontSize: '20px', color: BLUE, stroke: PAPER_STROKE, strokeThickness: 5, padding: { x: 4, y: 4 },
    }).setOrigin(0, 0.5);
    this.root = scene.add.container(0, 0, [card, this.name, icon, this.time, this.charms]);
  }

  get width(): number {
    return this.w;
  }

  update(elapsed: number, danger: boolean, charms: readonly string[]): void {
    this.name.setColor(danger ? RED : BLUE);
    this.time.setText(`${clock(elapsed)} / ${clock(this.par)}`).setColor(elapsed > this.par ? LATE : SOFT_INK);
    this.charms.setText(charms.join('  ·  '));
  }
}
