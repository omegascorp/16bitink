import Phaser from 'phaser';
import { BLACK_SAND, BLUE, BLUE_HEX, GREY_SAND, PALE_SAND, RED, RED_HEX, type GroundStyle } from '../art/palette';
import { TEX } from '../art/textures';
import { getHost, REG } from '../host';
import { buildLevel, START_SIZE } from '../level/build';
import { isBeachFinale, LEVELS, levelById, themeOf } from '../level/levels';
import type { LevelDef } from '../level/types';
import { Coach } from '../logic/coach';
import type { TilePos } from '../logic/dig';
import { surfaceRow, type Terrain } from '../logic/terrain';
import { centre, overlaps } from '../logic/items';
import { shellPx, SHELLS } from '../logic/shells';
import { blotsFor, loadProgress, recordResult, saveProgress } from '../logic/save';
import { Beach, type SimEvent } from '../logic/sim';
import { missionOf, parTimeOf } from '../level/missions';
import { missionTarget } from './game/missionPointer';
import { BackdropView } from './game/backdropView';
import { BirdsView } from './game/birdsView';
import { SandFxView } from './game/sandFxView';
import { WaterView } from './game/waterView';
import { CrabView } from './game/crabView';
import { CrittersView } from './game/crittersView';
import { createTouchState, GameInput, type TouchState } from './game/input';
import { ItemsView } from './game/itemsView';
import { TerrainView } from './game/terrainView';
import { RootsView } from './game/rootsView';
import { VentsView } from './game/ventsView';
import { FogView } from './game/fogView';
import { KelpView } from './game/kelpView';
import { RivalsView } from './game/rivalsView';
import { RainView } from './game/rainView';
import { DecksView } from './game/decksView';
import { wrackAt } from '../logic/kelp';
import { DPR, screenZoom, viewSize } from './hidpi';
import type { ResultData } from './ResultScene';
import { HAND_FONT } from './ui';

/** Longest frame the simulation takes in one step (tab switches, hitches). */
const MAX_DT = 1 / 20;
/** How each kind of ground is drawn. */
const GROUND: Readonly<Record<NonNullable<LevelDef['ground']> | 'pale', GroundStyle>> = { pale: PALE_SAND, black: BLACK_SAND, grey: GREY_SAND };
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
  coach!: Coach;
  private pointer!: Phaser.GameObjects.Graphics;
  private backdrop!: BackdropView;
  private terrainView!: TerrainView;
  private itemsView!: ItemsView;
  private crittersView!: CrittersView;
  private birdsView!: BirdsView;
  private sandFx!: SandFxView;
  private waterView!: WaterView;
  private crabView!: CrabView;
  private ventsView!: VentsView;
  private fogView: FogView | null = null;
  private kelpView: KelpView | null = null;
  private rivalsView!: RivalsView;
  private rainView: RainView | null = null;
  private decksView: DecksView | null = null;
  private input2!: GameInput;
  private touch!: TouchState;

  constructor() {
    super('Game');
  }

  create(data: GameData): void {
    this.level = levelById(data?.levelId) ?? LEVELS[0]!;
    const setup = buildLevel(this.level);
    this.beach = new Beach(setup);
    // A shell chain's line is explained by the coach the first time round.
    const chain = missionOf(this.level).chain > 0 && !(this.level.teach ?? []).includes('line') ? ['line' as const] : [];
    this.coach = new Coach([...(this.level.teach ?? []), ...chain]);
    this.pointer = this.add.graphics().setDepth(7);
    const T = setup.tileSize;
    const worldW = setup.terrain.width * T;
    const worldH = setup.terrain.height * T;
    this.add.tileSprite(0, 0, worldW, worldH, TEX.paper).setOrigin(0).setDepth(0);
    this.addBackdrop(setup.terrain, T, worldW);
    this.terrainView = new TerrainView(this, setup.terrain, T, GROUND[this.level.ground ?? 'pale']);
    const roots = setup.roots ? new RootsView(this, setup.terrain, setup.roots, T) : null;
    this.ventsView = new VentsView(this, setup.vents ?? [], setup.terrain, T);
    const kelp = setup.wrack?.length ? new KelpView(this, setup.terrain, setup.wrack, T) : null;
    const fog = setup.fog?.banks.length ? new FogView(this, setup.fog, setup.terrain, T) : null;
    this.kelpView = kelp;
    this.fogView = fog;
    const decks = setup.decks?.length ? new DecksView(this, setup.terrain, setup.decks, T) : null;
    this.decksView = decks;
    this.rainView = setup.rain ? new RainView(this, setup.terrain, T) : null;
    this.itemsView = new ItemsView(this);
    this.crittersView = new CrittersView(this, setup.terrain, T);
    this.rivalsView = new RivalsView(this);
    this.birdsView = new BirdsView(this, setup.terrain, T);
    this.sandFx = new SandFxView(this, this.beach);
    this.waterView = new WaterView(this, this.beach);
    this.crabView = new CrabView(this);
    this.input2 = new GameInput(this);
    this.touch = createTouchState();
    this.registry.set(REG.touch, this.touch);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.setZoom(DPR * this.targetZoom());
    cam.startFollow(this.crabView.root, true, 0.12, 0.12);
    this.scene.launch('Hud');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.terrainView.destroy();
      roots?.destroy();
      kelp?.destroy(this);
      fog?.destroy();
      decks?.destroy(this);
      this.rainView?.destroy();
    });
  }

  /** The faraway beach, anchored above the beach's typical surface height and wide enough for any scroll. */
  private addBackdrop(terrain: Terrain, T: number, worldW: number): void {
    const rows = Array.from({ length: terrain.width }, (_, x) => surfaceRow(terrain, x)).sort((a, b) => a - b);
    const ground = rows[Math.floor(rows.length / 2)]! * T;
    this.backdrop = new BackdropView(this, themeOf(this.level.id), ground, worldW + 2400);
  }

  /** Freezes the beach under the HUD's pause card: the clock, the hunters and the tide all wait. */
  pausePlay(): void {
    this.scene.pause();
  }

  /** Back to the beach, with no key or finger left "down" from before the pause. */
  resumePlay(): void {
    this.input2.reset(this);
    Object.assign(this.touch, createTouchState());
    this.scene.resume();
  }

  /** Back to the level list (from the HUD). */
  quit(): void {
    this.scene.stop('Hud');
    this.scene.start('Menu');
  }

  /** Saves a win, then shows the result card after a beat. */
  private finish(won: boolean): void {
    const b = this.beach;
    const livesLost = b.startLives - b.lives;
    const blots = won ? blotsFor(b.elapsed, parTimeOf(this.level), livesLost) : 0;
    const host = getHost(this);
    const saved = loadProgress(host.storage);
    if (won) saveProgress(host.storage, recordResult(saved, this.level.id, blots, b.elapsed));
    const result: ResultData = {
      levelId: this.level.id, won, time: b.elapsed, blots, livesLost,
      size: b.crab.growth.size, shell: b.crab.shell, previousBest: saved.levels[this.level.id]?.bestTime, caughtBy: b.caughtBy,
    };
    this.time.delayedCall(END_DELAY_MS, () => {
      this.scene.stop('Hud');
      // The last level of a beach gets the full celebration instead of the result card.
      this.scene.start(won && isBeachFinale(this.level.id) ? 'BeachEnd' : 'Result', result);
    });
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, MAX_DT);
    const { tapTile, tapInteract } = this.consumeTaps();
    const events = this.beach.step(this.input2.read(this.touch, tapTile, tapInteract), dt);
    for (const e of events) this.react(e);
    this.coach.observe(this.beach, events);
    this.terrainView.flush();
    this.itemsView.sync(this.beach.items, time, this.beach.crab.swap?.itemId ?? null);
    this.crittersView.sync(this.beach.critters, this.beach.crab.growth.size, time);
    this.rivalsView.sync(this.beach.critters, time);
    this.birdsView.sync(this.beach.birds, this.beach.crab.growth.size, time);
    this.sandFx.update(dt, time);
    this.waterView.update(this.cameras.main.worldView, time);
    this.ventsView.update(this.beach.elapsed * 1000);
    this.updateFogAndKelp();
    this.decksView?.update();
    this.rainView?.update(this.beach.rainNow, this.cameras.main.worldView, this.beach.elapsed);
    this.crabView.update(this.beach, time, dt);
    const cam = this.cameras.main;
    const z = screenZoom(cam);
    cam.setZoom(DPR * (z + (this.targetZoom() - z) * Math.min(1, dt * 2)));
    this.backdrop.update(time);
    this.drawPointer(time);
  }

  /** The kelp heap the crab is down in thins out; the fog clears round the crab. */
  private updateFogAndKelp(): void {
    const c = this.beach.crab;
    const at = centre(c.body);
    if (this.kelpView) {
      const under = this.beach.underKelp(c.body) ? wrackAt(this.beach.wrack, Math.floor(at.x / this.beach.tileSize)) : null;
      this.kelpView.update(under);
    }
    this.fogView?.update(this.beach.elapsed, at, c.growth.size);
  }

  /**
   * The coach's arrow: bobbing over what the hint is about, or at the edge
   * of the view pointing the way when it's off screen.
   */
  private drawPointer(time: number): void {
    const g = this.pointer.clear();
    const coached = this.coach.hint(this.beach, 'keys')?.target;
    // Without a hint, a red arrow at the edge points the way to the mission's next find.
    const view = this.cameras.main.worldView;
    const mission = coached ? null : missionTarget(this.beach);
    const target = coached ?? (mission && !view.contains(mission.x, mission.y) ? mission : null);
    if (!target) return;
    const zoom = screenZoom(this.cameras.main);
    const inset = 34 / zoom;
    const size = 14 / zoom;
    const bob = Math.sin(time / 180) * 3 / zoom;
    const onScreen = view.contains(target.x, target.y);
    const x = Phaser.Math.Clamp(target.x, view.x + inset, view.right - inset);
    const y = onScreen ? target.y - 18 / zoom - bob : Phaser.Math.Clamp(target.y, view.y + inset, view.bottom - inset);
    // Pointing down at the target when it's in view, otherwise towards it.
    const angle = onScreen ? Math.PI / 2 : Math.atan2(target.y - y, target.x - x);
    const tip = { x: x + Math.cos(angle) * size, y: y + Math.sin(angle) * size };
    const back = (a: number): { x: number; y: number } => ({ x: x + Math.cos(angle + a) * size, y: y + Math.sin(angle + a) * size });
    const l = back(Math.PI * 0.78);
    const r = back(-Math.PI * 0.78);
    g.lineStyle(3.2 / zoom, coached ? BLUE_HEX : RED_HEX, 0.95);
    g.lineBetween(l.x, l.y, tip.x, tip.y).lineBetween(r.x, r.y, tip.x, tip.y);
    g.lineBetween(x - Math.cos(angle) * size * 1.6, y - Math.sin(angle) * size * 1.6, tip.x, tip.y);
  }

  /** Bigger crabs see more of the beach, but never past its edges. */
  private targetZoom(): number {
    const { width, height } = viewSize(this);
    const c = this.beach.crab;
    const px = shellPx(c.shell ? c.shell.size : c.growth.size);
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
    // Tapping a rival close enough to rap on raps on it.
    const rival = this.beach.nearbyRival;
    if (rival && overlaps({ x: p.x, y: p.y, w: 1, h: 1 }, rival, 6)) return { tapTile: null, tapInteract: true };
    const T = this.beach.tileSize;
    return { tapTile: [Math.floor(p.x / T), Math.floor(p.y / T)], tapInteract: false };
  }

  private react(e: SimEvent): void {
    if (e.type === 'tiles') {
      this.terrainView.invalidate(e.tiles);
      if (e.poured) this.sandFx.poured(e.tiles);
    }
    else if (e.type === 'ate') {
      this.floatText(e.x, e.y, e.banked > 0 ? `+${e.banked} banked` : `+${e.points}`);
      if (e.banked > 0) this.crabView.stuck(this);
    } else if (e.type === 'grew') this.crabView.pop(this);
    else if (e.type === 'caught') {
      this.floatText(e.x, e.y, e.lives > 0 ? 'caught! −1 life' : 'caught!', RED);
      this.cameras.main.shake(180, 0.004);
    } else if (e.type === 'thrown') {
      this.floatText(e.x, e.y, 'whoosh!');
    } else if (e.type === 'rapped') {
      this.floatText(e.x, e.y, 'knock knock!');
    } else if (e.type === 'traded') {
      this.floatText(e.x, e.y, 'trade up!');
    } else if (e.type === 'joined') {
      this.floatText(e.x, e.y, e.line === 1 ? 'a follower!' : `${e.line} following`);
    } else if (e.type === 'collected') {
      this.floatText(e.x, e.y, 'ink bottle!', RED);
    } else if (e.type === 'quarry') {
      this.floatText(e.x, e.y, e.giant ? 'the giant!' : 'marked!', RED);
    } else if (e.type === 'struck') {
      this.floatText(e.x, e.y, 'tok! safe in the shell');
      this.cameras.main.shake(90, 0.002);
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
