import type { LoadingReporter } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { BACKDROP } from '../art/palette';
import { getHost, REG } from '../host';
import { installPaidMaps } from '../level/maps';
import { parseMaps } from '../level/validate';
import { pullFromAccount } from '../logic/accountSave';
import { loadUiFont } from './battle/pixelFont';
import { loadMenuArt } from './map/pixelMapArt';
import { loadLoadingArt, PixelLoading } from './pixelLoading';
import { pixelUiCamera } from './pixelScreen';
import { loadingText } from './ui';

/** Share of the bar the art fills (the rest is the account's progress and opening the menu). */
const ART_SHARE = 0.9;

/**
 * Loads the pixel font and the loading screen's own art, shows the loading
 * screen (and hides the site's), then loads the campaign menu's art with
 * the bar, pulls account progress and opens the menu.
 */
export class BootScene extends Phaser.Scene {
  private screen: PixelLoading | null = null;

  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(BACKDROP);
    this.screen = null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.screen?.destroy();
      this.screen = null;
    });
    const loading = getHost(this).loading;
    loading?.progress(0, 'raising the banners…');
    void this.boot(loading).catch((err: unknown) => {
      console.error('[inkheroes] boot failed', err);
      loading?.failed?.(err instanceof Error ? err.message : String(err));
      this.screen?.destroy();
      this.screen = null;
      this.children.removeAll(true);
      this.cameras.main.setZoom(1).setScroll(0, 0);
      loadingText(this, this.scale.width / 2, this.scale.height / 2, 'Your browser could not draw the game. Try another browser.', 26);
      this.game.events.once(Phaser.Core.Events.POST_RENDER, () => loading?.ready());
    });
  }

  update(_t: number, delta: number): void {
    this.screen?.update(delta);
  }

  private async boot(loading: LoadingReporter | undefined): Promise<void> {
    await Promise.all([loadUiFont(), loadLoadingArt(this)]);
    loading?.progress(0.1, 'raising the banners…');
    const fit = pixelUiCamera(this);
    this.screen = new PixelLoading(this, fit(), 'raising the banners…');
    // Our own screen is up from the next frame: the site's can go.
    if (loading) this.game.events.once(Phaser.Core.Events.POST_RENDER, () => loading.ready());
    const onProgress = (f: number): void => this.screen?.setProgress(f * ART_SHARE);
    this.load.on(Phaser.Loader.Events.PROGRESS, onProgress);
    await loadMenuArt(this);
    this.load.off(Phaser.Loader.Events.PROGRESS, onProgress);
    this.screen.setProgress(ART_SHARE, getHost(this).unlocked ? 'fetching the full game…' : 'unrolling the map…');
    await Promise.all([loadPaidMaps(this), pullFromAccount(getHost(this))]);
    this.screen.setProgress(1);
    // The narrator runs over every screen from here on (it fetches nothing until a line is near).
    this.scene.launch('Narrator');
    this.scene.start('Menu');
  }
}

/**
 * Fetches the full game's maps (chapter 2 on) when the host says the player
 * owns it, as InkSnake does: they never ship in the free game. Never
 * rejects: a failure is kept in REG.fullError for the menu to offer a retry.
 */
export async function loadPaidMaps(scene: Phaser.Scene): Promise<void> {
  const host = getHost(scene);
  if (!host.unlocked) return;
  try {
    installPaidMaps(parseMaps(await host.loadContent()));
    scene.registry.set(REG.fullError, null);
  } catch (err) {
    console.error('[inkheroes] failed to load the full game', err);
    scene.registry.set(REG.fullError, 'Could not load the full game. Check your connection and try again.');
  }
}
