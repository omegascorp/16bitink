import Phaser from 'phaser';
import type { LevelDef } from '../logic/level';
import type { Creature } from '../logic/world';
import { DPR, screenSize } from './hidpi';

/** Space kept for the interface: above the board, and around it (CSS px). */
export const HUD_TOP = 76;
export const HUD_BOTTOM = 34;
const MARGIN = 10;
/**
 * The most of a level that must fit on screen (board px). A bigger level
 * shows this much (more where the screen has room) and scrolls with Nib.
 */
const SHOWN = { w: 720, h: 1100 } as const;
/** A scrolling level opens on its far end (the chest) for this long (ms), then glides to Nib. */
const INTRO_MS = 1500;
/** After the player looks around, the camera stays put this long (ms) unless Nib moves. */
const LOOK_HOLD_MS = 3500;
/** Nib moving this far (board px) since the player looked around brings the camera back. */
const LOOK_RELEASE = 40;
/** The camera leads Nib this far (board px) the way it faces, so more of what's ahead shows. */
const LEAD = 110;
/** How quickly the camera eases to where it wants to be (per second). */
const EASE = 4;

/**
 * The level's camera: fits the level between the interface bar and the
 * screen's edges, or, for a level bigger than the screen, shows part of it
 * and follows Nib, leading a little the way Nib faces. The player can drag
 * to look around; the camera holds there until Nib moves on.
 */
export class LevelCamera {
  private zoom = 1;
  private scrolls = false;
  private intro = 0;
  private hold = 0;
  private heldAt = { x: 0, y: 0 };
  /** Where the camera wants its middle (board px), before clamping. */
  private target = { x: 0, y: 0 };

  constructor(private readonly scene: Phaser.Scene, private readonly level: LevelDef) {}

  private get cam(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }

  /** True when the level is bigger than the screen and the camera scrolls. */
  get scrolling(): boolean {
    return this.scrolls;
  }

  /** Fits the camera to the screen; a scrolling level opens on its far end first when `opening`. */
  fit(nib: Creature, opening = false): void {
    const { width, height } = screenSize(this.scene.scale);
    const { view } = this.level;
    const availW = width - MARGIN * 2;
    const availH = height - HUD_TOP - HUD_BOTTOM;
    this.zoom = Math.min(availW / Math.min(view.w, SHOWN.w), availH / Math.min(view.h, SHOWN.h));
    this.scrolls = availW / this.zoom < view.w - 1 || availH / this.zoom < view.h - 1;
    this.cam.setSize(this.scene.scale.width, this.scene.scale.height);
    this.cam.setZoom(this.zoom * DPR);
    if (!this.scrolls) {
      // Centre the view in the space below the bar.
      this.cam.centerOn(view.x + view.w / 2, view.y + view.h / 2 - this.offset());
      return;
    }
    if (opening) {
      // Show what waits at the far end first: the chest, or the end of the level away from Nib.
      const far = this.level.chest ?? { x: nib.x < view.x + view.w / 2 ? view.x + view.w : view.x, y: nib.y < view.y + view.h / 2 ? view.y + view.h : view.y };
      this.intro = INTRO_MS;
      this.target = { x: far.x, y: far.y };
    } else this.target = { x: nib.x, y: nib.y };
    this.place(1);
  }

  /** Follows Nib each frame (or holds where the player looked). */
  update(delta: number, nib: Creature): void {
    if (!this.scrolls) return;
    if (this.intro > 0) {
      this.intro -= delta;
      this.place(1);
      return;
    }
    if (this.hold > 0) {
      this.hold -= delta;
      if (Math.hypot(nib.x - this.heldAt.x, nib.y - this.heldAt.y) > LOOK_RELEASE) this.hold = 0;
      return;
    }
    this.target = { x: nib.x + nib.facing * LEAD, y: nib.y };
    this.place(Math.min(1, (delta / 1000) * EASE));
  }

  /** The player drags the board by (dx, dy) screen px: the camera moves with it and holds there. */
  look(dx: number, dy: number, nib: Creature): void {
    if (!this.scrolls) return;
    this.intro = 0;
    const k = this.cam.zoom;
    const mid = this.cam.midPoint;
    this.target = { x: mid.x - dx / k, y: mid.y + this.offset() - dy / k };
    this.hold = LOOK_HOLD_MS;
    this.heldAt = { x: nib.x, y: nib.y };
    this.place(1);
  }

  /** Half the bar's height, in board px: the view's middle sits this far below the screen's. */
  private offset(): number {
    return (HUD_TOP - HUD_BOTTOM) / 2 / this.zoom;
  }

  /** Eases the camera's middle towards the target, kept inside the level. */
  private place(ease: number): void {
    const { width, height } = screenSize(this.scene.scale);
    const { view } = this.level;
    const shownW = width / this.zoom;
    const shownH = (height - HUD_TOP - HUD_BOTTOM) / this.zoom;
    const clamp = (v: number, lo: number, size: number, shown: number): number => (shown >= size ? lo + size / 2 : Phaser.Math.Clamp(v, lo + shown / 2, lo + size - shown / 2));
    const x = clamp(this.target.x, view.x, view.w, shownW);
    const y = clamp(this.target.y, view.y, view.h, shownH) - this.offset();
    const mid = this.cam.midPoint;
    this.cam.centerOn(mid.x + (x - mid.x) * ease, mid.y + (y - mid.y) * ease);
  }
}
