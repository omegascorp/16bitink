import Phaser from 'phaser';
import { generateInkTextures } from '../art/textures';
import { getHost, REG } from '../host';
import { DEMO_CHAPTER } from '../levels/demo';
import { pullFromAccount } from '../logic/accountSave';
import { parseChapters } from '../levels/validate';
import { screenScene, viewSize } from './hidpi';
import { inkText } from './ui';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    screenScene(this);
    this.cameras.main.setBackgroundColor('#f4eddc');
    inkText(this, viewSize(this).width / 2, viewSize(this).height / 2, 'sharpening pens…', 32);
    // Let the label paint before the (synchronous) texture generation.
    this.time.delayedCall(30, () => {
      this.boot().catch((err: unknown) => {
        console.error('[inkfish] boot failed', err);
        this.children.removeAll(true);
        inkText(this, viewSize(this).width / 2, viewSize(this).height / 2, 'Your browser could not draw the game. Try another browser.', 26);
      });
    });
  }

  private async boot(): Promise<void> {
    generateInkTextures(this);
    this.registry.set(REG.chapters, [DEMO_CHAPTER]);
    this.registry.set(REG.fullError, null);
    await Promise.all([loadPaidChapters(this), pullFromAccount(getHost(this))]);
    this.scene.start('Menu');
  }
}

/** Fetches paid chapters when the host says the player owns the game. */
export async function loadPaidChapters(scene: Phaser.Scene): Promise<void> {
  const host = getHost(scene);
  if (!host.unlocked) return;
  try {
    const chapters = parseChapters(await host.loadContent());
    scene.registry.set(REG.chapters, [DEMO_CHAPTER, ...chapters]);
    scene.registry.set(REG.fullError, null);
  } catch (err) {
    console.error('[inkfish] failed to load full chapters', err);
    scene.registry.set(REG.fullError, 'Could not load the full game. Check your connection and try again.');
  }
}
