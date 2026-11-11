import Phaser from 'phaser';
import { inStickReach, sameSteer, steer, STILL, type Pt, type Steer } from '../logic/stick';
import type { World } from '../logic/world';
import { ZOOM_STEP } from '../logic/zoom';
import { hudTook } from './controls';
import { DPR } from './hidpi';
import type { LevelCamera } from './levelCamera';

export interface BoardHooks {
  /** The pin under a pointer (Phaser px): one still in, or a gate parked out. */
  readonly pinAt: (p: Phaser.Input.Pointer) => string | null;
  /** Pulls a pin, or pushes a gate back in. */
  readonly tapPin: (id: string) => void;
  /** A tap on the board off the pins: a plate or a door may answer it. */
  readonly poke: (p: Phaser.Input.Pointer) => void;
  /** The mouse moved over the board, off the stick and not dragging. */
  readonly hover: (p: Phaser.Input.Pointer) => void;
  /** The camera's zoom changed. */
  readonly zoomed: () => void;
  readonly restart: () => void;
  readonly map: () => void;
  /** Any press or key: the first one lets sound play. */
  readonly unlock: () => void;
}

/** A thumb on the stick: where it landed and how far it's pulled since, CSS px (the HUD draws it). */
export interface StickHold {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
}

/** Registry key: where the HUD shows the stick's resting ring (CSS px), or null while it's hidden. */
export const STICK_REST = 'stickRest';
/** A press that moves further than this (CSS px) is a drag to look around, not a tap. */
const DRAG_LOOK = 10;
/** One notch of ctrl + wheel (or a trackpad pinch's step) zooms by this much per wheel px. */
const WHEEL_ZOOM = 0.004;
const KEY_DIR: Record<string, -1 | 1> = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 };
/** Up and down climb a vine Nib is on or next to (up jumps otherwise). */
const CLIMB_KEY: Record<string, -1 | 1> = { ArrowUp: -1, w: -1, W: -1, ArrowDown: 1, s: 1, S: 1 };
const ZOOM_KEY: Record<string, -1 | 1> = { '+': 1, '=': 1, '-': -1, _: -1 };

const css = (p: Phaser.Input.Pointer): Pt => ({ x: p.x / DPR, y: p.y / DPR });

/**
 * Pointer and keys to Nib and the camera. Tap (or click) a pin to pull it.
 * Touch: the thumbstick in the lower-left corner walks Nib, and climbs a
 * vine pushed up or down; drag the board to look around a big level, pinch
 * to zoom. Mouse: drag to look, wheel to scroll, ctrl + wheel to zoom.
 * Keys: ← → (A D) walk, ↑ ↓ (W S) climb, Space (or ↑ off a vine) jumps,
 * + − zoom, Enter leaves once the goal is met, R restarts, Esc or M back to
 * the map, 1–9 pull the pins in order.
 */
export class BoardInput {
  /** A press on the board off the stick: a tap when it lifts, or a drag to look around. */
  private press: { readonly id: number; x: number; y: number; moved: boolean; readonly pin: string | null } | null = null;
  /** Two fingers on the board: where each is now (CSS px), by pointer id. */
  private pinch: Map<number, Pt> | null = null;
  private stick: (StickHold & { readonly id: number; readonly steer: Steer }) | null = null;
  private keyDir: -1 | 0 | 1 = 0;
  private climbKey: -1 | 0 | 1 = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly world: World, private readonly camera: LevelCamera, private readonly hooks: BoardHooks) {
    const input = scene.input;
    input.on('pointerdown', this.onDown, this);
    input.on('pointermove', this.onMove, this);
    input.on('pointerup', this.onUp, this);
    // A thumb that slides off the canvas lets go too.
    input.on('pointerupoutside', this.onUp, this);
    input.on('wheel', this.onWheel, this);
    input.keyboard?.on('keydown', this.onKey, this);
    input.keyboard?.on('keyup', this.onKeyUp, this);
  }

  /** Each frame: Nib may have come by a vine while the stick is held up or down. */
  update(): void {
    this.steer();
  }

  /** The level wound back (Nib stands still again): a stick still held sends its pull afresh. */
  resync(): void {
    if (this.stick) this.stick = { ...this.stick, steer: STILL };
  }

  private onDown(p: Phaser.Input.Pointer): void {
    this.hooks.unlock();
    // A tap on the interface (buttons, the card) isn't a tap on the board.
    if (hudTook(p) || this.world.finished) return;
    const at = css(p);
    const rest = this.scene.registry.get(STICK_REST) as Pt | null | undefined;
    if (p.wasTouch && !this.stick && rest && inStickReach(at, rest)) {
      this.stick = { id: p.id, x: at.x, y: at.y, dx: 0, dy: 0, steer: STILL };
      this.scene.game.events.emit('stick:hold', this.stick);
      return;
    }
    if (this.pinch) return;
    if (this.press && this.press.id !== p.id) {
      // A second finger on the board: the two pinch to zoom (and the first is no longer a tap).
      this.pinch = new Map([[this.press.id, { x: this.press.x, y: this.press.y }], [p.id, at]]);
      this.press = null;
      return;
    }
    this.press = { id: p.id, ...at, moved: false, pin: this.hooks.pinAt(p) };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const at = css(p);
    const st = this.stick;
    if (st && st.id === p.id) {
      this.stick = { ...st, dx: at.x - st.x, dy: at.y - st.y };
      this.steer();
      this.scene.game.events.emit('stick:hold', this.stick);
      return;
    }
    if (this.pinch?.has(p.id)) {
      this.pinchTo(p.id, at);
      return;
    }
    const press = this.press;
    if (press && press.id === p.id && p.isDown) {
      // Dragging the board looks around a level bigger than the screen.
      if (!press.moved && Math.hypot(at.x - press.x, at.y - press.y) > DRAG_LOOK && this.camera.scrolling) press.moved = true;
      if (press.moved) {
        this.camera.look(at.x - press.x, at.y - press.y, this.world.nib);
        press.x = at.x;
        press.y = at.y;
      }
      return;
    }
    this.hooks.hover(p);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (this.pinch?.delete(p.id)) {
      // The finger left on the board neither taps nor drags: it was half of the pinch.
      if (this.pinch.size < 2) this.pinch = null;
      return;
    }
    const press = this.press;
    if (press && press.id === p.id) {
      this.press = null;
      if (press.moved || this.world.finished) return;
      if (press.pin) this.hooks.tapPin(press.pin);
      else this.hooks.poke(p);
      return;
    }
    if (this.stick && this.stick.id === p.id) this.letGoStick();
  }

  private letGoStick(): void {
    this.stick = null;
    this.scene.game.events.emit('stick:hold', null);
    if (this.keyDir === 0) this.world.command({ kind: 'stay' });
  }

  /** Two fingers moved: the board follows their middle, and zooms as they spread or close. */
  private pinchTo(id: number, at: Pt): void {
    const pinch = this.pinch;
    if (!pinch) return;
    const [a0, b0] = [...pinch.values()];
    pinch.set(id, at);
    const [a1, b1] = [...pinch.values()];
    if (!a0 || !b0 || !a1 || !b1) return;
    const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
    const mid1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
    this.camera.look(mid1.x - mid0.x, mid1.y - mid0.y, this.world.nib);
    const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y);
    const d1 = Math.hypot(a1.x - b1.x, a1.y - b1.y);
    if (d0 > 0 && this.camera.zoomBy(d1 / d0, this.world.nib, mid1)) this.hooks.zoomed();
  }

  /** Zooms in (1) or out (−1) one step about the board's middle: the + − buttons and keys. */
  zoomStep(dir: -1 | 1): void {
    if (this.camera.zoomBy(dir > 0 ? ZOOM_STEP : 1 / ZOOM_STEP, this.world.nib)) this.hooks.zoomed();
  }

  private onWheel(p: Phaser.Input.Pointer, _over: unknown, dx: number, dy: number): void {
    const e = p.event as WheelEvent | undefined;
    // Ctrl + wheel is also how a trackpad pinch arrives.
    if (e?.ctrlKey || e?.metaKey) {
      if (this.camera.zoomBy(Math.exp(-dy * WHEEL_ZOOM), this.world.nib, css(p))) this.hooks.zoomed();
      return;
    }
    this.camera.look(-dx, -dy, this.world.nib);
  }

  /** What the stick asks of Nib now, sent on when it changes. */
  private steer(): void {
    const st = this.stick;
    if (!st || this.world.finished) return;
    const next = steer(st.dx, st.dy, this.world.canClimb());
    if (sameSteer(next, st.steer)) return;
    this.stick = { ...st, steer: next };
    if (next.climb !== 0) this.world.command({ kind: 'climb', dir: next.climb });
    else if (next.dir !== 0) this.world.command({ kind: 'walk', dir: next.dir });
    else if (this.keyDir === 0) this.world.command({ kind: 'stay' });
  }

  private walk(dir: -1 | 0 | 1): void {
    this.world.command(dir === 0 ? { kind: 'stay' } : { kind: 'walk', dir });
  }

  private onKey(e: KeyboardEvent): void {
    this.hooks.unlock();
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
    const zoom = ZOOM_KEY[e.key];
    if (zoom !== undefined) this.zoomStep(zoom);
    else if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') this.hooks.map();
    else if (e.key === 'r' || e.key === 'R') this.hooks.restart();
    else if (/^[1-9]$/.test(e.key)) {
      // Number keys pull the pins in the order the level lists them (and push a gate that's out back in).
      const pin = this.world.pins[Number(e.key) - 1];
      if (pin) this.hooks.tapPin(pin.def.id);
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
    if (!this.stick || sameSteer(this.stick.steer, STILL)) this.walk(0);
  }
}
