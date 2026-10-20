import Phaser from 'phaser';
import { MARBLE_RES } from '../art/marbleArt';
import { BLUE, BLUE_HEX, INK_HEX, PAPER_HEX } from '../art/palette';
import { TEX } from '../art/textures';
import { getFullError, getHost, getSound } from '../host';
import { CHAPTER_NAMES, FREE_CHAPTERS, levelOrder, loadedChapters, PLANNED_CHAPTERS } from '../level/levels';
import { COLOURS } from '../logic/colours';
import { chapterTally, isUnlocked, loadProgress, type Progress } from '../logic/save';
import { screenScene, viewSize } from './hidpi';
import { drawBlots, inkButton, inkText } from './ui';
import { loadPaidChapters } from './BootScene';

const SOFT_INK = '#4a463e';
const PENCIL = '#9a9488';
/** A level's marble on the map, layout px across. */
const NODE = 58;
const PER_ROW = 5;

/**
 * The level map: one page per chapter, its levels as big marbles along a
 * pencilled path, each with its blots. Arrows turn the page; the full
 * game's chapters show as locked pages until bought (or written).
 */
export class MenuScene extends Phaser.Scene {
  private page = 0;

  constructor() {
    super('Menu');
  }

  init(data: { page?: number }): void {
    const progress = loadProgress(getHost(this).storage);
    this.page = data.page ?? currentChapter(progress);
  }

  create(): void {
    screenScene(this, true);
    const { width, height } = viewSize(this);
    const host = getHost(this);
    const progress = loadProgress(host.storage);
    inkText(this, width / 2, 44, 'InkGecko', 56);
    const chapters = loadedChapters();
    const page = Math.min(this.page, PLANNED_CHAPTERS - 1);
    const name = CHAPTER_NAMES[page] ?? `Chapter ${page + 1}`;
    inkText(this, width / 2, 100, `Chapter ${page + 1} · ${name}`, 30, SOFT_INK);
    const levels = chapters[page];
    if (levels) this.drawLevels(levels.map((l) => ({ id: l.id, name: l.name })), progress, width, height);
    else this.drawLocked(page, width, height);
    this.pageArrows(page, width, height);
    inkButton(this, 70, height - 40, 'Exit', () => host.onExit(), { width: 110, height: 44, size: 24 });
    const sound = inkButton(this, width - 50, height - 40, getSound(this)?.muted ? '♪̸' : '♪', () => {
      const s = getSound(this);
      if (!s) return;
      s.setMuted(!s.muted);
      (sound.list[1] as Phaser.GameObjects.Text).setText(s.muted ? '♪̸' : '♪');
    }, { width: 50, height: 44, size: 24 });
    // Laid out for this screen: a resize (a phone turning) lays it out again.
    const relayout = (): void => {
      this.scene.restart({ page: this.page });
    };
    this.scale.once('resize', relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', relayout));
  }

  private drawLevels(levels: readonly { id: string; name: string }[], progress: Progress, width: number, height: number): void {
    const host = getHost(this);
    const order = levelOrder();
    const rows = Math.ceil(levels.length / PER_ROW);
    const gapX = Math.min(170, (width - 120) / PER_ROW);
    const top = 190;
    const gapY = Math.min(170, (height - top - 120) / Math.max(1, rows));
    const pos = levels.map((_, i) => {
      const row = Math.floor(i / PER_ROW);
      const col = row % 2 === 0 ? i % PER_ROW : PER_ROW - 1 - (i % PER_ROW);
      return { x: width / 2 + (col - (PER_ROW - 1) / 2) * gapX, y: top + row * gapY + (col % 2) * 14 };
    });
    // The pencilled path from marble to marble.
    const path = this.add.graphics().lineStyle(2, INK_HEX, 0.35);
    pos.forEach((p, i) => {
      const q = pos[i + 1];
      if (q) path.lineBetween(p.x, p.y, q.x, q.y);
    });
    const firstOpen = levels.findIndex((l) => !progress.levels[l.id]);
    levels.forEach((l, i) => {
      const p = pos[i]!;
      const rec = progress.levels[l.id];
      const open = host.allLevelsOpen === true || isUnlocked(progress, order, l.id);
      const colour = COLOURS[i % COLOURS.length]!;
      const disc = this.add.image(p.x, p.y, TEX.marble(colour, 0)).setScale(NODE / 40 / MARBLE_RES);
      if (!open) disc.setTint(0xb8b2a6).setAlpha(0.55);
      inkText(this, p.x, p.y, String(order.indexOf(l.id) + 1), 30, open ? BLUE : PENCIL).setStroke('#fffaf0', 5);
      inkText(this, p.x, p.y + NODE / 2 + 16, l.name, 19, open ? SOFT_INK : PENCIL);
      if (rec) drawBlots(this.add.graphics(), p.x, p.y + NODE / 2 + 40, rec.blots, 6);
      if (!open) return;
      disc.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        getSound(this)?.play('click');
        this.scene.start('Game', { levelId: l.id });
      });
      if (i === firstOpen) this.tweens.add({ targets: disc, scale: disc.scale * 1.12, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });
    const tally = chapterTally(progress, levels.map((l) => l.id));
    inkText(this, width / 2, height - 96, `${tally.blots} / ${tally.maxBlots} blots`, 22, SOFT_INK);
  }

  /** A chapter this player can't play yet: the full game's offer, a retry, or "on the way". */
  private drawLocked(page: number, width: number, height: number): void {
    const host = getHost(this);
    const y = height / 2;
    const g = this.add.graphics();
    g.fillStyle(PAPER_HEX, 0.9).fillRect(width / 2 - 260, y - 90, 520, 180);
    g.lineStyle(1.5, BLUE_HEX, 0.6).strokeRect(width / 2 - 260, y - 90, 520, 180);
    const error = getFullError(this);
    if (host.unlocked && error) {
      inkText(this, width / 2, y - 40, error, 20, SOFT_INK);
      inkButton(this, width / 2, y + 30, 'Try again', () => void loadPaidChapters(this).then(() => this.scene.restart({ page })), { width: 200 });
    } else if (page >= FREE_CHAPTERS && !host.unlocked && host.price) {
      inkText(this, width / 2, y - 40, `Chapters 2–${PLANNED_CHAPTERS} are the full game`, 26, SOFT_INK);
      inkButton(this, width / 2, y + 30, `Unlock · ${host.price}`, () => host.onBuy(), { width: 220 });
    } else {
      inkText(this, width / 2, y - 20, 'Still being drawn: on the way soon!', 28, SOFT_INK);
      inkText(this, width / 2, y + 26, 'New chapters arrive as free updates.', 20, PENCIL);
    }
  }

  private pageArrows(page: number, width: number, height: number): void {
    const y = height / 2 + 20;
    if (page > 0) inkButton(this, 40, y, '‹', () => this.scene.restart({ page: page - 1 }), { width: 50, height: 70, size: 44, color: BLUE });
    if (page < PLANNED_CHAPTERS - 1) inkButton(this, width - 40, y, '›', () => this.scene.restart({ page: page + 1 }), { width: 50, height: 70, size: 44, color: BLUE });
    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => page > 0 && this.scene.restart({ page: page - 1 }));
    kb?.on('keydown-RIGHT', () => page < PLANNED_CHAPTERS - 1 && this.scene.restart({ page: page + 1 }));
  }
}

/** The chapter with the player's next unfinished level (the last loaded one if all are done). */
function currentChapter(progress: Progress): number {
  const chapters = loadedChapters();
  const i = chapters.findIndex((c) => c.some((l) => !progress.levels[l.id]));
  return i < 0 ? chapters.length - 1 : i;
}
