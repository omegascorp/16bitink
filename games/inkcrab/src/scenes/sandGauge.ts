import Phaser from 'phaser';
import { BLUE_HEX, HIGHLIGHT_HEX, SAND_DRY, SAND_GRAIN, SAND_WET } from '../art/palette';
import { createRng } from '../logic/rng';
import { sandCapacity, SHELLS, shellOf, type ShellKind } from '../logic/shells';

const hex = (c: string): number => Phaser.Display.Color.HexStringToColor(c).color;
const DRY = hex(SAND_DRY);
const WET = hex(SAND_WET);
const GRAIN = hex(SAND_GRAIN);

/** Heap size in HUD px: the most a shell holds is drawn as a dashed heap that grows with it. */
const HEAP = { minW: 34, perClump: 0.55, aspect: 0.55 } as const;
const GRAINS = 70;
const DASH = 4;

/** Most sand any shell holds: the biggest shell of any kind. */
const MOST = Math.max(...(Object.keys(SHELLS) as ShellKind[]).map((k) => sandCapacity(shellOf(k))));

/** Widest heap any shell gets, so the HUD can leave room for it. */
export const HEAP_MAX_W = HEAP.minW + MOST * HEAP.perClump;

/** A heap's outline from left foot to right foot, `w` wide and `h` tall, sitting on `bottom`. */
function mound(cx: number, bottom: number, w: number, h: number): Phaser.Math.Vector2[] {
  const n = 16;
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = (i / n) * 2 - 1;
    // Slumped sides and a soft top, like poured sand.
    return new Phaser.Math.Vector2(cx + (u * w) / 2, bottom - h * Math.pow(1 - u * u, 0.8));
  });
}

function dashed(g: Phaser.GameObjects.Graphics, pts: readonly Phaser.Math.Vector2[]): void {
  let on = true;
  let left = DASH;
  for (let i = 0; i < pts.length - 1; i++) {
    let a = pts[i]!;
    const b = pts[i + 1]!;
    let seg = Phaser.Math.Distance.BetweenPoints(a, b);
    while (seg > 1e-6) {
      const step = Math.min(left, seg);
      const t = step / seg;
      const m = new Phaser.Math.Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      if (on) g.lineBetween(a.x, a.y, m.x, m.y);
      a = m;
      seg -= step;
      left -= step;
      if (left <= 1e-6) {
        on = !on;
        left = DASH;
      }
    }
  }
}

/**
 * The sand the crab carries, as a heap: a dashed outline of the most its
 * shell holds, filled with a stippled heap of what it has. Full, it's
 * highlighted: it digs nothing more until it puts some down.
 */
export function drawSandGauge(g: Phaser.GameObjects.Graphics, cx: number, bottom: number, sand: number, capacity: number): void {
  const w = HEAP.minW + capacity * HEAP.perClump;
  const h = w * HEAP.aspect;
  const full = sand >= capacity;
  if (full) g.fillStyle(HIGHLIGHT_HEX, 0.85).fillRect(cx - w / 2 - 6, bottom - h - 6, w + 12, h + 10);

  // The heap's area follows the load, so each clump adds about the same.
  const k = capacity > 0 ? Math.sqrt(Math.min(1, sand / capacity)) : 0;
  if (k > 0) {
    const pile = mound(cx, bottom, w * k, h * k);
    g.fillStyle(DRY, 1).fillPoints(pile, true);
    g.fillStyle(WET, 0.5).fillPoints(mound(cx, bottom, w * k, h * k * 0.45), true);
    // Fixed grains (seeded) so the stipple doesn't crawl from frame to frame.
    const rng = createRng(7);
    g.fillStyle(GRAIN, 0.75);
    const count = Math.round(GRAINS * k * k);
    for (let i = 0; i < count; i++) {
      const u = rng() * 2 - 1;
      const top = h * k * Math.pow(1 - u * u, 0.8);
      g.fillCircle(cx + ((u * w * k) / 2) * 0.95, bottom - rng() * top * 0.9, rng() < 0.3 ? 1.1 : 0.7);
    }
    g.lineStyle(1.6, BLUE_HEX, 1).strokePoints(pile, false);
  }
  if (!full) {
    g.lineStyle(1.2, BLUE_HEX, 0.55);
    dashed(g, mound(cx, bottom, w, h));
  }
  g.lineStyle(1.4, BLUE_HEX, 1).lineBetween(cx - w / 2 - 4, bottom, cx + w / 2 + 4, bottom);
}
