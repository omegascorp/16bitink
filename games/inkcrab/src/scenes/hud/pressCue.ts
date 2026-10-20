import type Phaser from 'phaser';
import { BLUE_HEX, HIGHLIGHT_HEX, PAPER_HEX } from '../../art/palette';
import type { Press } from '../../logic/firstPress';
import type { Box } from '../../logic/hintFade';
import { stickCentre, STICK, type Vec } from '../../logic/joystick';
import { inkText, wobblyRect } from '../ui';
import { touchButtons, type ButtonSpot, type TouchButton } from './touchButtons';

/** The keys each press is on, and what the note beside the keycaps says. */
const KEYS: Readonly<Record<Press, { readonly keys: readonly string[]; readonly label: string }>> = {
  move: { keys: ['←', '→'], label: 'to walk' },
  jump: { keys: ['Space'], label: 'to jump' },
  grab: { keys: ['E'], label: 'to move in' },
  dig: { keys: ['X'], label: 'to dig' },
  drop: { keys: ['C'], label: 'to drop sand' },
  build: { keys: ['↑', 'C'], label: 'to build a step' },
  hide: { keys: ['Z'], label: 'hold to hide' },
};
/** Most keycaps one press shows. */
const MAX_CAPS = 2;
/** What the note by the highlighted touch control says. */
const TOUCH_LABEL: Readonly<Record<Press, string>> = {
  move: 'drag to walk',
  jump: 'tap to jump',
  grab: 'tap to move in',
  dig: 'hold to dig',
  drop: 'tap dig to drop sand',
  build: 'stick up + dig to build a step',
  hide: 'hold to hide',
};
/** The touch dig button drops sand too, with nothing to dig or no room for more, and builds a step with the stick up; walking is the stick. */
const BUTTON_OF: Readonly<Record<Exclude<Press, 'move'>, TouchButton>> = { jump: 'jump', grab: 'grab', dig: 'dig', drop: 'dig', build: 'dig', hide: 'hide' };

/** The keycap, HUD units: its least width, its height, the depth of its skirt, its gap from the crab, from its note, from the next cap, and its padding round a long key name. */
const CAP = { size: 44, skirt: 5, aside: 14, gap: 8, between: 6, pad: 12 } as const;
/** How far the keycap bobs (units) and the arrow nudges (CSS px), and how fast (radians per ms). */
const BOB = { cap: 4, arrow: 6, speed: 0.006 } as const;
/** The touch arrow, CSS px: its length, and its gap from the button's ring. */
const ARROW = { length: 58, gap: 12, head: 11 } as const;
/** How long one ripple takes to spread out from the touch button, ms. */
const RIPPLE_MS = 1100;
/** The ripple spreads this far past the button's ring, CSS px. */
const RIPPLE_SPREAD = 18;
/** Paper behind the notes, so they read over sand and night skies alike. */
const NOTE_PAPER = 'rgba(245, 240, 225, 0.88)';
/** The touch arrow comes in from up and to the left, clear of the other buttons. */
const ARROW_DIR: Vec = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
/** To the jump button in the corner it comes in steeper, between grab and hide, its note beside it. */
const JUMP_DIR: Vec = { x: -0.45, y: -0.89 };
/** To the stick in the other corner it comes in from up and to the right. */
const STICK_DIR: Vec = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
/** The ghost knob that shows the stick being pushed: how far each way (share of the stick's reach), how fast (radians per ms), its radius (CSS px). */
const GHOST = { reach: 0.7, speed: 0.004, r: 22 } as const;

/**
 * Singles out the press the moment calls for, the first time (see
 * logic/firstPress.ts): on the keyboard, an inked keycap floating beside the
 * crab, behind it, clear of the notes that rise over it and of where it's
 * heading; on a touch screen, the button itself rings with highlighter and an
 * arrow points at it.
 */
export class PressCue {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly keyTexts: readonly Phaser.GameObjects.Text[];
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics();
    this.keyTexts = Array.from({ length: MAX_CAPS }, () => inkText(scene, 0, 0, '', 30).setVisible(false));
    this.label = inkText(scene, 0, 0, '', 22).setBackgroundColor(NOTE_PAPER).setVisible(false);
  }

  /**
   * A keycap beside the crab (`crab` in HUD units), on the side behind it
   * (`facing` is the way it looks), with its note on the far side; kept on a
   * `width`×`height` screen.
   */
  drawKey(press: Press, crab: Box, facing: number, width: number, height: number, now: number): void {
    const { keys, label } = KEYS[press];
    const g = this.g.clear();
    this.label.setText(label).setVisible(true);
    const caps = this.keyTexts.map((t, i) => {
      const key = keys[i];
      t.setVisible(key !== undefined).setText(key ?? '');
      return key === undefined ? null : { t, key, w: Math.max(CAP.size, t.width + CAP.pad * 2) };
    }).filter((c) => c !== null);
    const capsW = caps.reduce((sum, c) => sum + c.w, 0) + CAP.between * (caps.length - 1);
    const w = capsW + CAP.gap + this.label.width;
    const bob = Math.sin(now * BOB.speed) * BOB.cap;
    const toLeft = facing > 0;
    const groupLeft = toLeft ? crab.x - CAP.aside - w : crab.x + crab.w + CAP.aside;
    const clamped = clamp(groupLeft, 8, width - w - 8);
    // The keys sit next to the crab, the note further out.
    const left = toLeft ? clamped + w - capsW : clamped;
    const top = clamp(crab.y + crab.h / 2 - CAP.size / 2 + bob, 8, height - CAP.size - CAP.skirt - 8);
    const glow = 0.45 + 0.25 * Math.sin(now * BOB.speed * 1.5);
    let x = left;
    for (const { t, key, w: capW } of caps) {
      // The key's skirt under its face, then the face washed in highlighter, ringed in ink.
      g.fillStyle(BLUE_HEX, 0.22).fillRect(x, top + CAP.skirt, capW, CAP.size);
      g.fillStyle(PAPER_HEX, 0.97).fillRect(x, top, capW, CAP.size);
      g.fillStyle(HIGHLIGHT_HEX, glow).fillRect(x, top, capW, CAP.size);
      wobblyRect(g, x, top, capW, CAP.size, key.charCodeAt(0), 2, BLUE_HEX);
      g.lineStyle(1.2, BLUE_HEX, 0.45).lineBetween(x + 2, top + CAP.size + CAP.skirt, x + capW - 1, top + CAP.size + CAP.skirt);
      t.setPosition(x + capW / 2, top + CAP.size / 2);
      x += capW + CAP.between;
    }
    this.label.setOrigin(toLeft ? 1 : 0, 0.5).setPosition(toLeft ? left - CAP.gap : left + capsW + CAP.gap, top + CAP.size / 2);
  }

  /**
   * Rings the touch control for `press` (a button, or the stick for walking)
   * and points an arrow at it. `g` is the touch controls' graphics, in screen
   * CSS px; one HUD unit is `k` CSS px.
   */
  drawButton(press: Press, g: Phaser.GameObjects.Graphics, width: number, height: number, k: number, now: number): void {
    this.g.clear();
    for (const t of this.keyTexts) t.setVisible(false);
    const stick = press === 'move';
    const b: ButtonSpot = stick ? { ...stickCentre(height), r: STICK.radius } : touchButtons(width, height)[BUTTON_OF[press]];
    const dir = stick ? STICK_DIR : press === 'jump' ? JUMP_DIR : ARROW_DIR;
    const ripple = (now % RIPPLE_MS) / RIPPLE_MS;
    g.lineStyle(7, HIGHLIGHT_HEX, 0.85).strokeCircle(b.x, b.y, b.r + 5);
    g.lineStyle(2.4, BLUE_HEX, 0.7 * (1 - ripple)).strokeCircle(b.x, b.y, b.r + 8 + ripple * RIPPLE_SPREAD);
    // The stick shows itself being pushed: a knob sliding one way, then the other.
    if (stick) {
      const gx = b.x + Math.sin(now * GHOST.speed) * STICK.radius * GHOST.reach;
      g.fillStyle(HIGHLIGHT_HEX, 0.6).fillCircle(gx, b.y, GHOST.r);
      g.lineStyle(2, BLUE_HEX, 0.8).strokeCircle(gx, b.y, GHOST.r);
    }
    // The arrow nudges in towards the control, and back.
    const nudge = (Math.sin(now * BOB.speed * 1.5) + 1) / 2 * BOB.arrow;
    const near = b.r + ARROW.gap + nudge;
    const tip = { x: b.x + dir.x * near, y: b.y + dir.y * near };
    const tail = { x: tip.x + dir.x * ARROW.length, y: tip.y + dir.y * ARROW.length };
    const back = Math.atan2(dir.y, dir.x);
    g.lineStyle(3.4, BLUE_HEX, 0.95).lineBetween(tail.x, tail.y, tip.x, tip.y);
    for (const side of [-0.5, 0.5]) {
      g.lineBetween(tip.x, tip.y, tip.x + Math.cos(back + side) * ARROW.head, tip.y + Math.sin(back + side) * ARROW.head);
    }
    this.label.setText(TOUCH_LABEL[press]).setVisible(true);
    // The note sits over the arrow's tail; by the stick, beside its ring (on a short screen the tail is up by the crab); by the jump button, where grab and hide are above, beside the tail.
    if (stick) this.label.setOrigin(0, 0.5).setPosition((b.x + b.r + RIPPLE_SPREAD + ARROW.gap) / k, b.y / k);
    else if (press === 'jump') this.label.setOrigin(1, 0.5).setPosition(Math.max(this.label.width + 8, tail.x / k - 6), tail.y / k);
    else this.label.setOrigin(0.5, 1).setPosition(clamp(tail.x / k, this.label.width / 2 + 8, width / k - this.label.width / 2 - 8), tail.y / k - 4);
  }

  hide(): void {
    this.g.clear();
    for (const t of this.keyTexts) t.setVisible(false);
    this.label.setVisible(false);
  }
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
