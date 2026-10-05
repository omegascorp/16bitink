/**
 * Skyline (bottom-left) rectangle packing for the atlas pages: the page's
 * filled outline is kept as a list of flat steps, and each new rectangle goes
 * where it would sit lowest (then furthest left). Much tighter than shelves
 * for the mix of fish, weeds and props the game draws, in arrival order.
 */
export interface Step {
  readonly x: number;
  readonly y: number;
  readonly w: number;
}

export type Skyline = readonly Step[];

export const emptySkyline = (size: number): Skyline => [{ x: 0, y: 0, w: size }];

/** Where a w×h rectangle fits lowest on `line` within a size×size page, or null if it doesn't fit. */
export function fitOn(line: Skyline, size: number, w: number, h: number): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  for (let i = 0; i < line.length; i++) {
    const x = line[i]!.x;
    if (x + w > size) break;
    // The rectangle rests on the highest step it spans.
    let y = 0;
    for (let k = i; k < line.length && line[k]!.x < x + w; k++) y = Math.max(y, line[k]!.y);
    if (y + h > size) continue;
    if (!best || y < best.y) best = { x, y };
  }
  return best;
}

/** The skyline after placing a w×h rectangle at (x, y). */
export function placeOn(line: Skyline, x: number, y: number, w: number, h: number): Skyline {
  const right = x + w;
  const left = line.filter((s) => s.x < x).map((s) => ({ x: s.x, y: s.y, w: Math.min(s.x + s.w, x) - s.x }));
  const rest = line.filter((s) => s.x + s.w > right).map((s) => {
    const from = Math.max(s.x, right);
    return { x: from, y: s.y, w: s.x + s.w - from };
  });
  // Merge neighbouring steps at the same height.
  return [...left, { x, y: y + h, w }, ...rest].reduce<Step[]>((out, s) => {
    const last = out.at(-1);
    return last && last.y === s.y ? [...out.slice(0, -1), { ...last, w: last.w + s.w }] : [...out, s];
  }, []);
}
