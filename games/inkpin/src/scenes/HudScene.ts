import Phaser from 'phaser';
import { INK, PAPER, RED } from '../art/palette';
import type { SoundBoard } from '../audio/sfx';
import { hudTake, readControls, type ControlMode } from './controls';
import { HEARTS, type HudState, type LevelInfo, type Result } from './GameScene';
import { DPR, screenSize } from './hidpi';

const FONT = 'Caveat';
/** Hearts' size in the bar (the texture is painted at twice its size). */
const HEART_SCALE = 0.44;
const TIPS: Record<ControlMode, string> = {
  tap: 'Tap a pin to pull it. Tap the floor to send Nib there, tap Nib to jump.',
  stick: 'Tap a pin to pull it. Drag anywhere to walk Nib; jump with the button (keyboard: arrows and Space).',
};
const CONTROL_LABEL: Record<ControlMode, string> = { tap: 'Move: tap to go  ⇄', stick: 'Move: joystick  ⇄' };
const CAUSE_TEXT: Record<string, { title: string; line: string }> = {
  burnt: { title: 'Too hot!', line: 'Nib walked into the lava. Cool it with water first.' },
  inked: { title: 'Caught!', line: 'A guard got Nib. Wash it away with water, or jump on a boar’s head.' },
  pricked: { title: 'Ouch, spikes!', line: 'Porcupines can’t be stomped. Wash them away, or drop a boulder on them.' },
  melted: { title: 'The gold melted!', line: 'Coins that touch lava are gone, and too few are left.' },
  drained: { title: 'Down the drain!', line: 'Too much gold washed away. Plug the drain first.' },
  crushed: { title: 'Bonk!', line: 'A boulder came down on Nib. Keep out from under it.' },
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
    this.leaveButton = text(26, PAPER).setOrigin(0.5).setBackgroundColor('#2f7a3a').setPadding(18, 6, 18, 6).setVisible(false);
    this.leaveButton.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => {
      hudTake(p);
      this.sfx.unlock();
      this.sfx.play('tap');
      this.game.events.emit('cmd:leave');
    });
    this.buttons = [this.button('↺', () => this.game.events.emit('cmd:restart')), this.button('?', () => this.game.events.emit('cmd:hint'))];
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
    this.game.events.on('stick:show', this.stickShow, this);
    this.game.events.on('stick:move', this.stickMove, this);
    this.game.events.on('stick:hide', this.stickHide, this);
    const info = this.registry.get('levelInfo') as LevelInfo | undefined;
    if (info) this.onReset(info);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
      this.game.events.off('hud:state', this.onState, this);
      this.game.events.off('hud:result', this.showResult, this);
      this.game.events.off('hud:reset', this.onReset, this);
      this.game.events.off('hud:rewind', this.onRewind, this);
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
    this.controlChip.setPosition(x, narrow ? 76 : 86).setFontSize(narrow ? 16 : 18);
    // The way back to the map sits beside the controls chip; on phones, under it.
    const navY = narrow ? 108 : 86;
    this.mapChip.setPosition(narrow ? x : x + this.controlChip.width + 10, navY - 2).setFontSize(narrow ? 19 : 22);
    this.levelLabel.setPosition(this.mapChip.x + this.mapChip.width + 6, navY).setFontSize(narrow ? 16 : 18);
    const touch = this.sys.game.device.input.touch;
    this.jumpButton.setPosition(width - 52, height - 130).setVisible(touch && this.controls === 'stick');
    // Centred, but clear of the jump button in the bottom-right corner.
    this.leaveButton.setFontSize(narrow ? 24 : 26);
    const leaveRoom = this.jumpButton.visible ? width - 104 : width;
    this.leaveButton.setPosition(Math.min(width / 2, leaveRoom - this.leaveButton.width / 2 - 8), height - (narrow ? 96 : 70));
    this.tip.setPosition(width / 2, height - 10).setFontSize(narrow ? 19 : 22).setWordWrapWidth(width - 24).setAlign('center');
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
      this.levelLabel.setText(`Level ${info.index + 1} / ${info.count}`);
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
    this.tip.setText(this.info?.level.tip ?? TIPS[this.controls]);
    this.card?.destroy();
    this.card = null;
    this.tip.setVisible(true).setAlpha(0.92);
    this.lastCount = '';
    this.chestTick.setVisible(false);
    this.chestIcon.setTexture('chest-closed');
    this.stickHide();
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
  private onRewind(r: { hearts: number; cause: string }): void {
    const title = CAUSE_TEXT[r.cause]?.title ?? 'Oops!';
    const left = r.hearts === 1 ? 'Last heart!' : `${r.hearts} hearts left.`;
    this.tweens.killTweensOf(this.tip);
    this.tip.setText(`${title} Back to before that pin. ${left}`).setVisible(true).setAlpha(0.9);
    this.tweens.add({ targets: this.tip, alpha: 0, delay: 3200, duration: 600, onComplete: () => this.tip.setVisible(false) });
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
    this.tweens.killTweensOf(this.leaveButton);
    this.leaveButton.setVisible(false);
    const { width, height } = screenSize(this.scale);
    const w = Math.min(380, width - 32);
    const h = r.won ? (r.next !== null ? 370 : 330) : 236;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.12).fillRoundedRect(-w / 2 + 6, -h / 2 + 8, w, h, 14);
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(PAPER).color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    bg.lineStyle(3, 0x26316a, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    const cause = r.cause ? CAUSE_TEXT[r.cause] : undefined;
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
    }
    const next = r.won ? r.next : null;
    const again = this.add.text(next !== null ? -60 : 0, h / 2 - (next !== null ? 34 : 70), r.won ? 'Play again' : 'Try again', { fontFamily: FONT, fontSize: next !== null ? '24px' : '30px', fontStyle: '700', color: next !== null ? INK : '#ffffff', backgroundColor: next !== null ? undefined : r.won ? INK : RED, padding: { x: 18, y: 2 } }).setOrigin(0.5).setResolution(DPR);
    again.setInteractive({ useHandCursor: true }).on('pointerdown', (p: Phaser.Input.Pointer) => {
      hudTake(p);
      this.sfx.play('tap');
      this.game.events.emit('cmd:restart');
    });
    parts.push(again);
    // Back to the map: beside "Play again" under the way on, or under the main button.
    const map = this.add.text(next !== null ? 70 : 0, h / 2 - 32, '‹ Map', { fontFamily: FONT, fontSize: '24px', fontStyle: '700', color: INK, padding: { x: 14, y: 2 } }).setOrigin(0.5).setResolution(DPR);
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
    // In the upper part of the screen: the camera has zoomed in on Nib below it.
    this.card = this.add.container(width / 2, this.cardY(h), parts).setScale(0.7).setAlpha(0);
    this.card.setData('h', h);
    this.tweens.add({ targets: this.card, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
  }
}
