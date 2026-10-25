import type { GameHandle, GameHost, GameModule } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { PAPER } from './art/palette';
import { SoundBoard } from './audio/sound';
import { REG } from './host';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultScene } from './scenes/ResultScene';
import { DPR } from './scenes/hidpi';
import { GAME_VERSION } from './version';

/** Mounts InkSnake into `parent`, filling it completely and tracking its size. */
export function mount(parent: HTMLElement, host: GameHost): GameHandle & { readonly phaser: Phaser.Game } {
  const cssSize = (): { width: number; height: number } => ({
    width: parent.clientWidth || window.innerWidth,
    height: parent.clientHeight || window.innerHeight,
  });
  const { width, height } = cssSize();
  // Same setup as InkFish, InkCrab and InkGecko: a device-pixel canvas shown at 1/DPR zoom for sharp lines on phones.
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
      // The texture units WebGL promises everywhere: some Android GPUs report more but can't link a shader using them all.
      maxTextures: 8,
    },
    input: { activePointers: 3 },
    audio: { noAudio: true },
    scene: [BootScene, MenuScene, GameScene, HudScene, ResultScene],
  });
  game.registry.set(REG.host, host);
  // Sound effects are synthesized by our own SoundBoard (audio/), as in InkGecko; Phaser's audio stays off.
  const sound = new SoundBoard(host.storage);
  game.registry.set(REG.sound, sound);
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
      sound.destroy();
      game.destroy(true);
    },
  };
}

const inksnake: GameModule = { mount, version: GAME_VERSION };
export default inksnake;
