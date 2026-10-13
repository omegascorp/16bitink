import type Phaser from 'phaser';
import { BUTTON_ICONS, type ButtonIcon } from '../../art/buttonArt';
import { FOOT, FRAME, SHELL_MID, SHELL_UNITS } from '../../art/frame';
import { BLUE_HEX, HIGHLIGHT_HEX, PAPER_HEX } from '../../art/palette';
import { shellFit } from '../../art/shellFit';
import { TEX } from '../../art/textures';
import type { ShellKind } from '../../logic/shells';

/** The on-screen buttons (touch only), in screen CSS px. */
export type TouchButton = 'jump' | 'dig' | 'grab' | 'hide';

export interface ButtonSpot {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** How wide a sign draws, as a share of its button's diameter. */
const SIGN = 0.9;
/** The hide button's shell, as a share of the diameter; it sits a little low, on its foot. */
const SHELL_SIGN = { size: 0.68, drop: 0.32 } as const;

/**
 * Where the buttons sit, clustered in the bottom-right corner under the
 * right thumb: jump in the corner, dig beside it (the two used most), grab
 * above dig, and hide above jump.
 */
export function touchButtons(width: number, height: number): Readonly<Record<TouchButton, ButtonSpot>> {
  return {
    jump: { x: width - 80, y: height - 110, r: 44 },
    dig: { x: width - 190, y: height - 72, r: 38 },
    grab: { x: width - 182, y: height - 182, r: 34 },
    hide: { x: width - 80, y: height - 222, r: 30 },
  };
}

/** The button under (x, y), if any. */
export function buttonAt(x: number, y: number, width: number, height: number): TouchButton | null {
  const spots = touchButtons(width, height);
  for (const name of Object.keys(spots) as TouchButton[]) {
    const b = spots[name];
    if (Math.hypot(x - b.x, y - b.y) <= b.r) return name;
  }
  return null;
}

/** How each button shows: held down (a blue wash), or, for grab, something in reach (highlighter yellow). */
export interface ButtonsState {
  readonly dig: boolean;
  readonly grab: boolean;
  readonly hide: boolean;
  /** The shell the crab wears, drawn on the hide button. */
  readonly shell: ShellKind;
}

/**
 * The touch buttons: paper discs ringed in ink, each with its inked sign
 * (see buttonArt.ts) on top. Everything is laid out in screen CSS px and
 * scaled back to the HUD's units, so the buttons stay thumb-sized however
 * small the margin draws.
 */
export class TouchButtons {
  private readonly icons: Readonly<Record<TouchButton, Phaser.GameObjects.Image>>;

  constructor(scene: Phaser.Scene, private readonly g: Phaser.GameObjects.Graphics) {
    const icon = (key: string): Phaser.GameObjects.Image => scene.add.image(0, 0, key).setVisible(false);
    const signs = Object.fromEntries(BUTTON_ICONS.map((name) => [name, icon(TEX.button(name))])) as Record<ButtonIcon, Phaser.GameObjects.Image>;
    this.icons = { ...signs, hide: icon(TEX.shell('periwinkle', 0)).setOrigin(SHELL_MID / FRAME, FOOT.y / FRAME) };
  }

  /** Draws the buttons for a screen of `width`×`height` CSS px, where one HUD unit is `k` CSS px. */
  draw(width: number, height: number, k: number, state: ButtonsState): void {
    const spots = touchButtons(width, height);
    const lit: Readonly<Record<TouchButton, number | null>> = {
      jump: null,
      dig: state.dig ? BLUE_HEX : null,
      grab: state.grab ? HIGHLIGHT_HEX : null,
      hide: state.hide ? BLUE_HEX : null,
    };
    for (const name of Object.keys(spots) as TouchButton[]) {
      const b = spots[name];
      this.disc(b, lit[name]);
      const img = this.icons[name].setVisible(true);
      if (name === 'hide') {
        const scale = ((b.r * 2 * SHELL_SIGN.size) / SHELL_UNITS) * shellFit(state.shell);
        img.setTexture(TEX.shell(state.shell, 0)).setScale(scale / k).setPosition(b.x / k, (b.y + b.r * SHELL_SIGN.drop) / k);
      } else {
        img.setDisplaySize((b.r * 2 * SIGN) / k, (b.r * 2 * SIGN) / k).setPosition(b.x / k, b.y / k);
      }
    }
  }

  hide(): void {
    for (const img of Object.values(this.icons)) img.setVisible(false);
  }

  /** A paper disc with a double ink ring; washed over with `lit` when lit. */
  private disc(b: ButtonSpot, lit: number | null): void {
    const g = this.g;
    g.fillStyle(PAPER_HEX, 0.72).fillCircle(b.x, b.y, b.r);
    if (lit !== null) g.fillStyle(lit, lit === HIGHLIGHT_HEX ? 0.55 : 0.28).fillCircle(b.x, b.y, b.r);
    g.lineStyle(2.2, BLUE_HEX, 0.75).strokeCircle(b.x, b.y, b.r);
    g.lineStyle(1, BLUE_HEX, 0.3).strokeCircle(b.x + 0.8, b.y - 0.6, b.r - 3);
  }
}
