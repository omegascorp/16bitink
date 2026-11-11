import Phaser from 'phaser';
import { INK, PAPER, RED } from '../art/palette';
import type { SoundBoard } from '../audio/sfx';
import { STICK } from '../logic/stick';
import { STICK_REST, type StickHold } from './boardInput';
import { hudTake, isDesktop } from './controls';
import { HEARTS, type HudState, type LevelInfo, type Result } from './GameScene';
import { chapterPlace } from './chapters';
import { DPR, screenSize } from './hidpi';
import { lossText } from './lossLines';
import { ThumbStick } from './thumbStick';
import { getHost, trackOffer } from '../host';
import type { GuardAnimal } from '../logic/level';

const FONT = 'Caveat';
/** Hearts' size in the bar (the texture is painted at twice its size). */
const HEART_SCALE = 0.44;
/** How to play on a touch screen: shown on the first level, and on levels without a tip of their own. */
const TOUCH_TIP = 'Tap a pin to pull it. Walk Nib with the stick, jump with the button. Pinch to zoom.';
/** How to play with a keyboard and mouse. */
const DESKTOP_TIP = 'Click a pin to pull it. Walk Nib with ← →, Space to jump, ↑ ↓ to climb, + − to zoom.';
/** The volcano's first tip, for its levels that have none of their own: its gates and ledges are new. */
const VOLCANO_TIP = 'Striped gate pins go back in: tap one again to push it home. Ledges crumble once Nib steps off them.';
/** The touch controls' row: the stick's and the jump button's middles sit this far above the screen's bottom (CSS px). */
const CONTROLS_UP = 130;
/** The zoom buttons' radius. */
const ZOOM_R = 18;

/** The interface over the board: the level's name and goal, the coin count, buttons, and the result card. */
export class HudScene extends Phaser.Scene {
  private chapter!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private goal!: Phaser.GameObjects.Text;
  private count!: Phaser.GameObjects.Text;
  private coin!: Phaser.GameObjects.Image;
  private tip!: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Container[] = [];
  private card: Phaser.GameObjects.Container | null = null;
  private lastCount = '';
  private chestIcon!: Phaser.GameObjects.Image;
  private chestTick!: Phaser.GameObjects.Text;
  /** The last press was a finger (or this is a phone): the stick and the jump button show. */
  private touch = false;
  private stick!: ThumbStick;
  private jumpButton!: Phaser.GameObjects.Container;
  private zoomIn!: Phaser.GameObjects.Container;
  private zoomOut!: Phaser.GameObjects.Container;
  /** Shown once the goal is met: Nib may leave now or stay for the rest of the gold. */
  private leaveButton!: Phaser.GameObjects.Text;
  private goalShown = false;
  /** Back to the map, and which level this is. */
  private mapChip!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private info: LevelInfo | null = null;
  private hearts: Phaser.GameObjects.Image[] = [];
  private shownHearts = HEARTS;

  constructor() {
    super('hud');
  }

  private get sfx(): SoundBoard {
    return this.registry.get('sfx') as SoundBoard;
  }

  create(): void {
    this.cameras.main.setOrigin(0).setZoom(DPR);
    const text = (size: number, color = INK, bold = true): Phaser.GameObjects.Text =>
      this.add.text(0, 0, '', { fontFamily: FONT, fontSize: `${size}px`, fontStyle: bold ? '700' : '500', color, padding: { x: 4, y: 2 } }).setResolution(DPR);
    this.chapter = text(17, '#7a5a2e');
    this.title = text(34);
    this.goal = text(20, INK, false);
    this.coin = this.add.image(0, 0, 'coins', 0).setScale(0.5);
    this.count = text(26);
    this.chestIcon = this.add.image(0, 0, 'chest-closed').setScale(0.24);
    this.hearts = Array.from({ length: HEARTS }, () => this.add.image(0, 0, 'heart').setScale(HEART_SCALE));
    this.chestTick = text(26, '#2f7a3a').setText('✓').setOrigin(0.5).setVisible(false);
    this.touch = !isDesktop();
    // Whichever was pressed last, a finger or the mouse, decides whether the touch controls show.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch === this.touch) return;
      this.touch = p.wasTouch;
      this.tip.setText(this.firstTip());
      this.layout();
    });
    this.stick = new ThumbStick(this);
    this.tip = text(22, INK, false).setText(this.firstTip()).setOrigin(0.5, 1).setAlpha(0.92);
    // A paper label, so it reads over the rock.
    this.tip.setBackgroundColor('rgba(255,250,240,0.85)').setPadding(12, 4, 12, 4);
    // A jump button for touch screens (keyboards have Space).
    this.jumpButton = this.button('⤒', () => this.game.events.emit('cmd:jump'), 34);
    this.zoomIn = this.button('+', () => this.game.events.emit('cmd:zoom', 1), ZOOM_R);
    this.zoomOut = this.button('−', () => this.game.events.emit('cmd:zoom', -1), ZOOM_R);
    this.leaveButton = text(26, PAPER).setOrigin(0.5).setBackgroundColor('#2f7a3a').setPadding(18, 6, 18, 6).setVisible(false);
    this.leaveButton.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => {
      hudTake(p);
      this.sfx.unlock();
      this.sfx.play('tap');
      this.game.events.emit('cmd:leave');
    });
    this.buttons = [this.button('↺', () => this.game.events.emit('cmd:restart'))];
    const chip = (label: string, onTap: () => void): Phaser.GameObjects.Text => {
      const t = text(22, INK).setText(label).setBackgroundColor('rgba(255,250,240,0.85)').setPadding(9, 1, 9, 1);
      t.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => {
        hudTake(p);
        this.sfx.unlock();
        this.sfx.play('tap');
        onTap();
      });
      return t;
    };
    this.mapChip = chip('‹ Map', () => this.game.events.emit('cmd:map'));
    this.levelLabel = text(18, INK, false).setBackgroundColor('rgba(255,250,240,0.85)').setPadding(8, 3, 8, 3);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.game.events.on('hud:state', this.onState, this);
    this.game.events.on('hud:result', this.showResult, this);
    this.game.events.on('hud:reset', this.onReset, this);
    this.game.events.on('hud:rewind', this.onRewind, this);
    this.game.events.on('hud:note', this.onNote, this);
    this.game.events.on('hud:zoom', this.onZoom, this);
    this.game.events.on('stick:hold', this.onStick, this);
    const info = this.registry.get('levelInfo') as LevelInfo | undefined;
    if (info) this.onReset(info);
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
    });
  }

  private button(label: string, onTap: () => void, r = 22): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0xfffaf0, 1).fillCircle(0, 0, r);
    g.lineStyle(2.5, 0x26316a, 1).strokeCircle(0, 0, r);
    const t = this.add.text(0, 1, label, { fontFamily: FONT, fontSize: `${Math.round(r * 1.36)}px`, fontStyle: '700', color: INK }).setOrigin(0.5).setResolution(DPR);
    const c = this.add.container(0, 0, [g, t]).setSize(r * 2 + 4, r * 2 + 4).setInteractive({ useHandCursor: true });
    c.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      hudTake(p);
      this.sfx.unlock();
      this.sfx.play('tap');
      this.tweens.add({ targets: c, scale: 0.88, duration: 70, yoyo: true });
      onTap();
    });
    return c;
  }

  private layout(): void {
    const { width, height } = screenSize(this.scale);
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    const narrow = width < 520;
    const x = 14;
    this.chapter.setPosition(x, 2).setFontSize(narrow ? 15 : 17);
    this.title.setPosition(x, narrow ? 17 : 18).setFontSize(narrow ? 28 : 34);
    this.goal.setPosition(x, narrow ? 47 : 54).setFontSize(narrow ? 17 : 20);
    const right = width - 14;
    this.buttons.forEach((b, i) => b.setPosition(right - 24 - i * 56, 34));
    // The coin count sits left of the buttons; on phones, under them.
    const countRight = narrow ? right - 4 : right - 24 - 56 * this.buttons.length + 6;
    const countY = narrow ? 80 : 34;
    this.count.setOrigin(1, 0.5).setPosition(countRight, countY);
    this.coin.setPosition(countRight - this.count.width - 14, countY);
    // The chest goal sits just left of the coins.
    const chestX = countRight - this.count.width - 44;
    this.chestIcon.setPosition(chestX, countY);
    this.chestTick.setPosition(chestX + 8, countY + 4);
    // The hearts, left of the chest (or of the coins, on a Loot level).
    const heartsRight = (this.chestIcon.visible ? chestX - 26 : countRight - this.count.width - 34) - 4;
    this.hearts.forEach((h, i) => h.setPosition(heartsRight - (HEARTS - 1 - i) * 27, countY));
    this.mapChip.setPosition(x, narrow ? 76 : 84).setFontSize(narrow ? 19 : 22);
    this.levelLabel.setPosition(this.mapChip.x + this.mapChip.width + 6, this.mapChip.y + 2).setFontSize(narrow ? 16 : 18);
    // Zoom: a column under the restart button (on phones, under the coin count too).
    const zoomY = narrow ? 122 : 90;
    this.zoomIn.setPosition(right - 24, zoomY);
    this.zoomOut.setPosition(right - 24, zoomY + ZOOM_R * 2 + 10);
    this.zoomIn.setVisible(!this.card);
    this.zoomOut.setVisible(!this.card);
    // The touch controls: the stick in the lower-left corner, the jump button in the lower-right.
    const controls = this.touch && !this.card;
    const rowY = height - CONTROLS_UP;
    this.stick.place(24 + STICK.radius, rowY);
    this.stick.setVisible(controls);
    this.registry.set(STICK_REST, controls ? this.stick.restAt : null);
    this.jumpButton.setPosition(width - 52, rowY).setVisible(controls);
    // The tip along the bottom, and the way out above it: both lifted over the touch controls while they show.
    const tipBottom = controls ? rowY - STICK.radius - 10 : height - 10;
    this.tip.setPosition(width / 2, tipBottom).setFontSize(narrow ? 19 : 22).setWordWrapWidth(width - 24).setAlign('center');
    this.leaveButton.setFontSize(narrow ? 24 : 26);
    this.leaveButton.setPosition(width / 2, tipBottom - (narrow ? 86 : 60));
    if (this.card) this.card.setPosition(width / 2, this.cardY(this.card.getData('h') as number));
  }

  private cardY(h: number): number {
    const { height } = screenSize(this.scale);
    return Math.max(h / 2 + 90, height * 0.36);
  }

  private onState(s: HudState): void {
    if (s.hearts < this.shownHearts) this.popHearts(s.hearts);
    if (s.goal && !this.goalShown) this.showGoal();
    if (s.goal) {
      const leave = `Leave with ${s.coins} coins  ➜`;
      if (this.leaveButton.text !== leave) {
        this.leaveButton.setText(leave);
        this.layout();
      }
    }
    const label = s.goal ? `${s.coins}` : `${s.coins} / ${s.needed}`;
    if (label !== this.lastCount) {
      this.lastCount = label;
      this.count.setText(label).setColor(s.coins >= s.needed ? '#2f7a3a' : INK);
      this.layout();
    }
    if (s.chest !== this.chestTick.visible) {
      this.chestTick.setVisible(s.chest);
      this.chestIcon.setTexture(s.chest ? 'chest-open' : 'chest-closed');
      if (s.chest) this.tweens.add({ targets: this.chestIcon, scale: 0.34, duration: 160, yoyo: true });
    }
    if (s.started && !s.goal && this.tip.visible && this.tip.alpha > 0.9) this.tweens.add({ targets: this.tip, alpha: 0, duration: 400, onComplete: () => this.tip.setVisible(false) });
  }

  /** The goal is met: say so, and offer the way out while the rest of the gold waits. */
  private showGoal(): void {
    this.goalShown = true;
    this.leaveButton.setVisible(true).setScale(0.6);
    this.tweens.add({ targets: this.leaveButton, scale: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: this.leaveButton, scale: 1.06, duration: 600, yoyo: true, repeat: -1, delay: 300 });
    this.tweens.killTweensOf(this.tip);
    const key = this.sys.game.device.input.touch ? '' : ' (Enter)';
    this.tip.setText(`Treasure found! Pick up the rest of the gold, or leave${key}.`).setVisible(true).setAlpha(0.92);
    this.tweens.add({ targets: this.tip, alpha: 0, delay: 4500, duration: 600, onComplete: () => this.tip.setVisible(false) });
  }

  private onReset(info?: LevelInfo): void {
    if (info) {
      this.info = info;
      const { level } = info;
      this.chapter.setText(level.chapter);
      this.title.setText(level.name);
      this.goal.setText(level.goal);
      const place = chapterPlace(level.id);
      this.levelLabel.setText(`Level ${place ? place.level : info.index + 1}`);
      this.chestIcon.setVisible(level.chest !== undefined);
      this.layout();
    }
    this.goalShown = false;
    this.shownHearts = HEARTS;
    for (const h of this.hearts) {
      this.tweens.killTweensOf(h);
      h.setTexture('heart').setScale(HEART_SCALE).setAlpha(1);
    }
    this.tweens.killTweensOf(this.leaveButton);
    this.leaveButton.setVisible(false).setScale(1);
    this.tweens.killTweensOf(this.tip);
    this.tip.setText(this.firstTip());
    this.card?.destroy();
    this.card = null;
    this.tip.setVisible(true).setAlpha(0.92);
    this.lastCount = '';
    this.chestTick.setVisible(false);
    this.chestIcon.setTexture('chest-closed');
    this.onStick(null);
    this.layout();
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
      // The rightmost heart goes first.
      const h = this.hearts[i];
      if (!h) continue;
      this.tweens.add({ targets: h, scale: HEART_SCALE * 1.8, alpha: 0, duration: 260, ease: 'Quad.out', onComplete: () => {
        h.setTexture('heart-empty').setScale(HEART_SCALE * 0.6).setAlpha(1);
        this.tweens.add({ targets: h, scale: HEART_SCALE, duration: 220, ease: 'Back.out' });
      } });
    }
    this.shownHearts = left;
  }

  /** A heart spent: say what happened and that the level went back. */
  private onRewind(r: { hearts: number; cause: string; by?: GuardAnimal }): void {
    const title = lossText(r.cause, r.by, this.info?.level.ruin)?.title ?? 'Oops!';
    const left = r.hearts === 1 ? 'Last heart!' : `${r.hearts} hearts left.`;
    this.tweens.killTweensOf(this.tip);
    this.tip.setText(`${title} Back to before that pin. ${left}`).setVisible(true).setAlpha(0.9);
    this.tweens.add({ targets: this.tip, alpha: 0, delay: 3200, duration: 600, onComplete: () => this.tip.setVisible(false) });
  }

  /** A line about what was just tapped (the plates' rule), shown for a few seconds. */
  private onNote(line: string): void {
    this.tweens.killTweensOf(this.tip);
    // 0.9, not 0.92: the level's own tip fades once play starts; this one keeps its time.
    this.tip.setText(line).setVisible(true).setAlpha(0.9);
    this.tweens.add({ targets: this.tip, alpha: 0, delay: 5000, duration: 600, onComplete: () => this.tip.setVisible(false) });
  }

  private onStick(hold: StickHold | null): void {
    this.stick.update(hold);
  }

  /** How much further the camera zooms each way: a button at its limit fades. */
  private onZoom(z: { in: boolean; out: boolean }): void {
    this.zoomIn.setAlpha(z.in ? 1 : 0.35);
    this.zoomOut.setAlpha(z.out ? 1 : 0.35);
  }

  private showResult(r: Result): void {
    this.card?.destroy();
    this.tweens.killTweensOf(this.leaveButton);
    this.leaveButton.setVisible(false);
    const { width, height } = screenSize(this.scale);
    const w = Math.min(380, width - 32);
    const way = r.next !== null || r.offer !== undefined;
    const h = r.won ? (r.offer ? 396 : way ? 370 : 330) : 236;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.12).fillRoundedRect(-w / 2 + 6, -h / 2 + 8, w, h, 14);
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(PAPER).color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    bg.lineStyle(3, 0x26316a, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    const cause = lossText(r.cause, r.by, this.info?.level.ruin);
    const title = this.add.text(0, -h / 2 + 18, r.won ? 'Nib made it!' : cause?.title ?? 'Oh no!', { fontFamily: FONT, fontSize: '44px', fontStyle: '700', color: r.won ? INK : RED, padding: { x: 8, y: 2 } }).setOrigin(0.5, 0).setResolution(DPR);
    const haul = r.hasChest ? `The idol and ${r.coins} of ${r.total} coins.` : `${r.coins} of ${r.total} coins.`;
    const lineText = r.won ? `${haul}\nBank: ${r.bank.coins.toLocaleString('en-US')} coins · ${r.bank.idols} ${r.bank.idols === 1 ? 'idol' : 'idols'}` : cause?.line ?? '';
    const line = this.add.text(0, -h / 2 + 76, lineText, { fontFamily: FONT, fontSize: '23px', color: INK, align: 'center', wordWrap: { width: w - 40 } }).setOrigin(0.5, 0).setResolution(DPR);
    const parts: Phaser.GameObjects.GameObject[] = [bg, title, line];
    if (r.won) {
      // Three ink blots: done, every coin, first try.
      const labels = ['done', 'every coin', 'first try'];
      labels.forEach((label, i) => {
        const x = (i - 1) * 96;
        const y0 = -24;
        const got = [true, r.allCoins, r.firstTry][i]!;
        const blot = this.add.graphics();
        blot.fillStyle(got ? 0x26316a : 0xd8d0bf, 1).fillCircle(x, y0 + 26, 17).fillCircle(x + 12, y0 + 18, 6).fillCircle(x - 13, y0 + 34, 5);
        const t = this.add.text(x, y0 + 50, label, { fontFamily: FONT, fontSize: '19px', color: got ? INK : '#9a927f' }).setOrigin(0.5, 0).setResolution(DPR);
        parts.push(blot, t);
      });
      if (r.offer) parts.push(this.add.text(0, 74, 'The Volcano and the Tomb wait in the full game', { fontFamily: FONT, fontSize: '21px', color: INK, align: 'center', wordWrap: { width: w - 32 } }).setOrigin(0.5).setResolution(DPR));
      if (r.moreComing) parts.push(this.add.text(0, 65, 'More levels are being drawn', { fontFamily: FONT, fontSize: '22px', color: INK }).setOrigin(0.5).setResolution(DPR));
    }
    const next = r.won ? r.next : null;
    if (r.offer) trackOffer('free_end');
    const again = this.add.text(way ? -60 : 0, h / 2 - (way ? 34 : 70), r.won ? 'Play again' : 'Try again', { fontFamily: FONT, fontSize: way ? '24px' : '30px', fontStyle: '700', color: way ? INK : '#ffffff', backgroundColor: way ? undefined : r.won ? INK : RED, padding: { x: 18, y: 2 } }).setOrigin(0.5).setResolution(DPR);
    again.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => {
      hudTake(p);
      this.sfx.play('tap');
      this.game.events.emit('cmd:restart');
    });
    parts.push(again);
    // Back to the map: beside "Play again" under the way on, or under the main button.
    const map = this.add.text(way ? 70 : 0, h / 2 - 32, '‹ Map', { fontFamily: FONT, fontSize: '24px', fontStyle: '700', color: INK, padding: { x: 14, y: 2 } }).setOrigin(0.5).setResolution(DPR);
    map.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => {
      hudTake(p);
      this.sfx.play('tap');
      this.game.events.emit('cmd:map');
    });
    parts.push(map);
    if (next !== null) {
      // The way on: the next level, big; playing this one again is the small choice under it.
      const on = this.add.text(0, h / 2 - 84, 'Next level  ➜', { fontFamily: FONT, fontSize: '32px', fontStyle: '700', color: '#ffffff', backgroundColor: '#2f7a3a', padding: { x: 20, y: 3 } }).setOrigin(0.5).setResolution(DPR);
      on.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => {
        hudTake(p);
        this.sfx.play('tap');
        this.game.events.emit('cmd:level', next);
      });
      parts.push(on);
    }
    if (r.offer) {
      // The free levels are done: the full game is the way on.
      const buy = this.add.text(0, h / 2 - 84, `Full game · ${r.offer}`, { fontFamily: FONT, fontSize: '32px', fontStyle: '700', color: '#ffffff', backgroundColor: '#2f7a3a', padding: { x: 20, y: 3 } }).setOrigin(0.5).setResolution(DPR);
      buy.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => {
        hudTake(p);
        this.sfx.play('tap');
        getHost()?.onBuy('free_end');
      });
      parts.push(buy);
    }
    // In the upper part of the screen: the camera has zoomed in on Nib below it.
    this.card = this.add.container(width / 2, this.cardY(h), parts).setScale(0.7).setAlpha(0);
    this.card.setData('h', h);
    // The level is over: the stick, the jump and the zoom buttons go.
    this.layout();
    this.tweens.add({ targets: this.card, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
  }
}
