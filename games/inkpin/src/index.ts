import Phaser from 'phaser';
import { PAPER } from './art/palette';
import { SoundBoard } from './audio/sfx';
import { GameScene } from './scenes/GameScene';
import { DPR } from './scenes/hidpi';
import { HudScene } from './scenes/HudScene';

export interface MountOptions {
  /** The level to open at (0-based), if it's open. */
  readonly level?: number;
  /** Opens every level, for testing. */
  readonly unlockAll?: boolean;
}

/** Mounts InkPin into `parent`, filling it and following its size. */
export function mount(parent: HTMLElement, options: MountOptions = {}): { readonly phaser: Phaser.Game; destroy(): void } {
  const cssSize = (): { width: number; height: number } => ({
    width: parent.clientWidth || window.innerWidth,
    height: parent.clientHeight || window.innerHeight,
  });
  const { width, height } = cssSize();
  // As in the other games: a device-pixel canvas shown at 1/DPR zoom, for sharp lines on phones.
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    backgroundColor: PAPER,
    scale: { mode: Phaser.Scale.NONE, width: Math.round(width * DPR), height: Math.round(height * DPR), zoom: 1 / DPR },
    render: { antialias: true, antialiasGL: false, roundPixels: false, powerPreference: 'high-performance', maxTextures: 8 },
    input: { activePointers: 2 },
    audio: { noAudio: true },
    scene: [GameScene, HudScene],
  });
  const sfx = new SoundBoard();
  game.registry.set('sfx', sfx);
  game.registry.set('unlockAll', options.unlockAll ?? false);
  if (options.level !== undefined) game.registry.set('level', options.level);
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
      sfx.destroy();
      game.destroy(true);
    },
  };
}
