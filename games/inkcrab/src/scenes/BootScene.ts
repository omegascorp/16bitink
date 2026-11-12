import { runInSlices, type LoadingReporter } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { PAPER } from '../art/palette';
import { coreKeys } from '../art/texturePlan';
import { bakeJobs, installTextureGuard } from '../art/textures';
import { getHost, REG } from '../host';
import { installPaidBeaches, levelById, loadedLevels } from '../level/levels';
import { parseBeaches } from '../level/validate';
import { pullFromAccount } from '../logic/accountSave';
import { firstScreen, loadProgress } from '../logic/save';
import { levelArtJobs } from './game/levelArt';
import { screenScene, viewSize } from './hidpi';
import { inkText } from './ui';

/**
 * Shares of the site's loading bar: drawing the art every screen uses, then
 * fetching the full game's beaches, then drawing the first screen's own art
 * (a new player's first level; the map draws its own). The rest of the
 * game's art is drawn as each level starts (see GameScene).
 */
const CORE_AT = 0.3;
const FETCHED_AT = 0.4;
const DRAWN_AT = 0.96;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    screenScene(this);
    this.cameras.main.setBackgroundColor(PAPER);
    const { width, height } = viewSize(this);
    const label = 'clicking the ballpoint…';
    // Shown in the dev harness; on the site its loading screen covers the game until ready().
    inkText(this, width / 2, height / 2, label, 32);
    const loading = getHost(this).loading;
    loading?.progress(0, label);
    void this.boot(label).catch((err: unknown) => {
      console.error('[inkcrab] boot failed', err);
      loading?.failed?.(err instanceof Error ? err.message : String(err));
      this.children.removeAll(true);
      inkText(this, width / 2, height / 2, 'Your browser could not draw the game. Try another browser.', 26);
      // Lift the loading screen onto the drawn message, not a blank frame.
      this.game.events.once(Phaser.Core.Events.POST_RENDER, () => loading?.ready());
    });
  }

  private async boot(label: string): Promise<void> {
    const loading = getHost(this).loading;
    installTextureGuard(this.textures);
    // Drawn a slice at a time, so the loading bar moves and the page never freezes.
    await runInSlices(bakeJobs(this.textures, coreKeys()), { onProgress: (f) => loading?.progress(f * CORE_AT, label) });
    this.registry.set(REG.fullError, null);
    if (getHost(this).unlocked) loading?.progress(CORE_AT, 'fetching the full game…');
    await Promise.all([loadPaidBeaches(this), pullFromAccount(getHost(this))]);
    // Read after the account's progress is pulled in, so a player new to this device but not to the game gets the map.
    const first = firstScreen(loadProgress(getHost(this).storage));
    if (first.scene === 'Game') {
      const def = levelById(first.data.levelId ?? '') ?? loadedLevels()[0];
      const raking = 'raking the beach…';
      loading?.progress(FETCHED_AT, raking);
      // The level is drawn before it starts, so the loading screen lifts onto it finished.
      if (def) await runInSlices(levelArtJobs(this.textures, def), { onProgress: (f) => loading?.progress(FETCHED_AT + f * (DRAWN_AT - FETCHED_AT), raking) });
    }
    loading?.progress(DRAWN_AT, first.scene === 'Game' ? 'raking the beach…' : 'unfolding the map…');
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
