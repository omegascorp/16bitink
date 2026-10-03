import Phaser from 'phaser';
import { getChapters, getHost } from '../host';
import { DEMO_CHAPTER } from '../levels/demo';
import { blotsFor } from '../logic/growth';
import { loadSave, persistSave, recordResult } from '../logic/save';
import { allLevels } from './MenuScene';
import { BLUE_INK, drawBlot, inkButton, inkText, RED_INK, uiScale } from './ui';

export interface ResultData {
  readonly kind: 'win' | 'lose';
  readonly levelIndex: number;
  readonly score: number;
  readonly seconds: number;
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
      root.add([
        inkText(this, 0, -130, 'Eaten!', 80, RED_INK),
        inkText(this, 0, -60, `Score ${data.score}`, 34),
        inkButton(this, 0, 20, 'Try again', retry),
        inkButton(this, 0, 90, 'Level select', menu),
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
        inkText(this, 0, 64, 'Three more chapters, new fish and new hazards in the full game.', 22, '#5b5446'),
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
