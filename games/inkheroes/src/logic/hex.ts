/**
 * The battlefield: 13 × 9 pointy-top hexes in staggered rows (odd rows sit
 * half a hex to the right), indexed col + row × COLS as in VCMI.
 */
export const COLS = 13;
export const ROWS = 9;
export const HEX_COUNT = COLS * ROWS;

export type Hex = number;

export const hexAt = (col: number, row: number): Hex => col + row * COLS;
export const colOf = (h: Hex): number => h % COLS;
export const rowOf = (h: Hex): number => Math.floor(h / COLS);
export const onField = (col: number, row: number): boolean => col >= 0 && col < COLS && row >= 0 && row < ROWS;

/** The (up to) six hexes touching `h`. */
export function neighbours(h: Hex): Hex[] {
  const c = colOf(h);
  const r = rowOf(h);
  const shift = r % 2 === 1 ? 0 : -1;
  const cand: [number, number][] = [
    [c - 1, r], [c + 1, r],
    [c + shift, r - 1], [c + shift + 1, r - 1],
    [c + shift, r + 1], [c + shift + 1, r + 1],
  ];
  return cand.filter(([x, y]) => onField(x, y)).map(([x, y]) => hexAt(x, y));
}

/** Steps between two hexes on an open field. */
export function distance(a: Hex, b: Hex): number {
  const [ax, ay, az] = cube(a);
  const [bx, by, bz] = cube(b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

function cube(h: Hex): [number, number, number] {
  const r = rowOf(h);
  const q = colOf(h) - (r - (r & 1)) / 2;
  return [q, r, -q - r];
}

/** A hex's centre in hex-size units (a hex is 1 wide, rows 0.75 apart × √3/2·… see layout). */
export function hexCentre(h: Hex, size: number): { x: number; y: number } {
  const w = Math.sqrt(3) * size;
  const r = rowOf(h);
  return { x: colOf(h) * w + (r % 2 === 1 ? w / 2 : 0) + w / 2, y: r * size * 1.5 + size };
}

/** The hex under a point, or null off the field (point in the same units as hexCentre). */
export function hexUnder(x: number, y: number, size: number): Hex | null {
  let best: Hex | null = null;
  let bestD = Infinity;
  const guessRow = Math.round((y - size) / (size * 1.5));
  for (let r = guessRow - 1; r <= guessRow + 1; r++) {
    for (let c = -1; c <= COLS; c++) {
      if (!onField(c, r)) continue;
      const p = hexCentre(hexAt(c, r), size);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        best = hexAt(c, r);
      }
    }
  }
  return bestD <= size ? best : null;
}

/**
 * Hexes a unit standing on `from` can reach within `speed` steps: by walking
 * round `blocked` hexes, or (flying) any free hex within that distance.
 * Returns each reachable hex with its step count; `from` itself is 0.
 */
export function reachable(from: Hex, speed: number, blocked: ReadonlySet<Hex>, flies: boolean): Map<Hex, number> {
  const out = new Map<Hex, number>([[from, 0]]);
  if (flies) {
    for (let h = 0; h < HEX_COUNT; h++) {
      const d = distance(from, h);
      if (h !== from && d <= speed && !blocked.has(h)) out.set(h, d);
    }
    return out;
  }
  let frontier = [from];
  for (let step = 1; step <= speed && frontier.length > 0; step++) {
    const next: Hex[] = [];
    for (const h of frontier) {
      for (const n of neighbours(h)) {
        if (out.has(n) || blocked.has(n)) continue;
        out.set(n, step);
        next.push(n);
      }
    }
    frontier = next;
  }
  return out;
}

/** The walking route from `from` to `to` round `blocked` (excluding `from`), or [] if none. */
export function route(from: Hex, to: Hex, blocked: ReadonlySet<Hex>): Hex[] {
  if (from === to) return [];
  const prev = new Map<Hex, Hex>([[from, from]]);
  let frontier = [from];
  while (frontier.length > 0 && !prev.has(to)) {
    const next: Hex[] = [];
    for (const h of frontier) {
      for (const n of neighbours(h)) {
        if (prev.has(n) || (blocked.has(n) && n !== to)) continue;
        prev.set(n, h);
        next.push(n);
      }
    }
    frontier = next;
  }
  if (!prev.has(to)) return [];
  const path: Hex[] = [];
  for (let h = to; h !== from; h = prev.get(h)!) path.unshift(h);
  return path;
}
