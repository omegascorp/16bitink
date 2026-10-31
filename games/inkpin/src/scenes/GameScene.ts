import Phaser from 'phaser';
import { GRASS_H, GROUND_Y, SKY_H } from '../art/board';
import { ART_RES, BOIL, PAPER_HEX } from '../art/palette';
import { BOAR_FRAME } from '../art/boar';
import { CHEST_FRAME, FLAME_FRAME } from '../art/props';
import { LiquidPainter, LIQUID_RES } from '../art/liquid';
import { VOLCANO_SKY_TOP_HEX } from '../art/volcanoSurround';
import type { SoundBoard } from '../audio/sfx';
import { LEVELS } from '../level';
import type { GuardAnimal, LevelDef } from '../logic/level';
import { COIN, STEPS_PER_SECOND } from '../logic/particles';
import { World, type BlotEnd, type WorldEvent, type WorldSave } from '../logic/world';
import { DPR, screenSize } from './hidpi';
import { NibView } from './nibView';
import { hudTook, readControls, saveControls, type ControlMode } from './controls';
import { DarkLayer } from './darkLayer';
import { BodiesView } from './bodies';
import { Effects } from './effects';
import { LevelCamera } from './levelCamera';
import { addToBank, isOpen, readBank, readProgress, recordWin, type Bank } from './progress';
import { PinsView } from './pinsView';
import { ShrineView } from './shrineView';
import { bakeBoard, bakeTextures, COIN_TURNS, guardKey, guardKind, surroundKeys } from './textures';

const S = 1 / ART_RES;
const STEP_MS = 1000 / STEPS_PER_SECOND;
/** Most simulation steps run in one frame, so a slow phone slows the game down rather than freezing. */
const MAX_STEPS_PER_FRAME = 5;
/** Joystick: how far (CSS px) a drag must go before Nib walks, and its full throw. */
const STICK_DEAD = 14;
const STICK_RANGE = 46;
/** A tap this close to Nib (board px) makes Nib jump, in tap-to-go mode. */
const NIB_TAP = 30;
const KEY_DIR: Record<string, -1 | 1> = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 };
/** Up and down climb a vine Nib is on or next to (up jumps otherwise). */
const CLIMB_KEY: Record<string, -1 | 1> = { ArrowUp: -1, w: -1, W: -1, ArrowDown: 1, s: 1, S: 1 };
/** A slow coin is redrawn only once it has moved this far (board px), so a settling heap doesn't twitch. */
const COIN_HOLD = 2;
/** How far the surroundings reach past the board on each side (a multiple of the tiles' sizes). */
const SURROUND = 2048;
/** The sky's colour above its tile: the tile's top edge (the jungle's, and the volcano's dusk). */
const SKY_TOP_HEX = 0xc3d4d8;
/** A press that moves further than this (CSS px) is a drag to look around, not a tap. */
const DRAG_LOOK = 10;
/** In joystick mode, a drag that starts above this share of the screen looks around instead of walking Nib. */
const LOOK_ZONE = 0.45;



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
  readonly cause?: string;
  /** The guard that caught or pricked Nib, for the loss line. */
  readonly by?: GuardAnimal;
  /** Coins Nib picked up. */
  readonly coins: number;
  readonly total: number;
  /** The blots: every coin (95 of 100) picked up, and won without a retry or hint. */
  readonly allCoins: boolean;
  readonly firstTry: boolean;
  readonly bank: Bank;
}

/** Shared between restarts: how many tries this level has had, and whether a hint was used. */
interface Session {
  readonly level: string;
  tries: number;
  hinted: boolean;
}

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
  private world0!: Phaser.GameObjects.Layer;
  private liquid!: LiquidPainter;
  private liquidTex!: Phaser.Textures.CanvasTexture;
  private coins = new Map<number, Phaser.GameObjects.Image>();
  private seen = new Set<number>();
  private nib!: NibView;
  private blots: Phaser.GameObjects.Image[] = [];
  private bodies!: BodiesView;
  private shrine!: ShrineView;
  private dark: DarkLayer | null = null;
  private index = 0;
  private camera!: LevelCamera;
  private fx!: Effects;
  /** A press on the board that isn't the joystick: a tap when it lifts, or a drag to look around. */
  private press: { id: number; x: number; y: number; moved: boolean; pin: string | null } | null = null;
  private pins!: PinsView;
  private chest: Phaser.GameObjects.Image | null = null;
  private acc = 0;
  private ended = false;
  private hearts = HEARTS;
  /** The level just before the last pin pulled (or gate pushed): a lost heart winds back to here. */
  private checkpoint!: WorldSave;
  /** How many taps the hint had seen by then. */
  private checkpointMark = 0;
  /** True while a lost heart's fail plays, before the rewind. */
  private rewinding = false;
  private session!: Session;
  private controls: ControlMode = 'tap';
  /** The joystick while a drag is held: where it started (screen px) and the direction it gives. */
  private stick: { id: number; x: number; y: number; dir: -1 | 0 | 1; climb: -1 | 0 | 1 } | null = null;
  private keyDir: -1 | 0 | 1 = 0;
  private climbKey: -1 | 0 | 1 = 0;

  constructor() {
    super('game');
  }

  private get sfx(): SoundBoard {
    return this.registry.get('sfx') as SoundBoard;
  }

  create(): void {
    this.index = levelIndex(this.registry);
    const level = LEVELS[this.index]!;
    const old = this.registry.get('session') as Session | undefined;
    this.session = old?.level === level.id ? old : { level: level.id, tries: 0, hinted: false };
    this.session.tries++;
    this.registry.set('session', this.session);
    this.world = new World(level);
    this.ended = false;
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
    this.pins = new PinsView(this, this.world0, this.world);
    this.nib = new NibView(this, this.world0);
    if (level.dark) this.dark = new DarkLayer(this, this.world0, level);
    if (this.session.hinted) this.pins.showHint();
    this.checkpoint = this.world.save();
    this.checkpointMark = 0;
    this.sfx.bed(level.ruin ?? 'jungle');
    this.camera = new LevelCamera(this, level);
    this.camera.fit(this.world.nib, true);
    this.press = null;
    this.scale.on('resize', this.refit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sfx.bed(null);
      this.scale.off('resize', this.refit, this);
      this.game.events.off('cmd:restart', this.restart, this);
      this.game.events.off('cmd:hint', this.onHint, this);
      this.game.events.off('cmd:controls', this.onControls, this);
      this.game.events.off('cmd:jump', this.onJump, this);
      this.game.events.off('cmd:leave', this.onLeave, this);
      this.game.events.off('cmd:level', this.onLevel, this);
      this.game.events.off('cmd:map', this.onMap, this);
    });
    this.controls = readControls();
    this.stick = null;
    this.keyDir = 0;
    this.climbKey = 0;
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => this.camera.look(-dx, -dy, this.world.nib));
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.input.keyboard?.on('keyup', this.onKeyUp, this);
    this.game.events.on('cmd:controls', this.onControls, this);
    this.game.events.on('cmd:jump', this.onJump, this);
    this.game.events.on('cmd:restart', this.restart, this);
    this.game.events.on('cmd:hint', this.onHint, this);
    this.game.events.on('cmd:leave', this.onLeave, this);
    this.game.events.on('cmd:level', this.onLevel, this);
    this.game.events.on('cmd:map', this.onMap, this);
    if (!this.scene.isActive('hud')) this.scene.launch('hud');
    const info: LevelInfo = { level, index: this.index, count: LEVELS.length, unlocked: openUpTo(this.registry) };
    // Kept for the interface too, in case it starts after this.
    this.registry.set('levelInfo', info);
    this.game.events.emit('hud:reset', info);
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
    const mark = this.pins.mark;
    if (this.world.tap(id)) {
      this.checkpoint = before;
      this.checkpointMark = mark;
    }
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
    this.pins.resync(this.checkpointMark);
    this.chest?.setTexture(this.world.chestTaken ? 'chest-open' : 'chest-closed').setScale(S);
    this.bodies.resync();
    this.shrine.resync();
    this.nib.reset();
  }

  private refit(): void {
    this.camera.fit(this.world.nib);
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
    if (!this.ended) this.camera.update(delta, this.world.nib);
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
    });
    this.bodies.update();
    this.shrine.update(time);
    this.pins.updateHints();
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
          this.blotGone(e.type, e.x, e.y);
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

  private onPointerDown(p: Phaser.Input.Pointer): void {
    this.sfx.unlock();
    // A tap on the interface (buttons, the card) isn't a tap on the board.
    if (hudTook(p) || this.world.finished) return;
    const pin = this.pinAt(p.x, p.y);
    const looking = this.camera.scrolling && p.y / DPR < screenSize(this.scale).height * LOOK_ZONE;
    if (this.controls === 'stick' && !pin && !looking) {
      // Joystick: a drag off the pins walks Nib.
      this.stick = { id: p.id, x: p.x, y: p.y, dir: 0, climb: 0 };
      this.game.events.emit('stick:show', { x: p.x / DPR, y: p.y / DPR });
      return;
    }
    this.press = { id: p.id, x: p.x, y: p.y, moved: false, pin };
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    if (this.press && this.press.id === p.id) {
      const { moved, pin } = this.press;
      this.press = null;
      if (!moved && !this.world.finished) this.tap(p, pin);
      return;
    }
    if (!this.stick || this.stick.id !== p.id) return;
    this.stick = null;
    this.game.events.emit('stick:hide');
    if (this.keyDir === 0) this.world.command({ kind: 'stay' });
  }

  /** A tap on the board: pulls the pin under it (or pushes a gate back in), or (tap to go) jumps Nib or sends it there. */
  private tap(p: Phaser.Input.Pointer, pin: string | null): void {
    if (pin) {
      this.tryTap(pin);
      return;
    }
    if (this.controls !== 'tap') return;
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    if (Math.hypot(wp.x - this.world.nib.x, wp.y - this.world.nib.y) < NIB_TAP) {
      this.world.jump();
      return;
    }
    this.world.command({ kind: 'goto', x: wp.x, y: wp.y });
    this.markSpot(wp.x);
  }

  /** A small ink cross on the floor where Nib was sent, fading. */
  private markSpot(x: number): void {
    const y = this.world.nib.y + 22;
    const g = this.add.graphics();
    g.lineStyle(3, 0x26316a, 0.85);
    g.lineBetween(x - 7, y - 7, x + 7, y + 7);
    g.lineBetween(x - 7, y + 7, x + 7, y - 7);
    this.world0.add(g);
    this.tweens.add({ targets: g, alpha: 0, duration: 700, delay: 200, onComplete: () => g.destroy() });
  }

  private onControls(mode: ControlMode): void {
    this.controls = mode;
    this.stick = null;
    this.game.events.emit('stick:hide');
    saveControls(mode);
  }

  private onJump(): void {
    this.world.jump();
  }

  private onLeave(): void {
    this.world.leave();
  }

  private walk(dir: -1 | 0 | 1): void {
    this.world.command(dir === 0 ? { kind: 'stay' } : { kind: 'walk', dir });
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    const press = this.press;
    if (press && press.id === p.id && p.isDown) {
      // Dragging the board looks around a level bigger than the screen.
      if (!press.moved && Math.hypot(p.x - press.x, p.y - press.y) / DPR > DRAG_LOOK && this.camera.scrolling) press.moved = true;
      if (press.moved) {
        this.camera.look(p.x - press.x, p.y - press.y, this.world.nib);
        press.x = p.x;
        press.y = p.y;
      }
      return;
    }
    if (this.stick && this.stick.id === p.id) {
      const dx = (p.x - this.stick.x) / DPR;
      const dy = (p.y - this.stick.y) / DPR;
      // Mostly up or down by a vine: climb it.
      if (Math.abs(dy) > STICK_DEAD && Math.abs(dy) > Math.abs(dx) && this.world.canClimb()) {
        const climb: -1 | 1 = dy < 0 ? -1 : 1;
        if (this.stick.climb !== climb) {
          this.stick.climb = climb;
          this.stick.dir = 0;
          this.world.command({ kind: 'climb', dir: climb });
        }
        return;
      }
      if (this.stick.climb) {
        this.stick.climb = 0;
        if (Math.abs(dx) <= STICK_DEAD) this.world.command({ kind: 'stay' });
      }
      const dir: -1 | 0 | 1 = dx > STICK_DEAD ? 1 : dx < -STICK_DEAD ? -1 : 0;
      if (dir !== this.stick.dir) {
        this.stick.dir = dir;
        this.walk(dir);
      }
      this.game.events.emit('stick:move', { dx: Phaser.Math.Clamp(dx, -STICK_RANGE, STICK_RANGE) });
      return;
    }
    const id = this.world.finished ? null : this.pinAt(p.x, p.y);
    if (this.pins.setHover(id)) this.input.setDefaultCursor(id ? 'pointer' : 'default');
  }

  private onKey(e: KeyboardEvent): void {
    this.sfx.unlock();
    const dir = KEY_DIR[e.key];
    if (dir !== undefined) {
      if (dir !== this.keyDir) {
        this.keyDir = dir;
        this.walk(dir);
      }
      return;
    }
    if (e.key === 'Enter') {
      this.world.leave();
      return;
    }
    const climb = CLIMB_KEY[e.key];
    if (climb !== undefined && this.world.canClimb()) {
      e.preventDefault();
      this.climbKey = climb;
      this.world.command({ kind: 'climb', dir: climb });
      return;
    }
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      this.world.jump();
      return;
    }
    if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') this.onMap();
    else if (e.key === 'r' || e.key === 'R') this.restart();
    else if (e.key === 'h' || e.key === 'H') this.onHint();
    else if (/^[1-9]$/.test(e.key)) {
      // Number keys pull the pins in the order the level lists them (and push a gate that's out back in).
      const pin = this.world.pins[Number(e.key) - 1];
      if (pin) this.tryTap(pin.def.id);
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (CLIMB_KEY[e.key] !== undefined && CLIMB_KEY[e.key] === this.climbKey) {
      this.climbKey = 0;
      if (this.world.onVine && this.world.nibOrder.kind === 'climb') this.world.command({ kind: 'stay' });
      return;
    }
    const dir = KEY_DIR[e.key];
    if (dir === undefined || dir !== this.keyDir) return;
    this.keyDir = 0;
    if (!this.stick) this.walk(0);
  }

  private openChest(): void {
    const { chest } = this.world.level;
    if (chest && this.chest) this.fx.openChest(this.chest, chest, this.world.nib);
  }

  /** Numbers the steps left of a winning order over their pins. */
  private onHint(): void {
    this.session.hinted = true;
    this.pins.showHint();
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
    const allTreasure = w.coinsCollected >= Math.ceil(w.coinsTotal * 0.95);
    const firstTry = this.session.tries === 1 && !this.session.hinted && this.hearts === HEARTS;
    if (won) recordWin(w.level.id, w.coinsCollected, allTreasure, firstTry);
    const next = won && this.index + 1 < LEVELS.length ? this.index + 1 : null;
    const result: Result = {
      won,
      hasChest: w.level.chest !== undefined,
      next,
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
    const zoom = Math.min(cam.zoom * 2.2, DPR * 2.4);
    this.scale.off('resize', this.refit, this);
    cam.zoomTo(zoom, 650, 'Cubic.easeInOut');
    cam.pan(x, y - (height * 0.2 * DPR) / zoom, 650, 'Cubic.easeInOut');
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
