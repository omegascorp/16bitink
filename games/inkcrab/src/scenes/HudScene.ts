import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER_HEX, RED } from '../art/palette';
import { REG } from '../host';
import { inStickZone, knobOffset, stickCentre, stickVector, STICK } from '../logic/joystick';
import { levelGoal, START_SHELL } from '../level/build';
import { capMark, levelProgress, sizeMarks } from '../logic/progress';
import { SHELLS } from '../logic/shells';
import { TEX } from '../art/textures';
import { FOOT, FRAME, SHELL_MID } from '../art/frame';
import type { GameScene } from './GameScene';
import type { TouchState } from './game/input';
import { screenScene, toView, viewSize } from './hidpi';
import { drawSandGauge, HEAP_MAX_W } from './sandGauge';
import { drawGrowthBar } from './growthBar';
import { HAND_FONT, inkButton, inkText, wobblyRect } from './ui';

const PANEL = { x: 16, y: 14, w: 380, h: 118 } as const;
/** The sand heap sits in the panel's right end, its count under it. */
const HEAP_AT = { x: PANEL.x + PANEL.w - 16 - HEAP_MAX_W / 2, bottom: PANEL.y + PANEL.h - 30 } as const;
const BAR = { x: 30, y: 60, w: 190, h: 16 } as const;
/** Life icons: a little shell each, right to left from the levels button. */
const LIFE = { size: 30, gap: 36, y: 36 } as const;
const INTRO_MS = 3600;

/** The on-screen jump button, bottom right (touch only). */
function jumpButton(width: number, height: number): { x: number; y: number; r: number } {
  return { x: width - 80, y: height - 110, r: 44 };
}

/** Hold to hide in the shell, left of the jump button (touch only). */
function hideButton(width: number, height: number): { x: number; y: number; r: number } {
  return { x: width - 180, y: height - 80, r: 34 };
}

/** The notebook margin: level, growth bar, lives, shell, carried sand, and touch controls. */
export class HudScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private sizeText!: Phaser.GameObjects.Text;
  private lives: Phaser.GameObjects.Image[] = [];
  private levelsButton!: Phaser.GameObjects.Container;
  private intro: Phaser.GameObjects.Container | null = null;
  private sand!: Phaser.GameObjects.Text;
  private note!: Phaser.GameObjects.Text;
  private shell!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private help!: Phaser.GameObjects.Text;
  private stickPointer: number | null = null;
  private hidePointer: number | null = null;
  private stickPull = { x: 0, y: 0 };
  private touchSeen = false;

  constructor() {
    super('Hud');
  }

  create(): void {
    screenScene(this);
    // The scene object is reused across levels: a finger held down as the last one ended never lifted here.
    this.stickPointer = null;
    this.hidePointer = null;
    this.stickPull = { x: 0, y: 0 };
    this.intro = null;
    this.g = this.add.graphics();
    const text = (x: number, y: number, size: number, color = BLUE): Phaser.GameObjects.Text =>
      this.add.text(x, y, '', { fontFamily: HAND_FONT, fontSize: `${size}px`, color, padding: { x: 4, y: 2 } });
    const game = this.scene.get('Game') as GameScene;
    this.title = text(28, 20, 26);
    this.sizeText = text(BAR.x + BAR.w + 8, BAR.y - 4, 17);
    this.lives = [];
    this.levelsButton = inkButton(this, 0, LIFE.y, 'levels', () => game.quit(), { width: 92, height: 40, size: 22 });
    this.showIntro(game);
    this.sand = text(HEAP_AT.x, HEAP_AT.bottom + 2, 16).setOrigin(0.5, 0);
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
    if (!game.level) return;
    const beach = game.beach;
    if (!beach) return;
    const { width, height } = viewSize(this);
    const c = beach.crab;
    const g = this.g;
    g.clear();
    g.fillStyle(PAPER_HEX, 0.88).fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    wobblyRect(g, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 3, 1.6, BLUE_HEX);

    const start = game.startSize;
    const goal = levelGoal(game.level);
    drawGrowthBar(g, BAR, levelProgress(c.growth, start, goal), sizeMarks(start, goal), capMark(beach.cap, start, goal), beach.capped && beach.cap < goal);
    this.title.setText(game.level.name);
    this.sizeText.setText(`size ${c.growth.size} of ${goal}`);
    this.syncLives(beach.lives, c.shell ?? START_SHELL, width);

    drawSandGauge(g, HEAP_AT.x, HEAP_AT.bottom, c.sand, beach.sandCapacity);
    // Full, it digs nothing until it unloads; past full (a smaller shell) is a warning.
    const loaded = c.sand >= beach.sandCapacity;
    const unload = this.touchSeen ? 'tap to drop' : 'C to drop';
    this.sand.setText(loaded ? `${c.sand}/${beach.sandCapacity} · ${unload}` : `${c.sand}/${beach.sandCapacity}`);
    this.sand.setColor(c.sand > beach.sandCapacity ? RED : BLUE);
    // Centred under the heap, but kept inside the panel when the hint makes it long.
    this.sand.setX(Math.min(HEAP_AT.x, PANEL.x + PANEL.w - 8 - this.sand.width / 2));
    const bank = c.growth.bank > 0 ? ` (+${c.growth.bank} banked)` : '';
    this.note.setText(c.swap ? 'moving house… exposed!' : c.hidden ? 'hiding in the shell' : beach.capped ? `shell full, find a bigger one${bank}` : `growing${bank}`);
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
      ? 'tap sand next to the crab to dig · tap open space to drop sand · hold the shell button to hide'
      : '←→ walk · ↑↓ aim · Space jump · X dig · C place sand · E move in · Z hide');
    if (this.touchSeen) {
      this.drawStick(height);
      this.drawJumpButton(width, height);
      this.drawHideButton(width, height, c.hidden);
    }
  }

  /** Lives as little shells by the levels button, top right. */
  private syncLives(n: number, kind: string, width: number): void {
    while (this.lives.length > Math.max(0, n)) this.lives.pop()?.destroy();
    while (this.lives.length < n) this.lives.push(this.add.image(0, 0, TEX.shell(kind, 0)).setOrigin(SHELL_MID / FRAME, FOOT.y / FRAME));
    this.levelsButton.setPosition(width - 62, LIFE.y);
    const scale = LIFE.size / 116;
    this.lives.forEach((img, i) => img.setTexture(TEX.shell(kind, 0)).setScale(scale).setPosition(width - 140 - i * LIFE.gap, LIFE.y + 12));
  }

  /** The level's name, goal and lesson, centred for a few seconds at the start. */
  private showIntro(game: GameScene): void {
    const { width, height } = viewSize(this);
    const w = Math.min(520, width - 32);
    const h = 170;
    const g = this.add.graphics();
    g.fillStyle(PAPER_HEX, 0.96).fillRect(-w / 2, -h / 2, w, h);
    wobblyRect(g, -w / 2, -h / 2, w, h, 21, 2, BLUE_HEX);
    const name = inkText(this, 0, -h / 2 + 34, game.level.name, 34);
    const goal = inkText(this, 0, -8, `grow to size ${levelGoal(game.level)}`, 26);
    const hint = inkText(this, 0, 44, game.level.hint, 20).setWordWrapWidth(w - 40).setAlign('center').setAlpha(0.85);
    this.intro = this.add.container(width / 2, height * 0.42, [g, name, goal, hint]);
    this.tweens.add({ targets: this.intro, alpha: 0, delay: INTRO_MS, duration: 500, onComplete: () => this.intro?.destroy() });
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

  /** A shell drawn on the button; filled while held. */
  private drawHideButton(width: number, height: number, held: boolean): void {
    const b = hideButton(width, height);
    this.g.lineStyle(2, BLUE_HEX, 0.45).strokeCircle(b.x, b.y, b.r);
    this.g.fillStyle(BLUE_HEX, held ? 0.3 : 0.12).fillCircle(b.x, b.y, b.r);
    this.g.lineStyle(3, BLUE_HEX, 0.6);
    this.g.beginPath();
    this.g.arc(b.x, b.y + 6, 14, Math.PI, 0);
    this.g.closePath();
    this.g.strokePath();
  }

  private onDown(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[] = []): void {
    // A press on a HUD button isn't a tap on the beach.
    if (over.length > 0) return;
    if (p.wasTouch) this.touchSeen = true;
    const v = toView(p.x, p.y);
    const { width, height } = viewSize(this);
    const jb = jumpButton(width, height);
    if (p.wasTouch && Math.hypot(v.x - jb.x, v.y - jb.y) <= jb.r) {
      const t = this.touch();
      if (t) t.jump = true;
      return;
    }
    const hb = hideButton(width, height);
    if (p.wasTouch && Math.hypot(v.x - hb.x, v.y - hb.y) <= hb.r) {
      this.hidePointer = p.id;
      const t = this.touch();
      if (t) t.hide = true;
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
    if (p.id === this.hidePointer) {
      this.hidePointer = null;
      const t = this.touch();
      if (t) t.hide = false;
      return;
    }
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
