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

/**
 * The meter over the board: the score, the bar as a groove a vine grows
 * along as points come in (a flower opens at its end once it's full), and
 * the lives as marbles in sockets, each popping out as it's lost.
 */
export class Meter {
  readonly root: Phaser.GameObjects.Container;
  private readonly score: Phaser.GameObjects.Text;
  private readonly bar: VineBar;
  private readonly lives: Phaser.GameObjects.Image[];
  private readonly flower: Phaser.GameObjects.Image;
  private readonly full: Phaser.GameObjects.Text;
  private shownScore = -1;
  private shownLives = LIVES;
  private wasFilled = false;

  constructor(private readonly scene: Phaser.Scene) {
    const x0 = -METER_W / 2;
    this.score = scene.add.text(x0 + SCORE_W, 0, '0', {
      fontFamily: HAND, fontSize: '26px', color: BLUE, stroke: PAPER_STROKE, strokeThickness: 5, padding: { x: 4, y: 4 },
    }).setOrigin(1, 0.5);
    const barX = x0 + SCORE_W + GAP;
    this.bar = new VineBar(scene, barX, 0);
    this.flower = scene.add.image(barX + GROOVE.w + 2, -1, TEX.bloom).setScale(0).setVisible(false);
    const livesX = barX + GROOVE.w + GAP + LIFE_GAP / 2 + 2;
    const sockets = Array.from({ length: LIVES }, (_, i) => scene.add.image(livesX + i * LIFE_GAP, 1, UI_TEX.socket).setScale(1 / UI_RES));
    this.lives = Array.from({ length: LIVES }, (_, i) => scene.add.image(livesX + i * LIFE_GAP, 0, TEX.marble(LIFE_COLOUR, i % BOIL)).setScale(lifeScale()));
    this.full = scene.add.text(barX + GROOVE.w / 2, METER_H / 2 + 16, 'Bar full: pop the rest!', {
      fontFamily: HAND, fontSize: '20px', color: LEAF_INK, stroke: PAPER_STROKE, strokeThickness: 5, padding: { x: 4, y: 4 },
    }).setOrigin(0.5).setVisible(false);
    // A slip of paper under it all, so it reads over a busy board.
    const strip = paperCard(scene, 0, 0, METER_W + 26, METER_H, 17, { radius: 6, rough: 1.1, shadow: 0.45 });
    this.root = scene.add.container(0, 0, [strip, this.score, this.bar.root, ...sockets, ...this.lives, this.flower, this.full]);
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

function lifeScale(): number {
  return LIFE_R / MARBLE_R / MARBLE_RES;
}
