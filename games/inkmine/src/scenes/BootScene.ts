import Phaser from 'phaser';
import { PAPER } from '../art/palette';
import { screenScene, viewSize } from './hidpi';
import { inkText } from './ui';

/** Shows a word while the game's first scene bakes its drawings, then starts it. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    screenScene(this);
    this.cameras.main.setBackgroundColor(PAPER);
    const { width, height } = viewSize(this);
    inkText(this, width / 2, height / 2, 'charging the drill…', 32);
    // Let the label paint before the (synchronous) texture drawing.
    this.time.delayedCall(30, () => this.scene.start('Chart'));
  }
}
