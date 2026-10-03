import Phaser from 'phaser';
import { fishKey } from '../art/textures';
import type { PlayerFishId } from '../levels/types';
import { getHost } from '../host';
import type { LevelDescription } from '../levels/twists';
import { itemKey } from './game/items';
import { DASH_ZONE } from './game/player';
import { HUD_EVENT, type GameScene, type HudSnapshot } from './GameScene';
import { BLUE_INK, inkButton, inkText, INK_HEX, RED_INK, uiScale, wobblyRect } from './ui';

/** Score and warnings on dark water. */
const PALE_BLUE = '#a9c4ff';
const PALE_RED = '#ff9a8a';
/** Bar outlines and fills on dark water. */
const PALE_INK_HEX = 0xece4d2;
const PALE_ACCENT = { track: 0x0b1530, trackAlpha: 0.6, growth: 0x6f9bff, growthAlpha: 0.75, frenzy: 0xff7a6a } as const;
const INK_ACCENT = { track: 0xfffaf0, trackAlpha: 0.9, growth: 0x3466c2, growthAlpha: 0.55, frenzy: 0xa3342b } as const;

interface HudData {
  readonly levelName: string;
  readonly player: PlayerFishId;
  readonly touch: boolean;
  /** Dark water (lights-out levels, the deep zones): HUD text turns pale to read against it. */
  readonly dark?: boolean;
  /** What's special about this level, shown on a card before play starts. */
  readonly intro?: LevelDescription;
}

/** How long the intro card stays up, plus a little per extra rule. */
const INTRO_MS = 2600;
const INTRO_NOTE_MS = 900;

const BAR_W = 260;
const BAR_H = 18;
/** Screen width from which the combo multiplier fits beside its meter without reaching the score. */
const WIDE_HUD = 900;

export class HudScene extends Phaser.Scene {
  private bars!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private frenzyText!: Phaser.GameObjects.Text;
  private urgentColor = RED_INK;
  private lineColor = INK_HEX;
  private accent: { readonly track: number; readonly trackAlpha: number; readonly growth: number; readonly growthAlpha: number; readonly frenzy: number } = INK_ACCENT;
  private objectiveText!: Phaser.GameObjects.Text;
  private intro: Phaser.GameObjects.Container | null = null;
  private textColor = '#1b1a1f';
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private dashBtn: Phaser.GameObjects.Container | null = null;
  private pauseLayer: Phaser.GameObjects.Container | null = null;
  private last: HudSnapshot | null = null;
  private player: PlayerFishId = 'inkling';

  constructor() {
    super('Hud');
  }

  create(data: HudData): void {
    const game = this.scene.get('Game') as GameScene;
    this.lifeIcons = [];
    this.player = data.player;
    this.cornerButtons = [];
    this.pauseLayer = null;
    this.last = null;
    this.textColor = data.dark ? '#ece4d2' : '#1b1a1f';
    this.add.text(20, 14, data.levelName, { fontFamily: '"Caveat", cursive', fontSize: '24px', color: this.textColor });
    this.bars = this.add.graphics();
    this.scoreText = inkText(this, 0, 30, '0', 40, data.dark ? PALE_BLUE : BLUE_INK);
    this.objectiveText = this.add.text(20, 94, '', { fontFamily: '"Caveat", cursive', fontSize: '26px', color: this.textColor });
    this.urgentColor = data.dark ? PALE_RED : RED_INK;
    this.lineColor = data.dark ? PALE_INK_HEX : INK_HEX;
    this.accent = data.dark ? PALE_ACCENT : INK_ACCENT;
    // The combo multiplier sits at the end of its meter, so the meter explains itself.
    this.frenzyText = this.add.text(0, 0, '', { fontFamily: '"Caveat", cursive', fontSize: '26px', color: this.urgentColor }).setOrigin(0, 0.5);

    const fsAvailable = this.scale.fullscreen.available;
    this.addCornerButton(0, '❚❚', () => this.togglePause());
    if (fsAvailable) this.addCornerButton(1, '⤢', () => this.toggleFullscreen());
    this.dashBtn = data.touch ? this.makeDashButton(game) : null;

    game.events.on(HUD_EVENT, this.onSnapshot, this);
    // Pause keys live here: the Game scene's keyboard stops while it is paused.
    this.input.keyboard?.on('keydown-ESC', this.togglePause, this);
    this.input.keyboard?.on('keydown-P', this.togglePause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      game.events.off(HUD_EVENT, this.onSnapshot, this);
    });
    // Auto-pause when the tab is hidden so nobody gets eaten while away.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pauseIfRunning, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.HIDDEN, this.pauseIfRunning, this));
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.layout, this));
    this.layout();
    this.intro = null;
    if (data.intro) this.showIntro(data.levelName, data.intro);
  }

  /**
   * The level's twist on a paper card. The game waits underneath until the
   * card times out or the player taps or presses a key.
   */
  private showIntro(name: string, d: LevelDescription): void {
    this.scene.pause('Game');
    const lines = [inkText(this, 0, -86, d.tag, 28, RED_INK), inkText(this, 0, -40, name, 58, BLUE_INK), inkText(this, 0, 18, d.goal, 28)];
    d.notes.forEach((n, i) => lines.push(inkText(this, 0, 56 + i * 30, n, 23, '#5b5446')));
    const textBottom = (d.notes.length ? 56 + (d.notes.length - 1) * 30 : 18) + 36;
    const shelf = this.itemShelf(d.items, textBottom + 26);
    const w = Math.max(460, ...lines.map((t) => t.width + 60));
    // Fit the paper to the content: from above the tag to below the item shelf.
    const top = -126;
    const bottom = textBottom + (d.items.length ? 140 : 0);
    const h = bottom - top;
    const g = this.add.graphics();
    g.fillStyle(0xfffaf0, 0.96).fillRect(-w / 2, top, w, h);
    wobblyRect(g, -w / 2, top, w, h, 31);
    const card = this.add.container(this.scale.width / 2, this.scale.height / 2 - (h - 260) / 2, [g, ...lines, ...shelf]);
    card.setScale(Math.min(1, (this.scale.width - 32) / w, uiScale(this, 640, 480))).setAlpha(0);
    this.intro = card;
    this.tweens.add({ targets: card, alpha: 1, duration: 220 });
    const timer = this.time.delayedCall(INTRO_MS + d.notes.length * INTRO_NOTE_MS, () => this.dismissIntro());
    const skip = (): void => {
      timer.remove();
      this.input.off('pointerdown', skip);
      this.input.keyboard?.off('keydown', skip);
      this.dismissIntro();
    };
    this.input.once('pointerdown', skip);
    this.input.keyboard?.once('keydown', skip);
  }

  /**
   * "What might sink through": each item's drawing with its name, helpful ones
   * in blue, litter in red with a warning, so players learn them by sight.
   */
  private itemShelf(items: LevelDescription['items'], y: number): Phaser.GameObjects.GameObject[] {
    if (items.length === 0) return [];
    const gap = 150;
    const objects: Phaser.GameObjects.GameObject[] = [inkText(this, 0, y, 'Sinking through:', 22, '#5b5446')];
    items.forEach((it, i) => {
      const x = (i - (items.length - 1) / 2) * gap;
      objects.push(this.add.image(x, y + 46, itemKey(it.id, 0)).setScale(0.36));
      objects.push(inkText(this, x, y + 86, it.good ? it.name : `${it.name} (avoid)`, 19, it.good ? BLUE_INK : RED_INK));
    });
    return objects;
  }

  private dismissIntro(): void {
    const card = this.intro;
    if (!card) return;
    this.intro = null;
    this.tweens.add({ targets: card, alpha: 0, y: card.y - 30, duration: 260, onComplete: () => card.destroy() });
    this.scene.get('Game').input.keyboard?.resetKeys();
    if (!this.pauseLayer) this.scene.resume('Game');
  }

  private cornerButtons: Phaser.GameObjects.Container[] = [];

  private addCornerButton(slot: number, label: string, onClick: () => void): void {
    const btn = inkButton(this, 0, 0, label, onClick, { width: 52, height: 48, size: 28, seed: slot + 5 });
    btn.setData('slot', slot);
    this.cornerButtons = [...this.cornerButtons.filter((b) => b.active), btn];
  }

  private makeDashButton(game: GameScene): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0xfffaf0, 0.8).fillCircle(0, 0, 52);
    g.lineStyle(2.4, INK_HEX, 1).strokeCircle(0, 0, 52);
    const t = inkText(this, 0, 0, 'dash', 30);
    const c = this.add.container(0, 0, [g, t]).setSize(110, 110).setInteractive();
    c.on('pointerdown', () => game.dash());
    return c;
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.scoreText.setPosition(width / 2, 34);
    // Wide screens: the multiplier at the end of its meter. Narrow ones: under the objective, clear of the score.
    if (width >= WIDE_HUD) this.frenzyText.setPosition(20 + BAR_W + 12, 84).setOrigin(0, 0.5);
    else this.frenzyText.setPosition(20, 124).setOrigin(0, 0);
    this.cornerButtons.forEach((b) => b.setPosition(width - 40 - (b.getData('slot') as number) * 62, 36));
    this.dashBtn?.setPosition(width - DASH_ZONE / 2, height - DASH_ZONE / 2);
    this.pauseLayer?.setPosition(width / 2, height / 2);
    if (this.last) this.draw(this.last);
  }

  private onSnapshot(s: HudSnapshot): void {
    this.last = s;
    this.draw(s);
  }

  private draw(s: HudSnapshot): void {
    const g = this.bars.clear();
    const x = 20;
    const y = 50;
    g.fillStyle(this.accent.track, this.accent.trackAlpha).fillRect(x, y, BAR_W, BAR_H);
    g.fillStyle(this.accent.growth, this.accent.growthAlpha).fillRect(x, y, BAR_W * s.progress, BAR_H);
    for (const m of s.tierMarks) g.lineStyle(2, this.lineColor, 0.8).lineBetween(x + BAR_W * m, y - 4, x + BAR_W * m, y + BAR_H + 4);
    wobblyRect(g, x, y, BAR_W, BAR_H, 3, 2.2, this.lineColor);
    // Combo meter: a thinner red bar under the growth bar, filling as you eat in quick
    // succession; only shown while a combo is running.
    if (s.frenzyMeter > 0) {
      g.fillStyle(this.accent.frenzy, 0.6).fillRect(x, y + 30, BAR_W * s.frenzyMeter, 8);
      wobblyRect(g, x, y + 30, BAR_W, 8, 9, 1.4, this.lineColor);
    }
    this.objectiveText.setText(s.objective).setColor(s.urgent ? this.urgentColor : this.textColor);
    this.frenzyText.setText(s.multiplier > 1 ? `×${s.multiplier} ${s.frenzyLabel}` : '');
    this.scoreText.setText(String(s.score));
    this.syncLives(s.lives);
    this.dashBtn?.setAlpha(s.dashReady ? 1 : 0.4);
  }

  private syncLives(lives: number): void {
    const { width } = this.scale;
    const offset = this.cornerButtons.length * 62 + 50;
    while (this.lifeIcons.length > Math.max(0, lives)) this.lifeIcons.pop()?.destroy();
    while (this.lifeIcons.length < lives) {
      this.lifeIcons.push(this.add.image(0, 36, fishKey(this.player, 'light', 0)).setScale(0.16));
    }
    this.lifeIcons.forEach((icon, i) => icon.setPosition(width - offset - i * 44, 36));
  }

  private pauseIfRunning(): void {
    if (!this.pauseLayer && this.scene.isActive('Game')) this.togglePause();
  }

  private togglePause(): void {
    if (this.scene.isActive('Result')) return;
    if (this.intro) {
      this.dismissIntro();
      return;
    }
    if (this.pauseLayer) {
      this.pauseLayer.destroy();
      this.pauseLayer = null;
      // Keys released while paused would otherwise stay "down".
      this.scene.get('Game').input.keyboard?.resetKeys();
      this.scene.resume('Game');
      return;
    }
    this.scene.pause('Game');
    const host = getHost(this);
    const bg = this.add.graphics();
    bg.fillStyle(0xf4eddc, 0.88).fillRect(-2000, -2000, 4000, 4000);
    this.pauseLayer = this.add.container(this.scale.width / 2, this.scale.height / 2, [
      bg,
      inkText(this, 0, -120, 'Paused', 64, BLUE_INK),
      inkButton(this, 0, -30, 'Keep swimming', () => this.togglePause(), { width: 260 }),
      inkButton(this, 0, 40, 'Level select', () => this.toMenu(), { width: 260 }),
      inkButton(this, 0, 110, 'Exit to 16bit.ink', () => host.onExit(), { width: 260, size: 26 }),
    ]);
  }

  private toMenu(): void {
    this.scene.stop('Game');
    this.scene.start('Menu');
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
  }
}
