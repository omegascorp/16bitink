import Phaser from 'phaser';
import { ART_RES } from '../art/palette';
import { bakeBoard, TEX } from '../art/textures';
import { pitchForCombo } from '../audio/recipes';
import { getHost, getSound, trackGame } from '../host';
import { levelById, levelOrder, loadedLevels } from '../level/levels';
import { BOARD, type LevelDef } from '../level/types';
import { commitProgress } from '../logic/accountSave';
import { Board, LIVES, type BoardEvent } from '../logic/board';
import { Coach } from '../logic/coach';
import { blotsFor, loadProgress, recordResult } from '../logic/save';
import { FxView } from './game/fxView';
import { GameInput } from './game/input';
import { GeckoView } from './game/geckoView';
import { MarblesView } from './game/marblesView';
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
/** The heartbeat starts once a line's front is this far to its well. */
const DANGER_FROM = 0.82;

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

  constructor() {
    super('Game');
  }

  create(data: GameData): void {
    this.level = levelById(data?.levelId) ?? loadedLevels()[0]!;
    this.board = new Board(this.level);
    this.coach = new Coach(this.level.teach ?? []);
    this.over = false;
    this.heartbeat = 0;
    this.add.tileSprite(-BOARD.w, -BOARD.h, BOARD.w * 3, BOARD.h * 3, TEX.paper).setOrigin(0).setDepth(0);
    this.add.image(0, 0, bakeBoard(this, this.level)).setOrigin(0).setScale(1 / ART_RES).setDepth(1);
    this.fx = new FxView(this, this.board);
    this.marbles = new MarblesView(this);
    this.gecko = new GeckoView(this, this.board);
    this.input2 = new GameInput(this, {
      toBoard: (p) => {
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        return { x: w.x, y: w.y };
      },
      onGecko: (p) => this.gecko.contains(p.x, p.y),
      overHud: (p) => this.hud()?.covers(p) ?? false,
    });
    this.fit();
    this.scale.on('resize', this.fit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.fit, this));
    this.scene.launch('Hud');
    this.trackStart();
  }

  private hud(): HudScene | undefined {
    return this.scene.get('Hud') as HudScene | undefined;
  }

  /** The whole board in view, as big as the screen allows, centred, with paper round it. */
  private fit(): void {
    const { width, height } = viewSize(this);
    const zoom = Math.min(width / BOARD.w, height / BOARD.h);
    this.cameras.main.setZoom(DPR * zoom).centerOn(BOARD.w / 2, BOARD.h / 2);
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
    this.coach.observe(events, dt);
    for (const e of events) this.react(e, time);
    this.marbles.sync(this.board, dt, time);
    this.gecko.update(this.board, time, dt);
    this.fx.update(this.board, time, this.board.timers.aim > 0);
    this.listenForDanger(dt);
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
    if (e.type === 'spit') {
      this.gecko.spat(time);
      sound?.play('spit');
    } else if (e.type === 'swap') {
      this.gecko.swapped();
      sound?.play('swap');
    } else if (e.type === 'stuck') sound?.play('stuck');
    else if (e.type === 'pop') sound?.play('pop', { pitch: pitchForCombo(e.combo) });
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
    };
    this.time.delayedCall(END_DELAY_MS, () => {
      this.scene.stop('Hud');
      this.scene.start('Result', result);
    });
  }
}
