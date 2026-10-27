import Phaser from 'phaser';
import { INK, PAPER, RED } from '../art/palette';
import type { SoundBoard } from '../audio/sfx';
import { CELLAR } from '../level/cellar';
import { hudTake, readControls, type ControlMode, type HudState, type Result } from './GameScene';
import { DPR, screenSize } from './hidpi';

const FONT = 'Caveat';
const TIPS: Record<ControlMode, string> = {
  tap: 'Tap a pin to pull it. Tap the floor to send Nib there, tap Nib to jump.',
  stick: 'Tap a pin to pull it. Drag anywhere to walk Nib; jump with the button (keyboard: arrows and Space).',
};
const CONTROL_LABEL: Record<ControlMode, string> = { tap: 'Move: tap to go  ⇄', stick: 'Move: joystick  ⇄' };
const CAUSE_TEXT: Record<string, { title: string; line: string }> = {
  burnt: { title: 'Too hot!', line: 'Nib walked into the lava. Cool it with water first.' },
  inked: { title: 'Inked!', line: 'The Blot got Nib. Wash it away first.' },
  melted: { title: 'The gold melted!', line: 'Coins that touch lava are gone, and too few are left.' },
  fell: { title: 'Whoops!', line: 'Nib fell out of the temple.' },
};

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
  private controlChip!: Phaser.GameObjects.Text;
  private controls: ControlMode = 'tap';
  private stickBase!: Phaser.GameObjects.Graphics;
  private stickKnob!: Phaser.GameObjects.Graphics;
  private jumpButton!: Phaser.GameObjects.Container;

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
    this.chapter = text(17, '#7a5a2e').setText(CELLAR.chapter);
    this.title = text(34).setText(CELLAR.name);
    this.goal = text(20, INK, false).setText(CELLAR.goal);
    this.coin = this.add.image(0, 0, 'coins', 0).setScale(0.5);
    this.count = text(26);
    this.chestIcon = this.add.image(0, 0, 'chest-closed').setScale(0.24);
    this.chestTick = text(26, '#2f7a3a').setText('✓').setOrigin(0.5).setVisible(false);
    this.controls = readControls();
    this.controlChip = text(18, INK, false).setText(CONTROL_LABEL[this.controls]).setBackgroundColor('rgba(255,250,240,0.85)').setPadding(10, 3, 10, 3);
    this.controlChip.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => {
      hudTake(p);
      this.sfx.unlock();
      this.sfx.play('tap');
      this.controls = this.controls === 'tap' ? 'stick' : 'tap';
      this.controlChip.setText(CONTROL_LABEL[this.controls]);
      this.tip.setText(TIPS[this.controls]);
      this.game.events.emit('cmd:controls', this.controls);
      this.layout();
    });
    this.stickBase = this.add.graphics().setVisible(false);
    this.stickBase.fillStyle(0xfffaf0, 0.55).fillCircle(0, 0, 50).lineStyle(2.5, 0x26316a, 0.7).strokeCircle(0, 0, 50);
    this.stickKnob = this.add.graphics().setVisible(false);
    this.stickKnob.fillStyle(0x26316a, 0.8).fillCircle(0, 0, 20);
    this.tip = text(22, INK, false).setText(TIPS[this.controls]).setOrigin(0.5, 1).setAlpha(0.92);
    // A paper label, so it reads over the rock.
    this.tip.setBackgroundColor('rgba(255,250,240,0.85)').setPadding(12, 4, 12, 4);
    // A jump button for touch screens in joystick mode (keyboards have Space).
    this.jumpButton = this.button('⤒', () => this.game.events.emit('cmd:jump'), 34);
    this.buttons = [this.button('↺', () => this.game.events.emit('cmd:restart')), this.button('?', () => this.game.events.emit('cmd:hint'))];
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.game.events.on('hud:state', this.onState, this);
    this.game.events.on('hud:result', this.showResult, this);
    this.game.events.on('hud:reset', this.onReset, this);
    this.game.events.on('stick:show', this.stickShow, this);
    this.game.events.on('stick:move', this.stickMove, this);
    this.game.events.on('stick:hide', this.stickHide, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
      this.game.events.off('hud:state', this.onState, this);
      this.game.events.off('hud:result', this.showResult, this);
      this.game.events.off('hud:reset', this.onReset, this);
      this.game.events.off('stick:show', this.stickShow, this);
      this.game.events.off('stick:move', this.stickMove, this);
      this.game.events.off('stick:hide', this.stickHide, this);
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
    const countRight = narrow ? right - 4 : right - 24 - 56 * 2 + 6;
    const countY = narrow ? 72 : 34;
    this.count.setOrigin(1, 0.5).setPosition(countRight, countY);
    this.coin.setPosition(countRight - this.count.width - 14, countY);
    // The chest goal sits just left of the coins.
    const chestX = countRight - this.count.width - 44;
    this.chestIcon.setPosition(chestX, countY);
    this.chestTick.setPosition(chestX + 8, countY + 4);
    this.controlChip.setPosition(x, narrow ? 76 : 86).setFontSize(narrow ? 16 : 18);
    const touch = this.sys.game.device.input.touch;
    this.jumpButton.setPosition(width - 52, height - 130).setVisible(touch && this.controls === 'stick');
    this.tip.setPosition(width / 2, height - 10).setFontSize(narrow ? 19 : 22).setWordWrapWidth(width - 24).setAlign('center');
    if (this.card) this.card.setPosition(width / 2, this.cardY(this.card.getData('h') as number));
  }

  private cardY(h: number): number {
    const { height } = screenSize(this.scale);
    return Math.max(h / 2 + 90, height * 0.36);
  }

  private onState(s: HudState): void {
    const label = `${s.coins} / ${s.needed}`;
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
    if (s.started && this.tip.visible) this.tweens.add({ targets: this.tip, alpha: 0, duration: 400, onComplete: () => this.tip.setVisible(false) });
  }

  private onReset(): void {
    this.card?.destroy();
    this.card = null;
    this.tip.setVisible(true).setAlpha(0.92);
    this.lastCount = '';
    this.chestTick.setVisible(false);
    this.chestIcon.setTexture('chest-closed');
    this.stickHide();
  }

  private stickShow(at: { x: number; y: number }): void {
    this.stickBase.setPosition(at.x, at.y).setVisible(true);
    this.stickKnob.setPosition(at.x, at.y).setVisible(true);
  }

  private stickMove(m: { dx: number }): void {
    this.stickKnob.setX(this.stickBase.x + m.dx);
  }

  private stickHide(): void {
    this.stickBase.setVisible(false);
    this.stickKnob.setVisible(false);
  }

  private showResult(r: Result): void {
    this.card?.destroy();
    const { width, height } = screenSize(this.scale);
    const w = Math.min(380, width - 32);
    const h = r.won ? 320 : 200;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.12).fillRoundedRect(-w / 2 + 6, -h / 2 + 8, w, h, 14);
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(PAPER).color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    bg.lineStyle(3, 0x26316a, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    const cause = r.cause ? CAUSE_TEXT[r.cause] : undefined;
    const title = this.add.text(0, -h / 2 + 18, r.won ? 'Nib made it!' : cause?.title ?? 'Oh no!', { fontFamily: FONT, fontSize: '44px', fontStyle: '700', color: r.won ? INK : RED, padding: { x: 8, y: 2 } }).setOrigin(0.5, 0).setResolution(DPR);
    const lineText = r.won ? `The idol and ${r.coins} of ${r.total} coins.\nBank: ${r.bank.coins.toLocaleString('en-US')} coins · ${r.bank.idols} ${r.bank.idols === 1 ? 'idol' : 'idols'}` : cause?.line ?? '';
    const line = this.add.text(0, -h / 2 + 76, lineText, { fontFamily: FONT, fontSize: '23px', color: INK, align: 'center', wordWrap: { width: w - 40 } }).setOrigin(0.5, 0).setResolution(DPR);
    const parts: Phaser.GameObjects.GameObject[] = [bg, title, line];
    if (r.won) {
      // Three ink blots: done, every coin, first try.
      const labels = ['done', 'every coin', 'first try'];
      labels.forEach((label, i) => {
        const x = (i - 1) * 96;
        const y0 = 14;
        const got = [true, r.allCoins, r.firstTry][i]!;
        const blot = this.add.graphics();
        blot.fillStyle(got ? 0x26316a : 0xd8d0bf, 1).fillCircle(x, y0 + 26, 17).fillCircle(x + 12, y0 + 18, 6).fillCircle(x - 13, y0 + 34, 5);
        const t = this.add.text(x, y0 + 50, label, { fontFamily: FONT, fontSize: '19px', color: got ? INK : '#9a927f' }).setOrigin(0.5, 0).setResolution(DPR);
        parts.push(blot, t);
      });
    }
    const again = this.add.text(0, h / 2 - 34, r.won ? 'Play again' : 'Try again', { fontFamily: FONT, fontSize: '30px', fontStyle: '700', color: '#ffffff', backgroundColor: r.won ? INK : RED, padding: { x: 18, y: 2 } }).setOrigin(0.5).setResolution(DPR);
    again.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => {
      hudTake(p);
      this.sfx.play('tap');
      this.game.events.emit('cmd:restart');
    });
    parts.push(again);
    // In the upper part of the screen: the camera has zoomed in on Nib below it.
    this.card = this.add.container(width / 2, this.cardY(h), parts).setScale(0.7).setAlpha(0);
    this.card.setData('h', h);
    this.tweens.add({ targets: this.card, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
  }
}
