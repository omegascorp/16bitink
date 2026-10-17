import Phaser from 'phaser';
import { knobOffset, stickDirection, STICK, type StickDirection } from '../../logic/joystick';
import { toView, uiScaleOf, viewSize } from '../hidpi';
import { INK_TEXT, SERIF } from '../kit/type';

/** What the fingers ask of the world this frame, as the keyboard would. */
export interface TouchInput extends StickDirection {
  /** Jump tapped since last read. */
  readonly jump: boolean;
  /** Jump held: the jetpack, in the air. */
  readonly thrust: boolean;
  /** The Bag (or Aboard) button tapped since last read. */
  readonly menu: boolean;
  /** The Pulse button tapped since last read (shown once the pulse is printed). */
  readonly fire: boolean;
}

/** A round button: its middle and radius, in the HUD's units. */
interface Disc {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export const NO_TOUCH: TouchInput = { ix: 0, iy: 0, jump: false, thrust: false, menu: false, fire: false };

/** Sizes in CSS pixels, scaled back up from the HUD's interface scale so they stay thumb-sized. */
const JUMP_R = 46;
const BAG_R = 32;
const MARGIN = 26;
/** The stick takes a thumb landing in the left part of the screen, below the suit's plate. */
const STICK_ZONE = { w: 0.5, top: 0.38 } as const;
const PAPER = 0xf5efdf;
const INK = 0x1f2a55;

/**
 * Touch controls for phones and tablets (spec, "Controls"): a stick for the
 * left thumb that appears wherever it lands in the lower left, and two
 * buttons for the right, Jump (tap to jump, hold to fly) and Bag, which
 * says Aboard at the lander. Drawn in ink on paper discs over the HUD.
 * Fingers are tracked one each, so walking and jumping go together. Taps
 * meant for the HUD's own buttons and cards are left alone.
 */
export class TouchPad {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly jumpText: Phaser.GameObjects.Text;
  private readonly bagText: Phaser.GameObjects.Text;
  private readonly pulseText: Phaser.GameObjects.Text;
  private armed = false;
  private fired = false;
  private stick: { id: number; x: number; y: number; dx: number; dy: number } | null = null;
  private jumpId: number | null = null;
  private jumped = false;
  private menued = false;
  private shown = false;
  private aboard = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(30);
    const text = (t: string, size: number): Phaser.GameObjects.Text =>
      scene.add.text(0, 0, t.toUpperCase(), { fontFamily: SERIF, fontSize: `${size}px`, fontStyle: '600', color: INK_TEXT }).setOrigin(0.5).setDepth(31).setLetterSpacing(size * 0.1);
    this.jumpText = text('Jump', 17);
    this.bagText = text('Bag', 14);
    this.pulseText = text('Pulse', 13);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      scene.input.off('pointerupoutside', this.onUp, this);
    });
    this.setShown(false);
  }

  /** Shows or hides the controls (a key pressed hides them; a touch brings them back). */
  setShown(shown: boolean): void {
    if (shown === this.shown && this.g.visible === shown) return;
    this.shown = shown;
    if (!shown) this.release();
    this.g.setVisible(shown);
    this.jumpText.setVisible(shown);
    this.bagText.setVisible(shown);
    this.pulseText.setVisible(shown && this.armed);
    this.draw();
  }

  /** With the pulse printed, a Pulse button over Jump. */
  setArmed(armed: boolean): void {
    if (armed === this.armed) return;
    this.armed = armed;
    this.pulseText.setVisible(this.shown && armed);
    this.draw();
  }

  get visible(): boolean {
    return this.shown;
  }

  /** At the lander, Bag goes aboard instead: its label says so. */
  setAboard(aboard: boolean): void {
    if (aboard === this.aboard) return;
    this.aboard = aboard;
    this.bagText.setText(aboard ? 'ABOARD' : 'BAG');
    this.draw();
  }

  /** What the fingers ask for now; taps count once. */
  read(): TouchInput {
    if (!this.shown) return NO_TOUCH;
    const dir = this.stick ? stickDirection(this.stick.dx, this.stick.dy) : { ix: 0 as const, iy: 0 as const };
    const out: TouchInput = { ...dir, jump: this.jumped, thrust: this.jumpId !== null, menu: this.menued, fire: this.fired };
    this.jumped = false;
    this.menued = false;
    this.fired = false;
    return out;
  }

  /** Lets go of everything: fingers lifted while the HUD slept never reach it. */
  release(): void {
    this.stick = null;
    this.jumpId = null;
    this.jumped = false;
    this.menued = false;
    this.fired = false;
    this.draw();
  }

  /** Lays the buttons out again for the screen as it is now. */
  layout(): void {
    this.draw();
  }

  /** CSS pixels in the HUD's layout units. */
  private css(px: number): number {
    return px / uiScaleOf(this.scene);
  }

  private buttons(): { jump: Disc; bag: Disc; pulse: Disc } {
    const { width, height } = viewSize(this.scene);
    const jr = this.css(JUMP_R);
    const br = this.css(BAG_R);
    const m = this.css(MARGIN);
    const jump = { x: width - m - jr, y: height - m - jr, r: jr };
    const bag = { x: jump.x - jr - br - this.css(18), y: jump.y - jr * 0.9, r: br };
    const pulse = { x: jump.x - jr * 0.2, y: jump.y - jr - br - this.css(22), r: br };
    return { jump, bag, pulse };
  }

  private onDown(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (!p.wasTouch) return;
    if (!this.shown) this.setShown(true);
    // A tap on the HUD's own buttons (a card, a gauge) is theirs.
    if (over.length) return;
    const at = toView(p.x, p.y, this.scene);
    const { jump, bag, pulse } = this.buttons();
    if (this.armed && Math.hypot(at.x - pulse.x, at.y - pulse.y) <= pulse.r * 1.3) {
      this.fired = true;
    } else if (Math.hypot(at.x - jump.x, at.y - jump.y) <= jump.r * 1.25) {
      this.jumpId = p.id;
      this.jumped = true;
    } else if (Math.hypot(at.x - bag.x, at.y - bag.y) <= bag.r * 1.3) {
      this.menued = true;
    } else {
      const { width, height } = viewSize(this.scene);
      if (!this.stick && at.x < width * STICK_ZONE.w && at.y > height * STICK_ZONE.top) this.stick = { id: p.id, x: at.x, y: at.y, dx: 0, dy: 0 };
    }
    this.draw();
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.stick || p.id !== this.stick.id) return;
    const at = toView(p.x, p.y, this.scene);
    const s = uiScaleOf(this.scene);
    // The pull in CSS pixels, so the stick feels the same however the HUD is scaled.
    this.stick = { ...this.stick, dx: (at.x - this.stick.x) * s, dy: (at.y - this.stick.y) * s };
    this.draw();
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (this.stick?.id === p.id) this.stick = null;
    if (this.jumpId === p.id) this.jumpId = null;
    this.draw();
  }

  /** A paper disc with an ink rim, darker while pressed. */
  private disc(x: number, y: number, r: number, pressed: boolean): void {
    this.g.fillStyle(pressed ? 0xd9cfb4 : PAPER, pressed ? 0.85 : 0.6).fillCircle(x, y, r);
    this.g.lineStyle(this.css(2), INK, 0.75).strokeCircle(x, y, r);
    this.g.lineStyle(this.css(0.8), INK, 0.35).strokeCircle(x, y, r - this.css(5));
  }

  private draw(): void {
    this.g.clear();
    if (!this.shown) return;
    const { jump, bag, pulse } = this.buttons();
    this.disc(jump.x, jump.y, jump.r, this.jumpId !== null);
    this.disc(bag.x, bag.y, bag.r, false);
    this.jumpText.setPosition(jump.x, jump.y);
    this.bagText.setPosition(bag.x, bag.y);
    if (this.armed) {
      this.disc(pulse.x, pulse.y, pulse.r, false);
      this.pulseText.setPosition(pulse.x, pulse.y);
    }
    const st = this.stick;
    if (st) {
      const r = this.css(STICK.radius);
      this.disc(st.x, st.y, r, false);
      const k = knobOffset(st.dx, st.dy);
      const ks = 1 / uiScaleOf(this.scene);
      this.disc(st.x + k.x * ks, st.y + k.y * ks, this.css(22), true);
    } else {
      // Where the stick is, when no thumb is on it: a faint ring in the lower left.
      const { height } = viewSize(this.scene);
      const r = this.css(STICK.radius);
      const x = this.css(MARGIN) + r;
      const y = height - this.css(MARGIN) - r;
      this.g.lineStyle(this.css(1.4), INK, 0.3).strokeCircle(x, y, r);
      this.g.fillStyle(INK, 0.18).fillCircle(x, y, this.css(6));
    }
  }
}
