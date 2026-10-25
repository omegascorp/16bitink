import Phaser from 'phaser';
import { BLUE, BOIL } from '../../art/palette';
import { snakeArt } from '../../art/snakes/index';
import { TEX } from '../../art/textures';
import { LIVES } from '../../logic/world';
import type { SnakeId } from '../../logic/species';
import { GROOVE, HAND, LIFE_R, paperCard, UI_RES, UI_TEX, VineBar } from '../uiPaint';

/** The meter row's height (for layout), units. */
export const METER_H = 50;
const SCORE_W = 78;
const GAP = 12;
const LIFE_GAP = 30;
/** The row's width: score, bar, lives. */
export const METER_W = SCORE_W + GAP + GROOVE.w + GAP + LIFE_GAP * LIVES;
const PAPER_STROKE = '#fffaf0';

/** A life's little snake head, sized to sit in a socket. */
export function lifeIcon(scene: Phaser.Scene, id: SnakeId, x: number, y: number, f = 0, size = 1): Phaser.GameObjects.Image {
  const art = snakeArt(id).head;
  return scene.add.image(x, y, TEX.head(id, 'shut', f)).setScale((LIFE_R * 3.4 * size) / (art.frame * art.res)).setAngle(-90);
}

/**
 * The meter over the board: the score, the goal as a groove a vine grows
 * along (length grown, or the feast, or the boss's hits), and the lives as
 * little snake heads in sockets, each popping out as it's lost.
 */
export class Meter {
  readonly root: Phaser.GameObjects.Container;
  private readonly score: Phaser.GameObjects.Text;
  private readonly bar: VineBar;
  private readonly lives: Phaser.GameObjects.Image[];
  private shownScore = -1;
  private shownLives: number;

  constructor(private readonly scene: Phaser.Scene, private readonly snake: SnakeId, lives = LIVES) {
    this.shownLives = lives;
    const x0 = -METER_W / 2;
    this.score = scene.add.text(x0 + SCORE_W, 0, '0', {
      fontFamily: HAND, fontSize: '26px', color: BLUE, stroke: PAPER_STROKE, strokeThickness: 5, padding: { x: 4, y: 4 },
    }).setOrigin(1, 0.5);
    const barX = x0 + SCORE_W + GAP;
    this.bar = new VineBar(scene, barX, 0);
    const livesX = barX + GROOVE.w + GAP + LIFE_GAP / 2 + 2;
    const sockets = Array.from({ length: lives }, (_, i) => scene.add.image(livesX + i * LIFE_GAP, 1, UI_TEX.socket).setScale(1 / UI_RES));
    this.lives = Array.from({ length: lives }, (_, i) => lifeIcon(scene, snake, livesX + i * LIFE_GAP, 0, i % BOIL));
    // A slip of paper under it all, so it reads over a busy board.
    const strip = paperCard(scene, 0, 0, METER_W + 26, METER_H, 17, { radius: 6, rough: 1.1, shadow: 0.45 });
    this.root = scene.add.container(0, 0, [strip, this.score, this.bar.root, ...sockets, ...this.lives]);
  }

  update(score: number, progress: number, lives: number, time: number): void {
    this.bar.set(progress, time);
    if (score !== this.shownScore) {
      if (this.shownScore >= 0 && score > this.shownScore) this.scene.tweens.add({ targets: this.score, scale: { from: 1.18, to: 1 }, duration: 220, ease: 'Quad.Out' });
      this.shownScore = score;
      this.score.setText(`${score}`);
    }
    const f = Math.floor(time / 160) % BOIL;
    this.lives.forEach((m, i) => {
      if (m.visible) m.setTexture(TEX.head(this.snake, 'shut', (f + i) % BOIL));
    });
    if (lives < this.shownLives) this.lose(lives);
    this.shownLives = lives;
  }

  /** The lives from `left` on pop out of their sockets. */
  private lose(left: number): void {
    for (let i = left; i < this.shownLives; i++) {
      const m = this.lives[i]!;
      this.scene.tweens.add({
        targets: m, scale: m.scale * 1.7, alpha: 0, y: m.y - 10, duration: 360, ease: 'Quad.Out',
        onComplete: () => m.setVisible(false),
      });
    }
  }
}
