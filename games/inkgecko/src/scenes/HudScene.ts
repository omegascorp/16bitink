import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER_HEX, RED, RED_HEX } from '../art/palette';
import { getSound } from '../host';
import { levelOrder } from '../level/levels';
import { LIVES } from '../logic/board';
import { CHARM_NAMES } from '../logic/charms';
import type { GameScene } from './GameScene';
import { screenScene, toView, viewSize } from './hidpi';
import { clock, HAND_FONT, inkButton, inkText, wobblyRect } from './ui';

const BAR = { w: 300, h: 18, top: 16 } as const;
const BUTTON = 46;
const MARGIN = 14;
const LEAF_HEX = 0x5f8f4e;
const SOFT_INK = '#4a463e';

/**
 * Over the board: the level's name, the bar that fills with points, the
 * score, lives, charms at work, the pause and sound buttons, first-time
 * hints, and the pause card.
 */
export class HudScene extends Phaser.Scene {
  private bar!: Phaser.GameObjects.Graphics;
  private score!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private hintBack!: Phaser.GameObjects.Graphics;
  private soundButton!: Phaser.GameObjects.Container;
  private buttons: Phaser.GameObjects.Container[] = [];
  private pauseCard: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Hud');
  }

  private game2(): GameScene {
    return this.scene.get('Game') as GameScene;
  }

  create(): void {
    screenScene(this, true);
    this.pauseCard = null;
    const game = this.game2();
    const n = levelOrder().indexOf(game.level.id) + 1;
    this.title = this.add.text(MARGIN, 10, `${n} · ${game.level.name}`, { fontFamily: HAND_FONT, fontSize: '24px', color: BLUE, stroke: '#fffaf0', strokeThickness: 4, padding: { x: 6, y: 4 } });
    this.bar = this.add.graphics();
    this.score = inkText(this, 0, 0, '', 20);
    this.status = this.add.text(MARGIN, 40, '', { fontFamily: HAND_FONT, fontSize: '19px', color: SOFT_INK, stroke: '#fffaf0', strokeThickness: 4 });
    this.hintBack = this.add.graphics();
    this.hint = inkText(this, 0, 0, '', 24);
    const pause = inkButton(this, 0, 0, '❚❚', () => this.togglePause(), { width: BUTTON, height: BUTTON, size: 22 });
    this.soundButton = inkButton(this, 0, 0, this.soundLabel(), () => this.toggleSound(), { width: BUTTON, height: BUTTON, size: 24 });
    this.buttons = [pause, this.soundButton];
    this.layout();
    // Here rather than in the game's input, so Esc can also unpause the paused game.
    const kb = this.input.keyboard;
    kb?.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause();
      else if (e.code === 'KeyM') this.toggleSound();
    });
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.layout, this));
  }

  /** True when a press at pointer `p` is on the HUD's buttons (or the pause card), not the board. */
  covers(p: Phaser.Input.Pointer): boolean {
    if (this.pauseCard) return true;
    const v = toView(p.x, p.y, this);
    return this.buttons.some((b) => Math.abs(v.x - b.x) < BUTTON / 2 + 6 && Math.abs(v.y - b.y) < BUTTON / 2 + 6);
  }

  private layout(): void {
    const { width } = viewSize(this);
    this.buttons.forEach((b, i) => b.setPosition(width - MARGIN - BUTTON / 2 - i * (BUTTON + 10), MARGIN + BUTTON / 2));
    this.score.setPosition(width / 2, BAR.top + BAR.h + 16);
  }

  private soundLabel(): string {
    return getSound(this)?.muted ? '♪̸' : '♪';
  }

  toggleSound(): void {
    const sound = getSound(this);
    if (!sound) return;
    sound.setMuted(!sound.muted);
    (this.soundButton.list[1] as Phaser.GameObjects.Text).setText(this.soundLabel());
  }

  togglePause(): void {
    if (this.pauseCard) this.resume();
    else this.pause();
  }

  private pause(): void {
    const game = this.game2();
    game.pausePlay();
    const { width, height } = viewSize(this);
    const g = this.add.graphics();
    g.fillStyle(PAPER_HEX, 0.88).fillRect(-width, -height, width * 3, height * 3);
    const cardW = 320;
    const cardH = 300;
    g.fillStyle(PAPER_HEX, 1).fillRect(width / 2 - cardW / 2, height / 2 - cardH / 2, cardW, cardH);
    wobblyRect(g, width / 2 - cardW / 2, height / 2 - cardH / 2, cardW, cardH, 77, 2, BLUE_HEX);
    const title = inkText(this, width / 2, height / 2 - 105, 'Paused', 44);
    const resume = inkButton(this, width / 2, height / 2 - 35, 'Resume', () => this.resume());
    const restart = inkButton(this, width / 2, height / 2 + 30, 'Start over', () => game.restart());
    const map = inkButton(this, width / 2, height / 2 + 95, 'Level map', () => game.quit());
    this.pauseCard = this.add.container(0, 0, [g, title, resume, restart, map]).setDepth(50);
  }

  private resume(): void {
    this.pauseCard?.destroy();
    this.pauseCard = null;
    this.game2().resumePlay();
  }

  update(): void {
    const game = this.game2();
    const b = game.board;
    if (!b) return;
    const { width, height } = viewSize(this);
    this.drawBar(width / 2 - BAR.w / 2, BAR.top, b.progress, b.filled);
    this.score.setText(b.filled ? `${b.score} · pop the rest!` : `${b.score}`);
    this.drawLives(b.lives);
    const charms = (Object.entries(b.timers) as [keyof typeof b.timers, number][]).filter(([, t]) => t > 0).map(([c, t]) => `${CHARM_NAMES[c]} ${Math.ceil(t)}s`);
    if (b.burstArmed) charms.push('Burst ready');
    // The clock against par, for the time blot, then any charms at work.
    this.status.setText([`${clock(b.elapsed)} / ${clock(game.level.par)}`, ...charms].join('   '));
    this.title.setColor(b.danger > 0.85 ? RED : BLUE);
    const hint = game.coach.current(game.input2.touch);
    // Under the bar on rail levels, where the gecko runs along the bottom; at the bottom otherwise.
    const hintY = b.rail ? BAR.top + BAR.h + 64 : height - 36;
    this.hint.setText(hint ?? '').setPosition(width / 2, hintY);
    this.hintBack.clear();
    if (hint) {
      const w = this.hint.width + 28;
      this.hintBack.fillStyle(PAPER_HEX, 0.9).fillRect(width / 2 - w / 2, hintY - 22, w, 44);
      wobblyRect(this.hintBack, width / 2 - w / 2, hintY - 22, w, 44, 5, 1.5, BLUE_HEX);
    }
  }

  /** The bar: a pen-drawn box filling with a leaf-green wash; it turns to a full green when the burrows close. */
  private drawBar(x: number, y: number, progress: number, filled: boolean): void {
    const g = this.bar.clear();
    g.fillStyle(PAPER_HEX, 0.85).fillRect(x - 4, y - 4, BAR.w + 8, BAR.h + 8);
    g.fillStyle(LEAF_HEX, filled ? 0.85 : 0.55).fillRect(x, y, BAR.w * progress, BAR.h);
    wobblyRect(g, x, y, BAR.w, BAR.h, 11, 1.8, BLUE_HEX);
  }

  /** Lives as three small ink circles, filled while left, crossed out red once lost. */
  private drawLives(lives: number): void {
    const g = this.bar;
    const { width } = viewSize(this);
    const x0 = width / 2 + BAR.w / 2 + 26;
    for (let i = 0; i < LIVES; i++) {
      const x = x0 + i * 22;
      const y = BAR.top + BAR.h / 2;
      if (i < lives) g.fillStyle(LEAF_HEX, 0.8).fillCircle(x, y, 7);
      g.lineStyle(1.6, i < lives ? BLUE_HEX : RED_HEX, 1).strokeCircle(x, y, 7);
      if (i >= lives) g.lineBetween(x - 6, y - 6, x + 6, y + 6);
    }
  }
}
