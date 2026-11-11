import Phaser from 'phaser';
import type { LevelDef } from '../logic/level';
import type { Creature } from '../logic/world';
import { clampZoom, zoomAbout, zoomRange, type ZoomRange } from '../logic/zoom';
import { DPR, screenSize } from './hidpi';

/** Space kept for the interface: above the board, and around it (CSS px). The HUD says how much it takes at the top. */
const HUD_TOP = 76;
/** Registry key: how far down the interface reaches over the board (CSS px), set by the HUD. */
export const HUD_TOP_KEY = 'hudTop';
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
 * to look around, and zoom in (or out, on a big level, until all of it
 * shows); the camera holds where they looked until Nib moves on.
 */
export class LevelCamera {
  private zoom = 1;
  /** The zoom that fits the level (or SHOWN of it) on screen. */
  private fitZoom = 1;
  private range: ZoomRange = { min: 1, max: 1 };
  private scrolls = false;
  private intro = 0;
  private hold = 0;
  private heldAt = { x: 0, y: 0 };
  /** Where the camera wants its middle (board px), before clamping. */
  private target = { x: 0, y: 0 };

  /** @param scale the player's zoom, as a multiple of the fit: kept across a restart of the level. */
  constructor(private readonly scene: Phaser.Scene, private readonly level: LevelDef, private scale = 1) {}

  private get cam(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }

  /** True when the level is bigger than the screen and the camera scrolls. */
  get scrolling(): boolean {
    return this.scrolls;
  }

  /** The player's zoom, as a multiple of the level's fit. */
  get zoomScale(): number {
    return this.scale;
  }

  get canZoomIn(): boolean {
    return this.zoom < this.range.max - 1e-6;
  }

  get canZoomOut(): boolean {
    return this.zoom > this.range.min + 1e-6;
  }

  /** Fits the camera to the screen; a scrolling level opens on its far end first when `opening`. */
  fit(nib: Creature, opening = false): void {
    const { view } = this.level;
    const { w: availW, h: availH } = this.avail();
    this.fitZoom = Math.min(availW / Math.min(view.w, SHOWN.w), availH / Math.min(view.h, SHOWN.h));
    this.range = zoomRange(this.fitZoom, Math.min(availW / view.w, availH / view.h));
    this.cam.setSize(this.scene.scale.width, this.scene.scale.height);
    this.setZoom(clampZoom(this.fitZoom * this.scale, this.range));
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

  /** The player drags the board by (dx, dy) CSS px: the camera moves with it and holds there. */
  look(dx: number, dy: number, nib: Creature): void {
    if (!this.scrolls) return;
    const mid = this.cam.midPoint;
    this.holdAt({ x: mid.x - dx / this.zoom, y: mid.y - dy / this.zoom }, nib);
  }

  /**
   * Zooms by `factor` about the screen point `at` (CSS px; the middle of the
   * board's space when left out), keeping the board under it in place.
   * False when the zoom was already at its limit.
   */
  zoomBy(factor: number, nib: Creature, at?: { x: number; y: number }): boolean {
    const z2 = clampZoom(this.zoom * factor, this.range);
    if (Math.abs(z2 - this.zoom) < 1e-6) return false;
    const { width, height } = screenSize(this.scene.scale);
    const about = at ?? { x: width / 2, y: this.top() + (height - this.top() - HUD_BOTTOM) / 2 };
    const mid = zoomAbout(this.cam.midPoint, about, { x: width / 2, y: height / 2 }, this.zoom, z2);
    this.scale = z2 / this.fitZoom;
    this.setZoom(z2);
    this.holdAt(mid, nib);
    return true;
  }

  /** The space the level shows in, below the bar (CSS px). */
  private avail(): { w: number; h: number } {
    const { width, height } = screenSize(this.scene.scale);
    return { w: width - MARGIN * 2, h: height - this.top() - HUD_BOTTOM };
  }

  private setZoom(zoom: number): void {
    const { view } = this.level;
    const { w, h } = this.avail();
    this.zoom = zoom;
    this.scrolls = w / zoom < view.w - 1 || h / zoom < view.h - 1;
    this.cam.setZoom(zoom * DPR);
  }

  /** Puts the camera's middle at `mid` (board px, kept inside the level) and holds it there until Nib moves on. */
  private holdAt(mid: { x: number; y: number }, nib: Creature): void {
    this.intro = 0;
    this.target = { x: mid.x, y: mid.y + this.offset() };
    this.hold = LOOK_HOLD_MS;
    this.heldAt = { x: nib.x, y: nib.y };
    this.place(1);
  }

  /** How far down the interface reaches over the board (CSS px). */
  private top(): number {
    const t = this.scene.registry.get(HUD_TOP_KEY) as unknown;
    return typeof t === 'number' ? t : HUD_TOP;
  }

  /** The interface grew or shrank: fits again, carrying on with the opening look at the far end if it's still under way. */
  refit(nib: Creature): void {
    this.fit(nib, this.intro > 0);
  }

  /** Half the bar's height, in board px: the view's middle sits this far below the screen's. */
  private offset(): number {
    return (this.top() - HUD_BOTTOM) / 2 / this.zoom;
  }

  /** Eases the camera's middle towards the target, kept inside the level. */
  private place(ease: number): void {
    const { width, height } = screenSize(this.scene.scale);
    const { view } = this.level;
    const shownW = width / this.zoom;
    const shownH = (height - this.top() - HUD_BOTTOM) / this.zoom;
    const clamp = (v: number, lo: number, size: number, shown: number): number => (shown >= size ? lo + size / 2 : Phaser.Math.Clamp(v, lo + shown / 2, lo + size - shown / 2));
    const x = clamp(this.target.x, view.x, view.w, shownW);
    const y = clamp(this.target.y, view.y, view.h, shownH) - this.offset();
    const mid = this.cam.midPoint;
    this.cam.centerOn(mid.x + (x - mid.x) * ease, mid.y + (y - mid.y) * ease);
  }
}
