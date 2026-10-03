import Phaser from 'phaser';
import { REG, type InkfishHost } from './host';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultScene } from './scenes/ResultScene';

export type { InkfishHost } from './host';
export { DEMO_CHAPTER } from './levels/demo';
export type { Chapter, LevelDef } from './levels/types';

/** Mounts Inkfish into `parent`, filling it completely and tracking its size. */
export function bootInkfish(parent: HTMLElement, host: InkfishHost): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    backgroundColor: '#f4eddc',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
      fullscreenTarget: parent,
    },
    render: { antialias: true, roundPixels: false },
    input: { activePointers: 3 },
    scene: [BootScene, MenuScene, GameScene, HudScene, ResultScene],
  });
  game.registry.set(REG.host, host);
  return game;
}
