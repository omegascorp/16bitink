import type Phaser from 'phaser';
import { HAND_FONT } from '../ui';

/**
 * The page's type, a field journal's: printed headings and labels in a
 * book serif (EB Garamond), and handwriting (Caveat) only for what the
 * prospector scribbles: news, notes, numbers jotted beside a find.
 */
export const SERIF = '"EB Garamond", "Iowan Old Style", Georgia, serif';
export const HAND = HAND_FONT;

/** Iron-gall ink: headings and anything you can act on. */
export const INK_TEXT = '#1f2a55';
/** Sepia: running text. */
export const SEPIA = '#55493a';
/** Faded: what isn't there yet, or can't be done. */
export const FADED = '#a39985';
/** Madder: danger and loss only. */
export const MADDER = '#9e2f28';
/** Verdigris: done, mended, ready. */
export const VERDIGRIS = '#2f6f62';

type Text = Phaser.GameObjects.Text;

function serif(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color: string, style: string, wrap?: number): Text {
  return scene.add.text(x, y, text, {
    fontFamily: SERIF,
    fontSize: `${size}px`,
    fontStyle: style,
    color,
    padding: { x: 2, y: 3 },
    ...(wrap ? { wordWrap: { width: wrap }, lineSpacing: size * 0.08 } : {}),
  });
}

/** A heading: spaced small capitals, like a plate's caption. */
export function heading(scene: Phaser.Scene, x: number, y: number, text: string, size = 20, color = INK_TEXT): Text {
  return serif(scene, x, y, text.toUpperCase(), size, color, '600').setLetterSpacing(size * 0.16);
}

/** A label: a name, a figure. */
export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 19, color = INK_TEXT, weight: '500' | '600' | '400' = '500'): Text {
  return serif(scene, x, y, text, size, color, weight);
}

/** Running text, wrapped to `width`. */
export function prose(scene: Phaser.Scene, x: number, y: number, text: string, size: number, width: number, color = SEPIA): Text {
  return serif(scene, x, y, text, size, color, '400', width);
}

/** An aside, in italic, wrapped to `width`. */
export function aside(scene: Phaser.Scene, x: number, y: number, text: string, size: number, width: number, color = SEPIA): Text {
  return serif(scene, x, y, text, size, color, 'italic', width);
}

/** The prospector's own hand: news, scribbled notes. */
export function scrawl(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = INK_TEXT, width?: number): Text {
  return scene.add.text(x, y, text, {
    fontFamily: HAND,
    fontSize: `${size}px`,
    color,
    padding: { x: size * 0.2, y: 4 },
    ...(width ? { wordWrap: { width } } : {}),
  });
}
