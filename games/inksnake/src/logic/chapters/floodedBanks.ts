import { pt, TAU, type Pt } from '../vec';

/**
 * Finding the water's edge in the flooded forest: where a capybara comes
 * down to drink, an egret wades, and the jaguar prowls. The boards are
 * water with islands and banks of land, so "the edge" is the nearest bit
 * of land with water just past it.
 */

/** Directions probed round a point, and the step out along each, px. */
const DIRS = 16;
const STEP = 8;
/** The edge is never this close to the board's sides (off the board isn't water to drink). */
const SIDE = 30;
/** A bank spot has land at least this far round it, px. */
const FIRM = 8;

/** A spot at the water's edge: on land, `inset` px in from the water, and the way the water lies. */
export interface EdgeSpot {
  readonly at: Pt;
  readonly facing: number;
}

/** Whether `p` is water on the board itself (the water past the board's sides doesn't count). */
export function boardWater(p: Pt, w: number, h: number, inWater: (q: Pt) => boolean): boolean {
  return p.x > SIDE && p.y > SIDE && p.x < w - SIDE && p.y < h - SIDE && inWater(p);
}

/** The nearest water's edge from `from` (on land), within `reach` px, or null if no water is that near. */
export function waterEdge(from: Pt, reach: number, isWater: (q: Pt) => boolean, inset = 12): EdgeSpot | null {
  let bestA = 0;
  let bestR = Infinity;
  for (let i = 0; i < DIRS; i++) {
    const a = (i / DIRS) * TAU;
    for (let r = STEP; r <= reach && r < bestR; r += STEP) {
      if (!isWater(pt(from.x + Math.cos(a) * r, from.y + Math.sin(a) * r))) continue;
      bestR = r;
      bestA = a;
      break;
    }
  }
  if (!Number.isFinite(bestR)) return null;
  const r = Math.max(0, bestR - inset);
  return { at: pt(from.x + Math.cos(bestA) * r, from.y + Math.sin(bestA) * r), facing: bestA };
}

/**
 * Every bank spot on a grid `step` px apart: land with water within
 * `near` px (the jaguar's beat). `blocked` rules out spots in solid things.
 */
export function bankSpots(
  w: number, h: number, isLand: (q: Pt) => boolean, isWater: (q: Pt) => boolean, blocked: (q: Pt) => boolean, step = 22, near = 40,
): Pt[] {
  const out: Pt[] = [];
  for (let y = SIDE; y <= h - SIDE; y += step) {
    for (let x = SIDE; x <= w - SIDE; x += step) {
      const p = pt(x, y);
      // Well up on the bank, not on the shoreline itself.
      if (!isLand(p) || blocked(p) || [0, 1, 2, 3].some((i) => !isLand(pt(x + Math.cos((i * TAU) / 4) * FIRM, y + Math.sin((i * TAU) / 4) * FIRM)))) continue;
      let wet = false;
      for (let i = 0; i < 8 && !wet; i++) {
        const a = (i / 8) * TAU;
        wet = isWater(pt(x + Math.cos(a) * near, y + Math.sin(a) * near));
      }
      if (wet) out.push(p);
    }
  }
  return out;
}
