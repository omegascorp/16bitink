import Phaser from 'phaser';
import { inStickZone, stickAngle } from '../../logic/joystick';
import type { SnakeInput } from '../../logic/snake';
import type { Pt } from '../../logic/vec';
import { screenSize, toView } from '../hidpi';

export interface InputHooks {
  /** Screen pointer (Phaser pointer px) to board px. */
  readonly toBoard: (p: Phaser.Input.Pointer) => Pt;
  /** True when the pointer is over a HUD button, so the press isn't a strike. */
  readonly overHud: (p: Phaser.Input.Pointer) => boolean;
  /** How far the board is turned on screen, radians (a quarter on an upright phone). */
  readonly turn: () => number;
}

/** A touch shorter than this, that barely moved, is a tap: a strike, ms and CSS px. */
const TAP_MS = 220;
const TAP_MOVE = 14;

/** A finger on the thumbstick: where it landed and how far it's pulled since, CSS px. */
export interface StickHold {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
}

/**
 * Mouse, touch and keys to snake input.
 * Mouse: the head follows the pointer; click to strike.
 * Touch: a thumb in the lower-left corner is a stick that steers like the keys;
 * elsewhere the head follows a held finger; a quick tap strikes (and steers there).
 * Keys: arrows / WASD steer (the head turns towards the direction held), Space strikes, E or Shift is the snake's ability.
 * Pause and sound keys belong to the HUD, which keeps listening while the game is paused.
 */
export class GameInput {
  /** The last press was a finger (or this is a phone), so hints speak of taps. */
  touch: boolean;
  private toward: Pt | null = null;
  private strike = false;
  private readonly held = new Set<string>();
  private down: { id: number; x: number; y: number; t: number } | null = null;
  private stick: (StickHold & { readonly id: number; readonly t: number }) | null = null;
  /** The ability's button on screen is held. */
  private buttonHeld = false;
  private abilityWas = false;
  /** The pointer moved since the last read. */
  private moved = false;

  constructor(scene: Phaser.Scene, private readonly hooks: InputHooks) {
    // A phone's hints speak of fingers from the start, not after the first touch.
    this.touch = !scene.sys.game.device.os.desktop;
    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const st = this.stick;
      if (st && p.id === st.id) {
        const at = toView(p.x, p.y);
        this.stick = { ...st, dx: at.x - st.x, dy: at.y - st.y };
        return;
      }
      // A finger only steers while it's down; a mouse steers just by moving.
      if (p.wasTouch && !p.isDown) return;
      this.toward = hooks.toBoard(p);
      this.moved = true;
    });
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.touch = p.wasTouch;
      if (hooks.overHud(p)) return;
      if (p.wasTouch && !this.stick) {
        const at = toView(p.x, p.y);
        if (inStickZone(at.x, at.y, screenSize(scene))) {
          this.stick = { id: p.id, x: at.x, y: at.y, dx: 0, dy: 0, t: p.event.timeStamp };
          return;
        }
      }
      this.toward = hooks.toBoard(p);
      if (p.wasTouch) {
        this.down = { id: p.id, x: p.x, y: p.y, t: p.event.timeStamp };
        return;
      }
      if (p.button === 0) this.strike = true;
    });
    const up = (p: Phaser.Input.Pointer): void => {
      const st = this.stick;
      if (st && p.id === st.id) {
        // A quick tap on the stick strikes, as a tap anywhere does.
        this.stick = null;
        if (p.event.timeStamp - st.t < TAP_MS && Math.hypot(st.dx, st.dy) < TAP_MOVE) this.strike = true;
        return;
      }
      const d = this.down;
      if (!p.wasTouch || !d || d.id !== p.id) return;
      this.down = null;
      const moved = Math.hypot(p.x - d.x, p.y - d.y) / (window.devicePixelRatio || 1);
      if (p.event.timeStamp - d.t < TAP_MS && moved < TAP_MOVE) this.strike = true;
    };
    scene.input.on('pointerup', up);
    // A thumb that slides off the canvas lets go of the stick too.
    scene.input.on('pointerupoutside', up);
    const keys = scene.input.keyboard;
    keys?.on('keydown', (e: KeyboardEvent) => {
      this.touch = false;
      this.held.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) this.strike = true;
      }
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    keys?.on('keyup', (e: KeyboardEvent) => this.held.delete(e.code));
    // A key let go while the window is in the background never sends its keyup.
    const blur = (): void => this.reset();
    scene.game.events.on(Phaser.Core.Events.BLUR, blur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.game.events.off(Phaser.Core.Events.BLUR, blur));
  }

  /** The HUD's ability button pressed (true) or let go (false). */
  setAbilityButton(held: boolean): void {
    this.buttonHeld = held;
  }

  /** The thumb on the stick, if any (the HUD draws it). */
  get stickHold(): StickHold | null {
    return this.stick;
  }

  /** This frame's input; a strike is used up. */
  read(): SnakeInput {
    const ability = this.buttonHeld || this.has('KeyE', 'ShiftLeft', 'ShiftRight');
    const abilityPressed = ability && !this.abilityWas;
    this.abilityWas = ability;
    const x = (this.has('ArrowRight', 'KeyD') ? 1 : 0) - (this.has('ArrowLeft', 'KeyA') ? 1 : 0);
    const y = (this.has('ArrowDown', 'KeyS') ? 1 : 0) - (this.has('ArrowUp', 'KeyW') ? 1 : 0);
    // Keys (or the stick) take over from the pointer until it moves again.
    const keyFace = x !== 0 || y !== 0 ? Math.atan2(y, x) : null;
    const pull = this.stick ? stickAngle(this.stick.dx, this.stick.dy) : null;
    // The stick is pulled on the screen; the board may be turned on it.
    const face = keyFace ?? (pull === null ? null : pull - this.hooks.turn());
    if (face !== null) this.toward = null;
    const out: SnakeInput = { toward: this.toward, face, strike: this.strike, ability, abilityPressed, moved: this.moved };
    this.strike = false;
    this.moved = false;
    return out;
  }

  private has(...codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  /**
   * The head reached where it was sent: it goes straight on until the
   * pointer moves again, instead of circling a still pointer and biting its
   * own tail.
   */
  arrived(head: Pt, reach = 34): void {
    if (this.toward && Math.hypot(this.toward.x - head.x, this.toward.y - head.y) < reach) this.toward = null;
  }

  /** Forgets keys held across a pause. */
  reset(): void {
    this.held.clear();
    this.strike = false;
    this.down = null;
    this.stick = null;
    this.buttonHeld = false;
    this.abilityWas = false;
  }
}
