import Phaser from 'phaser';
import type { SoundBoard } from '../audio/sfx';
import { getHost, trackOffer } from '../host';
import { CHAPTER_NAMES } from '../level';
import type { GuardAnimal } from '../logic/level';
import { STICK } from '../logic/stick';
import { STICK_REST, type StickHold } from './boardInput';
import { chapterPlace } from './chapters';
import { isDesktop } from './controls';
import { HEARTS, type HudState, type LevelInfo, type Result } from './GameScene';
import { DPR, screenSize } from './hidpi';
import { resultCard, resultHeight } from './hud/resultCard';
import { HEART_SCALE, StatusTag } from './hud/statusTag';
import { ThumbStick } from './hud/thumbStick';
import { TipNote } from './hud/tipNote';
import { TitleCard } from './hud/titleCard';
import { HUD_TOP_KEY } from './levelCamera';
import { lossText } from './lossLines';
import { bakeUi, freePaper, paintedButton, roundButton, type PaintedButton } from './uiPaint';

/** How to play on a touch screen: shown on the first level, and on levels without a tip of their own. */
const TOUCH_TIP = 'Tap a pin to pull it. Walk Nib with the stick, jump with the button. Pinch to zoom.';
/** How to play with a keyboard and mouse. */
const DESKTOP_TIP = 'Click a pin to pull it. Walk Nib with ← →, Space to jump, ↑ ↓ to climb, + − to zoom.';
/** The volcano's first tip, for its levels that have none of their own: its gates and ledges are new. */
const VOLCANO_TIP = 'Striped gate pins go back in: tap one again to push it home. Ledges crumble once Nib steps off them.';
/** The touch controls' row: the stick's and the jump button's middles sit this far above the screen's bottom (CSS px). */
const CONTROLS_UP = 130;
const EDGE = 12;
const BUTTON = 46;
const ZOOM_D = 40;
const JUMP_D = 66;

/** The interface over the board: the level's page, the haul, buttons, the tip, and the result card. */
export class HudScene extends Phaser.Scene {
  private titleCard!: TitleCard;
  private status!: StatusTag;
  private tip!: TipNote;
  /** The level's own tip (or how to play) is up: it goes once the first pin is pulled. */
  private levelTip = false;
  private card: Phaser.GameObjects.Container | null = null;
  private lastCount = '';
  /** The last press was a finger (or this is a phone): the stick and the jump button show. */
  private touch = false;
  private stick!: ThumbStick;
  private jumpButton!: Phaser.GameObjects.Container;
  private zoomIn!: Phaser.GameObjects.Container;
  private zoomOut!: Phaser.GameObjects.Container;
  private mapButton!: Phaser.GameObjects.Container;
  private restartButton!: Phaser.GameObjects.Container;
  /** Shown once the goal is met: Nib may leave now or stay for the rest of the gold. */
  private leave!: PaintedButton;
  private goalShown = false;
  private info: LevelInfo | null = null;
  private shownHearts = HEARTS;

  constructor() {
    super('hud');
  }

  private get sfx(): SoundBoard {
    return this.registry.get('sfx') as SoundBoard;
  }

  create(): void {
    this.cameras.main.setOrigin(0).setZoom(DPR);
    bakeUi(this);
    this.touch = !isDesktop();
    // Whichever was pressed last, a finger or the mouse, decides whether the touch controls show.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.sfx.unlock();
      if (p.wasTouch === this.touch) return;
      this.touch = p.wasTouch;
      if (this.levelTip) this.tip.show(this.firstTip());
      this.layout();
    });
    this.stick = new ThumbStick(this);
    this.tip = new TipNote(this);
    this.titleCard = new TitleCard(this);
    this.status = new StatusTag(this);
    const emit = (event: string, arg?: unknown) => (): void => {
      this.game.events.emit(event, arg);
    };
    this.mapButton = roundButton(this, 0, 0, 'map', emit('cmd:map'), BUTTON);
    this.restartButton = roundButton(this, 0, 0, 'restart', emit('cmd:restart'), BUTTON);
    this.zoomIn = roundButton(this, 0, 0, 'zoomIn', emit('cmd:zoom', 1), ZOOM_D);
    this.zoomOut = roundButton(this, 0, 0, 'zoomOut', emit('cmd:zoom', -1), ZOOM_D);
    // A jump button for touch screens (keyboards have Space): it jumps as the finger lands.
    this.jumpButton = roundButton(this, 0, 0, 'jump', emit('cmd:jump'), JUMP_D, true);
    this.leave = paintedButton(this, 0, 0, 'Leave with 100 coins  ➜', emit('cmd:leave'), { kind: 'gold', width: 270, height: 50, size: 26 });
    this.leave.root.setVisible(false);
    this.scale.on('resize', this.layout, this);
    this.game.events.on('hud:state', this.onState, this);
    this.game.events.on('hud:result', this.showResult, this);
    this.game.events.on('hud:reset', this.onReset, this);
    this.game.events.on('hud:rewind', this.onRewind, this);
    this.game.events.on('hud:note', this.onNote, this);
    this.game.events.on('hud:zoom', this.onZoom, this);
    this.game.events.on('stick:hold', this.onStick, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
      this.game.events.off('hud:state', this.onState, this);
      this.game.events.off('hud:result', this.showResult, this);
      this.game.events.off('hud:reset', this.onReset, this);
      this.game.events.off('hud:rewind', this.onRewind, this);
      this.game.events.off('hud:note', this.onNote, this);
      this.game.events.off('hud:zoom', this.onZoom, this);
      this.game.events.off('stick:hold', this.onStick, this);
      this.registry.set(STICK_REST, null);
      this.registry.set(HUD_TOP_KEY, undefined);
    });
    const info = this.registry.get('levelInfo') as LevelInfo | undefined;
    if (info) this.onReset(info);
    else this.layout();
  }

  private layout(): void {
    const { width, height } = screenSize(this.scale);
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    const narrow = width < 560;
    // A phone on its side: the small type, as upright, to leave the board its height.
    const compact = narrow || height < 500;
    const half = BUTTON / 2;
    // The way back to the map top-left, restart top-right, and the level's page between them.
    this.mapButton.setPosition(EDGE + half, EDGE + half);
    this.restartButton.setPosition(width - EDGE - half, EDGE + half);
    const cardX = EDGE + BUTTON + 8;
    const cardW = narrow ? width - cardX * 2 : Math.min(440, width * 0.42);
    this.titleCard.layout(cardX, 6, cardW, compact);
    // The haul: under the page on a phone, else top-right beside restart.
    const statusX = narrow ? cardX : width - EDGE - BUTTON - 10 - this.status.width;
    const statusY = narrow ? 6 + this.titleCard.height + 6 : EDGE;
    // The result card says the haul, and would sit over the tag on a phone.
    this.status.root.setPosition(statusX, statusY).setVisible(!this.card);
    const top = Math.max(6 + this.titleCard.height, statusY + StatusTag.height) + 6;
    if (this.registry.get(HUD_TOP_KEY) !== top) {
      this.registry.set(HUD_TOP_KEY, top);
      this.game.events.emit('hud:top');
    }
    // Zoom: a column under restart (and under the haul, on a wide screen).
    const zoomX = width - EDGE - half;
    const zoomY = EDGE + BUTTON + 10 + ZOOM_D / 2 + (narrow ? 0 : StatusTag.height - BUTTON + 10);
    this.zoomIn.setPosition(zoomX, zoomY).setVisible(!this.card);
    this.zoomOut.setPosition(zoomX, zoomY + ZOOM_D + 10).setVisible(!this.card);
    // The touch controls: the stick in the lower-left corner, the jump button in the lower-right.
    const controls = this.touch && !this.card;
    const rowY = height - CONTROLS_UP;
    this.stick.place(24 + STICK.radius, rowY);
    this.stick.setVisible(controls);
    this.registry.set(STICK_REST, controls ? this.stick.restAt : null);
    this.jumpButton.setPosition(width - 20 - JUMP_D / 2, rowY).setVisible(controls);
    // The tip along the bottom (between the stick and the jump button, where there's room), the way out above it.
    const between = width - 2 * (24 + STICK.radius * 2 + 16);
    const lift = controls && between < 360;
    const tipBottom = lift ? rowY - STICK.radius - 14 : height - 12;
    this.tip.place(width / 2, tipBottom, Math.min(controls && !lift ? between : width - 24, 560), compact);
    this.leave.root.setPosition(width / 2, tipBottom - (narrow ? 96 : 76));
    if (this.card) this.card.setPosition(width / 2, this.cardY(this.card.getData('h') as number));
  }

  private cardY(h: number): number {
    const { height } = screenSize(this.scale);
    return Math.max(h / 2 + 70, height * 0.38);
  }

  private onState(s: HudState): void {
    if (s.hearts < this.shownHearts) this.popHearts(s.hearts);
    if (s.goal && !this.goalShown) this.showGoal();
    const label = s.goal ? `${s.coins}` : `${s.coins} / ${s.needed}`;
    if (label !== this.lastCount) {
      this.lastCount = label;
      this.status.setCount(label, s.coins >= s.needed);
      if (s.goal) this.leave.label.setText(`Leave with ${s.coins} coins  ➜`);
    }
    this.status.setChest(s.chest);
    if (s.started && !s.goal && this.levelTip) {
      this.levelTip = false;
      this.tip.fade(0, 400);
    }
  }

  /** The goal is met: say so, and offer the way out while the rest of the gold waits. */
  private showGoal(): void {
    this.goalShown = true;
    const root = this.leave.root;
    root.setVisible(true).setScale(0.6);
    this.tweens.add({ targets: root, scale: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: root, scale: 1.05, duration: 600, yoyo: true, repeat: -1, delay: 300 });
    const key = this.touch ? '' : ' (Enter)';
    this.note(`Treasure found! Pick up the rest of the gold, or leave${key}.`, 4500);
  }

  private onReset(info?: LevelInfo): void {
    this.destroyCard();
    if (info) {
      this.info = info;
      const { level } = info;
      const place = chapterPlace(level.id);
      const ruin = place ? CHAPTER_NAMES[place.chapter - 1] : undefined;
      const n = place ? place.level : info.index + 1;
      this.titleCard.set(ruin ? `Level ${n} · ${ruin}` : level.chapter, level.name, level.goal);
      // The widest count it will show: every coin, more than the goal asks.
      this.status.reset(level.chest !== undefined, `${level.coinsNeeded * 2} / ${level.coinsNeeded}`);
    }
    this.goalShown = false;
    this.shownHearts = HEARTS;
    for (const h of this.status.hearts) {
      this.tweens.killTweensOf(h);
      h.setTexture('heart').setScale(HEART_SCALE).setAlpha(1);
    }
    this.tweens.killTweensOf(this.leave.root);
    this.leave.root.setVisible(false).setScale(1);
    this.lastCount = '';
    this.status.setChest(false);
    this.onStick(null);
    this.layout();
    this.levelTip = true;
    this.tip.show(this.firstTip());
  }

  /** The level's own tip, else the volcano's, else how to play; the first level leads with how to play. */
  private firstTip(): string {
    const level = this.info?.level;
    const howTo = this.touch ? TOUCH_TIP : DESKTOP_TIP;
    if (this.info?.index === 0) return level?.tip ? `${howTo}\n${level.tip}` : howTo;
    return level?.tip ?? (level?.ruin === 'volcano' ? VOLCANO_TIP : howTo);
  }

  /** Hearts from `left` on are lost: each bursts and is left an empty outline. */
  private popHearts(left: number): void {
    for (let i = left; i < this.shownHearts; i++) {
      const h = this.status.hearts[i];
      if (!h) continue;
      this.tweens.add({ targets: h, scale: HEART_SCALE * 1.8, alpha: 0, duration: 260, ease: 'Quad.out', onComplete: () => {
        h.setTexture('heart-empty').setScale(HEART_SCALE * 0.6).setAlpha(1);
        this.tweens.add({ targets: h, scale: HEART_SCALE, duration: 220, ease: 'Back.out' });
      } });
    }
    this.shownHearts = left;
  }

  /** A line on the tip's note for a few seconds (it replaces the level's tip). */
  private note(line: string, ms: number): void {
    this.levelTip = false;
    this.tip.show(line);
    this.tip.fade(ms, 600);
  }

  /** A heart spent: say what happened and that the level went back. */
  private onRewind(r: { hearts: number; cause: string; by?: GuardAnimal }): void {
    const title = lossText(r.cause, r.by, this.info?.level.ruin)?.title ?? 'Oops!';
    const left = r.hearts === 1 ? 'Last heart!' : `${r.hearts} hearts left.`;
    this.note(`${title} Back to before that pin. ${left}`, 3200);
  }

  /** A line about what was just tapped (the plates' rule). */
  private onNote(line: string): void {
    this.note(line, 5000);
  }

  private onStick(hold: StickHold | null): void {
    this.stick.update(hold);
  }

  /** How much further the camera zooms each way: a button at its limit fades. */
  private onZoom(z: { in: boolean; out: boolean }): void {
    this.zoomIn.setAlpha(z.in ? 1 : 0.4);
    this.zoomOut.setAlpha(z.out ? 1 : 0.4);
  }

  /** Takes the result card down, and lets its page's painting go. */
  private destroyCard(): void {
    if (!this.card) return;
    const { w, h, seed } = this.card.data.getAll() as { w: number; h: number; seed: number };
    this.card.destroy();
    freePaper(this, w, h, seed);
    this.card = null;
  }

  private showResult(r: Result): void {
    this.destroyCard();
    this.tweens.killTweensOf(this.leave.root);
    this.leave.root.setVisible(false);
    this.levelTip = false;
    this.tip.hide();
    if (r.offer) trackOffer('free_end');
    const { width } = screenSize(this.scale);
    const card = resultCard(this, r, this.info?.level, width, {
      again: () => this.game.events.emit('cmd:restart'),
      map: () => this.game.events.emit('cmd:map'),
      next: (index) => this.game.events.emit('cmd:level', index),
      buy: () => getHost()?.onBuy('free_end'),
    });
    // In the upper part of the screen: the camera has zoomed in on Nib below it.
    this.card = card.setPosition(width / 2, this.cardY(resultHeight(r))).setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 280, ease: 'Back.out' });
    // The level is over: the stick, the jump and the zoom buttons go.
    this.layout();
  }
}
