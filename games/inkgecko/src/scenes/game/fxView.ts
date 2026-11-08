import Phaser from 'phaser';
import { BLUE, INK_HEX, RED, RED_HEX } from '../../art/palette';
import { RAIN_RES, RAIN_SLANT } from '../../art/propsFarm';
import { TEX } from '../../art/textures';
import { MAX_BOUNCES, MAX_GLANCES, WALL_INSET, type Board, type BoardEvent } from '../../logic/board';
import { BOSS_NAMES } from '../../logic/boss';
import { MARBLE_RES } from '../../art/marbleArt';
import { PAD_WARN } from '../../logic/twists';
import { CHARM_NAMES, RAIN_HALF } from '../../logic/charms';
import { colourHex, type ColourId } from '../../logic/colours';
import { BOARD } from '../../level/types';
import { D } from '../../logic/line';
import { angleAt, pointAt, type Pt } from '../../logic/path';
import { DPR } from '../hidpi';
import { HAND_FONT } from '../ui';

const SPLASH_RES = 2;
const MARBLE_TEX_RES = 4;
/** How far a night lantern stands from its well's centre, board px. */
const LANTERN_OFF = 62;
/** Raindrops in one shower. */
const RAIN_DROPS = 34;
/** How long a marble takes to spin down the well's hole, ms. */
const SINK_MS = 380;
/** The well starts to blush once the line's front is this far along. */
const BLUSH_FROM = 0.7;
/** What's said when a shot doesn't hurt the boss. */
const BLOCKED = { blocked: 'no effect!', swallowed: 'gulp!', swatted: 'swat!' } as const;

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
  /** Night levels: a lit garden lantern standing by each well. */
  private readonly lanterns: Phaser.GameObjects.Image[];
  /** Late burrows: a stone lid over each until it opens. */
  private readonly lids: (Phaser.GameObjects.Image | null)[];
  /** Restless pads' timer ring, and the wind's streaks. */
  private readonly marks: Phaser.GameObjects.Graphics;
  private streaks: { x: number; y: number; len: number; age: number; life: number }[] = [];
  private lastTime = 0;
  /** How far the camera turns the board (a phone held upright), so words can stay upright. */
  turn = 0;
  /** Words grow when the board is drawn small (a phone), so they stay readable. */
  textScale = 1;

  constructor(private readonly scene: Phaser.Scene, private readonly board: Board) {
    this.burrows = board.lines.map((l) => {
      const p = pointAt(l.path, 0);
      return scene.add.image(p.x, p.y, TEX.burrow(0)).setScale(1 / 3).setDepth(3);
    });
    this.wells = board.lines.map((l) => {
      const p = pointAt(l.path, l.path.length);
      return scene.add.image(p.x, p.y, TEX.well(0)).setScale(1 / 3).setDepth(3);
    });
    this.aim = scene.add.graphics().setDepth(7);
    this.marks = scene.add.graphics().setDepth(6.95);
    this.lids = board.lines.map((l, i) => {
      if (!board.isShut(i)) return null;
      const p = pointAt(l.path, 0);
      return scene.add.image(p.x, p.y, TEX.stone(0)).setScale(1.9 / MARBLE_RES).setDepth(3.2).setRotation(i);
    });
    // Beside the well, off to the side the track doesn't come in from.
    this.lanterns = board.level.dark ? board.lines.map((l) => {
      const p = pointAt(l.path, l.path.length);
      const a = angleAt(l.path, l.path.length) + Math.PI / 2;
      return scene.add.image(p.x + Math.cos(a) * LANTERN_OFF, p.y + Math.sin(a) * LANTERN_OFF, TEX.gardenLantern(0)).setScale(1 / 3).setDepth(3.4);
    }) : [];
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
      this.lanterns[i]?.setTexture(TEX.gardenLantern(f));
    });
    this.drawAim(board, showAim);
    this.drawMarks(board, time);
  }

  /** A restless pad's ring running out round the gecko, and streaks blowing with the wind. */
  private drawMarks(board: Board, time: number): void {
    const g = this.marks.clear();
    const dt = this.lastTime ? Math.min(0.1, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;
    board.lines.forEach((_, i) => {
      if (!board.isShut(i)) this.lids[i]?.setVisible(false);
    });
    const limit = board.level.restless;
    if (limit && !board.hopping && board.state === 'play') {
      const left = Math.max(0, 1 - board.twists.padClock / limit);
      const warn = board.twists.padClock >= limit - PAD_WARN;
      const pulse = warn ? 0.5 + 0.5 * Math.sin(time / 70) : 1;
      g.lineStyle(5, warn ? RED_HEX : INK_HEX, (warn ? 0.75 : 0.4) * pulse);
      g.beginPath();
      g.arc(board.gecko.x, board.gecko.y, 64, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
      g.strokePath();
    }
    const push = board.twists.push;
    if (!board.level.wind) return;
    // New streaks blow in while a gust is up (about 20 a second); each fades as it crosses.
    if (Math.abs(push) > 40 && Math.random() < dt * 21) {
      this.streaks.push({ x: push > 0 ? -60 : BOARD.w + 60, y: 40 + Math.random() * (BOARD.h - 80), len: 30 + Math.random() * 50, age: 0, life: 1.2 + Math.random() });
    }
    this.streaks = this.streaks.filter((s) => (s.age += dt) < s.life);
    for (const s of this.streaks) {
      s.x += Math.sign(push || 1) * 900 * dt * Math.max(0.3, board.twists.gust);
      const a = Math.sin((s.age / s.life) * Math.PI) * 0.35;
      g.lineStyle(1.6, INK_HEX, a);
      g.lineBetween(s.x, s.y, s.x - Math.sign(push || 1) * s.len, s.y + Math.sin(s.x / 50) * 3);
    }
  }

  /**
   * A dotted line from the gecko's mouth to the first marble in its way,
   * off the barn's walls where it has them. The Aim charm shows it bold;
   * a barn level shows it faintly all the time, so a bank shot can be lined up.
   */
  private drawAim(board: Board, show: boolean): void {
    const g = this.aim.clear();
    const walls = board.level.walls === true;
    const pillars = board.level.pillars ?? [];
    if (!show && !((walls || pillars.length > 0) && board.state === 'play')) return;
    const p = { ...board.mouth() };
    const dir = { x: Math.cos(board.gecko.angle), y: Math.sin(board.gecko.angle) };
    const marbles: Pt[] = board.lines.flatMap((l) => l.marbles.filter((m) => m.s >= 0).map((m) => pointAt(l.path, m.s)));
    const near = (D * 0.8) ** 2;
    const lo = WALL_INSET;
    let bounces = 0;
    let glances = 0;
    g.fillStyle(INK_HEX, show ? 0.55 : 0.22);
    for (let t = 18; t < (show ? 2400 : 1500); t += 14) {
      p.x += dir.x * 14;
      p.y += dir.y * 14;
      if (walls && bounces < MAX_BOUNCES) {
        if ((p.x < lo && dir.x < 0) || (p.x > BOARD.w - lo && dir.x > 0)) {
          dir.x = -dir.x;
          bounces++;
        }
        if (p.y < lo && dir.y < 0) {
          dir.y = -dir.y;
          bounces++;
        }
      }
      for (const c of glances < MAX_GLANCES ? pillars : []) {
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const d = Math.hypot(dx, dy);
        const along = (dir.x * dx + dir.y * dy) / (d || 1);
        if (d >= c.r + D / 2 || along >= 0) continue;
        dir.x -= (2 * along * dx) / d;
        dir.y -= (2 * along * dy) / d;
        glances++;
      }
      if (p.x < 0 || p.x > BOARD.w || p.y < 0 || p.y > BOARD.h) break;
      if (marbles.some((m) => (m.x - p.x) ** 2 + (m.y - p.y) ** 2 < near)) break;
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
    else if (e.type === 'rain') this.shower(e.x);
    else if (e.type === 'bounce') this.knock(e.x, e.y);
    else if (e.type === 'sink') this.sink(e.x, e.y, e.colour);
    else if (e.type === 'well') {
      this.sink(e.x, e.y, e.colour);
      this.say(e.x, e.y - 40, e.lives > 0 ? 'into the well! −1 life' : 'into the well!', 22, RED);
      this.scene.cameras.main.shake(200, 0.004);
    } else if (e.type === 'filled') this.say(640, 120, 'The burrows are shut: pop the rest!', 26);
    else this.reactTwist(e);
  }

  /** Words and marks for a level's twist, goal and boss. */
  private reactTwist(e: BoardEvent): void {
    if (e.type === 'gust') this.say(640, 90, 'a gust!', 24);
    else if (e.type === 'surgeSoon') this.scene.cameras.main.shake(260, 0.0025);
    else if (e.type === 'surge') this.say(640, 160, 'surge!', 26, RED);
    else if (e.type === 'tide') this.say(640, 160, 'the lines draw back…', 22);
    else if (e.type === 'burrowOpen') this.openLid(e.line, e.x, e.y);
    else if (e.type === 'newColour') this.say(640, 160, 'a new colour joins!', 24);
    else if (e.type === 'leafHit') this.knock(e.x, e.y);
    else if (e.type === 'padWarn') this.say(this.board.gecko.x, this.board.gecko.y - 80, 'hop!', 24, RED);
    else if (e.type === 'tipped') this.say(this.board.gecko.x, this.board.gecko.y - 80, 'tipped off!', 22);
    else if (e.type === 'gold') this.say(e.x, e.y - 40, e.left > 0 ? `gold! ${e.left} to go` : 'all the gold!', 22, '#9a6b14');
    else if (e.type === 'bossHit') {
      this.splash(e.x, e.y, 'red');
      this.say(e.x, e.y - 60, e.hp > 0 ? `ouch! ${e.hp} to go` : 'beaten!', 24, RED);
    } else if (e.type === 'bossBlock') {
      this.knock(e.x, e.y);
      this.say(e.x, e.y - 30, BLOCKED[e.how], 18);
    } else if (e.type === 'bossShove') this.say(e.x, e.y - 60, 'shove!', 20, RED);
    else if (e.type === 'bossDrop') this.say(e.x, e.y - 50, 'a bud dropped in!', 18);
    else if (e.type === 'bossStones') this.say(e.x, e.y - 40, 'stone!', 18);
    else if (e.type === 'bossHoot') this.say(e.x, e.y - 50, 'hoo-hoo…', 22);
    else if (e.type === 'bossBeaten') this.say(640, 200, 'Beaten! It runs off', 30, RED);
    else if (e.type === 'lost' && e.cause === 'time') this.say(640, 200, 'Time\'s up!', 30, RED);
  }

  /** A late burrow opening: its lid pops off and rolls aside. */
  private openLid(i: number, x: number, y: number): void {
    const lid = this.lids[i];
    this.say(x, y - 50, 'a new burrow opens!', 22);
    if (!lid) return;
    this.lids[i] = null;
    this.scene.tweens.add({ targets: lid, x: x + 50, y: y - 20, angle: 200, alpha: 0, duration: 600, ease: 'Quad.Out', onComplete: () => lid.destroy() });
  }

  /** The boss's name, as it appears. */
  announce(kind: keyof typeof BOSS_NAMES): void {
    this.say(640, 200, `${BOSS_NAMES[kind]}!`, 34, RED);
  }

  /** A shower down one column of the board: slanting drops, splashes, a wet sheen that dries. */
  private shower(x: number): void {
    const wet = this.scene.add.rectangle(x, BOARD.h / 2, RAIN_HALF * 2.2, BOARD.h, 0x6f9fd8, 0.16).setDepth(6.7);
    this.scene.tweens.add({ targets: wet, alpha: 0, delay: 350, duration: 900, onComplete: () => wet.destroy() });
    for (let i = 0; i < RAIN_DROPS; i++) {
      const dx = (Math.random() - 0.5) * RAIN_HALF * 2.4;
      const fall = 600 + Math.random() * 300;
      const y0 = -40 - Math.random() * 500;
      const drop = this.scene.add.image(x + dx, y0, TEX.rainStreak).setScale(1 / RAIN_RES).setDepth(6.8).setAlpha(0.85);
      const y1 = Math.min(BOARD.h + 30, y0 + fall + 400);
      this.scene.tweens.add({
        targets: drop, x: x + dx - Math.sin(RAIN_SLANT) * (y1 - y0), y: y1, duration: (y1 - y0) / 1.6, ease: 'Linear',
        onComplete: () => {
          drop.destroy();
          if (Math.random() < 0.5) this.dropSplash(drop.x, Math.min(drop.y, BOARD.h - 20));
        },
      });
    }
  }

  private dropSplash(x: number, y: number): void {
    const s = this.scene.add.image(x, y, TEX.rainSplash).setScale(0.3 / RAIN_RES).setDepth(6.75).setAlpha(0.8);
    this.scene.tweens.add({ targets: s, scale: 0.8 / RAIN_RES, alpha: 0, duration: 380, onComplete: () => s.destroy() });
  }

  /** A shot knocking off a timber wall: a little puff of ink. */
  private knock(x: number, y: number): void {
    const g = this.scene.add.graphics().setDepth(6.9).setPosition(x, y);
    g.lineStyle(2, INK_HEX, 0.7).strokeCircle(0, 0, 6);
    this.scene.tweens.add({ targets: g, scale: 2.6, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  /** A marble rolling over the well's lip and spinning away down the hole. */
  private sink(x: number, y: number, colour: ColourId): void {
    const m = this.scene.add.image(x, y, TEX.marble(colour, 0)).setScale(0.75 / MARBLE_TEX_RES).setDepth(3.5);
    this.scene.tweens.add({
      targets: m, scale: 0.05 / MARBLE_TEX_RES, rotation: Math.PI * 3, duration: SINK_MS, ease: 'Quad.easeIn',
      onUpdate: () => m.setTint(mixHex(0xffffff, colourHex(colour) & 0x333333, 1 - m.scale * MARBLE_TEX_RES)),
      onComplete: () => m.destroy(),
    });
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
