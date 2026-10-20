import Phaser from 'phaser';
import type { BoardInput } from '../../logic/board';
import type { Pt } from '../../logic/path';

export interface InputHooks {
  /** Screen pointer (Phaser pointer px) to board px. */
  readonly toBoard: (p: Phaser.Input.Pointer) => Pt;
  /** A tap on the gecko swaps on touch screens. */
  readonly onGecko: (p: Pt) => boolean;
  /** True when the pointer is over a HUD button, so the press isn't a spit. */
  readonly overHud: (p: Phaser.Input.Pointer) => boolean;
}

/**
 * Mouse, touch and keys to board input. Mouse: point to aim, click to spit,
 * right-click to swap. Touch: tap to aim and spit in one go, tap the gecko to
 * swap. Keys: Space / S swap, A D / arrows turn the gecko or run along a
 * branch, W / ↑ / Enter spit. Pause and sound keys belong to the HUD, which
 * keeps listening while the game is paused.
 */
export class GameInput {
  /** The last press was a finger, so hints speak of taps. */
  touch = false;
  private aim: Pt | null = null;
  private fire = false;
  private swap = false;
  private readonly held = new Set<string>();

  constructor(scene: Phaser.Scene, hooks: InputHooks) {
    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch && !p.isDown) return;
      this.aim = hooks.toBoard(p);
    });
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.touch = p.wasTouch;
      if (hooks.overHud(p)) return;
      const at = hooks.toBoard(p);
      if (p.rightButtonDown()) {
        this.swap = true;
        return;
      }
      // Only the left button (or a finger) spits: a middle click does nothing.
      if (!p.wasTouch && p.button !== 0) return;
      if (p.wasTouch && hooks.onGecko(at)) {
        this.swap = true;
        return;
      }
      this.aim = at;
      this.fire = true;
    });
    const keys = scene.input.keyboard;
    keys?.on('keydown', (e: KeyboardEvent) => {
      this.touch = false;
      const k = e.code;
      this.held.add(k);
      // A held key swaps or spits once, not at the keyboard's repeat rate.
      if (e.repeat) return;
      if (k === 'Space' || k === 'KeyS' || k === 'ArrowDown') {
        this.swap = true;
        e.preventDefault();
      } else if (k === 'KeyW' || k === 'ArrowUp' || k === 'Enter') this.fire = true;
    });
    keys?.on('keyup', (e: KeyboardEvent) => this.held.delete(e.code));
    // A key let go while the window is in the background never sends its keyup.
    const blur = (): void => this.reset();
    scene.game.events.on(Phaser.Core.Events.BLUR, blur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.game.events.off(Phaser.Core.Events.BLUR, blur));
  }

  /** This frame's input; one-off presses are used up. */
  read(): BoardInput {
    const left = this.held.has('KeyA') || this.held.has('ArrowLeft');
    const right = this.held.has('KeyD') || this.held.has('ArrowRight');
    const move = (right ? 1 : 0) - (left ? 1 : 0);
    // Keys take over the branch from the pointer until it moves again.
    if (move !== 0) this.aim = null;
    const out: BoardInput = { aim: this.aim, fire: this.fire, swap: this.swap, move };
    this.fire = false;
    this.swap = false;
    return out;
  }

  /** Forgets keys held across a pause. */
  reset(): void {
    this.held.clear();
    this.fire = false;
    this.swap = false;
  }
}
