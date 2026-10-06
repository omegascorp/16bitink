import Phaser from 'phaser';
import { BLUE, RED } from '../art/palette';
import { TEX } from '../art/textures';
import { getHost, REG } from '../host';
import { buildLevel, START_SIZE } from '../level/build';
import { LEVELS, levelById } from '../level/levels';
import type { LevelDef } from '../level/types';
import type { TilePos } from '../logic/dig';
import { overlaps } from '../logic/items';
import { shellPx, SHELLS } from '../logic/shells';
import { blotsFor, loadProgress, recordResult, saveProgress } from '../logic/save';
import { Beach, LIVES, type SimEvent } from '../logic/sim';
import { CrabView } from './game/crabView';
import { CrittersView } from './game/crittersView';
import { createTouchState, GameInput, type TouchState } from './game/input';
import { ItemsView } from './game/itemsView';
import { TerrainView } from './game/terrainView';
import { DPR, screenZoom, viewSize } from './hidpi';
import type { ResultData } from './ResultScene';
import { HAND_FONT } from './ui';

/** Longest frame the simulation takes in one step (tab switches, hitches). */
const MAX_DT = 1 / 20;
/** A beat to see the win (or the last catch) before the result card. */
const END_DELAY_MS = 1100;

export interface GameData {
  readonly levelId: string;
}

/** One level: the beach, the crab, and what happens when it's won or lost. */
export class GameScene extends Phaser.Scene {
  beach!: Beach;
  level!: LevelDef;
  /** Starting size, for the HUD's growth bar. */
  readonly startSize = START_SIZE;
  private terrainView!: TerrainView;
  private itemsView!: ItemsView;
  private crittersView!: CrittersView;
  private crabView!: CrabView;
  private input2!: GameInput;
  private touch!: TouchState;

  constructor() {
    super('Game');
  }

  create(data: GameData): void {
    this.level = levelById(data?.levelId) ?? LEVELS[0]!;
    const setup = buildLevel(this.level);
    this.beach = new Beach(setup);
    const T = setup.tileSize;
    const worldW = setup.terrain.width * T;
    const worldH = setup.terrain.height * T;
    this.add.tileSprite(0, 0, worldW, worldH, TEX.paper).setOrigin(0).setDepth(0);
    this.terrainView = new TerrainView(this, setup.terrain, T);
    this.itemsView = new ItemsView(this);
    this.crittersView = new CrittersView(this);
    this.crabView = new CrabView(this);
    this.input2 = new GameInput(this);
    this.touch = createTouchState();
    this.registry.set(REG.touch, this.touch);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.setZoom(DPR * this.targetZoom());
    cam.startFollow(this.crabView.root, true, 0.12, 0.12);
    this.scene.launch('Hud');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.terrainView.destroy());
  }

  /** Back to the level list (from the HUD). */
  quit(): void {
    this.scene.stop('Hud');
    this.scene.start('Menu');
  }

  /** Saves a win, then shows the result card after a beat. */
  private finish(won: boolean): void {
    const b = this.beach;
    const livesLost = LIVES - b.lives;
    const blots = won ? blotsFor(b.elapsed, this.level.parTime, livesLost) : 0;
    if (won) {
      const host = getHost(this);
      saveProgress(host.storage, recordResult(loadProgress(host.storage), this.level.id, blots, b.elapsed));
    }
    const result: ResultData = { levelId: this.level.id, won, time: b.elapsed, blots, livesLost };
    this.time.delayedCall(END_DELAY_MS, () => {
      this.scene.stop('Hud');
      this.scene.start('Result', result);
    });
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, MAX_DT);
    const { tapTile, tapInteract } = this.consumeTaps();
    const events = this.beach.step(this.input2.read(this.touch, tapTile, tapInteract), dt);
    for (const e of events) this.react(e);
    this.terrainView.flush();
    this.itemsView.sync(this.beach.items, time, this.beach.crab.swap?.itemId ?? null);
    this.crittersView.sync(this.beach.critters, this.beach.crab.growth.size, time);
    this.crabView.update(this.beach, time, dt);
    const cam = this.cameras.main;
    const z = screenZoom(cam);
    cam.setZoom(DPR * (z + (this.targetZoom() - z) * Math.min(1, dt * 2)));
  }

  /** Bigger crabs see more of the beach, but never past its edges. */
  private targetZoom(): number {
    const { width, height } = viewSize(this);
    const c = this.beach.crab;
    const px = shellPx(c.shell ? SHELLS[c.shell].maxSize : c.growth.size);
    const T = this.beach.tileSize;
    const wanted = height / (px * 4.2 + T * 10);
    const fit = Math.max(height / (this.beach.terrain.height * T), width / (this.beach.terrain.width * T));
    return Math.max(fit, Math.min(3, wanted));
  }

  /** Turns HUD taps into a shell to move into or a tile to dig/fill. */
  private consumeTaps(): { tapTile: TilePos | null; tapInteract: boolean } {
    const tap = this.touch.taps.shift();
    if (!tap) return { tapTile: null, tapInteract: false };
    const p = this.cameras.main.getWorldPoint(tap.x * DPR, tap.y * DPR);
    const shell = this.beach.nearbyShell;
    if (shell && overlaps({ x: p.x, y: p.y, w: 1, h: 1 }, shell, 6)) return { tapTile: null, tapInteract: true };
    const T = this.beach.tileSize;
    return { tapTile: [Math.floor(p.x / T), Math.floor(p.y / T)], tapInteract: false };
  }

  private react(e: SimEvent): void {
    if (e.type === 'tiles') this.terrainView.invalidate(e.tiles);
    else if (e.type === 'ate') {
      this.floatText(e.x, e.y, e.banked > 0 ? `+${e.banked} banked` : `+${e.points}`);
      if (e.banked > 0) this.crabView.stuck(this);
    } else if (e.type === 'grew') this.crabView.pop(this);
    else if (e.type === 'caught') {
      this.floatText(e.x, e.y, e.lives > 0 ? 'caught! −1 life' : 'caught!', RED);
      this.cameras.main.shake(180, 0.004);
    } else if (e.type === 'won') {
      const c = this.beach.crab.body;
      this.floatText(c.x + c.w / 2, c.y - 10, 'grown up!');
      this.finish(true);
    } else if (e.type === 'lost') this.finish(false);
  }

  private floatText(x: number, y: number, text: string, color: string = BLUE): void {
    const t = this.add.text(x, y - 6, text, { fontFamily: HAND_FONT, fontSize: '13px', color })
      .setOrigin(0.5).setDepth(8).setResolution(DPR * 3);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }
}
