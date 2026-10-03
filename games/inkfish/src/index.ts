import type { GameHandle, GameHost, GameModule } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { REG } from './host';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { GuideScene } from './scenes/GuideScene';
import { HudScene } from './scenes/HudScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultScene } from './scenes/ResultScene';

export { DEMO_CHAPTER } from './levels/demo';
export type { Chapter, LevelDef } from './levels/types';

/** Mounts InkFish into `parent`, filling it completely and tracking its size. */
export function mount(parent: HTMLElement, host: GameHost): GameHandle & { readonly phaser: Phaser.Game } {
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
    // Mipmaps keep hairline pen detail clean when sprites are drawn small.
    render: { antialias: true, roundPixels: false, mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
    input: { activePointers: 3 },
    scene: [BootScene, MenuScene, GameScene, HudScene, ResultScene, GuideScene],
  });
  game.registry.set(REG.host, host);
  return { phaser: game, destroy: () => game.destroy(true) };
}

const inkfish: GameModule = { mount };
export default inkfish;
