import Phaser from 'phaser';
import { fishKey } from '../art/textures';
import { getChapters, getFullError, getHost } from '../host';
import { LOCKED_CHAPTER_TEASERS } from '../levels/demo';
import type { Chapter, LevelDef } from '../levels/types';
import { isLevelOpen, loadSave } from '../logic/save';
import { loadPaidChapters } from './BootScene';
import { BLUE_INK, drawBlot, inkButton, inkText, paperBackdrop, uiScale } from './ui';

export function allLevels(chapters: readonly Chapter[]): LevelDef[] {
  return chapters.flatMap((c) => c.levels);
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    paperBackdrop(this);
    const { width, height } = this.scale;
    const s = uiScale(this);
    const root = this.add.container(width / 2, 0).setScale(s);
    const host = getHost(this);
    const chapters = getChapters(this);
    const levels = allLevels(chapters);
    const save = loadSave(host.storage);
    const ids = levels.map((l) => l.id);

    const hero = this.add.image(-170, 70, fishKey('inkling', 'light', 0)).setScale(0.55);
    this.tweens.add({ targets: hero, y: 78, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    root.add([hero, inkText(this, 30, 62, 'InkFish', 84, BLUE_INK), inkText(this, 30, 118, 'eat · grow · don’t get eaten', 26)]);

    let y = 190;
    for (const chapter of chapters) {
      root.add(inkText(this, 0, y, `Chapter ${chapter.id} — ${chapter.name}`, 32));
      y += 50;
      const n = chapter.levels.length;
      chapter.levels.forEach((level, i) => {
        const x = (i - (n - 1) / 2) * 92;
        const open = isLevelOpen(save, ids, level.id);
        const btn = inkButton(this, x, y, String(levels.indexOf(level) + 1), () => {
          if (open) this.scene.start('Game', { levelIndex: levels.indexOf(level) });
        }, { width: 64, height: 56, size: 34, color: open ? '#1b1a1f' : '#b8ad98', seed: i + chapter.id * 10 });
        const blots = this.add.graphics();
        const rec = save.levels[level.id];
        for (let b = 0; b < 3; b++) drawBlot(blots, x - 18 + b * 18, y + 44, 6, (rec?.blots ?? 0) > b, b + i * 3);
        root.add([btn, blots]);
      });
      y += 100;
    }

    if (!host.unlocked) {
      for (const teaser of LOCKED_CHAPTER_TEASERS) {
        root.add(inkText(this, 0, y, `Chapter ${teaser.id} — ${teaser.name}  (pencil draft)`, 28, '#a69c8a'));
        y += 40;
      }
      y += 20;
      root.add(inkButton(this, 0, y, 'Unlock the full ocean', () => host.onBuy(), { width: 340, color: '#a3342b' }));
      y += 70;
    }

    const error = getFullError(this);
    if (error) {
      root.add(inkText(this, 0, y, error, 22, '#a3342b'));
      root.add(inkButton(this, 0, y + 50, 'Retry', () => void loadPaidChapters(this).then(() => this.scene.restart()), { width: 160 }));
      y += 110;
    }

    root.add(inkButton(this, 0, y + 10, '← Back to 16bit.ink', () => host.onExit(), { width: 280, size: 24, height: 46 }));
    // Centre vertically when it fits, otherwise allow drag/wheel scrolling.
    const contentH = (y + 60) * s;
    if (contentH < height) {
      root.y = (height - contentH) / 2;
    } else {
      this.enableScroll(root, contentH - height);
    }
    const relayout = (): void => {
      this.scene.restart();
    };
    this.scale.once('resize', relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', relayout));
  }

  private enableScroll(root: Phaser.GameObjects.Container, maxScroll: number): void {
    const clamp = (v: number): number => Phaser.Math.Clamp(v, -maxScroll, 0);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      root.y = clamp(root.y - dy);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) root.y = clamp(root.y + (p.y - p.prevPosition.y));
    });
  }
}
