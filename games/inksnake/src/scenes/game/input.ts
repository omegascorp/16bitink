import Phaser from 'phaser';
import type { SnakeInput } from '../../logic/snake';
import type { Pt } from '../../logic/vec';

export interface InputHooks {
  /** Screen pointer (Phaser pointer px) to board px. */
  readonly toBoard: (p: Phaser.Input.Pointer) => Pt;
  /** True when the pointer is over a HUD button, so the press isn't a strike. */
  readonly overHud: (p: Phaser.Input.Pointer) => boolean;
}

/** A touch shorter than this, that barely moved, is a tap: a strike, ms and CSS px. */
const TAP_MS = 220;
const TAP_MOVE = 14;

/**
 * Mouse, touch and keys to snake input.
 * Mouse: the head follows the pointer; click to strike.
 * Touch: the head follows a held finger; a quick tap strikes (and steers there).
 * Keys: arrows / WASD steer (the head turns towards the direction held), Space strikes, E or Shift is the snake's ability.
 * Pause and sound keys belong to the HUD, which keeps listening while the game is paused.
 */
export class GameInput {
  /** The last press was a finger, so hints speak of taps. */
  touch = false;
  private toward: Pt | null = null;
  private strike = false;
  private readonly held = new Set<string>();
  private down: { x: number; y: number; t: number } | null = null;
  /** The ability's button on screen is held. */
  private buttonHeld = false;
  private abilityWas = false;
  /** The pointer moved since the last read. */
  private moved = false;

  constructor(scene: Phaser.Scene, private readonly hooks: InputHooks) {
    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      // A finger only steers while it's down; a mouse steers just by moving.
      if (p.wasTouch && !p.isDown) return;
      this.toward = hooks.toBoard(p);
      this.moved = true;
    });
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.touch = p.wasTouch;
      if (hooks.overHud(p)) return;
      this.toward = hooks.toBoard(p);
      if (p.wasTouch) {
        this.down = { x: p.x, y: p.y, t: p.event.timeStamp };
        return;
      }
      if (p.button === 0) this.strike = true;
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const d = this.down;
      this.down = null;
      if (!p.wasTouch || !d) return;
      const moved = Math.hypot(p.x - d.x, p.y - d.y) / (window.devicePixelRatio || 1);
      if (p.event.timeStamp - d.t < TAP_MS && moved < TAP_MOVE) this.strike = true;
    });
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

  /** This frame's input; a strike is used up. */
  read(): SnakeInput {
    const ability = this.buttonHeld || this.has('KeyE', 'ShiftLeft', 'ShiftRight');
    const abilityPressed = ability && !this.abilityWas;
    this.abilityWas = ability;
    const x = (this.has('ArrowRight', 'KeyD') ? 1 : 0) - (this.has('ArrowLeft', 'KeyA') ? 1 : 0);
    const y = (this.has('ArrowDown', 'KeyS') ? 1 : 0) - (this.has('ArrowUp', 'KeyW') ? 1 : 0);
    // Keys take over from the pointer until it moves again.
    const face = x !== 0 || y !== 0 ? Math.atan2(y, x) : null;
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
    this.buttonHeld = false;
    this.abilityWas = false;
  }
}
