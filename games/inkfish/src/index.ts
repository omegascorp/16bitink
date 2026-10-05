import type { GameHandle, GameHost, GameModule } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { SoundBoard } from './audio/sound';
import { REG } from './host';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { GuideScene } from './scenes/GuideScene';
import { HudScene } from './scenes/HudScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultScene } from './scenes/ResultScene';
import { DPR } from './scenes/hidpi';

export { DEMO_CHAPTER } from './levels/demo';
export type { Chapter, LevelDef } from './levels/types';

/** Mounts InkFish into `parent`, filling it completely and tracking its size. */
export function mount(parent: HTMLElement, host: GameHost): GameHandle & { readonly phaser: Phaser.Game } {
  const cssSize = (): { width: number; height: number } => ({
    width: parent.clientWidth || window.innerWidth,
    height: parent.clientHeight || window.innerHeight,
  });
  const { width, height } = cssSize();
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    backgroundColor: '#f4eddc',
    // The canvas holds DPR device pixels per CSS pixel and is shown at 1/DPR zoom,
    // so phones get a sharp picture. Phaser's RESIZE mode would size it in CSS pixels.
    scale: {
      mode: Phaser.Scale.NONE,
      width: Math.round(width * DPR),
      height: Math.round(height * DPR),
      zoom: 1 / DPR,
      fullscreenTarget: parent,
    },
    // Mipmaps keep hairline pen detail clean when sprites are drawn small.
    // `antialias` is texture smoothing and stays on; `antialiasGL` is MSAA on the
    // canvas, which only edges raw geometry (the art is all pre-drawn textures) and
    // costs old mobile GPUs a lot of fill-rate.
    render: {
      antialias: true, antialiasGL: false, roundPixels: false, mipmapFilter: 'LINEAR_MIPMAP_LINEAR', powerPreference: 'high-performance',
    },
    input: { activePointers: 3 },
    // Sound effects are synthesized by our own SoundBoard (audio/sound.ts); Phaser's audio stays off.
    audio: { noAudio: true },
    scene: [BootScene, MenuScene, GameScene, HudScene, ResultScene, GuideScene],
  });
  game.registry.set(REG.host, host);
  const sound = new SoundBoard(host.storage);
  game.registry.set(REG.sound, sound);
  // Track the parent ourselves (window resize, rotation, fullscreen), as RESIZE mode would.
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

const inkfish: GameModule = { mount };
export default inkfish;
