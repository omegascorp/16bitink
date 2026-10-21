import Phaser from 'phaser';
import { ART_RES } from '../art/palette';
import { bakeBoard, bakeCovers, dropBoards, TEX } from '../art/textures';
import { pitchForCombo } from '../audio/recipes';
import { getHost, getSound, trackGame } from '../host';
import { levelById, levelOrder, loadedLevels, placeOf } from '../level/levels';
import { BOARD, type LevelDef } from '../level/types';
import { commitProgress } from '../logic/accountSave';
import { Board, LIVES, type BoardEvent } from '../logic/board';
import { Coach } from '../logic/coach';
import { blotsFor, loadProgress, recordResult } from '../logic/save';
import { FxView } from './game/fxView';
import { GameInput } from './game/input';
import { GeckoView } from './game/geckoView';
import { MarblesView } from './game/marblesView';
import { NightView } from './game/nightView';
import { DPR, viewSize } from './hidpi';
import type { HudScene } from './HudScene';
import type { ResultData } from './ResultScene';

export interface GameData {
  readonly levelId?: string;
}

/** Longest frame the simulation takes in one step (tab switches, hitches). */
const MAX_DT = 1 / 20;
/** A beat to see the win (or the last marble fall) before the result card. */
const END_DELAY_MS = 1200;
/** A lost level waits for its lines to pour away down the wells, but no longer than this, ms. */
const DRAIN_MAX_MS = 3500;
/** The heartbeat starts once a line's front is this far to its well. */
const DANGER_FROM = 0.82;
/** A tap this close to a lily pad's centre hops there, board px. */
const PAD_TAP = 64;

/** One level: the board drawn to fit the screen, the gecko, and what happens when it's won or lost. */
export class GameScene extends Phaser.Scene {
  board!: Board;
  level!: LevelDef;
  coach!: Coach;
  input2!: GameInput;
  private marbles!: MarblesView;
  private gecko!: GeckoView;
  private fx!: FxView;
  private over = false;
  private away = false;
  private heartbeat = 0;
  private night: NightView | null = null;
  /** On a loss, whether the lines have all poured away yet. */
  private drainedAll = false;

  constructor() {
    super('Game');
  }

  create(data: GameData): void {
    this.level = levelById(data?.levelId) ?? loadedLevels()[0]!;
    this.board = new Board(this.level);
    this.coach = new Coach(this.level.teach ?? []);
    this.over = false;
    this.heartbeat = 0;
    this.drainedAll = false;
    this.add.tileSprite(-BOARD.w, -BOARD.h, BOARD.w * 3, BOARD.h * 3, TEX.paper).setOrigin(0).setDepth(0);
    // A retry keeps the board it was played on; any other level's painting goes.
    dropBoards(this, this.level);
    this.add.image(0, 0, bakeBoard(this, this.level, placeOf(this.level.id))).setOrigin(0).setScale(1 / ART_RES).setDepth(1);
    // Tunnels lie over the marbles (and shots fly over them, under the gecko).
    const covers = bakeCovers(this, this.level, placeOf(this.level.id));
    if (covers) this.add.image(0, 0, covers).setOrigin(0).setScale(1 / ART_RES).setDepth(5.5);
    this.fx = new FxView(this, this.board);
    this.marbles = new MarblesView(this);
    this.gecko = new GeckoView(this, this.board);
    this.night = this.level.dark ? new NightView(this) : null;
    this.input2 = new GameInput(this, {
      toBoard: (p) => {
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        return { x: w.x, y: w.y };
      },
      onGecko: (p) => this.gecko.contains(p.x, p.y),
      overHud: (p) => this.hud()?.covers(p) ?? false,
      padAt: (p) => this.padAt(p),
      padStep: (step) => {
        const s = this.level.shooter;
        return s.kind === 'hop' ? (this.board.pad + step + s.pads.length) % s.pads.length : null;
      },
    });
    this.fit();
    this.scale.on('resize', this.fit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.fit, this));
    this.scene.launch('Hud');
    this.trackStart();
    const sound = getSound(this);
    sound?.setBed(placeOf(this.level.id));
    sound?.play('rush');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      sound?.setRoll(0);
    });
  }

  /** The lily pad (other than the gecko's own) at board point p, on hop levels. */
  private padAt(p: { x: number; y: number }): number | null {
    const s = this.level.shooter;
    if (s.kind !== 'hop') return null;
    const i = s.pads.findIndex((q, k) => k !== this.board.pad && Math.hypot(q.x - p.x, q.y - p.y) < PAD_TAP);
    return i < 0 ? null : i;
  }

  private hud(): HudScene | undefined {
    return this.scene.get('Hud') as HudScene | undefined;
  }

  /**
   * The whole board in view, as big as the screen allows, centred, with paper
   * round it. On a phone held upright the board (seen from above) turns a
   * quarter so it fills the screen instead of a strip of it.
   */
  private fit(): void {
    const { width, height } = viewSize(this);
    const turned = isUpright(width, height);
    const zoom = Math.max(0.1, turned ? Math.min(width / BOARD.h, (height - UPRIGHT_HUD * 2) / BOARD.w) : Math.min(width / BOARD.w, height / BOARD.h));
    this.cameras.main.setZoom(DPR * zoom).setRotation(turned ? Math.PI / 2 : 0).centerOn(BOARD.w / 2, BOARD.h / 2);
    this.fx.turn = turned ? Math.PI / 2 : 0;
    // Words on the board are sized in board px: lift them where the board is drawn small.
    this.fx.textScale = Phaser.Math.Clamp(0.85 / zoom, 1, 1.7);
  }

  private levelRef(): { level: string; n: number; name: string } {
    return { level: this.level.id, n: levelOrder().indexOf(this.level.id) + 1, name: this.level.name };
  }

  private seconds(): number {
    return Math.round(this.board.elapsed * 10) / 10;
  }

  private progressNote(): string {
    return `bar ${Math.round(this.board.progress * 100)}%, lives ${this.board.lives}`;
  }

  /** Reports the level's start, and a quit if the player leaves before it ends or the page hides (as InkCrab). */
  private trackStart(): void {
    this.away = false;
    trackGame(this, { type: 'level_start', ...this.levelRef() });
    const quit = (): void => {
      if (this.over) return;
      this.over = true;
      trackGame(this, { type: 'level_end', ...this.levelRef(), result: 'quit', seconds: this.seconds(), score: this.board.score, progress: this.progressNote() });
    };
    const visibility = (): void => {
      if (document.visibilityState === 'hidden') {
        if (this.over) return;
        this.away = true;
        quit();
      } else if (this.away) {
        this.away = false;
        this.over = false;
      }
    };
    window.addEventListener('visibilitychange', visibility, { capture: true });
    const ended = (): void => {
      window.removeEventListener('visibilitychange', visibility, { capture: true });
      quit();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, ended);
  }

  pausePlay(): void {
    getSound(this)?.setRoll(0);
    this.scene.pause();
  }

  resumePlay(): void {
    this.input2.reset();
    this.scene.resume();
  }

  /** Back to the map (from the HUD). */
  quit(): void {
    this.scene.stop('Hud');
    this.scene.start('Menu');
  }

  restart(): void {
    this.scene.stop('Hud');
    this.scene.restart({ levelId: this.level.id });
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, MAX_DT);
    const events = this.board.step(this.input2.read(), dt);
    if (this.board.state === 'lost') this.drainedAll = this.board.drain(dt, events);
    this.coach.observe(events, dt);
    for (const e of events) this.react(e, time);
    this.marbles.sync(this.board, dt, time);
    this.gecko.update(this.board, time, dt);
    this.fx.update(this.board, time, this.board.timers.aim > 0);
    this.night?.update(this.board, time, dt);
    this.listenForDanger(dt);
    getSound(this)?.setRoll(this.rolling());
  }

  /** How hard the lines are rolling, for the rumble: loud while they rush out, quiet as they creep, still when stopped. */
  private rolling(): number {
    const b = this.board;
    if (b.state !== 'play' || b.lines.every((l) => !l.marbles.length)) return 0;
    if (b.lines.some((l) => l.rushing && l.marbles.length)) return 1;
    if (b.timers.reverse > 0 || b.lines.some((l) => l.rewind > 0)) return 0.55;
    if (b.lines.every((l) => !l.spawning)) return 0.08;
    return Phaser.Math.Clamp(0.14 + (b.level.speed / 40) * 0.18 * (b.timers.slow > 0 ? 0.5 : 1), 0, 0.5);
  }

  private listenForDanger(dt: number): void {
    const d = this.board.danger;
    if (d < DANGER_FROM || this.board.state !== 'play') return;
    this.heartbeat -= dt;
    if (this.heartbeat > 0) return;
    // Faster the closer it gets.
    this.heartbeat = 1.1 - (d - DANGER_FROM) / (1 - DANGER_FROM) * 0.6;
    getSound(this)?.play('danger');
  }

  private react(e: BoardEvent, time: number): void {
    const sound = getSound(this);
    this.fx.react(e);
    this.night?.react(e);
    if (e.type === 'spit') {
      this.gecko.spat(time);
      sound?.play(e.dragonfly ? 'dragonfly' : e.geode ? 'crystal' : 'spit');
    } else if (e.type === 'hop') {
      this.gecko.hopped();
      sound?.play('hop');
    } else if (e.type === 'landed') sound?.play('plop'); else if (e.type === 'swap') {
      this.gecko.swapped();
      sound?.play('swap');
    } else if (e.type === 'stuck') sound?.play('stuck');
    else if (e.type === 'pop') {
      sound?.play('pop', { pitch: pitchForCombo(e.combo) });
      if (e.marbles.some((m) => m.stone)) sound?.play('crack');
    } else if (e.type === 'blossom') sound?.play('blossom');
    else if (e.type === 'windfall') sound?.play('thud');
    else if (e.type === 'hedgehog') sound?.play('snuffle');
    else if (e.type === 'munch') sound?.play('munch');
    else if (e.type === 'shift') sound?.play('shift');
    else if (e.type === 'rain') sound?.play('rain');
    else if (e.type === 'bounce') sound?.play('bounce');
    else if (e.type === 'sink') sound?.play('sink', { pitch: 0.9 + Math.random() * 0.25 });
    else if (e.type === 'fruit') sound?.play('fruit');
    else if (e.type === 'pull') sound?.play('pull');
    else if (e.type === 'join') sound?.play('join');
    else if (e.type === 'gap') sound?.play('gap');
    else if (e.type === 'streak') sound?.play('streak');
    else if (e.type === 'charm' || e.type === 'caught') sound?.play(e.type === 'charm' ? 'charm' : 'catch');
    else if (e.type === 'drop') sound?.play('drop');
    else if (e.type === 'well') sound?.play('well');
    else if (e.type === 'filled') sound?.play('filled');
    else if (e.type === 'won') this.finish(true);
    else if (e.type === 'lost') this.finish(false);
  }

  /** Saves a win, then shows the result card after a beat. */
  private finish(won: boolean): void {
    const b = this.board;
    const livesLost = LIVES - b.lives;
    const blots = won ? blotsFor(b.elapsed, this.level.par, livesLost) : 0;
    const host = getHost(this);
    if (!this.over) {
      this.over = true;
      trackGame(this, {
        type: 'level_end', ...this.levelRef(), result: won ? 'win' : 'lose', seconds: this.seconds(), score: b.score, progress: this.progressNote(),
        ...(won ? {} : { cause: 'well' }),
      });
    }
    const saved = loadProgress(host.storage);
    if (won) commitProgress(host, recordResult(saved, this.level.id, blots, b.elapsed));
    getSound(this)?.play(won ? 'win' : 'lose');
    const result: ResultData = {
      levelId: this.level.id, won, time: b.elapsed, blots, livesLost, score: b.score,
      bestCombo: b.best.combo, bestStreak: b.best.streak, previousBest: saved.levels[this.level.id]?.bestTime,
      progress: b.progress,
    };
    // The card lies over the board, held still behind it.
    const show = (): void => {
      this.scene.stop('Hud');
      this.scene.pause();
      this.scene.launch('Result', result);
    };
    if (won) {
      this.time.delayedCall(END_DELAY_MS, show);
      return;
    }
    // A loss: the line pours into the well first, then a beat, then the card.
    const started = this.time.now;
    const wait = (): void => {
      if (this.drainedAll || this.time.now - started > DRAIN_MAX_MS) this.time.delayedCall(END_DELAY_MS * 0.6, show);
      else this.time.delayedCall(100, wait);
    };
    wait();
  }
}

/** Room kept for the HUD above and below an upright board, screen px. */
const UPRIGHT_HUD = 56;

/** A phone held upright: the board turns a quarter to fill it. */
export function isUpright(width: number, height: number): boolean {
  return height > width * 1.15;
}
