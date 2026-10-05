import Phaser from 'phaser';
import { screenScene, toView, viewSize } from './hidpi';
import { fishKey } from '../art/textures';
import type { PlayerFishId } from '../levels/types';
import { getHost } from '../host';
import type { LevelDescription } from '../levels/twists';
import { itemKey } from './game/items';
import { DASH_ZONE, stickPointer } from './game/player';
import { knobOffset, STICK, stickCentre } from '../logic/joystick';
import { HUD_EVENT, type GameScene, type HudSnapshot } from './GameScene';
import { getSound } from '../host';
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
/** Below this width (portrait phones) the HUD stacks: bar and score drop under the corner buttons. */
const NARROW_HUD = 640;
/** Bar top on wide screens, and on narrow ones where it sits under the corner buttons. */
const BAR_Y = 50;
const NARROW_BAR_Y = 76;
const CORNER_SLOT = 62;
const LIFE_GAP = 44;
const NARROW_LIFE_GAP = 34;

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
  private stick: { readonly base: Phaser.GameObjects.Graphics; readonly knob: Phaser.GameObjects.Graphics } | null = null;
  private pauseLayer: Phaser.GameObjects.Container | null = null;
  private last: HudSnapshot | null = null;
  /** What the bars were last drawn for; see drawBars. */
  private barsSig = '';
  private player: PlayerFishId = 'inkling';
  private levelText!: Phaser.GameObjects.Text;
  private narrow = false;
  private barY = BAR_Y;
  private barW = BAR_W;

  constructor() {
    super('Hud');
  }

  create(data: HudData): void {
    screenScene(this);
    const game = this.scene.get('Game') as GameScene;
    this.lifeIcons = [];
    this.player = data.player;
    this.cornerButtons = [];
    this.pauseLayer = null;
    this.last = null;
    this.barsSig = '';
    this.textColor = data.dark ? '#ece4d2' : '#1b1a1f';
    this.levelText = this.add.text(20, 14, data.levelName, { fontFamily: '"Caveat", cursive', fontSize: '24px', color: this.textColor });
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
    this.addMuteButton(fsAvailable ? 2 : 1);
    this.dashBtn = data.touch ? this.makeDashButton(game) : null;
    this.stick = data.touch ? this.makeStick() : null;

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
    const card = this.add.container(viewSize(this).width / 2, viewSize(this).height / 2 - (h - 260) / 2, [g, ...lines, ...shelf]);
    card.setScale(Math.min(1, (viewSize(this).width - 32) / w, uiScale(this, 640, 480))).setAlpha(0);
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

  private addCornerButton(slot: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const btn = inkButton(this, 0, 0, label, onClick, { width: 52, height: 48, size: 28, seed: slot + 5 });
    btn.setData('slot', slot);
    this.cornerButtons = [...this.cornerButtons.filter((b) => b.active), btn];
    return btn;
  }

  /** Sound on/off: a note, struck through in red while muted. M toggles it too. */
  private addMuteButton(slot: number): void {
    const sound = getSound(this);
    if (!sound) return;
    const strike = this.add.graphics();
    strike.lineStyle(3, 0xa3342b, 0.9).lineBetween(-15, 13, 15, -13);
    const sync = (): void => {
      strike.setVisible(sound.muted);
    };
    const toggle = (): void => {
      sound.setMuted(!sound.muted);
      sync();
    };
    this.addCornerButton(slot, '♪', toggle).add(strike);
    this.input.keyboard?.on('keydown-M', toggle);
    sync();
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

  /** Bottom-left thumbstick: a faint ring, and a knob that follows the thumb to its rim. */
  private makeStick(): { base: Phaser.GameObjects.Graphics; knob: Phaser.GameObjects.Graphics } {
    const base = this.add.graphics();
    base.fillStyle(0xfffaf0, 0.35).fillCircle(0, 0, STICK.radius + 10);
    base.lineStyle(2.4, INK_HEX, 0.6).strokeCircle(0, 0, STICK.radius + 10);
    const knob = this.add.graphics();
    knob.fillStyle(0xfffaf0, 0.85).fillCircle(0, 0, 28);
    knob.lineStyle(2.4, INK_HEX, 1).strokeCircle(0, 0, 28);
    return { base, knob };
  }

  update(): void {
    if (!this.stick) return;
    const o = stickCentre(viewSize(this).height);
    const ptr = stickPointer(this);
    const at = ptr ? toView(ptr.x, ptr.y) : null;
    const k = at ? knobOffset(at.x - o.x, at.y - o.y) : { x: 0, y: 0 };
    this.stick.knob.setPosition(o.x + k.x, o.y + k.y);
    this.stick.base.setAlpha(ptr ? 1 : 0.6);
  }

  private layout(): void {
    const { width, height } = viewSize(this);
    const buttonsLeft = width - 66 - (this.cornerButtons.length - 1) * CORNER_SLOT;
    this.narrow = width < NARROW_HUD;
    // A long level name shrinks rather than running under the corner buttons.
    this.levelText.setScale(1).setScale(Math.min(1, (buttonsLeft - 32) / this.levelText.width));
    if (this.narrow) {
      // Portrait phones: the top row holds only the name and buttons; bar and lives
      // go on the row below, with the objective and score under them.
      this.barY = NARROW_BAR_Y;
      this.barW = Math.min(BAR_W, width - 40 - this.livesWidth());
      // Rows under the bar leave room for the combo meter drawn 30px below it.
      this.objectiveText.setPosition(20, NARROW_BAR_Y + 44);
      this.scoreText.setPosition(width - 20, NARROW_BAR_Y + 58).setOrigin(1, 0.5);
      this.frenzyText.setPosition(20, NARROW_BAR_Y + 76).setOrigin(0, 0);
    } else {
      this.barY = BAR_Y;
      this.barW = BAR_W;
      this.scoreText.setPosition(width / 2, 34).setOrigin(0.5);
      this.objectiveText.setPosition(20, 94);
      // Wide screens: the multiplier at the end of its meter. Narrower ones: under the objective, clear of the score.
      if (width >= WIDE_HUD) this.frenzyText.setPosition(20 + BAR_W + 12, 84).setOrigin(0, 0.5);
      else this.frenzyText.setPosition(20, 124).setOrigin(0, 0);
    }
    this.cornerButtons.forEach((b) => b.setPosition(width - 40 - (b.getData('slot') as number) * CORNER_SLOT, 36));
    this.dashBtn?.setPosition(width - DASH_ZONE / 2, height - DASH_ZONE / 2);
    if (this.stick) {
      const o = stickCentre(height);
      this.stick.base.setPosition(o.x, o.y);
      this.stick.knob.setPosition(o.x, o.y);
    }
    this.pauseLayer?.setPosition(width / 2, height / 2);
    if (this.last) this.draw(this.last);
  }

  private onSnapshot(s: HudSnapshot): void {
    this.last = s;
    this.draw(s);
  }

  private draw(s: HudSnapshot): void {
    this.drawBars(s);
    // Text re-rasterizes and re-uploads on any style change, so only touch what changed.
    const color = s.urgent ? this.urgentColor : this.textColor;
    if (this.objectiveText.style.color !== color) this.objectiveText.setColor(color);
    this.objectiveText.setText(s.objective);
    this.frenzyText.setText(s.multiplier > 1 ? `×${s.multiplier} ${s.frenzyLabel}` : '');
    this.scoreText.setText(String(s.score));
    this.syncLives(s.lives);
    this.dashBtn?.setAlpha(s.dashReady ? 1 : 0.4);
  }

  /** The growth and combo bars, redrawn only when their fill changes. */
  private drawBars(s: HudSnapshot): void {
    const sig = `${s.progress}|${s.frenzyMeter}|${s.tierMarks.join(',')}|${this.barY}|${this.barW}`;
    if (sig === this.barsSig) return;
    this.barsSig = sig;
    const g = this.bars.clear();
    const x = 20;
    const y = this.barY;
    const w = this.barW;
    g.fillStyle(this.accent.track, this.accent.trackAlpha).fillRect(x, y, w, BAR_H);
    g.fillStyle(this.accent.growth, this.accent.growthAlpha).fillRect(x, y, w * s.progress, BAR_H);
    for (const m of s.tierMarks) g.lineStyle(2, this.lineColor, 0.8).lineBetween(x + w * m, y - 4, x + w * m, y + BAR_H + 4);
    wobblyRect(g, x, y, w, BAR_H, 3, 2.2, this.lineColor);
    // Combo meter: a thinner red bar under the growth bar, filling as you eat in quick
    // succession; only shown while a combo is running.
    if (s.frenzyMeter > 0) {
      g.fillStyle(this.accent.frenzy, 0.6).fillRect(x, y + 30, w * s.frenzyMeter, 8);
      wobblyRect(g, x, y + 30, w, 8, 9, 1.4, this.lineColor);
    }
  }

  private syncLives(lives: number): void {
    const { width } = viewSize(this);
    while (this.lifeIcons.length > Math.max(0, lives)) this.lifeIcons.pop()?.destroy();
    while (this.lifeIcons.length < lives) {
      this.lifeIcons.push(this.add.image(0, 36, fishKey(this.player, 'light', 0)));
    }
    if (this.narrow) {
      // Right-aligned on the bar's row, under the corner buttons.
      const y = NARROW_BAR_Y + BAR_H / 2;
      this.lifeIcons.forEach((icon, i) => icon.setScale(0.13).setPosition(width - 36 - i * NARROW_LIFE_GAP, y));
      return;
    }
    const offset = this.cornerButtons.length * CORNER_SLOT + 50;
    this.lifeIcons.forEach((icon, i) => icon.setScale(0.16).setPosition(width - offset - i * LIFE_GAP, 36));
  }

  /** Room the life icons need on a narrow screen's bar row. */
  private livesWidth(): number {
    return Math.max(this.lifeIcons.length, this.last?.lives ?? 3) * NARROW_LIFE_GAP + 24;
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
    this.pauseLayer = this.add.container(viewSize(this).width / 2, viewSize(this).height / 2, [
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
