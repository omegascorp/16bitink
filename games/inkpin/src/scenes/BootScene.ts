import Phaser from 'phaser';
import { getHost, setFullError } from '../host';
import { installPaidChapters, LEVELS } from '../level';
import { parseChapters } from '../level/validate';

/** The message an owner sees when the full game could not be fetched. */
export const FULL_GAME_ERROR = 'Could not load the full game. Check your connection and try again.';

/**
 * Fetches the full game's chapters when the host says the player owns it.
 * Never rejects: a failure is kept for the map (getFullError) and the player
 * keeps Chapter 1. The payload is untrusted, so it is checked first.
 */
export async function loadPaidChapters(): Promise<void> {
  const host = getHost();
  if (!host?.unlocked) return;
  try {
    installPaidChapters(parseChapters(await host.loadContent()));
    setFullError(null);
  } catch (err) {
    console.error('[inkpin] failed to load the full game', err);
    setFullError(FULL_GAME_ERROR);
  }
}

/**
 * Runs before the map or a level: gets the paid chapters (unless the dev page
 * passed them), then hands over and lifts the site's loading screen once the
 * first real screen is drawn.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    void this.boot();
  }

  private async boot(): Promise<void> {
    const host = getHost();
    const dev = this.registry.get('paidInstalled') === true;
    if (!dev && host?.unlocked) {
      host.loading?.progress(0.5, 'fetching the full game…');
      await loadPaidChapters();
    }
    // The levels are known now: a dev ?level= can be held to what is installed.
    const start = this.registry.get('startLevel') as number | undefined;
    if (start !== undefined) this.registry.set('startLevel', Math.min(start, LEVELS.length - 1));
    if (host?.loading) this.game.events.once(Phaser.Core.Events.POST_RENDER, () => host.loading?.ready());
    this.scene.start('menu');
  }
}
