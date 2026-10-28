import type { Boulder } from './boulders';
import type { DrainDef } from './level';
import { COIN, STONE, type Grains } from './particles';

/**
 * Drains: a grate in the floor; liquid and coins that reach the box beneath
 * it are gone. A boulder sitting in a drain plugs it shut.
 */

export interface DrainedCoin {
  readonly type: 'drained';
  readonly x: number;
  readonly y: number;
}

/** Removes every grain in an open drain's box; reports each coin lost. */
export function drainGrains(drains: readonly DrainDef[], boulders: readonly Boulder[], g: Grains, events: DrainedCoin[]): void {
  const open = drains.filter((d) => !boulders.some((b) => !b.gone && plugs(b, d)));
  if (!open.length) return;
  for (let i = 0; i < g.count; i++) {
    const k = g.kind[i];
    if (k === STONE || k === 0) continue;
    if (!open.some((d) => inBox(d, g.x[i]!, g.y[i]!))) continue;
    g.remove(i);
    if (k === COIN) events.push({ type: 'drained', x: g.x[i]!, y: g.y[i]! });
  }
}

function inBox(d: DrainDef, x: number, y: number): boolean {
  return x > d.x0 && x < d.x1 && y > d.y0 && y < d.y1;
}

/** True when a boulder fills a drain: its circle reaches into the drain's box. */
function plugs(b: Boulder, d: DrainDef): boolean {
  const nx = Math.max(d.x0, Math.min(b.x, d.x1));
  const ny = Math.max(d.y0, Math.min(b.y, d.y1));
  return Math.hypot(b.x - nx, b.y - ny) < b.r;
}
