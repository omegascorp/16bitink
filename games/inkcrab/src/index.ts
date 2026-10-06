import type { GameHandle, GameHost, GameModule } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { PAPER } from './art/palette';
import { REG } from './host';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultScene } from './scenes/ResultScene';
import { DPR } from './scenes/hidpi';

/** Mounts InkCrab into `parent`, filling it completely and tracking its size. */
export function mount(parent: HTMLElement, host: GameHost): GameHandle & { readonly phaser: Phaser.Game } {
  const cssSize = (): { width: number; height: number } => ({
    width: parent.clientWidth || window.innerWidth,
    height: parent.clientHeight || window.innerHeight,
  });
  const { width, height } = cssSize();
  // Same setup as InkFish: a device-pixel canvas shown at 1/DPR zoom for sharp lines on phones.
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    backgroundColor: PAPER,
    scale: {
      mode: Phaser.Scale.NONE,
      width: Math.round(width * DPR),
      height: Math.round(height * DPR),
      zoom: 1 / DPR,
      fullscreenTarget: parent,
    },
    render: {
      antialias: true, antialiasGL: false, roundPixels: false, mipmapFilter: 'LINEAR_MIPMAP_LINEAR', powerPreference: 'high-performance',
    },
    input: { activePointers: 3 },
    audio: { noAudio: true },
    scene: [BootScene, MenuScene, GameScene, HudScene, ResultScene],
  });
  game.registry.set(REG.host, host);
  const resizer = new ResizeObserver(() => {
    const next = cssSize();
    const w = Math.round(next.width * DPR);
    const h = Math.round(next.height * DPR);
    if (w !== game.scale.width || h !== game.scale.height) game.scale.resize(w, h);
  });
  resizer.observe(parent);
  return {
    phaser: game,
    destroy: () => {
      resizer.disconnect();
      game.destroy(true);
    },
  };
}

const inkcrab: GameModule = { mount };
export default inkcrab;
