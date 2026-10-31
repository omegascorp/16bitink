import type { FillDef } from './level';
import { GAS, GRAIN_R, type Grains } from './particles';

/** Packs a block of grains in staggered rows, from its bottom up. */
export function fill(g: Grains, f: FillDef): void {
  const gap = 10;
  const rowH = 9;
  // Gas is held from above: its rows pack downward from under the lid at y1.
  const dir = f.kind === GAS ? -1 : 1;
  let placed = 0;
  for (let row = 0; placed < f.count; row++) {
    const offset = (row % 2) * (gap / 2);
    for (let x = f.x0 + GRAIN_R + offset; x <= f.x1 - GRAIN_R && placed < f.count; x += gap) {
      g.add(f.kind, x, f.y1 - dir * (GRAIN_R + 2 + row * rowH));
      placed++;
    }
  }
}
