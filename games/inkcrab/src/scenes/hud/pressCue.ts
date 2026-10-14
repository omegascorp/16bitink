import type Phaser from 'phaser';
import { BLUE_HEX, HIGHLIGHT_HEX, PAPER_HEX } from '../../art/palette';
import type { Press } from '../../logic/firstPress';
import type { Box } from '../../logic/hintFade';
import { inkText, wobblyRect } from '../ui';
import { touchButtons, type TouchButton } from './touchButtons';

/** The key each press is on, and what the note beside the keycap says. */
const KEYS: Readonly<Record<Press, { readonly key: string; readonly label: string }>> = {
  grab: { key: 'E', label: 'to move in' },
  dig: { key: 'X', label: 'to dig' },
  drop: { key: 'C', label: 'to drop sand' },
  hide: { key: 'Z', label: 'hold to hide' },
};
/** What the note by the highlighted touch button says. */
const TOUCH_LABEL: Readonly<Record<Press, string>> = {
  grab: 'tap to move in',
  dig: 'hold to dig',
  drop: 'tap dig to drop sand',
  hide: 'hold to hide',
};
/** The touch dig button drops sand too, with nothing to dig or no room for more. */
const BUTTON_OF: Readonly<Record<Press, TouchButton>> = { grab: 'grab', dig: 'dig', drop: 'dig', hide: 'hide' };

/** The keycap, HUD units: its size, the depth of its skirt, its gap from the crab, and from its note. */
const CAP = { size: 44, skirt: 5, aside: 14, gap: 8 } as const;
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
const ARROW_DIR = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 } as const;

/**
 * Singles out the press the moment calls for, the first time (see
 * logic/firstPress.ts): on the keyboard, an inked keycap floating beside the
 * crab, behind it, clear of the notes that rise over it and of where it's
 * heading; on a touch screen, the button itself rings with highlighter and an
 * arrow points at it.
 */
export class PressCue {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly keyText: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics();
    this.keyText = inkText(scene, 0, 0, '', 30).setVisible(false);
    this.label = inkText(scene, 0, 0, '', 22).setBackgroundColor(NOTE_PAPER).setVisible(false);
  }

  /**
   * A keycap beside the crab (`crab` in HUD units), on the side behind it
   * (`facing` is the way it looks), with its note on the far side; kept on a
   * `width`×`height` screen.
   */
  drawKey(press: Press, crab: Box, facing: number, width: number, height: number, now: number): void {
    const { key, label } = KEYS[press];
    const g = this.g.clear();
    this.label.setText(label).setVisible(true);
    this.keyText.setText(key).setVisible(true);
    const w = CAP.size + CAP.gap + this.label.width;
    const bob = Math.sin(now * BOB.speed) * BOB.cap;
    const toLeft = facing > 0;
    const groupLeft = toLeft ? crab.x - CAP.aside - w : crab.x + crab.w + CAP.aside;
    const clamped = clamp(groupLeft, 8, width - w - 8);
    // The key sits next to the crab, the note further out.
    const left = toLeft ? clamped + w - CAP.size : clamped;
    const top = clamp(crab.y + crab.h / 2 - CAP.size / 2 + bob, 8, height - CAP.size - CAP.skirt - 8);
    const glow = 0.45 + 0.25 * Math.sin(now * BOB.speed * 1.5);
    // The key's skirt under its face, then the face washed in highlighter, ringed in ink.
    g.fillStyle(BLUE_HEX, 0.22).fillRect(left, top + CAP.skirt, CAP.size, CAP.size);
    g.fillStyle(PAPER_HEX, 0.97).fillRect(left, top, CAP.size, CAP.size);
    g.fillStyle(HIGHLIGHT_HEX, glow).fillRect(left, top, CAP.size, CAP.size);
    wobblyRect(g, left, top, CAP.size, CAP.size, key.charCodeAt(0), 2, BLUE_HEX);
    g.lineStyle(1.2, BLUE_HEX, 0.45).lineBetween(left + 2, top + CAP.size + CAP.skirt, left + CAP.size - 1, top + CAP.size + CAP.skirt);
    this.keyText.setPosition(left + CAP.size / 2, top + CAP.size / 2);
    this.label.setOrigin(toLeft ? 1 : 0, 0.5).setPosition(toLeft ? left - CAP.gap : left + CAP.size + CAP.gap, top + CAP.size / 2);
  }

  /**
   * Rings the touch button for `press` and points an arrow at it. `g` is the
   * touch controls' graphics, in screen CSS px; one HUD unit is `k` CSS px.
   */
  drawButton(press: Press, g: Phaser.GameObjects.Graphics, width: number, height: number, k: number, now: number): void {
    this.g.clear();
    this.keyText.setVisible(false);
    const b = touchButtons(width, height)[BUTTON_OF[press]];
    const ripple = (now % RIPPLE_MS) / RIPPLE_MS;
    g.lineStyle(7, HIGHLIGHT_HEX, 0.85).strokeCircle(b.x, b.y, b.r + 5);
    g.lineStyle(2.4, BLUE_HEX, 0.7 * (1 - ripple)).strokeCircle(b.x, b.y, b.r + 8 + ripple * RIPPLE_SPREAD);
    // The arrow nudges in towards the button, and back.
    const nudge = (Math.sin(now * BOB.speed * 1.5) + 1) / 2 * BOB.arrow;
    const near = b.r + ARROW.gap + nudge;
    const tip = { x: b.x + ARROW_DIR.x * near, y: b.y + ARROW_DIR.y * near };
    const tail = { x: tip.x + ARROW_DIR.x * ARROW.length, y: tip.y + ARROW_DIR.y * ARROW.length };
    const back = Math.atan2(ARROW_DIR.y, ARROW_DIR.x);
    g.lineStyle(3.4, BLUE_HEX, 0.95).lineBetween(tail.x, tail.y, tip.x, tip.y);
    for (const side of [-0.5, 0.5]) {
      g.lineBetween(tip.x, tip.y, tip.x + Math.cos(back + side) * ARROW.head, tip.y + Math.sin(back + side) * ARROW.head);
    }
    this.label.setText(TOUCH_LABEL[press]).setOrigin(0.5, 1).setVisible(true);
    this.label.setPosition(clamp(tail.x / k, this.label.width / 2 + 8, width / k - this.label.width / 2 - 8), tail.y / k - 4);
  }

  hide(): void {
    this.g.clear();
    this.keyText.setVisible(false);
    this.label.setVisible(false);
  }
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
