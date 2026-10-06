import Phaser from 'phaser';
import { PAPER } from '../art/palette';
import { generateTextures } from '../art/textures';
import { screenScene, viewSize } from './hidpi';
import { inkText } from './ui';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    screenScene(this);
    this.cameras.main.setBackgroundColor(PAPER);
    const { width, height } = viewSize(this);
    inkText(this, width / 2, height / 2, 'clicking the ballpoint…', 32);
    // Let the label paint before the (synchronous) texture drawing.
    this.time.delayedCall(30, () => {
      try {
        generateTextures(this);
        this.scene.start('Menu');
      } catch (err) {
        console.error('[inkcrab] boot failed', err);
        this.children.removeAll(true);
        inkText(this, width / 2, height / 2, 'Your browser could not draw the game. Try another browser.', 26);
      }
    });
  }
}
