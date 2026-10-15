import { runInSlices, type LoadingReporter } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { ensureFishTextures, inkTextureJobs } from '../art/textures';
import { trackArt, warmArt } from '../art/artCache';
import { getHost, REG } from '../host';
import { DEMO_CHAPTER } from '../levels/demo';
import { firstScreen, loadSave } from '../logic/save';
import { LEVEL_BUILT } from './GameScene';
import { pullFromAccount } from '../logic/accountSave';
import { parseChapters } from '../levels/validate';
import { screenScene, viewSize } from './hidpi';
import { mapFauna } from './map/fauna';
import { inkText } from './ui';

/** Shares of the site's loading bar: unpacking saved drawings, drawing the rest, then fetching the full game and saves. */
const WARMED_AT = 0.1;
const DRAWN_AT = 0.9;
const FETCHED_AT = 0.96;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    screenScene(this);
    this.cameras.main.setBackgroundColor('#f4eddc');
    const label = 'sharpening pens…';
    // Shown in the dev harness; on the site its loading screen covers the game until ready().
    inkText(this, viewSize(this).width / 2, viewSize(this).height / 2, label, 32);
    const loading = getHost(this).loading;
    loading?.progress(0, label);
    this.boot(label).catch((err: unknown) => {
      console.error('[inkfish] boot failed', err);
      loading?.failed?.(err instanceof Error ? err.message : String(err));
      this.children.removeAll(true);
      inkText(this, viewSize(this).width / 2, viewSize(this).height / 2, 'Your browser could not draw the game. Try another browser.', 26);
      // Lift the loading screen onto the drawn message, not a blank frame.
      this.game.events.once(Phaser.Core.Events.POST_RENDER, () => loading?.ready());
    });
  }

  private async boot(label: string): Promise<void> {
    const host = getHost(this);
    const loading = host.loading;
    // Drawings saved on an earlier visit are decoded instead of redrawn (see art/artCache.ts).
    const exists = (key: string): boolean => this.textures.exists(key);
    await Promise.all([warmArt('boot', exists), warmArt('menu', exists)]);
    loading?.progress(WARMED_AT, label);
    const stop = trackArt('boot');
    // The map's fish too, which the menu would otherwise draw in one long freeze. A slice at a time, so the loading bar moves.
    const fauna = mapFauna().map((shape) => () => ensureFishTextures(this, [shape], ['light']));
    await runInSlices([...inkTextureJobs(this), ...fauna], {
      onProgress: (f) => loading?.progress(WARMED_AT + f * (DRAWN_AT - WARMED_AT), label),
    });
    stop();
    this.registry.set(REG.chapters, [DEMO_CHAPTER]);
    this.registry.set(REG.fullError, null);
    loading?.progress(DRAWN_AT, host.unlocked ? 'fetching the full game…' : 'finding your saves…');
    await Promise.all([loadPaidChapters(this), pullFromAccount(host)]);
    // Read after the account's saves are pulled in, so a player new to this device but not to the game gets the map.
    const first = firstScreen(loadSave(host.storage));
    loading?.progress(FETCHED_AT, first.scene === 'Game' ? 'filling the tide pool…' : 'unfolding the map…');
    if (loading) readyOnFirstFrame(this, first.scene, loading);
    if (first.scene === 'Game') this.scene.start('Game', first.data);
    else this.scene.start('Menu');
  }
}

/**
 * Calls `loading.ready()` once scene `key` is drawn, so the loading screen
 * lifts onto a finished picture: the map once created, a level once built.
 */
function readyOnFirstFrame(scene: Phaser.Scene, key: 'Menu' | 'Game', loading: LoadingReporter): void {
  const shown = key === 'Game' ? LEVEL_BUILT : Phaser.Scenes.Events.CREATE;
  scene.scene.get(key).events.once(shown, () => {
    scene.game.events.once(Phaser.Core.Events.POST_RENDER, () => loading.ready());
  });
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
