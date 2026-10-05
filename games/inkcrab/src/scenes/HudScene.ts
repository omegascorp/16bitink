import Phaser from 'phaser';
import { BLUE, BLUE_HEX, HIGHLIGHT_HEX, PAPER_HEX, RED } from '../art/palette';
import { REG } from '../host';
import { meterGoal } from '../logic/growth';
import { inStickZone, knobOffset, stickCentre, stickVector, STICK } from '../logic/joystick';
import { SAND_CAPACITY } from '../logic/sim';
import { SHELLS } from '../logic/shells';
import type { GameScene } from './GameScene';
import type { TouchState } from './game/input';
import { screenScene, toView, viewSize } from './hidpi';
import { HAND_FONT, wobblyRect } from './ui';

const PANEL = { x: 16, y: 14, w: 300, h: 118 } as const;
const BAR = { x: 30, y: 60, w: 200, h: 16 } as const;

/** The on-screen jump button, bottom right (touch only). */
function jumpButton(width: number, height: number): { x: number; y: number; r: number } {
  return { x: width - 80, y: height - 110, r: 44 };
}

/** The notebook margin: size, growth meter, bank, shell, and touch controls. */
export class HudScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private size!: Phaser.GameObjects.Text;
  private note!: Phaser.GameObjects.Text;
  private shell!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private help!: Phaser.GameObjects.Text;
  private stickPointer: number | null = null;
  private stickPull = { x: 0, y: 0 };
  private touchSeen = false;

  constructor() {
    super('Hud');
  }

  create(): void {
    screenScene(this);
    this.g = this.add.graphics();
    const text = (x: number, y: number, size: number, color = BLUE): Phaser.GameObjects.Text =>
      this.add.text(x, y, '', { fontFamily: HAND_FONT, fontSize: `${size}px`, color, padding: { x: 4, y: 2 } });
    this.size = text(28, 20, 30);
    this.note = text(28, 82, 20);
    this.shell = text(28, 102, 18);
    this.prompt = text(0, 0, 24).setOrigin(0.5, 1);
    this.help = text(0, 0, 18).setOrigin(1, 1).setAlpha(0.7);
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
  }

  update(): void {
    const game = this.scene.get('Game') as GameScene;
    const beach = game.beach;
    if (!beach) return;
    const { width, height } = viewSize(this);
    const c = beach.crab;
    const g = this.g;
    g.clear();
    g.fillStyle(PAPER_HEX, 0.88).fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    wobblyRect(g, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 3, 1.6, BLUE_HEX);

    const goal = meterGoal(c.growth.size);
    const full = Math.min(1, c.growth.meter / goal);
    // Highlighter under the ink: a full shell is something to act on.
    if (beach.capped) g.fillStyle(HIGHLIGHT_HEX, 0.85).fillRect(BAR.x - 5, BAR.y - 5, BAR.w + 10, BAR.h + 10);
    g.fillStyle(BLUE_HEX, 0.75).fillRect(BAR.x, BAR.y, BAR.w * full, BAR.h);
    wobblyRect(g, BAR.x, BAR.y, BAR.w, BAR.h, 9, 1.4, BLUE_HEX);

    this.size.setText(`size ${c.growth.size}${c.sand > 0 ? `   · sand ${c.sand}/${SAND_CAPACITY}` : ''}`);
    const bank = c.growth.bank > 0 ? ` (+${c.growth.bank} banked)` : '';
    this.note.setText(c.swap ? 'moving house… exposed!' : beach.capped ? `shell full, find a bigger one${bank}` : `growing${bank}`);
    this.note.setColor(c.swap ? RED : BLUE);
    const spec = c.shell ? SHELLS[c.shell] : null;
    this.shell.setText(spec ? `in a ${spec.name} · fits sizes ${spec.minSize}–${spec.maxSize}` : 'no shell!');

    const near = beach.nearbyShell;
    if (near && near.kind.type === 'shell' && !c.swap) {
      const s = SHELLS[near.kind.shell];
      const how = this.touchSeen ? 'tap it' : 'press E';
      const verdict = beach.nearbyFits
        ? `${how} to move in`
        : c.growth.size < s.minSize ? 'too big for you yet' : 'too small for you now';
      this.prompt.setText(`${s.name} · fits ${s.minSize}–${s.maxSize} · ${verdict}`).setPosition(width / 2, height - 24).setVisible(true);
    } else this.prompt.setVisible(false);

    this.help.setPosition(width - 14, height - 10).setText(this.touchSeen
      ? 'tap sand next to the crab to dig · tap open space to drop sand'
      : '←→ walk · ↑↓ aim · Space jump · X dig · C place sand · E move in');
    if (this.touchSeen) {
      this.drawStick(height);
      this.drawJumpButton(width, height);
    }
  }

  private touch(): TouchState | undefined {
    return this.registry.get(REG.touch) as TouchState | undefined;
  }

  private drawStick(height: number): void {
    const c = stickCentre(height);
    const k = knobOffset(this.stickPull.x, this.stickPull.y);
    this.g.lineStyle(2, BLUE_HEX, 0.35).strokeCircle(c.x, c.y, STICK.radius);
    this.g.fillStyle(BLUE_HEX, 0.25).fillCircle(c.x + k.x, c.y + k.y, 22);
  }

  private drawJumpButton(width: number, height: number): void {
    const b = jumpButton(width, height);
    this.g.lineStyle(2, BLUE_HEX, 0.45).strokeCircle(b.x, b.y, b.r);
    this.g.fillStyle(BLUE_HEX, 0.12).fillCircle(b.x, b.y, b.r);
    this.g.lineStyle(3, BLUE_HEX, 0.6).lineBetween(b.x - 12, b.y + 6, b.x, b.y - 8).lineBetween(b.x, b.y - 8, b.x + 12, b.y + 6);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (p.wasTouch) this.touchSeen = true;
    const v = toView(p.x, p.y);
    const { width, height } = viewSize(this);
    const jb = jumpButton(width, height);
    if (p.wasTouch && Math.hypot(v.x - jb.x, v.y - jb.y) <= jb.r) {
      const t = this.touch();
      if (t) t.jump = true;
      return;
    }
    if (p.wasTouch && this.stickPointer === null && inStickZone(v.x, v.y, height)) {
      this.stickPointer = p.id;
      this.onMove(p);
      return;
    }
    this.touch()?.taps.push(v);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.stickPointer) return;
    const v = toView(p.x, p.y);
    const c = stickCentre(viewSize(this).height);
    this.stickPull = { x: v.x - c.x, y: v.y - c.y };
    const s = stickVector(this.stickPull.x, this.stickPull.y);
    const t = this.touch();
    if (t) {
      t.stickX = s.x;
      t.stickY = s.y;
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.stickPointer) return;
    this.stickPointer = null;
    this.stickPull = { x: 0, y: 0 };
    const t = this.touch();
    if (t) {
      t.stickX = 0;
      t.stickY = 0;
    }
  }
}
