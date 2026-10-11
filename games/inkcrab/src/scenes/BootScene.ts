import Phaser from 'phaser';
import { PAPER } from '../art/palette';
import { generateTextures } from '../art/textures';
import { getHost, REG } from '../host';
import { installPaidBeaches } from '../level/levels';
import { parseBeaches } from '../level/validate';
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
      } catch (err) {
        console.error('[inkcrab] boot failed', err);
        this.children.removeAll(true);
        inkText(this, width / 2, height / 2, 'Your browser could not draw the game. Try another browser.', 26);
        return;
      }
      this.registry.set(REG.fullError, null);
      void loadPaidBeaches(this).then(() => this.scene.start('Menu'));
    });
  }
}

/** Fetches the full game's beaches when the host says the player owns it. Never rejects: a failure is kept in REG.fullError. */
export async function loadPaidBeaches(scene: Phaser.Scene): Promise<void> {
  const host = getHost(scene);
  if (!host.unlocked) return;
  try {
    installPaidBeaches(parseBeaches(await host.loadContent()));
    scene.registry.set(REG.fullError, null);
  } catch (err) {
    console.error('[inkcrab] failed to load the full game', err);
    scene.registry.set(REG.fullError, 'Could not load the full game. Check your connection and try again.');
  }
}
