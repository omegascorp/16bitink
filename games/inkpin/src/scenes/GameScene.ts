import Phaser from 'phaser';
import { GRASS_H, GROUND_Y, SKY_H } from '../art/board';
import { ART_RES, BOIL, PAPER_HEX } from '../art/palette';
import { BOAR_FRAME } from '../art/boar';
import { CHEST_FRAME, FLAME_FRAME, PIN_RING } from '../art/props';
import { LiquidPainter, LIQUID_RES } from '../art/liquid';
import type { SoundBoard } from '../audio/sfx';
import { CELLAR } from '../level/cellar';
import { segDistance } from '../logic/geom';
import type { PinDef } from '../logic/level';
import { COIN, STEPS_PER_SECOND } from '../logic/particles';
import { World, type BlotEnd, type WorldEvent } from '../logic/world';
import { DPR, screenSize } from './hidpi';
import { NibView } from './nibView';
import { bakeTextures, COIN_TURNS, pinKey } from './textures';

const S = 1 / ART_RES;
const STEP_MS = 1000 / STEPS_PER_SECOND;
/** Most simulation steps run in one frame, so a slow phone slows the game down rather than freezing. */
const MAX_STEPS_PER_FRAME = 5;
/** A tap this close to a pin (in board px) pulls it: generous, for fingers. */
const PIN_REACH = 34;
/** Space kept for the interface: above the board, and around it. */
const HUD_TOP = 76;
const HUD_BOTTOM = 34;
/** Joystick: how far (CSS px) a drag must go before Nib walks, and its full throw. */
const STICK_DEAD = 14;
const STICK_RANGE = 46;
/** A tap this close to Nib (board px) makes Nib jump, in tap-to-go mode. */
const NIB_TAP = 30;
const KEY_DIR: Record<string, -1 | 1> = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 };
const MARGIN = 10;
/** A slow coin is redrawn only once it has moved this far (board px), so a settling heap doesn't twitch. */
const COIN_HOLD = 2;
/** How far the surroundings reach past the board on each side (a multiple of the tiles' sizes). */
const SURROUND = 2048;
/** The sky's colour above its tile: the tile's top edge. */
const SKY_TOP_HEX = 0xc3d4d8;

/** How the player moves Nib: tap the floor to send Nib there, or walk with a joystick / arrow keys. */
export type ControlMode = 'tap' | 'stick';
const CONTROLS_KEY = 'inkpin.controls';

export interface HudState {
  readonly coins: number;
  readonly needed: number;
  readonly chest: boolean;
  readonly started: boolean;
  /** The chest and enough coins: Nib may leave, or stay for the rest of the gold. */
  readonly goal: boolean;
}

/** Everything Nib has carried out of the ruins, kept in the browser. */
export interface Bank {
  readonly coins: number;
  readonly idols: number;
}
const BANK_KEY = 'inkpin.bank';

export function readBank(): Bank {
  try {
    const raw = JSON.parse(window.localStorage.getItem(BANK_KEY) ?? 'null') as unknown;
    if (raw && typeof raw === 'object' && 'coins' in raw && 'idols' in raw) {
      const { coins, idols } = raw as { coins: unknown; idols: unknown };
      if (typeof coins === 'number' && typeof idols === 'number') return { coins, idols };
    }
  } catch {
    // Storage blocked or garbled: start an empty bank.
  }
  return { coins: 0, idols: 0 };
}

function addToBank(coins: number, idols: number): Bank {
  const old = readBank();
  const next = { coins: old.coins + coins, idols: old.idols + idols };
  try {
    window.localStorage.setItem(BANK_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the bank lasts for this visit only.
  }
  return next;
}

/** Marks a pointer press as handled by the interface, which sits above the board and hears it first. */
export function hudTake(p: Phaser.Input.Pointer): void {
  (p as Phaser.Input.Pointer & { hudAt?: number }).hudAt = p.downTime;
}

function hudTook(p: Phaser.Input.Pointer): boolean {
  return (p as Phaser.Input.Pointer & { hudAt?: number }).hudAt === p.downTime;
}

export function readControls(): ControlMode {
  try {
    return window.localStorage.getItem(CONTROLS_KEY) === 'stick' ? 'stick' : 'tap';
  } catch {
    return 'tap';
  }
}

export interface Result {
  readonly won: boolean;
  readonly cause?: string;
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
  tries: number;
  hinted: boolean;
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
  private pins = new Map<string, Phaser.GameObjects.Image>();
  private hints: Phaser.GameObjects.Text[] = [];
  private chest!: Phaser.GameObjects.Image;
  private hover: string | null = null;
  private acc = 0;
  private ended = false;
  private session!: Session;
  private controls: ControlMode = 'tap';
  /** The joystick while a drag is held: where it started (screen px) and the direction it gives. */
  private stick: { id: number; x: number; y: number; dir: -1 | 0 | 1 } | null = null;
  private keyDir: -1 | 0 | 1 = 0;

  constructor() {
    super('game');
  }

  private get sfx(): SoundBoard {
    return this.registry.get('sfx') as SoundBoard;
  }

  create(): void {
    const level = CELLAR;
    this.session = (this.registry.get('session') as Session | undefined) ?? { tries: 0, hinted: false };
    this.session.tries++;
    this.registry.set('session', this.session);
    this.world = new World(level);
    this.ended = false;
    this.acc = 0;
    this.hover = null;
    this.blots = [];
    this.hints = [];
    this.pins.clear();
    this.cameras.main.setBackgroundColor(PAPER_HEX);
    bakeTextures(this, level);
    this.world0 = this.add.layer();
    const { view } = level;
    this.addSurroundings();
    this.world0.add(this.add.image(view.x, view.y, `board-${level.id}`).setOrigin(0).setScale(S));
    this.addTorches();
    // The liquids: a canvas redrawn each frame, at half the board's resolution.
    this.liquid = new LiquidPainter(view.x, view.y, view.w, view.h);
    if (this.textures.exists('liquid')) this.textures.remove('liquid');
    const tex = this.textures.addCanvas('liquid', this.liquid.canvas);
    if (!tex) throw new Error('Could not make the liquid texture');
    this.liquidTex = tex;
    this.world0.add(this.add.image(view.x, view.y, 'liquid').setOrigin(0).setScale(1 / LIQUID_RES));
    // One image per coin, by the coin's id (coins are only ever lost, never added).
    this.coins = new Map();
    const g0 = this.world.grains;
    for (let i = 0; i < g0.count; i++) {
      if (g0.kind[i] !== COIN) continue;
      const id = g0.id[i]!;
      const c = this.add.image(g0.x[i]!, g0.y[i]!, 'coins', id % COIN_TURNS.length).setScale(S);
      c.setAngle(((id * 37) % 40) - 20);
      this.coins.set(id, c);
      this.world0.add(c);
    }
    this.chest = this.add.image(level.chest.x, level.chest.y, 'chest-closed').setScale(S).setOrigin(CHEST_FRAME.ox / CHEST_FRAME.w, CHEST_FRAME.oy / CHEST_FRAME.h);
    this.world0.add(this.chest);
    for (const b of this.world.blots) {
      const img = this.add.image(b.x, b.y, 'blot-grump-0').setScale(S).setOrigin(BOAR_FRAME.ox / BOAR_FRAME.w, BOAR_FRAME.oy / BOAR_FRAME.h);
      this.blots.push(img);
      this.world0.add(img);
    }
    for (const pin of level.pins) this.addPin(pin);
    this.nib = new NibView(this, this.world0);
    if (this.session.hinted) this.showHint();
    this.fitCamera();
    this.scale.on('resize', this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.fitCamera, this);
      this.game.events.off('cmd:restart', this.restart, this);
      this.game.events.off('cmd:hint', this.onHint, this);
      this.game.events.off('cmd:controls', this.onControls, this);
      this.game.events.off('cmd:jump', this.onJump, this);
      this.game.events.off('cmd:leave', this.onLeave, this);
    });
    this.controls = readControls();
    this.stick = null;
    this.keyDir = 0;
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.input.keyboard?.on('keyup', this.onKeyUp, this);
    this.game.events.on('cmd:controls', this.onControls, this);
    this.game.events.on('cmd:jump', this.onJump, this);
    this.game.events.on('cmd:restart', this.restart, this);
    this.game.events.on('cmd:hint', this.onHint, this);
    this.game.events.on('cmd:leave', this.onLeave, this);
    if (!this.scene.isActive('hud')) this.scene.launch('hud');
    this.game.events.emit('hud:reset');
    this.drawWorld(0, 0);
  }

  /**
   * The garden and rock around the level, far past its edges, so a wide screen
   * (or the close-up at the end) never shows bare paper.
   */
  private addSurroundings(): void {
    const left = -SURROUND;
    const width = SURROUND * 2 + 720;
    const skyTop = GROUND_Y - SKY_H;
    const top = this.add.rectangle(left, skyTop - SURROUND, width, SURROUND + 2, SKY_TOP_HEX).setOrigin(0);
    const sky = this.add.tileSprite(left, skyTop, width, SKY_H, 'sky-tile').setOrigin(0);
    // Tiles start on a whole number of tiles from the origin, so they line up with nothing in between.
    const rock = this.add.tileSprite(left, GROUND_Y, width, SURROUND * 2, 'rock-tile').setOrigin(0).setTileScale(S, S);
    const grass = this.add.tileSprite(left, GROUND_Y - GRASS_H / 2, width, GRASS_H, 'grass-tile').setOrigin(0).setTileScale(S, S);
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

  private addPin(pin: PinDef): void {
    const len = Math.hypot(pin.bx - pin.ax, pin.by - pin.ay);
    const w = len + PIN_RING * 2 + 4;
    const img = this.add.image(pin.ax, pin.ay, pinKey(pin.id, false)).setScale(S).setOrigin((PIN_RING + 2) / w, 0.5);
    img.setRotation(Math.atan2(pin.by - pin.ay, pin.bx - pin.ax));
    this.pins.set(pin.id, img);
    this.world0.add(img);
  }

  /** Fits the level's view between the interface bar and the screen's edges. */
  private fitCamera(): void {
    const { width, height } = screenSize(this.scale);
    const { view } = this.world.level;
    const availW = width - MARGIN * 2;
    const availH = height - HUD_TOP - HUD_BOTTOM;
    const zoom = Math.min(availW / view.w, availH / view.h);
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height);
    cam.setZoom(zoom * DPR);
    // Centre the view in the space below the bar.
    const cy = view.y + view.h / 2 - (HUD_TOP - HUD_BOTTOM) / 2 / zoom;
    cam.centerOn(view.x + view.w / 2, cy);
  }

  update(time: number, delta: number): void {
    this.acc += Math.min(delta, 100);
    let steps = 0;
    while (this.acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.acc -= STEP_MS;
      steps++;
      if (this.world.finished) break;
      this.world.step();
      this.react(this.world.events);
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = Math.min(this.acc, STEP_MS);
    this.drawWorld(time, delta);
    if (!this.ended && this.world.finished) this.finish();
    const w = this.world;
    this.game.events.emit('hud:state', { coins: w.coinsCollected, needed: w.level.coinsNeeded, chest: w.chestTaken, started: w.pins.some((p) => p.pulledAt !== null), goal: w.goalMet } satisfies HudState);
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
    this.nib.update(this.world.nib, time, delta);
    const boil = Math.floor(time / 140) % BOIL;
    this.world.blots.forEach((b, i) => {
      const img = this.blots[i];
      if (!img || b.gone) return;
      img.setPosition(b.x, b.y).setFlipX(b.facing < 0);
      img.setTexture(`blot-${b.wet > 0 ? 'scared' : 'grump'}-${boil}`);
    });
  }

  /** Sounds and little effects for what just happened in the world. */
  private react(events: readonly WorldEvent[]): void {
    let steam = 0;
    for (const e of events) {
      switch (e.type) {
        case 'pull':
          this.sfx.play('pull');
          this.pullPin(e.id);
          break;
        case 'blocked':
          this.sfx.play('blocked');
          this.showBlocked(e.id, e.by);
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

  private pullPin(id: string): void {
    const img = this.pins.get(id);
    const def = this.world.level.pins.find((p) => p.id === id);
    if (!img || !def) return;
    // It slides out the way its ring points, and fades.
    const len = Math.hypot(def.bx - def.ax, def.by - def.ay);
    const ux = (def.ax - def.bx) / len;
    const uy = (def.ay - def.by) / len;
    this.tweens.add({ targets: img, x: img.x + ux * (len + 30), y: img.y + uy * (len + 30), alpha: 0, duration: 380, ease: 'Cubic.in' });
    for (const h of this.hints) if (h.getData('pin') === id) h.destroy();
  }

  /** A pin that can't come out: it jolts towards its ring and back, and the pin in its way lights up. */
  private showBlocked(id: string, by: string): void {
    const img = this.pins.get(id);
    const def = this.world.level.pins.find((p) => p.id === id);
    const blocker = this.pins.get(by);
    if (!img || !def || !blocker) return;
    const len = Math.hypot(def.bx - def.ax, def.by - def.ay) || 1;
    const ux = (def.ax - def.bx) / len;
    const uy = (def.ay - def.by) / len;
    const home = { x: def.ax, y: def.ay };
    this.tweens.killTweensOf(img);
    img.setPosition(home.x, home.y);
    this.tweens.add({ targets: img, x: home.x + ux * 7, y: home.y + uy * 7, duration: 70, yoyo: true, repeat: 1, ease: 'Quad.out', onComplete: () => img.setPosition(home.x, home.y) });
    blocker.setTexture(pinKey(by, true));
    this.tweens.add({ targets: blocker, scale: S * 1.06, duration: 120, yoyo: true, repeat: 1, onComplete: () => {
      blocker.setScale(S);
      if (this.hover !== by) blocker.setTexture(pinKey(by, false));
    } });
  }

  /** A picked-up coin hops into Nib's backpack, so even one dug out from deep down is seen going. */
  private flyCoin(id: number, x: number, y: number): void {
    const c = this.coins.get(id);
    if (!c) return;
    this.coins.delete(id);
    c.setPosition(x, y).setVisible(true).setDepth(1);
    const nib = this.world.nib;
    this.tweens.add({
      targets: c,
      x: nib.x - nib.facing * 10,
      y: nib.y - 18,
      scale: S * 0.6,
      alpha: 0.4,
      duration: 260,
      ease: 'Quad.in',
      onComplete: () => c.destroy(),
    });
  }

  private puff(kind: 'steam' | 'smoke', x: number, y: number): void {
    const p = this.add.image(x, y, kind).setScale(S * (0.6 + Math.random() * 0.5)).setAlpha(0.9);
    this.world0.add(p);
    this.tweens.add({ targets: p, y: y - 40 - Math.random() * 30, x: x + (Math.random() - 0.5) * 24, scale: p.scale * 1.8, alpha: 0, duration: 700 + Math.random() * 400, onComplete: () => p.destroy() });
  }

  private blotGone(how: BlotEnd, x: number, y: number): void {
    const i = this.world.blots.findIndex((b) => b.gone === how && Math.abs(b.x - x) < 1 && Math.abs(b.y - y) < 1);
    const img = this.blots[i];
    if (!img) return;
    if (how === 'stomped') {
      // Squashed flat with a boing, then it puffs away, ink and all.
      this.sfx.play('stomp');
      img.setTexture('blot-scared-0');
      this.tweens.add({
        targets: img,
        scaleY: S * 0.28,
        scaleX: S * 1.25,
        duration: 90,
        ease: 'Quad.out',
        onComplete: () => {
          for (let k = 0; k < 3; k++) this.puff('steam', x + (k - 1) * 12, y + 12);
          this.tweens.add({ targets: img, alpha: 0, delay: 350, duration: 250, onComplete: () => img.setVisible(false) });
        },
      });
      return;
    }
    this.sfx.play('squelch');
    img.setTexture('blot-scared-0');
    if (how === 'washed') {
      // Soaked through, it tumbles away on the water.
      img.setTint(0xb8c8e0);
      for (let k = 0; k < 3; k++) this.puff('steam', x + (k - 1) * 10, y - 4);
      this.tweens.add({ targets: img, angle: img.flipX ? 200 : -200, x: x + (img.flipX ? 40 : -40), y: y + 10, alpha: 0, duration: 800, ease: 'Quad.in' });
    } else {
      // A singed bottom: it rockets straight up in a puff of smoke.
      img.setTint(0x7a6a62);
      for (let k = 0; k < 4; k++) this.puff('smoke', x + (k - 1.5) * 8, y + 10);
      this.tweens.add({ targets: img, y: y - 90, alpha: 0, duration: 650, ease: 'Quad.in' });
    }
  }

  private pinAt(px: number, py: number): string | null {
    const wp = this.cameras.main.getWorldPoint(px, py);
    let best: string | null = null;
    let bestD = PIN_REACH;
    for (const p of this.world.pins) {
      if (p.pulledAt !== null) continue;
      const d = Math.min(segDistance(p.def, wp.x, wp.y), Math.hypot(wp.x - p.def.ax, wp.y - p.def.ay) - 4);
      if (d < bestD) {
        bestD = d;
        best = p.def.id;
      }
    }
    return best;
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    this.sfx.unlock();
    // A tap on the interface (buttons, the card) isn't a tap on the board.
    if (hudTook(p) || this.world.finished) return;
    const id = this.pinAt(p.x, p.y);
    if (id) {
      this.world.pull(id);
      return;
    }
    if (this.controls === 'tap') {
      // Tap Nib: a jump. Tap the floor: Nib walks there and stops.
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      if (Math.hypot(wp.x - this.world.nib.x, wp.y - this.world.nib.y) < NIB_TAP) {
        this.world.jump();
        return;
      }
      this.world.command({ kind: 'goto', x: wp.x });
      this.markSpot(wp.x);
      return;
    }
    // Joystick: a drag anywhere off the pins walks Nib.
    this.stick = { id: p.id, x: p.x, y: p.y, dir: 0 };
    this.game.events.emit('stick:show', { x: p.x / DPR, y: p.y / DPR });
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    if (!this.stick || this.stick.id !== p.id) return;
    this.stick = null;
    this.game.events.emit('stick:hide');
    if (this.keyDir === 0) this.world.command({ kind: 'stay' });
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
    try {
      window.localStorage.setItem(CONTROLS_KEY, mode);
    } catch {
      // Storage blocked: the choice lasts for this visit.
    }
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
    if (this.stick && this.stick.id === p.id) {
      const dx = (p.x - this.stick.x) / DPR;
      const dir: -1 | 0 | 1 = dx > STICK_DEAD ? 1 : dx < -STICK_DEAD ? -1 : 0;
      if (dir !== this.stick.dir) {
        this.stick.dir = dir;
        this.walk(dir);
      }
      this.game.events.emit('stick:move', { dx: Phaser.Math.Clamp(dx, -STICK_RANGE, STICK_RANGE) });
      return;
    }
    const id = this.world.finished ? null : this.pinAt(p.x, p.y);
    if (id === this.hover) return;
    if (this.hover) this.pins.get(this.hover)?.setTexture(pinKey(this.hover, false));
    if (id) this.pins.get(id)?.setTexture(pinKey(id, true));
    this.hover = id;
    this.input.setDefaultCursor(id ? 'pointer' : 'default');
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
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      this.world.jump();
      return;
    }
    if (e.key === 'r' || e.key === 'R') this.restart();
    else if (e.key === 'h' || e.key === 'H') this.onHint();
    else if (/^[1-9]$/.test(e.key)) {
      // Number keys pull the pins in the order the level lists them.
      const pin = this.world.pins[Number(e.key) - 1];
      if (pin) this.world.pull(pin.def.id);
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const dir = KEY_DIR[e.key];
    if (dir === undefined || dir !== this.keyDir) return;
    this.keyDir = 0;
    if (!this.stick) this.walk(0);
  }

  /** The chest flies open and its golden idol jumps out into Nib's pack. */
  private openChest(): void {
    const { chest } = this.world.level;
    this.chest.setTexture('chest-open');
    this.tweens.add({ targets: this.chest, scale: S * 1.12, duration: 140, yoyo: true });
    this.sfx.play('win');
    const idol = this.add.image(chest.x, chest.y - 10, 'idol').setScale(S);
    this.world0.add(idol);
    this.tweens.add({ targets: idol, y: chest.y - 70, duration: 380, ease: 'Quad.out', onComplete: () => {
      this.tweens.add({ targets: idol, x: this.world.nib.x - 12, y: this.world.nib.y - 8, scale: S * 0.4, alpha: 0.2, duration: 420, ease: 'Quad.in', onComplete: () => idol.destroy() });
    } });
    for (let k = 0; k < 6; k++) this.puff('steam', chest.x + (k - 2.5) * 8, chest.y - 16);
  }

  private onHint(): void {
    this.session.hinted = true;
    this.showHint();
  }

  /** Numbers the pins still in, in a winning order. */
  private showHint(): void {
    for (const h of this.hints) h.destroy();
    this.hints = [];
    const left = this.world.level.solution.filter((id) => this.world.pins.find((p) => p.def.id === id)?.pulledAt === null);
    left.forEach((id, n) => {
      const def = this.world.level.pins.find((p) => p.id === id);
      if (!def) return;
      const t = this.add.text(def.ax, def.ay, String(n + 1), { fontFamily: 'Caveat', fontSize: '34px', fontStyle: '700', color: '#ffffff', backgroundColor: '#b3322b', padding: { x: 7, y: 0 } });
      t.setOrigin(0.5).setResolution(DPR * 2).setData('pin', id);
      this.world0.add(t);
      this.hints.push(t);
    });
  }

  private finish(): void {
    this.ended = true;
    const w = this.world;
    const status = w.status;
    const floor = w.nib.y + 24;
    if (status.state === 'won') {
      this.sfx.play('win');
      this.nib.cheer();
      this.chest.setTexture('chest-open');
      this.tweens.add({ targets: this.chest, scale: S * 1.15, duration: 160, yoyo: true });
    } else if (status.state === 'lost') {
      this.sfx.play('fail');
      this.nib.fail(status.cause, w.nib, floor);
    }
    this.closeUp(w.nib.x, w.nib.y);
    const won = status.state === 'won';
    const allTreasure = w.coinsCollected >= Math.ceil(w.coinsTotal * 0.95);
    const firstTry = this.session.tries === 1 && !this.session.hinted;
    const result: Result = {
      won,
      cause: status.state === 'lost' ? status.cause : undefined,
      allCoins: allTreasure,
      firstTry,
      coins: w.coinsCollected,
      total: w.coinsTotal,
      // Only what Nib carries out of a won level goes in the bank.
      bank: won ? addToBank(w.coinsCollected, 1) : readBank(),
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
    this.scale.off('resize', this.fitCamera, this);
    cam.zoomTo(zoom, 650, 'Cubic.easeInOut');
    cam.pan(x, y - (height * 0.2 * DPR) / zoom, 650, 'Cubic.easeInOut');
  }

  private restart(): void {
    this.tweens.killAll();
    this.scene.restart();
  }
}
