import type { GameHandle, GameHost, GameModule } from '@16bitink/game-sdk';
import type { LevelDef } from './logic/level';
import Phaser from 'phaser';
import { PAPER } from './art/palette';
import { SoundBoard } from './audio/sfx';
import { useHost, useStorage } from './host';
import { installPaidChapters } from './level';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { DPR } from './scenes/hidpi';
import { HudScene } from './scenes/HudScene';
import { MenuScene } from './scenes/MenuScene';
import { GAME_VERSION } from './version';

export interface MountOptions {
  /** Opens straight into this level (0-based) instead of the map. */
  readonly level?: number;
  /** The dev page's sampler: opens straight into this level, which isn't in any chapter (Chapter 3's engine parts). */
  readonly sample?: LevelDef;
  /** Opens every level, for testing. */
  readonly unlockAll?: boolean;
  /** The dev page's way in: the paid chapters, installed as they are instead of being fetched. Never set by the site. */
  readonly paid?: readonly (readonly LevelDef[])[];
}

/** Mounts InkPin into `parent`, filling it and following its size. */
export function mount(parent: HTMLElement, host: GameHost, options: MountOptions = {}): GameHandle & { readonly phaser: Phaser.Game } {
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
    scale: { mode: Phaser.Scale.NONE, width: Math.round(width * DPR), height: Math.round(height * DPR), zoom: 1 / DPR, fullscreenTarget: parent },
    render: { antialias: true, antialiasGL: false, roundPixels: false, powerPreference: 'high-performance', maxTextures: 8 },
    // A thumb on the stick, and two more fingers to jump, tap a pin or pinch.
    input: { activePointers: 3 },
    audio: { noAudio: true },
    scene: [BootScene, MenuScene, GameScene, HudScene],
  });
  const sfx = new SoundBoard();
  game.registry.set('sfx', sfx);
  game.registry.set('unlockAll', options.unlockAll ?? host.allLevelsOpen === true);
  useStorage(host.storage);
  useHost(host);
  // Whatever an earlier mount installed goes: this player's chapters are fetched (or passed in) afresh.
  installPaidChapters(options.paid ?? []);
  if (options.paid) {
    game.registry.set('paidInstalled', true);
  }
  // The site's splash stays up until the boot step has fetched the full game and the first screen is drawn.
  // Straight into a level (the dev page's ?level=), else the Atlas map first.
  if (options.sample) game.registry.set('sampleLevel', options.sample);
  if (options.level !== undefined || options.sample) game.registry.set('startLevel', options.level ?? 0);
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

const inkpin: GameModule = { mount, version: GAME_VERSION };
export default inkpin;
