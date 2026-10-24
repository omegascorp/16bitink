import { runInSlices, type LoadingReporter } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { PAPER } from '../art/palette';
import { textureJobs } from '../art/textures';
import { getHost } from '../host';
import { pullFromAccount } from '../logic/accountSave';
import { screenScene, viewSize } from './hidpi';
import { inkText } from './ui';
import { uiTextureJobs } from './uiPaint';

/** Share of the site's loading bar spent drawing the art. */
const DRAWN_AT = 0.92;

/** Draws every sprite (a slice at a time), pulls account progress, then opens the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    screenScene(this);
    this.cameras.main.setBackgroundColor(PAPER);
    const { width, height } = viewSize(this);
    const label = 'sharpening quills…';
    inkText(this, width / 2, height / 2, label, 32);
    const loading = getHost(this).loading;
    loading?.progress(0, label);
    void this.boot(label).catch((err: unknown) => {
      console.error('[inkheroes] boot failed', err);
      loading?.failed?.(err instanceof Error ? err.message : String(err));
      this.children.removeAll(true);
      inkText(this, width / 2, height / 2, 'Your browser could not draw the game. Try another browser.', 26);
      this.game.events.once(Phaser.Core.Events.POST_RENDER, () => loading?.ready());
    });
  }

  private async boot(label: string): Promise<void> {
    const loading = getHost(this).loading;
    await runInSlices([...textureJobs(this), ...uiTextureJobs(this)], { onProgress: (f) => loading?.progress(f * DRAWN_AT, label) });
    await pullFromAccount(getHost(this));
    loading?.progress(DRAWN_AT, 'unrolling the map…');
    if (loading) readyOnFirstFrame(this, 'Menu', loading);
    this.scene.start('Menu');
  }
}

function readyOnFirstFrame(scene: Phaser.Scene, key: string, loading: LoadingReporter): void {
  scene.scene.get(key).events.once(Phaser.Scenes.Events.CREATE, () => {
    scene.game.events.once(Phaser.Core.Events.POST_RENDER, () => loading.ready());
  });
}
