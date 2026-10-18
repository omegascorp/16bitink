import Phaser from 'phaser';
import { PAPER } from '../art/palette';
import { getHost, getProfile, REG } from '../host';
import { installPaidPlanets } from '../level/planets';
import { firstScene } from '../level/route';
import { parsePlanets } from '../level/validate';
import { screenScene, viewSize } from './hidpi';
import { inkText } from './ui';

/** Fetches the full game's planets when the host says the player owns it. Never rejects: a failure is kept in REG.fullError. */
export async function loadPaidPlanets(scene: Phaser.Scene): Promise<void> {
  const host = getHost(scene);
  if (!host.unlocked) return;
  try {
    installPaidPlanets(parsePlanets(await host.loadContent()));
    scene.registry.set(REG.fullError, null);
  } catch (err) {
    console.error('[inkmine] failed to load the full game', err);
    scene.registry.set(REG.fullError, 'Could not load the full game. Check your connection and try again.');
  }
}

/** Shows a word while the game's first scene bakes its drawings, then starts it: the world, or the starship if the game was left aboard it. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    screenScene(this);
    this.cameras.main.setBackgroundColor(PAPER);
    const { width, height } = viewSize(this);
    const label = 'charging the drill…';
    inkText(this, width / 2, height / 2, label, 32);
    // On the site, its loading screen covers the game until ready(); in the dev harness the label shows.
    const loading = getHost(this).loading;
    loading?.progress(0, label);
    // Let the label paint before the (synchronous) texture drawing. An owner's game fetches the full game's planets first.
    const start = (): void => {
      const [key, data] = firstScene(getProfile(this));
      // Lift the loading screen once the first real screen has been drawn, not on this word.
      this.scene.get(key).events.once(Phaser.Scenes.Events.CREATE, () => this.game.events.once(Phaser.Core.Events.POST_RENDER, () => loading?.ready()));
      this.scene.start(key, data);
    };
    // The narrator runs over every scene from now on (NarratorScene).
    this.scene.launch('Narrator');
    void loadPaidPlanets(this).then(() => this.time.delayedCall(30, start));
  }
}
