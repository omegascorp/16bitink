import Phaser from 'phaser';
import { ART_RES } from '../art/palette';
import { bakeBoard, bakeCovers, bakeForLevel, dropBoards, freeBosses, TEX } from '../art/textures';
import { pitchForMeal, type SfxId } from '../audio/recipes';
import { getHost, getSound, trackGame } from '../host';
import { levelById, levelOrder, loadedLevels, placeOf } from '../level/levels';
import { twistTexts } from '../level/twistText';
import { BOARD, type LevelDef } from '../level/types';
import { commitProgress } from '../logic/accountSave';
import { Coach } from '../logic/coach';
import { preySpec } from '../logic/prey';
import { blotsFor, loadProgress, recordResult } from '../logic/save';
import { World, type WorldEvent } from '../logic/world';
import { layGround } from './game/boardBleed';
import { CrittersView } from './game/crittersView';
import { FxView } from './game/fxView';
import { GameInput } from './game/input';
import { NightView } from './game/nightView';
import { SnakeView } from './game/snakeView';
import { RivalSnake } from '../logic/enemies/rival';
import { SFX_IDS } from '../audio/recipes';
import { CHAPTER_VIEWS, type ChapterView } from '../art/chapters/index';
import { DPR, viewSize } from './hidpi';
import type { HudScene } from './HudScene';
import type { ResultData } from './ResultScene';

export interface GameData {
  readonly levelId?: string;
}

/** Longest frame the simulation takes in one step (tab switches, hitches). */
const MAX_DT = 1 / 20;
/** A beat to see the win (or the loss) before the result card, ms. */
const END_DELAY_MS = 1300;
/** Cover fades to this while the head is under it, so the player can see where they are. */
const COVER_SEE_THROUGH = 0.72;
/** A rush's clock ticks over its last this-many seconds. */
const TICK_FROM = 10;

/** One level: the board drawn to fit the screen, the snake, and what happens when it's won or lost. */
export class GameScene extends Phaser.Scene {
  world!: World;
  level!: LevelDef;
  coach!: Coach;
  input2!: GameInput;
  private snakeView!: SnakeView;
  /** Rival snakes, each drawn like the player's. */
  private rivals: { readonly rival: RivalSnake; readonly view: SnakeView }[] = [];
  private critters!: CrittersView;
  private fx!: FxView;
  private night: NightView | null = null;
  private own: ChapterView | null = null;
  private covers: Phaser.GameObjects.Image | null = null;
  private over = false;
  private away = false;
  private lastTick = -1;

  constructor() {
    super('Game');
  }

  create(data: GameData): void {
    this.level = levelById(data?.levelId) ?? loadedLevels()[0]!;
    this.world = new World(this.level);
    this.coach = new Coach(this.level.teach ?? [], twistTexts(this.level).map((t) => t.hint));
    this.over = false;
    this.lastTick = -1;
    const place = placeOf(this.level.id);
    // Only this level's boss is kept painted; its snake and critters are painted if they aren't yet.
    freeBosses(this, this.level.boss?.kind);
    bakeForLevel(this, this.level);
    this.add.tileSprite(-BOARD.w, -BOARD.h, BOARD.w * 3, BOARD.h * 3, TEX.paper).setOrigin(0).setDepth(0);
    // A retry keeps the board it was played on; any other level's painting goes.
    dropBoards(this, this.level);
    layGround(this, bakeBoard(this, this.level, place), 1);
    const covers = bakeCovers(this, this.level, place);
    this.covers = covers ? this.add.image(0, 0, covers).setOrigin(0).setScale(1 / ART_RES).setDepth(5) : null;
    this.critters = new CrittersView(this);
    this.snakeView = new SnakeView(this, this.world.snake);
    this.rivals = this.world.enemies.filter((e): e is RivalSnake => e instanceof RivalSnake).map((rival) => ({ rival, view: new SnakeView(this, rival.snake) }));
    this.fx = new FxView(this, this.world);
    this.night = this.level.dark ? new NightView(this) : null;
    this.own = CHAPTER_VIEWS[place]?.(this, this.world) ?? null;
    this.input2 = new GameInput(this, {
      toBoard: (p) => {
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        return { x: w.x, y: w.y };
      },
      overHud: (p) => this.hud()?.covers(p) ?? false,
    });
    this.fit();
    this.scale.on('resize', this.fit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.fit, this);
      getSound(this)?.setSlither(0);
      this.critters.destroy();
      this.snakeView.destroy();
      for (const r of this.rivals) r.view.destroy();
      this.fx.destroy();
      this.night?.destroy();
      this.own?.destroy();
    });
    this.scene.launch('Hud');
    this.trackStart();
    getSound(this)?.setBed(this.level.dark ? 'night' : 'farm');
  }

  /** A board point on the screen, in device px (as a pointer reads it): through the camera's zoom and turn. */
  toScreen(x: number, y: number): { x: number; y: number } {
    // Its turn (radians, set by setRotation) is on the camera though the typings don't declare it.
    const cam = this.cameras.main as Phaser.Cameras.Scene2D.Camera & { readonly rotation: number };
    const c = Math.cos(cam.rotation);
    const s = Math.sin(cam.rotation);
    const dx = (x - cam.midPoint.x) * cam.zoom;
    const dy = (y - cam.midPoint.y) * cam.zoom;
    return { x: cam.x + cam.width / 2 + c * dx - s * dy, y: cam.y + cam.height / 2 + s * dx + c * dy };
  }

  private hud(): HudScene | undefined {
    return this.scene.get('Hud') as HudScene | undefined;
  }

  /**
   * The whole board in view, as big as the screen allows, centred. On a
   * phone held upright the board (seen from above) turns a quarter so it
   * fills the screen instead of a strip of it.
   */
  private fit(): void {
    const { width, height } = viewSize(this);
    const turned = isUpright(width, height);
    const zoom = Math.max(0.1, turned ? Math.min(width / BOARD.h, (height - UPRIGHT_HUD * 2) / BOARD.w) : Math.min(width / BOARD.w, (height - LANDSCAPE_HUD) / BOARD.h));
    this.cameras.main.setZoom(DPR * zoom).setRotation(turned ? Math.PI / 2 : 0).centerOn(BOARD.w / 2, BOARD.h / 2 - (turned ? 0 : LANDSCAPE_HUD / 2 / zoom));
    this.fx.turn = turned ? Math.PI / 2 : 0;
    // Words on the board are sized in board px: lift them where the board is drawn small.
    this.fx.textScale = Phaser.Math.Clamp(0.85 / zoom, 1, 1.7);
  }

  private levelRef(): { level: string; n: number; name: string } {
    return { level: this.level.id, n: levelOrder().indexOf(this.level.id) + 1, name: this.level.name };
  }

  private seconds(): number {
    return Math.round(this.world.elapsed * 10) / 10;
  }

  private progressNote(): string {
    const w = this.world;
    return `length ${Math.round(w.snake.length)}/${this.level.target}, goal ${Math.round(w.progress * 100)}%, lives ${w.lives}`;
  }

  /** Reports the level's start, and a quit if the player leaves before it ends or the page hides. */
  private trackStart(): void {
    this.away = false;
    trackGame(this, { type: 'level_start', ...this.levelRef() });
    const quit = (): void => {
      if (this.over) return;
      this.over = true;
      trackGame(this, { type: 'level_end', ...this.levelRef(), result: 'quit', seconds: this.seconds(), score: this.world.score, progress: this.progressNote() });
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('visibilitychange', visibility, { capture: true });
      quit();
    });
  }

  pausePlay(): void {
    getSound(this)?.setSlither(0);
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
    const w = this.world;
    this.input2.arrived(w.snake.head);
    const events = w.step(this.input2.read(), dt);
    this.coach.observe(events, dt);
    for (const e of events) this.react(e);
    this.critters.update(w, time);
    this.snakeView.update(time, dt);
    for (const r of this.rivals) {
      r.view.setVisible(!r.rival.away);
      if (!r.rival.away) r.view.update(time, dt);
    }
    this.fx.update(time);
    this.night?.update(w, time, dt);
    this.own?.update(w, time, dt);
    if (this.covers) {
      const want = w.snake.hidden ? COVER_SEE_THROUGH : 1;
      this.covers.setAlpha(this.covers.alpha + (want - this.covers.alpha) * Math.min(1, dt * 8));
    }
    this.tickClock();
    getSound(this)?.setSlither(w.state === 'play' ? Math.min(1, w.snake.moved / (dt * w.snake.spec.speed * 1.4)) : 0);
  }

  /** A rush's last seconds tick away. */
  private tickClock(): void {
    const left = this.world.timeLeft;
    if (left === null || left > TICK_FROM || this.world.state !== 'play') return;
    const s = Math.ceil(left);
    if (s !== this.lastTick) {
      this.lastTick = s;
      getSound(this)?.play('tick');
    }
  }

  private react(e: WorldEvent): void {
    const sound = getSound(this);
    this.fx.react(e);
    this.night?.react(e);
    const at = 'x' in e && 'y' in e ? { at: { x: e.x, y: e.y }, view: this.cameras.main.worldView } : {};
    if (e.type === 'eat') {
      this.snakeView.gulped();
      sound?.play('gulp', { pitch: pitchForMeal(e.size) });
    } else if (e.type === 'hurt') sound?.play(e.cause === 'knot' ? 'knot' : 'hurt', at);
    else if (e.type === 'say') {
      if (e.sound && (SFX_IDS as readonly string[]).includes(e.sound)) sound?.play(e.sound as SfxId, at);
    }
    else if (e.type === 'won') this.finish(true);
    else if (e.type === 'lost') this.finish(false);
    else {
      const id = EVENT_SOUNDS[e.type];
      if (id) sound?.play(id, at);
    }
  }

  /** Saves a win, then shows the result card after a beat. */
  private finish(won: boolean): void {
    const w = this.world;
    const livesLost = w.maxLives - w.lives;
    const blots = won ? blotsFor(w.elapsed, this.level.par, livesLost) : 0;
    const host = getHost(this);
    if (!this.over) {
      this.over = true;
      trackGame(this, {
        type: 'level_end', ...this.levelRef(), result: won ? 'win' : 'lose', seconds: this.seconds(), score: w.score, progress: this.progressNote(),
        ...(won ? {} : { cause: w.lostBy }),
      });
    }
    const saved = loadProgress(host.storage);
    if (won) commitProgress(host, recordResult(saved, this.level.id, blots, w.elapsed));
    getSound(this)?.play(won ? 'win' : 'lose');
    const result: ResultData = {
      levelId: this.level.id, won, time: w.elapsed, blots, livesLost, score: w.score,
      length: Math.round(w.snake.length), bestCoil: w.bestCoil, eaten: Object.values(w.eaten).reduce<number>((a, b) => a + (b ?? 0), 0),
      previousBest: saved.levels[this.level.id]?.bestTime, progress: w.progress, lostBy: w.lostBy,
    };
    // The card lies over the board, held still behind it.
    this.time.delayedCall(END_DELAY_MS, () => {
      this.scene.stop('Hud');
      this.scene.pause();
      this.scene.launch('Result', result);
    });
  }
}

/** The sound of each event that has one (eating, winning and losing are handled on their own). */
const EVENT_SOUNDS: Partial<Record<WorldEvent['type'], SfxId>> = {
  strike: 'strike', squeeze: 'squeeze', bump: 'bump', nip: 'nip', grown: 'grown',
  caw: 'caw', cry: 'cry', dive: 'dive', miss: 'miss', cluck: 'cluck', scared: 'flap', arrive: 'appear',
  growl: 'growl', pounce: 'pounce', bossHit: 'yowl', bossBeaten: 'beaten',
};

/** Room kept for the HUD above and below an upright board, and above a landscape one, screen px. */
const UPRIGHT_HUD = 56;
const LANDSCAPE_HUD = 0;

/** A phone held upright: the board turns a quarter to fill it. */
export function isUpright(width: number, height: number): boolean {
  return height > width * 1.15;
}
