import type Phaser from 'phaser';

/** How see-through a piece of the interface goes while the snake is under it. */
const FADED = 0.28;
/** How fast it fades out and back in, per s. */
const RATE = 9;
/** Body samples tested, every this many (4 px apart on the board). */
const STRIDE = 3;

/** Anything with an alpha to fade. */
interface Fadable {
  alpha: number;
  setAlpha(value: number): unknown;
}

/** A piece of the interface: the box the snake is tested against, and what fades. */
export interface FadePiece {
  readonly box: Phaser.GameObjects.Container;
  /** What fades (the box itself, unless something else owns its alpha). */
  readonly fade: readonly Fadable[];
}

/**
 * The HUD goes see-through where the snake slides under it, so the snake
 * (and what it's after) never hides behind the interface. `points` are the
 * snake's head and body in the HUD's own coordinates; `pad` is how close,
 * in those units, still counts as under (half the body's width on screen).
 */
export function fadeUnder(pieces: readonly FadePiece[], points: readonly { x: number; y: number }[], pad: number, dt: number): void {
  const k = Math.min(1, dt * RATE);
  for (const piece of pieces) {
    const want = piece.box.visible && under(piece.box.getBounds(), points, pad) ? FADED : 1;
    for (const o of piece.fade) o.setAlpha(o.alpha + (want - o.alpha) * k);
  }
}

function under(b: Phaser.Geom.Rectangle, points: readonly { x: number; y: number }[], pad: number): boolean {
  if (b.width <= 0 || b.height <= 0) return false;
  for (let i = 0; i < points.length; i += STRIDE) {
    const p = points[i]!;
    if (p.x > b.x - pad && p.x < b.right + pad && p.y > b.y - pad && p.y < b.bottom + pad) return true;
  }
  return false;
}
