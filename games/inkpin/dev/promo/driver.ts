import type Phaser from 'phaser';
import type { GameHost } from '@16bitink/game-sdk';
import { mount } from '../../src/index';
import { CHAPTER_1 } from '../../src/level';
import type { Sfx } from '../../src/audio/sfx';
import { ACTIONS, FPS, LEVEL, LOOP_FRAMES, PRE_ROLL_S, SEGMENT_START, STEPS_PER_FRAME, segmentAt, type Action, type Segment } from './plan';
import { STEPS_PER_SECOND } from '../../src/logic/particles';
import { VIEW } from './overlay';
import { VIDEO } from './short';

/** One sound the game made, at cycle time c. */
export interface Cue {
  readonly c: number;
  readonly name: Sfx;
  readonly strength: number;
}

/** The parts of GameScene the driver reaches into (private in the source; the scene is the game's real one). */
interface SceneInternals extends Phaser.Scene {
  world: import('../../src/logic/world').World;
  camera: { update: () => void; fit: () => void };
  hearts: number;
  closeUp: (x: number, y: number) => void;
  tryTap: (id: string) => void;
}

/** Time the game's clock reads at the start of a cycle (ms): a constant, so every pass draws the same animation frames. */
const CLOCK_START_MS = 4000;
const FRAME_MS = 1000 / FPS;
/** A hair over four steps' worth, so the game takes exactly STEPS_PER_FRAME steps each frame. */
const DELTA_MS = (STEPS_PER_FRAME * 1000) / STEPS_PER_SECOND + 1e-6;
/** How far the close-up on a failed Nib zooms in on the base view, and where Nib ends up on screen (video y). */
const CLOSE_UP = 1.5;
const CLOSE_UP_NIB_Y = 800;

const memoryStorage = (): Storage => {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
};

/**
 * Plays the real game scene, frame by frame, with the clock in our hands:
 * the page's own game loop is stopped and each video frame is one
 * game.step(). The level is the game's (GameScene, its Phaser art), the pulls
 * are the scene's own taps, the sounds are what the scene asks its
 * SoundBoard for (recorded here, played offline by audio.ts).
 */
export class Driver {
  readonly cues: Cue[] = [];
  /** The last frame the game drew, as a plain canvas (a WebGL canvas can't be read back later). */
  readonly live: HTMLCanvasElement;
  /** The frame before the last restart, for the ink wipe to carry away. */
  readonly old: HTMLCanvasElement;
  hasOld = false;
  /** Frame of the cycle just drawn; -1 before the first. */
  frame = -1;
  private done = new Set<number>();
  private clock = CLOCK_START_MS;
  private segmentRunning: Segment = 'wrong';

  private constructor(private readonly game: Phaser.Game) {
    this.live = canvasOf();
    this.old = canvasOf();
  }

  static async create(): Promise<Driver> {
    // The game draws at device pixels; a 540×960 page at 2× makes its canvas 1080×1920.
    if (Math.round(window.devicePixelRatio) !== 2) throw new Error(`Need a 2× device pixel ratio, got ${window.devicePixelRatio}`);
    const parent = document.createElement('div');
    parent.style.cssText = 'position:fixed;left:-4000px;top:0;width:540px;height:960px;';
    document.body.append(parent);
    const host: GameHost = {
      unlocked: false,
      price: '$4.99',
      allLevelsOpen: true,
      storage: memoryStorage(),
      loadContent: () => Promise.reject(new Error('No paid content for the promo')),
      onBuy: () => undefined,
      onExit: () => undefined,
    };
    const handle = mount(parent, host, { level: CHAPTER_1.indexOf(LEVEL), paid: [] });
    const game = handle.phaser;
    const driver = new Driver(game);
    // The game's sounds are recorded, not played.
    game.registry.set('sfx', {
      play: (name: Sfx, strength = 1) => driver.cues.push({ c: driver.cycleTime(), name, strength }),
      bed: () => undefined,
      unlock: () => undefined,
      destroy: () => undefined,
      muted: true,
    });
    await driver.boot();
    return driver;
  }

  private get scene(): SceneInternals {
    return this.game.scene.getScene('game') as SceneInternals;
  }

  /** Where the boar stands on the board now, or null once it is gone. */
  boar(): { x: number; y: number } | null {
    const b = this.scene.world?.blots[0];
    return b && !b.gone ? { x: b.x, y: b.y } : null;
  }

  cycleTime(): number {
    return Math.max(0, this.frame) / FPS;
  }

  private tickGame(): void {
    this.game.step(this.clock, DELTA_MS);
    this.clock += FRAME_MS;
  }

  /** Lets the game boot on its own loop's schedule, then takes the clock. */
  private async boot(): Promise<void> {
    for (let i = 0; i < 400 && !this.game.isRunning; i++) await new Promise((r) => setTimeout(r, 25));
    if (!this.game.isRunning) throw new Error('The game did not start');
    this.game.loop.stop();
    for (let i = 0; i < 400 && !this.game.scene.isActive('game'); i++) this.tickGame();
    if (!this.game.scene.isActive('game')) throw new Error('The level did not open');
    // No interface bar over the picture, and none launched on a restart.
    this.game.scene.stop('hud');
    const plugin = this.scene.scene;
    const launch = plugin.launch.bind(plugin);
    plugin.launch = ((key: string, data?: object) => (key === 'hud' ? plugin : launch(key, data))) as typeof plugin.launch;
    this.scene.events.on('create', () => this.onCreate());
    this.tickGame();
  }

  /** Runs right after the scene builds a level (inside the step that restarts it). */
  private onCreate(): void {
    const scene = this.scene;
    // Our camera: the first hall, close, with the base view fixed. The scene's own would follow Nib.
    scene.camera.update = () => undefined;
    scene.camera.fit = () => undefined;
    const cam = scene.cameras.main;
    cam.setSize(VIDEO.width, VIDEO.height);
    cam.setZoom(VIEW.zoom);
    cam.centerOn(VIEW.cx, VIEW.cy);
    // The wrong try ends the level (the game's own fail and close-up), it doesn't rewind a heart.
    scene.hearts = 1;
    // The game's close-up on a failed Nib, framed for a phone's safe area.
    scene.closeUp = (x: number, y: number): void => {
      const zoom = VIEW.zoom * CLOSE_UP;
      cam.zoomTo(zoom, 650, 'Cubic.easeInOut');
      cam.pan(x, y + (VIDEO.height / 2 - CLOSE_UP_NIB_Y) / zoom, 650, 'Cubic.easeInOut');
    };
    const segment = this.segmentRunning;
    for (let s = Math.round(PRE_ROLL_S[segment] * STEPS_PER_SECOND); s > 0; s--) scene.world.step();
  }

  /** Plays one action through the scene, as the player's finger or stick would. */
  private perform(action: Action): void {
    const scene = this.scene;
    switch (action.kind) {
      case 'tap':
        scene.tryTap(action.pin);
        return;
      case 'goto':
        scene.world.command(action.y === undefined ? { kind: 'goto', x: action.x } : { kind: 'goto', x: action.x, y: action.y });
        return;
      case 'jump':
        scene.world.jump();
    }
  }

  /** Draws the next frame of the cycle (wrapping from the last back to the first). */
  private next(): void {
    const k = (this.frame + 1) % LOOP_FRAMES;
    const { segment } = segmentAt(k / FPS);
    const startFrame = Math.round(SEGMENT_START[segment] * FPS);
    this.frame = k;
    this.clock = CLOCK_START_MS + k * FRAME_MS;
    if (k === startFrame) {
      // A new try: the board is rebuilt by the scene's own restart, after keeping the last picture for the wipe.
      if (this.hadFrame) this.keepOld();
      this.segmentRunning = segment;
      this.done.clear();
      this.scene.scene.restart();
    } else {
      const localFrame = k - startFrame;
      for (const [i, a] of ACTIONS[segment].entries()) {
        if (!this.done.has(i) && Math.round(a.at * FPS) <= localFrame) {
          this.done.add(i);
          this.perform(a);
        }
      }
    }
    this.tickGame();
    this.live.getContext('2d')!.drawImage(this.game.canvas, 0, 0, VIDEO.width, VIDEO.height);
    this.hadFrame = true;
  }

  private hadFrame = false;

  private keepOld(): void {
    this.old.getContext('2d')!.drawImage(this.live, 0, 0);
    this.hasOld = true;
  }

  /** Steps the game on to cycle frame `target` (wrapping if it is behind), leaving its picture in `live`. */
  advanceTo(target: number): void {
    const t = ((target % LOOP_FRAMES) + LOOP_FRAMES) % LOOP_FRAMES;
    if (this.frame === t && this.hadFrame) return;
    do this.next(); while (this.frame !== t);
  }
}

function canvasOf(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = VIDEO.width;
  c.height = VIDEO.height;
  return c;
}
