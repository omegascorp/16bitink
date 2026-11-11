import Phaser from 'phaser';
import { GRASS_H, GROUND_Y, SKY_H } from '../art/board';
import { ART_RES, BOIL, PAPER_HEX } from '../art/palette';
import { BOAR_FRAME } from '../art/boar';
import { CHEST_FRAME, FLAME_FRAME } from '../art/props';
import { LiquidPainter, LIQUID_RES } from '../art/liquid';
import { VOLCANO_SKY_TOP_HEX } from '../art/volcanoSurround';
import { bedOf, type SoundBoard } from '../audio/sfx';
import { getHost, trackGame } from '../host';
import { CHAPTER_NAMES, isFreeEnd, LEVELS, LEVELS_PER_CHAPTER } from '../level';
import type { GuardAnimal, LevelDef } from '../logic/level';
import { COIN, STEPS_PER_SECOND } from '../logic/particles';
import { World, type BlotEnd, type WorldEvent, type WorldSave } from '../logic/world';
import { DPR, screenSize } from './hidpi';
import { NibView } from './nibView';
import { BoardInput } from './boardInput';
import { DarkLayer } from './darkLayer';
import { BodiesView } from './bodies';
import { Effects } from './effects';
import { LevelCamera } from './levelCamera';
import { addToBank, isOpen, readBank, readProgress, recordWin, type Bank } from './progress';
import { PinsView } from './pinsView';
import { RunTracker } from './runTracker';
import { ShrineView } from './shrineView';
import { TombView } from './tombView';
import { bakeBoard, bakeTextures, COIN_TURNS, guardKey, guardKind, surroundKeys } from './textures';

const S = 1 / ART_RES;
const STEP_MS = 1000 / STEPS_PER_SECOND;
/** Most simulation steps run in one frame, so a slow phone slows the game down rather than freezing. */
const MAX_STEPS_PER_FRAME = 5;
/** A slow coin is redrawn only once it has moved this far (board px), so a settling heap doesn't twitch. */
const COIN_HOLD = 2;
/** How far the surroundings reach past the board on each side (a multiple of the tiles' sizes). */
const SURROUND = 2048;
/** The sky's colour above its tile: the tile's top edge (the jungle's, and the volcano's dusk). */
const SKY_TOP_HEX = 0xc3d4d8;

/** Hearts per level: each loss before the last winds the level back to just before the last pin pulled. */
export const HEARTS = 3;
/** How long the funny fail plays before a heart's rewind (ms). */
const REWIND_MS = 1400;

export interface HudState {
  readonly hearts: number;
  readonly coins: number;
  readonly needed: number;
  readonly chest: boolean;
  readonly started: boolean;
  /** The chest and enough coins: Nib may leave, or stay for the rest of the gold. */
  readonly goal: boolean;
}

export interface Result {
  readonly won: boolean;
  /** False for a Loot level: no chest, no idol. */
  readonly hasChest: boolean;
  /** The next level's index, when there is one and it's open. */
  readonly next: number | null;
  /** The playable order ends before the Atlas's planned levels do. */
  readonly moreComing: boolean;
  /** Won the last free level without the full game: the result offers it. */
  readonly offer?: string;
  readonly cause?: string;
  /** The guard that caught or pricked Nib, for the loss line. */
  readonly by?: GuardAnimal;
  /** Coins Nib picked up. */
  readonly coins: number;
  readonly total: number;
  /** The blots: every coin (95 of 100) picked up, and won without a retry. */
  readonly allCoins: boolean;
  readonly firstTry: boolean;
  readonly bank: Bank;
}

/** Shared between restarts: how many tries this level has had. */
interface Session {
  readonly level: string;
  tries: number;
  /** The plates' line ("they open with weight") has been shown on this level. */
  plateNote?: boolean;
  /** The player's zoom on this level, as a multiple of its fit. */
  zoom?: number;
}

/** Shown once per level, the first time a plate or a door is tapped. */
export const PLATE_NOTE = 'Plates open with weight, not a tap: drop something heavy on one to fill its notches, and the doors with its symbol open.';

/** What the interface needs to know about the level just started. */
export interface LevelInfo {
  readonly level: LevelDef;
  readonly index: number;
  readonly count: number;
  /** The highest level index open to play. */
  readonly unlocked: number;
}

/** The level to play: the one chosen, else the furthest one open. */
function levelIndex(registry: Phaser.Data.DataManager): number {
  const chosen = registry.get('level') as number | undefined;
  const open = openUpTo(registry);
  return Math.min(chosen ?? open, open, LEVELS.length - 1);
}

/** The furthest level open to play. */
export function openUpTo(registry: Phaser.Data.DataManager): number {
  if (registry.get('unlockAll')) return LEVELS.length - 1;
  const progress = readProgress();
  const order = LEVELS.map((l) => l.id);
  let i = 0;
  while (i + 1 < LEVELS.length && isOpen(progress, order, i + 1)) i++;
  return i;
}

/** The level in play: steps the world at a fixed rate and draws it. */
export class GameScene extends Phaser.Scene {
  private world!: World;
  private run: RunTracker | null = null;
  private world0!: Phaser.GameObjects.Layer;
  private liquid!: LiquidPainter;
  private liquidTex!: Phaser.Textures.CanvasTexture;
  private coins = new Map<number, Phaser.GameObjects.Image>();
  private seen = new Set<number>();
  private nib!: NibView;
  private blots: Phaser.GameObjects.Image[] = [];
  private bodies!: BodiesView;
  private shrine!: ShrineView;
  private tomb!: TombView;
  private dark: DarkLayer | null = null;
  private index = 0;
  private camera!: LevelCamera;
  private fx!: Effects;
  private input2!: BoardInput;
  private pins!: PinsView;
  private chest: Phaser.GameObjects.Image | null = null;
  private acc = 0;
  private ended = false;
  private hearts = HEARTS;
  /** The level just before the last pin pulled (or gate pushed): a lost heart winds back to here. */
  private checkpoint!: WorldSave;
  /** True while a lost heart's fail plays, before the rewind. */
  private rewinding = false;
  private session!: Session;

  constructor() {
    super('game');
  }

  private get sfx(): SoundBoard {
    return this.registry.get('sfx') as SoundBoard;
  }

  create(): void {
    this.index = levelIndex(this.registry);
    // The dev page's sampler (?sample=tomb) plays a level that is in no chapter.
    const level = (this.registry.get('sampleLevel') as LevelDef | undefined) ?? LEVELS[this.index]!;
    const old = this.registry.get('session') as Session | undefined;
    this.session = old?.level === level.id ? old : { level: level.id, tries: 0 };
    this.session.tries++;
    this.registry.set('session', this.session);
    this.world = new World(level);
    this.ended = false;
    this.startRun(level);
    this.hearts = HEARTS;
    this.rewinding = false;
    this.acc = 0;
    this.blots = [];
    this.dark = null;
    this.cameras.main.setBackgroundColor(PAPER_HEX);
    bakeTextures(this, level);
    this.world0 = this.add.layer();
    this.fx = new Effects(this, this.world0, () => this.sfx);
    const { view } = level;
    this.addSurroundings();
    for (const tile of bakeBoard(this, level)) this.world0.add(this.add.image(tile.x, view.y, tile.key).setOrigin(0).setScale(S));
    this.addTorches();
    this.bodies = new BodiesView(this, this.world0, this.world, this.fx);
    this.shrine = new ShrineView(this, this.world0, this.world, this.fx, () => this.sfx);
    // The liquids: a canvas redrawn each frame, at half the board's resolution.
    this.liquid = new LiquidPainter(view.x, view.y, view.w, view.h);
    if (this.textures.exists('liquid')) this.textures.remove('liquid');
    const tex = this.textures.addCanvas('liquid', this.liquid.canvas);
    if (!tex) throw new Error('Could not make the liquid texture');
    this.liquidTex = tex;
    this.world0.add(this.add.image(view.x, view.y, 'liquid').setOrigin(0).setScale(1 / LIQUID_RES));
    this.coins = new Map();
    this.addCoins();
    this.chest = null;
    if (level.chest) {
      this.chest = this.add.image(level.chest.x, level.chest.y, 'chest-closed').setScale(S).setOrigin(CHEST_FRAME.ox / CHEST_FRAME.w, CHEST_FRAME.oy / CHEST_FRAME.h);
      this.world0.add(this.chest);
    }
    for (const b of this.world.blots) {
      const img = this.add.image(b.x, b.y, guardKey(guardKind(b), false, 0)).setScale(S).setOrigin(BOAR_FRAME.ox / BOAR_FRAME.w, BOAR_FRAME.oy / BOAR_FRAME.h);
      this.blots.push(img);
      this.world0.add(img);
    }
    this.tomb = new TombView(this, this.world0, this.world, this.fx, () => this.sfx);
    this.pins = new PinsView(this, this.world0, this.world);
    this.nib = new NibView(this, this.world0);
    if (level.dark) this.dark = new DarkLayer(this, this.world0, level);
    this.checkpoint = this.world.save();
    this.sfx.bed(bedOf(level.ruin ?? 'jungle'));
    this.camera = new LevelCamera(this, level, this.session.zoom);
    this.camera.fit(this.world.nib, true);
    this.scale.on('resize', this.refit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.run?.quit();
      this.sfx.bed(null);
      this.scale.off('resize', this.refit, this);
      this.game.events.off('cmd:restart', this.restart, this);
      this.game.events.off('cmd:zoom', this.onZoom, this);
      this.game.events.off('hud:top', this.onHudTop, this);
      this.game.events.off('cmd:jump', this.onJump, this);
      this.game.events.off('cmd:leave', this.onLeave, this);
      this.game.events.off('cmd:level', this.onLevel, this);
      this.game.events.off('cmd:map', this.onMap, this);
    });
    this.input2 = new BoardInput(this, this.world, this.camera, {
      pinAt: (p) => this.pinAt(p.x, p.y),
      tapPin: (id) => this.tryTap(id),
      poke: (p) => this.pokeTomb(p),
      hover: (p) => {
        const id = this.world.finished ? null : this.pinAt(p.x, p.y);
        if (this.pins.setHover(id)) this.input.setDefaultCursor(id ? 'pointer' : 'default');
      },
      zoomed: () => this.zoomed(),
      restart: () => this.restart(),
      map: () => this.onMap(),
      unlock: () => this.sfx.unlock(),
    });
    this.game.events.on('cmd:zoom', this.onZoom, this);
    this.game.events.on('hud:top', this.onHudTop, this);
    this.game.events.on('cmd:jump', this.onJump, this);
    this.game.events.on('cmd:restart', this.restart, this);
    this.game.events.on('cmd:leave', this.onLeave, this);
    this.game.events.on('cmd:level', this.onLevel, this);
    this.game.events.on('cmd:map', this.onMap, this);
    if (!this.scene.isActive('hud')) this.scene.launch('hud');
    const info: LevelInfo = { level, index: this.index, count: LEVELS.length, unlocked: openUpTo(this.registry) };
    // Kept for the interface too, in case it starts after this.
    this.registry.set('levelInfo', info);
    this.game.events.emit('hud:reset', info);
    this.zoomed();
    this.drawWorld(0, 0);
  }

  /**
   * The garden and rock around the level, far past its edges, so a wide screen
   * (or the close-up at the end) never shows bare paper.
   */
  private addSurroundings(): void {
    const { view } = this.world.level;
    // Whole tiles from the origin, so the tiles line up whatever the level's width.
    const left = Math.floor((view.x - SURROUND) / SURROUND) * SURROUND;
    const width = Math.ceil((view.x + view.w + SURROUND - left) / SURROUND) * SURROUND;
    const skyTop = GROUND_Y - SKY_H;
    const ruin = this.world.level.ruin ?? 'jungle';
    const keys = surroundKeys(ruin);
    const top = this.add.rectangle(left, skyTop - SURROUND, width, SURROUND + 2, ruin === 'volcano' ? VOLCANO_SKY_TOP_HEX : SKY_TOP_HEX).setOrigin(0);
    const sky = this.add.tileSprite(left, skyTop, width, SKY_H, keys.sky).setOrigin(0);
    // Tiles start on a whole number of tiles from the origin, so they line up with nothing in between.
    const rock = this.add.tileSprite(left, GROUND_Y, width, SURROUND * 2, keys.rock).setOrigin(0).setTileScale(S, S);
    const grass = this.add.tileSprite(left, GROUND_Y - GRASS_H / 2, width, GRASS_H, keys.ground).setOrigin(0).setTileScale(S, S);
    this.world0.add([top, sky, rock, grass]);
  }

  /** Flickering flames and their warm glow on the temple's wall torches. */
  private addTorches(): void {
    for (const [n, t] of this.world.level.torches.entries()) {
      const glow = this.add.image(t.x, t.y - 16, 'glow').setScale(1.6).setBlendMode(Phaser.BlendModes.ADD);
      const flame = this.add.image(t.x, t.y - 6, 'flame-0').setScale(S).setOrigin(FLAME_FRAME.ox / FLAME_FRAME.w, FLAME_FRAME.oy / FLAME_FRAME.h);
      this.world0.add([glow, flame]);
      this.tweens.add({ targets: glow, alpha: 0.7, scale: 1.45, duration: 180 + n * 23, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.time.addEvent({ delay: 110 + n * 7, loop: true, callback: () => flame.setTexture(`flame-${Math.floor(Math.random() * 3)}`) });
    }
  }

  /** One image per coin, by the coin's id (coins are only ever lost, never added, until a rewind). */
  private addCoins(): void {
    for (const c of this.coins.values()) c.destroy();
    this.coins.clear();
    const g = this.world.grains;
    for (let i = 0; i < g.count; i++) {
      if (g.kind[i] !== COIN) continue;
      const id = g.id[i]!;
      const c = this.add.image(g.x[i]!, g.y[i]!, 'coins', id % COIN_TURNS.length).setScale(S);
      c.setAngle(((id * 37) % 40) - 20);
      this.coins.set(id, c);
      this.world0.add(c);
    }
  }

  /** Pulls a pin (or pushes a gate back in) for the player, keeping the level as it was just before as the checkpoint. */
  private tryTap(id: string): void {
    const before = this.world.save();
    if (this.world.tap(id)) this.checkpoint = before;
  }

  /**
   * A loss with hearts to spare: the funny fail plays, a heart pops, and the
   * level winds back to just before the last pin pulled.
   */
  private loseHeart(): void {
    const status = this.world.status;
    if (status.state !== 'lost') return;
    this.hearts--;
    this.rewinding = true;
    this.sfx.play('fail');
    this.nib.fail(status.cause, this.world.nib, this.world.nib.y + 24);
    this.cameras.main.shake(180, 0.004);
    this.time.delayedCall(REWIND_MS, () => {
      this.world.load(this.checkpoint);
      this.resync();
      this.rewinding = false;
      this.game.events.emit('hud:rewind', { hearts: this.hearts, cause: status.cause, by: status.by });
    });
  }

  /** After a rewind: everything on screen back in step with the world. */
  private resync(): void {
    this.tweens.killTweensOf([...this.blots, ...(this.chest ? [this.chest] : [])]);
    this.addCoins();
    this.world.blots.forEach((b, i) => {
      const img = this.blots[i];
      img?.setScale(S).setAlpha(1).setAngle(0).clearTint().setVisible(!b.gone).setPosition(b.x, b.y);
    });
    this.pins.resync();
    this.chest?.setTexture(this.world.chestTaken ? 'chest-open' : 'chest-closed').setScale(S);
    this.bodies.resync();
    this.shrine.resync();
    this.tomb.resync();
    this.nib.reset();
    this.input2.resync();
  }

  private refit(): void {
    this.camera.fit(this.world.nib);
    this.zoomed();
  }

  update(time: number, delta: number): void {
    this.acc += Math.min(delta, 100);
    let steps = 0;
    while (this.acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.acc -= STEP_MS;
      steps++;
      if (this.world.finished || this.rewinding) break;
      this.world.step();
      this.react(this.world.events);
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = Math.min(this.acc, STEP_MS);
    this.drawWorld(time, delta);
    if (!this.ended) {
      this.input2.update();
      this.camera.update(delta, this.world.nib);
    }
    if (!this.ended && !this.rewinding && this.world.finished) {
      if (this.world.status.state === 'lost' && this.hearts > 1) this.loseHeart();
      else this.finish();
    }
    const w = this.world;
    this.game.events.emit('hud:state', { hearts: this.hearts, coins: w.coinsCollected, needed: w.level.coinsNeeded, chest: w.chestTaken, started: w.pins.some((p) => p.pulledAt !== null), goal: w.goalMet } satisfies HudState);
  }

  private drawWorld(time: number, delta: number): void {
    const g = this.world.grains;
    this.liquid.paint(g);
    this.liquidTex.refresh();
    // Coins: each keeps its own look; it only turns while it tumbles, and a
    // coin at rest stays exactly where it is drawn.
    this.seen.clear();
    for (let i = 0; i < g.count; i++) {
      if (g.kind[i] !== COIN) continue;
      const id = g.id[i]!;
      const c = this.coins.get(id);
      if (!c) continue;
      this.seen.add(id);
      const fast = Math.abs(g.vx[i]!) + Math.abs(g.vy[i]!) > 1.2;
      if (fast || Math.abs(g.x[i]! - c.x) > COIN_HOLD || Math.abs(g.y[i]! - c.y) > COIN_HOLD) c.setPosition(g.x[i]!, g.y[i]!);
      c.setFrame(fast ? Math.floor(time / 70 + id) % COIN_TURNS.length : id % COIN_TURNS.length);
    }
    for (const [id, c] of this.coins) if (!this.seen.has(id) && c.visible) c.setVisible(false);
    this.nib.update(this.world.nib, time, delta, this.world.onVine);
    const boil = Math.floor(time / 140) % BOIL;
    this.world.blots.forEach((b, i) => {
      const img = this.blots[i];
      if (!img || b.gone) return;
      img.setPosition(b.x, b.y).setFlipX(b.facing < 0);
      img.setTexture(guardKey(guardKind(b), b.wet > 0, boil));
      // The Tomb Guardian's throat swells before each breath: the tell (placeholder: the whole toad puffs a little).
      if (b.boss && b.animal === 'toad') img.setScale(S * (1 + 0.12 * this.world.breathSwell));
    });
    this.bodies.update();
    this.shrine.update(time);
    this.tomb.update(time);
    this.dark?.paint(this.world, time);
  }

  /** Sounds and little effects for what just happened in the world. */
  private react(events: readonly WorldEvent[]): void {
    let steam = 0;
    for (const e of events) {
      switch (e.type) {
        case 'pull':
          this.sfx.play('pull');
          this.pins.pulled(e.id);
          break;
        case 'gateIn':
          this.sfx.play('gate');
          this.pins.pushed(e.id);
          break;
        case 'blocked':
          this.sfx.play('blocked');
          this.pins.blocked(e.id, e.by);
          break;
        case 'gateJammed':
          // Something is in the gate's slot: it jolts and won't go in.
          this.sfx.play('blocked');
          this.pins.blocked(e.id, null);
          break;
        case 'crack':
          this.shrine.cracked(e.index);
          break;
        case 'slabDown':
          this.shrine.landed(e.index);
          break;
        case 'ruby':
          this.shrine.taken(e.id, e.x, e.y);
          break;
        case 'rubyLost':
          this.shrine.lost(e.id);
          break;
        case 'steam':
          if (steam++ % 3 === 0) this.puff('steam', e.x, e.y);
          this.sfx.play('sizzle');
          break;
        case 'melt':
          this.puff('smoke', e.x, e.y);
          this.sfx.play('sizzle', 0.6);
          break;
        case 'collect':
          this.sfx.play('coin');
          this.flyCoin(e.id, e.x, e.y);
          break;
        case 'goal':
          this.sfx.play('win');
          break;
        case 'chest':
          this.openChest();
          break;
        case 'jump':
          this.sfx.play('jump');
          break;
        case 'bonk':
          // Too big to squash: Nib bounces off the Great Boar's back.
          this.sfx.play('blocked');
          this.puff('steam', e.x, e.y);
          break;
        case 'crateBurnt':
          this.bodies.crateBurnt(e.x, e.y);
          this.sfx.play('sizzle');
          break;
        case 'vineBurnt':
          this.bodies.vineBurnt(e.x);
          this.sfx.play('sizzle');
          break;
        case 'sprout':
          this.bodies.sprout(e.x);
          break;
        case 'washed':
        case 'scorched':
        case 'stomped':
        case 'blasted':
          this.blotGone(e.type, e.x, e.y);
          break;
        case 'blast':
          this.tomb.blast(e.x, e.y);
          break;
        case 'wallBroken':
          this.tomb.broken(e.index, e.x, e.y);
          break;
        case 'doused':
          this.tomb.doused(e.x, e.y);
          break;
        case 'breath':
          this.sfx.play('squelch', 0.5);
          break;
        case 'doorOpen':
        case 'doorShut':
        case 'plateDown':
          this.sfx.play('gate', 0.6);
          break;
        case 'doorBlocked':
          this.sfx.play('blocked');
          break;
        default:
          break;
      }
    }
  }

  /** A picked-up coin hops into Nib's backpack. */
  private flyCoin(id: number, x: number, y: number): void {
    const c = this.coins.get(id);
    if (!c) return;
    this.coins.delete(id);
    this.fx.flyCoin(c, x, y, this.world.nib);
  }

  private puff(kind: 'steam' | 'smoke', x: number, y: number): void {
    this.fx.puff(kind, x, y);
  }

  private blotGone(how: BlotEnd, x: number, y: number): void {
    const i = this.world.blots.findIndex((b) => b.gone === how && Math.abs(b.x - x) < 1 && Math.abs(b.y - y) < 1);
    const img = this.blots[i];
    const b = this.world.blots[i];
    if (img && b) this.fx.guardGone(img, guardKey(guardKind(b), true, 0), how, x, y);
  }

  /** The pin under a screen point: one still in, or a gate parked out. */
  private pinAt(px: number, py: number): string | null {
    return this.pins.pinAt(this.cameras.main.getWorldPoint(px, py));
  }

  /** A tap on a plate or a door: it shakes and lights its groove; the first time on a level, the HUD says how plates work. */
  private pokeTomb(p: Phaser.Input.Pointer): void {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    if (!this.tomb.poke(wp.x, wp.y) || this.session.plateNote) return;
    this.session.plateNote = true;
    this.game.events.emit('hud:note', PLATE_NOTE);
  }

  /** The interface's height changed (a new level's page, a turned phone): the board fits the room left. */
  private onHudTop(): void {
    if (this.ended) return;
    this.camera.refit(this.world.nib);
    this.zoomed();
  }

  /** The + or − button: one step in or out. */
  private onZoom(dir: -1 | 1): void {
    this.input2.zoomStep(dir);
  }

  /** The zoom changed: kept for a restart of this level, and the buttons show how much further it goes. */
  private zoomed(): void {
    this.session.zoom = this.camera.zoomScale;
    this.game.events.emit('hud:zoom', { in: this.camera.canZoomIn, out: this.camera.canZoomOut });
  }

  private onJump(): void {
    this.world.jump();
  }

  private onLeave(): void {
    this.world.leave();
  }

  private openChest(): void {
    const { chest } = this.world.level;
    if (chest && this.chest) this.fx.openChest(this.chest, chest, this.world.nib);
  }

  private finish(): void {
    this.ended = true;
    const w = this.world;
    const status = w.status;
    const floor = w.nib.y + 24;
    if (status.state === 'won') {
      this.sfx.play('win');
      this.nib.cheer();
      if (this.chest && w.chestTaken) {
        this.chest.setTexture('chest-open');
        this.tweens.add({ targets: this.chest, scale: S * 1.15, duration: 160, yoyo: true });
      }
    } else if (status.state === 'lost') {
      this.sfx.play('fail');
      this.nib.fail(status.cause, w.nib, floor);
    }
    this.closeUp(w.nib.x, w.nib.y);
    const won = status.state === 'won';
    if (won) this.run?.win();
    else if (status.state === 'lost') this.run?.lose(status.cause);
    const allTreasure = w.coinsTotal > 0 && w.coinsCollected >= Math.ceil(w.coinsTotal * 0.95);
    const firstTry = this.session.tries === 1 && this.hearts === HEARTS;
    if (won) recordWin(w.level.id, w.coinsCollected, allTreasure, firstTry);
    const next = won && this.index + 1 < LEVELS.length ? this.index + 1 : null;
    const host = getHost();
    const offer = won && next === null && isFreeEnd(w.level.id) && host && !host.unlocked ? host.price : undefined;
    const result: Result = {
      won,
      hasChest: w.level.chest !== undefined,
      next,
      ...(offer ? { offer } : {}),
      moreComing: won && next === null && !offer && LEVELS.length < CHAPTER_NAMES.length * LEVELS_PER_CHAPTER,
      cause: status.state === 'lost' ? status.cause : undefined,
      by: status.state === 'lost' ? status.by : undefined,
      allCoins: allTreasure,
      firstTry,
      coins: w.coinsCollected,
      total: w.coinsTotal,
      // Only what Nib carries out of a won level goes in the bank.
      bank: won ? addToBank(w.coinsCollected, w.chestTaken ? 1 : 0) : readBank(),
    };
    this.time.delayedCall(status.state === 'won' ? 1100 : 1500, () => this.game.events.emit('hud:result', result));
  }

  /**
   * Zooms in on Nib, so the cheer or the silly face reads even on a phone.
   * Nib ends up in the lower part of the screen, under the result card.
   */
  private closeUp(x: number, y: number): void {
    const cam = this.cameras.main;
    const { height } = screenSize(this.scale);
    // Never out from where the player had zoomed in.
    const zoom = Math.max(cam.zoom, Math.min(cam.zoom * 2.2, DPR * 2.4));
    this.scale.off('resize', this.refit, this);
    cam.zoomTo(zoom, 650, 'Cubic.easeInOut');
    cam.pan(x, y - (height * 0.2 * DPR) / zoom, 650, 'Cubic.easeInOut');
  }

  /** Reports the level's start, and its end once (the dev page's sampler level is in no chapter, so it is not reported). */
  private startRun(level: LevelDef): void {
    this.run = null;
    const at = LEVELS.findIndex((l) => l.id === level.id);
    if (at < 0) return;
    const w = this.world;
    this.run = new RunTracker({ id: level.id, name: level.name, n: at + 1 }, trackGame, () => ({
      pinsPulled: w.pins.filter((p) => p.pulledAt !== null).length,
      pinsTotal: w.pins.length,
      coins: w.coinsCollected,
      coinsNeeded: level.coinsNeeded,
      hasChest: level.chest !== undefined,
      chestTaken: w.chestTaken,
    }));
  }

  private restart(): void {
    this.tweens.killAll();
    this.scene.restart();
  }

  /** Back to the Atlas map. */
  private onMap(): void {
    this.tweens.killAll();
    this.scene.stop('hud');
    this.scene.start('menu');
  }

  /** Plays another level of the chapter (only an open one). */
  private onLevel(index: number): void {
    if (index < 0 || index > openUpTo(this.registry)) return;
    this.registry.set('level', index);
    this.restart();
  }
}
