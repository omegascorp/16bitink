import Phaser from 'phaser';
import type { BoardInput } from '../../logic/board';
import { inStickReach, pulled, stickAngle, stickRun } from '../../logic/joystick';
import type { Pt } from '../../logic/path';
import { toView } from '../hidpi';
import type { Disc } from '../hud/touchButtons';

export interface InputHooks {
  /** Screen pointer (Phaser pointer px) to board px. */
  readonly toBoard: (p: Phaser.Input.Pointer) => Pt;
  /** A tap on the gecko swaps on touch screens. */
  readonly onGecko: (p: Pt) => boolean;
  /** True when the pointer is over a HUD button, so the press isn't a spit. */
  readonly overHud: (p: Phaser.Input.Pointer) => boolean;
  /** Hop levels: the other lily pad at board point p, if any. */
  readonly padAt: (p: Pt) => number | null;
  /** Hop levels: the pad before (−1) or after (1) the one the gecko is on. */
  readonly padStep: (step: 1 | -1) => number | null;
  /** Where the thumbstick's ring sits, CSS px, or null while it isn't shown. */
  readonly stickRest: () => Pt | null;
  /** Where the Spit and Swap buttons are, CSS px, or null while they aren't shown. */
  readonly buttons: () => { readonly fire: Disc; readonly swap: Disc } | null;
  /** How far the board is turned on screen, radians (a quarter on an upright phone). */
  readonly turn: () => number;
  /** Where the gecko stands and whether it runs along a branch. */
  readonly gecko: () => Pt & { readonly rail: boolean };
}

/** A thumb on the stick: the ring's centre and how far from it the thumb is, CSS px. */
export interface StickHold {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
}

/** A stick aim is a point this far along the pull from the gecko, board px. */
const STICK_AIM_FAR = 1000;

/**
 * Mouse, touch and keys to board input. Mouse: point to aim, click to spit,
 * right-click to swap. Touch: tap to aim and spit in one go, tap the gecko to
 * swap; or the thumbstick in the lower-left corner (pull to aim, or to run
 * along a branch) with the Spit button in the lower-right and Swap above it.
 * Either: click or tap another lily pad to hop onto it. Keys: Space /
 * S swap, A D / arrows turn the gecko or run along a branch, W / ↑ / Enter
 * spit, Q / E hop to the previous / next pad. Pause and sound keys belong to the HUD, which
 * keeps listening while the game is paused.
 */
export class GameInput {
  /** The last press was a finger (or this is a phone), so hints speak of taps. */
  touch: boolean;
  private aim: Pt | null = null;
  private fire = false;
  private swap = false;
  private hop: number | null = null;
  private readonly held = new Set<string>();
  private stick: (StickHold & { readonly id: number }) | null = null;
  /** The fingers on the Spit and Swap buttons (their moves aim nothing). */
  private readonly pressing = new Map<number, 'fire' | 'swap'>();
  /** Fingers still down from the stick or a button across a pause: ignored until they lift. */
  private readonly stale = new Set<number>();

  constructor(scene: Phaser.Scene, private readonly hooks: InputHooks) {
    this.touch = !scene.sys.game.device.os.desktop;
    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const st = this.stick;
      if (st && p.id === st.id) {
        const at = toView(p.x, p.y);
        // Measured from where the ring is now (a turned screen moves it).
        const rest = hooks.stickRest() ?? st;
        this.stick = { ...st, x: rest.x, y: rest.y, dx: at.x - rest.x, dy: at.y - rest.y };
        return;
      }
      if (this.pressing.has(p.id) || this.stale.has(p.id) || (p.wasTouch && !p.isDown)) return;
      this.aim = hooks.toBoard(p);
    });
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.touch = p.wasTouch;
      this.stale.delete(p.id);
      if (hooks.overHud(p)) return;
      if (p.wasTouch && this.pressButton(p)) return;
      if (p.wasTouch && !this.stick) {
        const rest = hooks.stickRest();
        const css = toView(p.x, p.y);
        // The pull is from the ring's centre, wherever on it the thumb lands.
        if (rest && inStickReach(css, rest)) {
          this.stick = { id: p.id, x: rest.x, y: rest.y, dx: css.x - rest.x, dy: css.y - rest.y };
          return;
        }
      }
      const at = hooks.toBoard(p);
      if (p.rightButtonDown()) {
        this.swap = true;
        return;
      }
      // Only the left button (or a finger) spits: a middle click does nothing.
      if (!p.wasTouch && p.button !== 0) return;
      const pad = hooks.padAt(at);
      if (pad !== null) {
        this.hop = pad;
        return;
      }
      if (p.wasTouch && hooks.onGecko(at)) {
        this.swap = true;
        return;
      }
      this.aim = at;
      this.fire = true;
    });
    // Letting go of the stick leaves the aim where it pointed: the Spit button spits.
    const up = (p: Phaser.Input.Pointer): void => {
      this.pressing.delete(p.id);
      this.stale.delete(p.id);
      if (this.stick?.id === p.id) this.stick = null;
    };
    scene.input.on('pointerup', up);
    // A thumb that slides off the canvas lets go too.
    scene.input.on('pointerupoutside', up);
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
      else if (k === 'KeyQ' || k === 'KeyE') this.hop = hooks.padStep(k === 'KeyQ' ? -1 : 1);
    });
    keys?.on('keyup', (e: KeyboardEvent) => this.held.delete(e.code));
    // A key let go while the window is in the background never sends its keyup.
    const blur = (): void => this.reset();
    scene.game.events.on(Phaser.Core.Events.BLUR, blur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.game.events.off(Phaser.Core.Events.BLUR, blur));
  }

  /** A finger landing on the Spit or Swap button presses it. */
  private pressButton(p: Phaser.Input.Pointer): boolean {
    const discs = this.hooks.buttons();
    if (!discs) return false;
    const css = toView(p.x, p.y);
    const on = (d: Disc): boolean => Math.hypot(css.x - d.x, css.y - d.y) <= d.r;
    const which = on(discs.fire) ? 'fire' : on(discs.swap) ? 'swap' : null;
    if (!which) return false;
    this.pressing.set(p.id, which);
    if (which === 'fire') this.fire = true;
    else this.swap = true;
    return true;
  }

  /** Whether a finger is on the Spit or Swap button now (the HUD shows it pressed). */
  isPressing(which: 'fire' | 'swap'): boolean {
    for (const w of this.pressing.values()) if (w === which) return true;
    return false;
  }

  /** The thumb on the stick, if any (the HUD draws it). */
  get stickHold(): StickHold | null {
    return this.stick;
  }

  /** The stick is pulled out of its dead zone, so the aim line shows. */
  get stickAiming(): boolean {
    return this.stick !== null && pulled(this.stick.dx, this.stick.dy);
  }

  /** Points the aim along a pull: a far point that way from the gecko (rail geckos keep spitting straight up). */
  private aimAlong(st: StickHold): void {
    const g = this.hooks.gecko();
    const a = stickAngle(st.dx, st.dy, this.hooks.turn());
    if (g.rail || a === null) return;
    this.aim = { x: g.x + Math.cos(a) * STICK_AIM_FAR, y: g.y + Math.sin(a) * STICK_AIM_FAR };
  }

  /** This frame's input; one-off presses are used up. */
  read(): BoardInput {
    const left = this.held.has('KeyA') || this.held.has('ArrowLeft');
    const right = this.held.has('KeyD') || this.held.has('ArrowRight');
    let move = (right ? 1 : 0) - (left ? 1 : 0);
    const st = this.stick;
    if (move === 0 && st) {
      if (this.hooks.gecko().rail) move = stickRun(st.dx, st.dy, this.hooks.turn());
      else this.aimAlong(st);
    }
    // Keys (or the stick on a branch) take over from the pointer until it moves again.
    if (move !== 0) this.aim = null;
    const out: BoardInput = { aim: this.aim, fire: this.fire, swap: this.swap, move, hop: this.hop };
    this.fire = false;
    this.swap = false;
    this.hop = null;
    return out;
  }

  /** Forgets keys and fingers held across a pause. */
  reset(): void {
    this.held.clear();
    this.fire = false;
    this.swap = false;
    this.hop = null;
    for (const id of this.pressing.keys()) this.stale.add(id);
    if (this.stick) this.stale.add(this.stick.id);
    this.stick = null;
    this.pressing.clear();
  }
}
