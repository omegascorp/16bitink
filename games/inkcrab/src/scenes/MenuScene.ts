import Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX } from '../art/palette';
import { TEX } from '../art/textures';
import { getHost } from '../host';
import { BEACH_1_NAME } from '../level/beach1';
import { levelGoal } from '../level/build';
import { LEVEL_ORDER, LEVELS } from '../level/levels';
import type { LevelDef } from '../level/types';
import { isUnlocked, loadProgress, type Progress } from '../logic/save';
import { screenScene, toView, viewSize } from './hidpi';
import { drawBlots, inkButton, inkText, wobblyRect } from './ui';

const CARD = { w: 168, h: 112, gap: 18 } as const;

/** The beach's level list: name, goal and blots per level; locked ones are faded. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    screenScene(this);
    const { width, height } = viewSize(this);
    const host = getHost(this);
    const progress = loadProgress(host.storage);
    this.add.tileSprite(0, 0, width, height, TEX.paper).setOrigin(0).setScrollFactor(0);
    inkText(this, width / 2, 46, 'InkCrab', 52);
    inkText(this, width / 2, 92, `Beach 1 · ${BEACH_1_NAME}`, 26);
    inkButton(this, 70, 40, '← back', () => host.onExit(), { width: 110, height: 44, size: 24 });

    const cols = Math.max(1, Math.min(5, Math.floor((width - 32) / (CARD.w + CARD.gap))));
    const rows = Math.ceil(LEVELS.length / cols);
    const gridW = cols * CARD.w + (cols - 1) * CARD.gap;
    const top = 130;
    LEVELS.forEach((def, i) => {
      const x = (width - gridW) / 2 + (i % cols) * (CARD.w + CARD.gap) + CARD.w / 2;
      const y = top + Math.floor(i / cols) * (CARD.h + CARD.gap) + CARD.h / 2;
      this.card(def, i, x, y, progress);
    });
    // Tall lists scroll with a drag.
    const contentH = top + rows * (CARD.h + CARD.gap) + 20;
    if (contentH > height) this.enableScroll(contentH - height);
  }

  private card(def: LevelDef, i: number, x: number, y: number, progress: Progress): void {
    const open = isUnlocked(progress, LEVEL_ORDER, def.id);
    const record = progress.levels[def.id];
    const g = this.add.graphics();
    g.fillStyle(PAPER_HEX, 0.95).fillRect(-CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h);
    wobblyRect(g, -CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, 40 + i, 1.6, BLUE_HEX);
    drawBlots(g, 0, CARD.h / 2 - 20, record?.blots ?? 0, 7);
    const num = inkText(this, 0, -CARD.h / 2 + 22, `${i + 1}`, 30);
    const name = inkText(this, 0, -6, def.name, 22);
    const goal = inkText(this, 0, 18, open ? `grow to size ${levelGoal(def)}` : 'locked', 17).setAlpha(0.75);
    const c = this.add.container(x, y, [g, num, name, goal]).setSize(CARD.w, CARD.h).setAlpha(open ? 1 : 0.4);
    if (!open) return;
    c.setInteractive({ useHandCursor: true });
    let down: { x: number; y: number } | null = null;
    c.on('pointerover', () => c.setScale(1.04));
    c.on('pointerout', () => {
      c.setScale(1);
      down = null;
    });
    c.on('pointerdown', (p: Phaser.Input.Pointer) => {
      down = toView(p.x, p.y);
    });
    c.on('pointerup', (p: Phaser.Input.Pointer) => {
      const end = toView(p.x, p.y);
      if (down && Math.hypot(down.x - end.x, down.y - end.y) < 12) this.scene.start('Game', { levelId: def.id });
      down = null;
    });
  }

  private enableScroll(max: number): void {
    const cam = this.cameras.main;
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const dy = (p.y - p.prevPosition.y) / cam.zoom;
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY - dy, 0, max);
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy * 0.5, 0, max);
    });
  }
}
