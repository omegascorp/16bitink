import Phaser from 'phaser';
import { BLUE, INK_HEX, RED } from '../../art/palette';
import { TEX } from '../../art/textures';
import type { Board, BoardEvent } from '../../logic/board';
import { CHARM_NAMES } from '../../logic/charms';
import { D } from '../../logic/line';
import { pointAt, type Pt } from '../../logic/path';
import { DPR } from '../hidpi';
import { HAND_FONT } from '../ui';

const SPLASH_RES = 2;
/** The well starts to blush once the line's front is this far along. */
const BLUSH_FROM = 0.7;
/** The well's colour at its most alarmed. */
const BLUSH_HEX = 0xf07a6e;

/** Two 0xRRGGBB colours mixed, `t` of the way from a to b. */
function mixHex(a: number, b: number, t: number): number {
  const ch = (shift: number): number => Math.round(((a >> shift) & 255) + ((((b >> shift) & 255) - ((a >> shift) & 255)) * t));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * Everything drawn over the board that isn't a marble or the gecko: the
 * burrows and wells, ink splashes from pops, floating words, the aim line.
 */
export class FxView {
  private readonly wells: Phaser.GameObjects.Image[];
  private readonly burrows: Phaser.GameObjects.Image[];
  private readonly aim: Phaser.GameObjects.Graphics;
  /** How far the camera turns the board (a phone held upright), so words can stay upright. */
  turn = 0;
  /** Words grow when the board is drawn small (a phone), so they stay readable. */
  textScale = 1;

  constructor(private readonly scene: Phaser.Scene, board: Board) {
    this.burrows = board.lines.map((l) => {
      const p = pointAt(l.path, 0);
      return scene.add.image(p.x, p.y, TEX.burrow(0)).setScale(1 / 3).setDepth(3);
    });
    this.wells = board.lines.map((l) => {
      const p = pointAt(l.path, l.path.length);
      return scene.add.image(p.x, p.y, TEX.well(0)).setScale(1 / 3).setDepth(3);
    });
    this.aim = scene.add.graphics().setDepth(7);
  }

  update(board: Board, time: number, showAim: boolean): void {
    const f = Math.floor(time / 150) % 3;
    board.lines.forEach((line, i) => {
      const danger = line.marbles.length ? line.front() / line.path.length : 0;
      const blush = Phaser.Math.Clamp((danger - BLUSH_FROM) / (1 - BLUSH_FROM), 0, 1);
      const pulse = blush > 0 ? 0.5 + 0.5 * Math.sin(time / (260 - blush * 140)) : 0;
      const well = this.wells[i]!.setTexture(TEX.well(f));
      if (blush > 0) well.setTint(mixHex(0xffffff, BLUSH_HEX, blush * (0.45 + 0.55 * pulse)));
      else well.clearTint();
      this.burrows[i]!.setTexture(TEX.burrow(f));
    });
    this.drawAim(board, showAim);
  }

  /** A dotted line from the gecko's mouth to the first marble in its way. */
  private drawAim(board: Board, show: boolean): void {
    const g = this.aim.clear();
    if (!show) return;
    const from = board.mouth();
    const dir = { x: Math.cos(board.gecko.angle), y: Math.sin(board.gecko.angle) };
    const marbles: Pt[] = board.lines.flatMap((l) => l.marbles.filter((m) => m.s >= 0).map((m) => pointAt(l.path, m.s)));
    g.fillStyle(INK_HEX, 0.55);
    for (let t = 18; t < 1500; t += 14) {
      const p = { x: from.x + dir.x * t, y: from.y + dir.y * t };
      if (p.x < 0 || p.x > 1280 || p.y < 0 || p.y > 720) break;
      if (marbles.some((m) => Math.hypot(m.x - p.x, m.y - p.y) < D * 0.8)) break;
      g.fillCircle(p.x, p.y, 2.2);
    }
  }

  react(e: BoardEvent): void {
    if (e.type === 'pop') {
      for (const m of e.marbles) this.splash(m.x, m.y, m.colour, m.stone === true);
      this.say(e.x, e.y - 8, `+${e.points}`, 15);
      if (e.combo > 0) this.say(e.x, e.y - 30, `combo ×${e.combo + 1}!`, 20 + Math.min(e.combo, 4) * 3);
    } else if (e.type === 'streak') this.say(e.x, e.y + 22, `streak ${e.streak}!`, 16);
    else if (e.type === 'gap') this.say(e.x, e.y + 40, e.gaps > 1 ? `${e.gaps}-gap shot!` : 'gap shot!', 17);
    else if (e.type === 'charm') this.say(e.x, e.y - 50, `${CHARM_NAMES[e.charm]}!`, 22);
    else if (e.type === 'blossom') {
      this.bloom(e.x, e.y);
      this.say(e.x, e.y - 28, e.count > 1 ? 'blossom ×' + e.count : 'blossom!', 17);
    } else if (e.type === 'fruit') {
      this.bloom(e.x, e.y);
      this.say(e.x, e.y - 10, `+${e.points}`, 20);
    }
    else if (e.type === 'caught') this.say(e.x, e.y - 40, `${CHARM_NAMES[e.charm]}!`, 22);
    else if (e.type === 'well') {
      this.say(e.x, e.y - 40, e.lives > 0 ? 'into the well! −1 life' : 'into the well!', 22, RED);
      this.scene.cameras.main.shake(200, 0.004);
    } else if (e.type === 'filled') this.say(640, 120, 'The burrows are shut: pop the rest!', 26);
  }

  /** Petals bursting open where a bud blossomed or a windfall was hit. */
  private bloom(x: number, y: number): void {
    const img = this.scene.add.image(x, y, TEX.bloom).setDepth(6.6).setScale(0.3 / SPLASH_RES).setRotation(Math.random() * Math.PI * 2);
    this.scene.tweens.add({ targets: img, scale: 0.9 / SPLASH_RES, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => img.destroy() });
  }

  private splash(x: number, y: number, colour: Parameters<typeof TEX.splash>[0], stone = false): void {
    const img = this.scene.add.image(x, y, TEX.splash(colour)).setDepth(2).setScale(0.25 / SPLASH_RES).setRotation(Math.random() * Math.PI * 2).setAlpha(0.95);
    // A stone breaks into grey grit, not paint.
    if (stone) img.setTint(0x9a968c);
    this.scene.tweens.add({ targets: img, scale: 0.85 / SPLASH_RES, duration: 180, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: img, alpha: 0, delay: 500, duration: 900, onComplete: () => img.destroy() });
  }

  private say(x: number, y: number, text: string, size: number, color: string = BLUE): void {
    const t = this.scene.add.text(x, y, text, { fontFamily: HAND_FONT, fontSize: `${Math.round(size * this.textScale)}px`, color, stroke: '#fffaf0', strokeThickness: 4 })
      .setOrigin(0.5).setDepth(20).setResolution(DPR * 2);
    // Upright on screen even when the board is turned (a phone held upright), rising up the screen.
    const turn = this.turn;
    t.setRotation(-turn);
    this.scene.tweens.add({ targets: t, x: x - Math.sin(turn) * 30, y: y - Math.cos(turn) * 30, alpha: 0, delay: 350, duration: 900, onComplete: () => t.destroy() });
  }
}
