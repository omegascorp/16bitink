import { runInSlices, type LoadingReporter } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { PAPER } from '../art/palette';
import { textureJobs } from '../art/textures';
import { getHost, REG } from '../host';
import { installPaidChapters } from '../level/levels';
import { parseChapters } from '../level/validate';
import { pullFromAccount } from '../logic/accountSave';
import { firstScreen, loadProgress } from '../logic/save';
import { screenScene, viewSize } from './hidpi';
import { inkText } from './ui';
import { uiTextureJobs } from './uiPaint';

/** Shares of the site's loading bar: drawing the art, then fetching the full game's chapters, then the first screen. */
const DRAWN_AT = 0.9;
const FETCHED_AT = 0.96;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    screenScene(this);
    this.cameras.main.setBackgroundColor(PAPER);
    const { width, height } = viewSize(this);
    const label = 'waking the snakes…';
    // Shown in the dev harness; on the site its loading screen covers the game until ready().
    inkText(this, width / 2, height / 2, label, 32);
    const loading = getHost(this).loading;
    loading?.progress(0, label);
    void this.boot(label).catch((err: unknown) => {
      console.error('[inksnake] boot failed', err);
      loading?.failed?.(err instanceof Error ? err.message : String(err));
      this.children.removeAll(true);
      inkText(this, width / 2, height / 2, 'Your browser could not draw the game. Try another browser.', 26);
      // Lift the loading screen onto the drawn message, not a blank frame.
      this.game.events.once(Phaser.Core.Events.POST_RENDER, () => loading?.ready());
    });
  }

  private async boot(label: string): Promise<void> {
    const loading = getHost(this).loading;
    // Drawn a slice at a time, so the loading bar moves and the page never freezes.
    await runInSlices([...textureJobs(this), ...uiTextureJobs(this)], { onProgress: (f) => loading?.progress(f * DRAWN_AT, label) });
    this.registry.set(REG.fullError, null);
    if (getHost(this).unlocked) loading?.progress(DRAWN_AT, 'fetching the full game…');
    await Promise.all([loadPaidChapters(this), pullFromAccount(getHost(this))]);
    // Read after the account's progress is pulled in, so a player new to this device but not to the game gets the map.
    const first = firstScreen(loadProgress(getHost(this).storage));
    loading?.progress(FETCHED_AT, first.scene === 'Game' ? 'warming up in the sun…' : 'unfolding the map…');
    if (loading) readyOnFirstFrame(this, first.scene, loading);
    if (first.scene === 'Game') this.scene.start('Game', first.data);
    else this.scene.start('Menu');
  }
}

/** Calls `loading.ready()` once scene `key` has been created and drawn, so the loading screen lifts onto a finished picture. */
function readyOnFirstFrame(scene: Phaser.Scene, key: string, loading: LoadingReporter): void {
  scene.scene.get(key).events.once(Phaser.Scenes.Events.CREATE, () => {
    scene.game.events.once(Phaser.Core.Events.POST_RENDER, () => loading.ready());
  });
}

/** Fetches the full game's chapters when the host says the player owns it. Never rejects: a failure is kept in REG.fullError. */
export async function loadPaidChapters(scene: Phaser.Scene): Promise<void> {
  const host = getHost(scene);
  if (!host.unlocked) return;
  try {
    installPaidChapters(parseChapters(await host.loadContent()));
    scene.registry.set(REG.fullError, null);
  } catch (err) {
    console.error('[inksnake] failed to load the full game', err);
    scene.registry.set(REG.fullError, 'Could not load the full game. Check your connection and try again.');
  }
}
