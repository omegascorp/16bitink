import type { ShellKind } from '../logic/shells';

/**
 * Every kind of shell comes in every size it's found in (see shells.ts), so
 * a size-N shell must look size N whatever its kind. The drawings don't
 * agree on that by themselves: a periwinkle is drawn about 80 frame px
 * across, a horse conch nearly 230. So each kind's drawing is measured once
 * it's baked, and scaled by its fit: to the same bulk (the square root of
 * its area) as the rest, and no longer than `LONG`, so a slender spire
 * doesn't stretch far past its crab.
 */
const BULK = 88;
const LONG = 134;
/** Alpha a pixel needs to count as drawn. */
const INKED = 40;

const FIT = new Map<ShellKind, number>();

/** Measures a baked shell drawing (frame px, one texture px each) and records its kind's fit. */
export function measureShell(kind: ShellKind, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: W, height: H } = canvas;
  const px = ctx.getImageData(0, 0, W, H).data;
  let x0 = W;
  let x1 = -1;
  let y0 = H;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3]! <= INKED) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  if (x1 < x0) return;
  FIT.set(kind, fitFor(x1 - x0 + 1, y1 - y0 + 1));
}

/** How much to scale a kind's drawing so it's drawn to its size (1 until it's been measured). */
export function shellFit(kind: ShellKind): number {
  return FIT.get(kind) ?? 1;
}

/** The fit a drawing of `w` × `h` frame px gets: for tests. */
export function fitFor(w: number, h: number): number {
  return Math.min(BULK / Math.sqrt(w * h), LONG / w);
}
