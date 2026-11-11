import Phaser from 'phaser';
import { MARBLE_R, MARBLE_RES } from '../../art/marbleArt';
import { BLUE, BOIL } from '../../art/palette';
import { TEX } from '../../art/textures';
import { LIVES } from '../../logic/board';
import { GROOVE, HAND, LIFE_R, paperCard, UI_RES, UI_TEX, VineBar } from '../uiPaint';

/** The meter row's height (for layout), units. */
export const METER_H = 50;
const SCORE_W = 78;
const GAP = 12;
const LIFE_GAP = 27;
/** The row's width: score, bar, lives. */
export const METER_W = SCORE_W + GAP + GROOVE.w + GAP + LIFE_GAP * LIVES;
const LEAF_INK = '#365f2c';
const PAPER_STROKE = '#fffaf0';
/** Lives are leaf-green marbles, as the gecko's own. */
const LIFE_COLOUR = 'green';

/** The column's width, and its bar's length as a share of the row's, units. */
export const METER_COL_W = 92;
const COL_BAR = 0.62;

/**
 * The meter over the board: the score, the bar as a groove a vine grows
 * along as points come in (a flower opens at its end once it's full), and
 * the lives as marbles in sockets, each popping out as it's lost. Laid in
 * a row across the top, or (`column`, a touch screen held sideways) down
 * the paper beside the board: the score, the lives, and the vine growing
 * up from the bottom; its origin is then the column's top centre.
 */
export class Meter {
  readonly root: Phaser.GameObjects.Container;
  private readonly score: Phaser.GameObjects.Text;
  private readonly bar: VineBar;
  private readonly lives: Phaser.GameObjects.Image[];
  private readonly flower: Phaser.GameObjects.Image;
  private readonly full: Phaser.GameObjects.Text;
  private shownScore = -1;
  private shownLives: number;
  private wasFilled = false;

  /** `lives`: the level's lives (a socket each; three unless it says otherwise). */
  constructor(private readonly scene: Phaser.Scene, lives = LIVES, column = false) {
    this.shownLives = lives;
    this.score = scene.add.text(0, 0, '0', {
      fontFamily: HAND, fontSize: '26px', color: BLUE, stroke: PAPER_STROKE, strokeThickness: 5, padding: { x: 4, y: 4 },
    }).setOrigin(1, 0.5);
    this.bar = new VineBar(scene, 0, 0);
    this.flower = scene.add.image(0, 0, TEX.bloom).setScale(0).setVisible(false);
    this.full = scene.add.text(0, 0, 'Bar full: pop the rest!', {
      fontFamily: HAND, fontSize: '20px', color: LEAF_INK, stroke: PAPER_STROKE, strokeThickness: 5, padding: { x: 4, y: 4 },
    }).setOrigin(0.5).setVisible(false);
    const socketsAt = column ? this.layColumn(lives) : this.layRow();
    const sockets = socketsAt.map((p) => scene.add.image(p.x, p.y + 1, UI_TEX.socket).setScale(1 / UI_RES));
    this.lives = socketsAt.map((p, i) => scene.add.image(p.x, p.y, TEX.marble(LIFE_COLOUR, i % BOIL)).setScale(lifeScale()));
    // A slip of paper under it all, so it reads over a busy board.
    const strip = column
      ? paperCard(scene, 0, columnHeight(lives) / 2, METER_COL_W, columnHeight(lives), 18, { radius: 6, rough: 1.1, shadow: 0.45 })
      : paperCard(scene, 0, 0, METER_W + 26, METER_H, 17, { radius: 6, rough: 1.1, shadow: 0.45 });
    this.root = scene.add.container(0, 0, [strip, this.score, this.bar.root, ...sockets, ...this.lives, this.flower, this.full]);
  }

  /** Score, bar and lives side by side; where the lives go. */
  private layRow(): { x: number; y: number }[] {
    const x0 = -METER_W / 2;
    this.score.setPosition(x0 + SCORE_W, 0);
    const barX = x0 + SCORE_W + GAP;
    this.bar.root.setPosition(barX, 0);
    this.flower.setPosition(barX + GROOVE.w + 2, -1);
    this.full.setPosition(barX + GROOVE.w / 2, METER_H / 2 + 16);
    const livesX = barX + GROOVE.w + GAP + LIFE_GAP / 2 + 2;
    return Array.from({ length: this.shownLives }, (_, i) => ({ x: livesX + i * LIFE_GAP, y: 0 }));
  }

  /** Score on top, the lives under it, the vine growing up to them; where the lives go. */
  private layColumn(lives: number): { x: number; y: number }[] {
    this.score.setOrigin(0.5).setPosition(0, COL_SCORE_Y);
    const h = columnHeight(lives);
    const len = GROOVE.w * COL_BAR;
    this.bar.root.setPosition(0, h - COL_PAD).setRotation(-Math.PI / 2).setScale(COL_BAR, 1);
    this.flower.setPosition(0, h - COL_PAD - len - 2);
    // Beside the column, over the board's edge, where the flower opens.
    this.full.setOrigin(1, 0.5).setPosition(-METER_COL_W / 2 - 6, h - COL_PAD - len);
    const gap = Math.min(LIFE_GAP, (METER_COL_W - 16) / Math.max(1, lives));
    return Array.from({ length: lives }, (_, i) => ({ x: (i - (lives - 1) / 2) * gap, y: COL_LIVES_Y }));
  }

  update(score: number, progress: number, filled: boolean, lives: number, time: number): void {
    this.bar.set(progress, time);
    if (score !== this.shownScore) {
      // A bump when points come in.
      if (this.shownScore >= 0 && score > this.shownScore) this.scene.tweens.add({ targets: this.score, scale: { from: 1.18, to: 1 }, duration: 220, ease: 'Quad.Out' });
      this.shownScore = score;
      this.score.setText(`${score}`);
    }
    const f = Math.floor(time / 160) % BOIL;
    this.lives.forEach((m, i) => {
      if (m.visible) m.setTexture(TEX.marble(LIFE_COLOUR, (f + i) % BOIL));
    });
    if (lives < this.shownLives) this.lose(lives);
    this.shownLives = lives;
    if (filled && !this.wasFilled) {
      this.wasFilled = true;
      this.flower.setVisible(true);
      this.scene.tweens.add({ targets: this.flower, scale: { from: 0, to: 0.24 }, angle: { from: -40, to: 0 }, duration: 520, ease: 'Back.Out' });
      this.full.setVisible(true).setAlpha(0);
      this.scene.tweens.add({ targets: this.full, alpha: 1, y: { from: this.full.y - 6, to: this.full.y }, duration: 300 });
    }
    if (this.wasFilled) this.flower.setAngle(Math.sin(time / 600) * 6);
  }

  /** The lives from `left` on pop out of their sockets. */
  private lose(left: number): void {
    for (let i = left; i < this.shownLives; i++) {
      const m = this.lives[i]!;
      this.scene.tweens.add({
        targets: m, scale: lifeScale() * 1.7, alpha: 0, y: m.y - 10, duration: 360, ease: 'Quad.Out',
        onComplete: () => m.setVisible(false),
      });
    }
  }
}

/** The column's score and lives rows, and the room under its vine, units. */
const COL_SCORE_Y = 22;
const COL_LIVES_Y = 54;
const COL_PAD = 14;

/** The column's height: the score, the lives, then the vine. */
export function columnHeight(lives: number): number {
  return COL_LIVES_Y + 18 + GROOVE.w * COL_BAR + COL_PAD + (lives > 3 ? 4 : 0);
}

function lifeScale(): number {
  return LIFE_R / MARBLE_R / MARBLE_RES;
}
