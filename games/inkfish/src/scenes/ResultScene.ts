import Phaser from 'phaser';
import { getChapters, getHost } from '../host';
import { ART_RES, fishKey } from '../art/textures';
import { PAN_SIZE } from '../art/deathArt';
import { DEMO_CHAPTER, LOCKED_CHAPTER_TEASERS } from '../levels/demo';
import type { PlayerFishId } from '../levels/types';
import { deathText, type Death } from '../logic/deaths';
import { blotsFor } from '../logic/growth';
import { loadSave, persistSave, recordResult } from '../logic/save';
import { allLevels } from '../levels/chapters';
import { BLUE_INK, drawBlot, inkButton, inkText, RED_INK, uiScale } from './ui';

export interface ResultData {
  readonly kind: 'win' | 'lose';
  readonly levelIndex: number;
  readonly score: number;
  readonly seconds: number;
  /** How the player died, for a lost level. */
  readonly death?: Death;
  readonly player?: PlayerFishId;
}

const DEAD_TINT = 0xb3ab9c;
const COOKED_TINT = 0xd9975a;

/** A little pen vignette of how it ended, drawn above the title. */
function deathPicture(scene: Phaser.Scene, death: Death, player: PlayerFishId, y: number): Phaser.GameObjects.GameObject[] {
  const me = (frame: string): Phaser.GameObjects.Image => scene.add.image(0, 0, frame);
  if (death.cause === 'hooked') {
    // Lifted a little: the steam needs headroom and the pan must clear the title.
    const panScale = 220 / (PAN_SIZE.w * ART_RES);
    return [
      scene.add.image(0, y - 14, 'pan').setScale(panScale),
      me(fishKey(player, 'light', 0)).setPosition(-27, y - 3).setScale(0.34).setTint(COOKED_TINT).setFlipY(true).setRotation(0.08),
    ];
  }
  if (death.cause === 'timeout') {
    // The school swims off; the player trails behind, too late.
    return [
      ...[0, 1, 2].map((i) => scene.add.image(40 + i * 46, y - 18 + (i % 2) * 26, fishKey('minnow', 'light', 0)).setScale(0.26)),
      me(fishKey(player, 'light', 0)).setPosition(-90, y + 4).setScale(0.42),
    ];
  }
  const killer = scene.add.image(-85, y, fishKey(death.killer ?? 'pike', 'heavy', 0)).setScale(0.55);
  if (death.cause === 'spiked') {
    return [killer, me(fishKey(player, 'light', 0)).setPosition(80, y + 6).setScale(0.42).setTint(DEAD_TINT).setFlipY(true).setRotation(-0.12)];
  }
  return [killer, scene.add.image(85, y + 8, 'bones').setScale(0.5).setRotation(0.1)];
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    const host = getHost(this);
    const levels = allLevels(getChapters(this));
    const level = levels[data.levelIndex];
    if (!level) throw new Error(`Result for unknown level ${data.levelIndex}`);
    const { width, height } = this.scale;
    const root = this.add.container(width / 2, height / 2).setScale(uiScale(this, 700, 640));
    const bg = this.add.graphics();
    bg.fillStyle(0xf4eddc, 0.92).fillRect(-3000, -3000, 6000, 6000);
    root.add(bg);
    const relayout = (): void => {
      root.setPosition(this.scale.width / 2, this.scale.height / 2).setScale(uiScale(this, 700, 640));
    };
    this.scale.on('resize', relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', relayout));

    const goto = (sceneKey: string, payload?: object): void => {
      this.scene.stop('Game');
      this.scene.stop('Hud');
      this.scene.start(sceneKey, payload);
    };
    const retry = (): void => goto('Game', { levelIndex: data.levelIndex });
    const menu = (): void => goto('Menu');

    if (data.kind === 'lose') {
      const death = data.death ?? { cause: 'eaten' };
      const text = deathText(death);
      root.add([
        ...deathPicture(this, death, data.player ?? 'inkling', -230),
        inkText(this, 0, -130, text.title, 80, RED_INK),
        inkText(this, 0, -74, text.line, 26, '#5b5446'),
        inkText(this, 0, -32, `Score ${data.score}`, 30),
        inkButton(this, 0, 40, 'Try again', retry),
        inkButton(this, 0, 110, 'Level select', menu),
      ]);
      return;
    }

    const blots = blotsFor(level, data.seconds);
    persistSave(host.storage, recordResult(loadSave(host.storage), level.id, data.score, blots));
    const g = this.add.graphics();
    for (let i = 0; i < 3; i++) drawBlot(g, -60 + i * 60, -40, 22, i < blots, i * 7 + 1);
    root.add([inkText(this, 0, -200, 'Full belly!', 76, BLUE_INK), inkText(this, 0, -120, `Score ${data.score} · ${Math.round(data.seconds)}s`, 32), g]);

    const next = levels[data.levelIndex + 1];
    const isDemoEnd = !next && !host.unlocked && level.id === DEMO_CHAPTER.levels.at(-1)?.id;
    if (isDemoEnd) {
      root.add([
        inkText(this, 0, 30, 'The ocean keeps going… deeper, darker, and drawn by hand.', 26),
        inkText(this, 0, 64, `${LOCKED_CHAPTER_TEASERS.reduce((n, c) => n + c.levelCount, 0)} more levels in ${LOCKED_CHAPTER_TEASERS.length} deeper zones, with new fish to play.`, 22, '#5b5446'),
        inkButton(this, 0, 130, 'Unlock the full ocean', () => host.onBuy(), { width: 340, color: RED_INK }),
        inkButton(this, 0, 200, 'Level select', menu),
      ]);
      return;
    }
    root.add([
      next ? inkButton(this, 0, 50, 'Next level →', () => goto('Game', { levelIndex: data.levelIndex + 1 })) : inkText(this, 0, 50, 'You finished every level. Bravo!', 30),
      inkButton(this, 0, 120, 'Replay', retry),
      inkButton(this, 0, 190, 'Level select', menu),
    ]);
  }
}
