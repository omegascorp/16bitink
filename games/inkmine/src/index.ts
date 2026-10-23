import type { GameHandle, GameHost, GameModule } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { PAPER } from './art/palette';
import { SoundBoard } from './audio/sound';
import { REG, tickPlay } from './host';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { NarratorScene } from './scenes/NarratorScene';
import { ShipScene } from './scenes/ShipScene';
import { SystemScene } from './scenes/SystemScene';
import { DPR } from './scenes/hidpi';
import { GAME_VERSION } from './version';

/** Mounts InkMine into `parent`, filling it completely and tracking its size. */
export function mount(parent: HTMLElement, host: GameHost): GameHandle & { readonly phaser: Phaser.Game } {
  const cssSize = (): { width: number; height: number } => ({
    width: parent.clientWidth || window.innerWidth,
    height: parent.clientHeight || window.innerHeight,
  });
  const { width, height } = cssSize();
  // Same setup as InkFish and InkCrab: a device-pixel canvas shown at 1/DPR zoom for sharp lines on phones.
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
    // The narrator last, so its strip draws over every other scene.
    scene: [BootScene, GameScene, ShipScene, SystemScene, HudScene, NarratorScene],
  });
  game.registry.set(REG.host, host);
  // Sound is synthesized by our own SoundBoard (audio/), as in InkCrab; Phaser's audio stays off.
  const sound = new SoundBoard(host.storage);
  game.registry.set(REG.sound, sound);
  game.events.on(Phaser.Core.Events.STEP, (_time: number, delta: number) => tickPlay(game, delta));
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

const inkmine: GameModule = { mount, version: GAME_VERSION };
export default inkmine;
