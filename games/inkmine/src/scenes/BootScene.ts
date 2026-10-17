import Phaser from 'phaser';
import { PAPER } from '../art/palette';
import { getHost, getProfile } from '../host';
import { hasBeat } from '../logic/story';
import { screenScene, viewSize } from './hidpi';
import { inkText } from './ui';

/** Shows a word while the game's first scene bakes its drawings, then starts it: the world, or the starship if the game was left aboard her. */
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
    // Let the label paint before the (synchronous) texture drawing. A game left aboard the starship opens there.
    this.time.delayedCall(30, () => {
      const p = getProfile(this);
      // The demo over, it opens on the star map, where it ended.
      const [key, data] = p.docked && hasBeat(p, 'course') ? ['System', {}] : p.docked ? ['Ship', { remote: false, tab: 'starship' }] : ['Game', undefined];
      // Lift the loading screen once the first real screen has been drawn, not on this word.
      this.scene.get(key).events.once(Phaser.Scenes.Events.CREATE, () => this.game.events.once(Phaser.Core.Events.POST_RENDER, () => loading?.ready()));
      this.scene.start(key, data);
    });
  }
}
