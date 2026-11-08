import type { MapCover } from '../../art/pixel/map';
import type { Grid } from '../../logic/map';
import { cellRandom } from '../battle/pixelScenery';
import { MAP_TILE } from './pixelGround';

/**
 * Where the map's cover stands: trees and pines a few to a tile, mountain
 * ranges laid along each row's run of mountain tiles in two-tile peaks and
 * three-tile ranges, a boulder on a rock tile, a bridge across each run of bridge
 * tiles. Positions are feet, map pixels (a tile is MAP_TILE). No Phaser
 * here, so it can be tested.
 */

export interface CoverPlacement {
  readonly kind: MapCover;
  /** Which sprite of the kind (taken modulo how many there are). */
  readonly pick: number;
  readonly x: number;
  readonly y: number;
  readonly flip: boolean;
}

/** Where a tile's ground line is: feet stand this far down it. */
const FOOT = 44;

/** Trees on a forest tile: a back one and (mostly) a front one, jittered. */
function trees(kind: 'tree' | 'pine', tx: number, ty: number, seed: number): CoverPlacement[] {
  const r = (n: number): number => cellRandom(seed, tx, ty, n);
  const out: CoverPlacement[] = [];
  const spots = r(0) < 0.75 ? [[0.3, 0.55], [0.7, 0.95]] : [[0.5, 0.8]];
  spots.forEach(([fx, fy], i) => {
    out.push({
      kind, pick: Math.floor(r(1 + i) * 1000),
      x: Math.round(tx * MAP_TILE + MAP_TILE * fx! + (r(3 + i) - 0.5) * 12),
      y: Math.round(ty * MAP_TILE + MAP_TILE * fy! * 0.5 + 20 + (r(5 + i) - 0.5) * 6),
      flip: r(7 + i) < 0.5,
    });
  });
  return out;
}

/** Splits a run of `n` mountain tiles into pieces three or two tiles wide (a lone tile gets a two-tile peak of its own). */
export function mountainPieces(n: number): number[] {
  const out: number[] = [];
  for (let left = n; left > 0;) {
    const take = left === 4 || left === 2 ? 2 : left === 1 ? 1 : 3;
    out.push(take);
    left -= take;
  }
  return out;
}

export function coverPlacements(g: Grid, seed: number): CoverPlacement[] {
  const out: CoverPlacement[] = [];
  const cover = (x: number, y: number): string => g.cover[x + y * g.w]!;
  for (let ty = 0; ty < g.h; ty++) {
    for (let tx = 0; tx < g.w; tx++) {
      const c = cover(tx, ty);
      if (c === 'tree' || c === 'pine') out.push(...trees(c, tx, ty, seed));
      else if (c === 'rock') out.push({ kind: 'rock', pick: tx + ty, x: tx * MAP_TILE + MAP_TILE / 2, y: ty * MAP_TILE + FOOT, flip: cellRandom(seed, tx, ty, 9) < 0.5 });
    }
    // Mountains and bridges go by runs along the row.
    for (let tx = 0; tx < g.w;) {
      const c = cover(tx, ty);
      const bridge = c === 'road' && g.terrain[tx + ty * g.w] === 'water';
      if (c !== 'mountain' && !bridge) {
        tx++;
        continue;
      }
      let end = tx;
      const same = (x: number): boolean => (bridge ? cover(x, ty) === 'road' && g.terrain[x + ty * g.w] === 'water' : cover(x, ty) === 'mountain');
      while (end < g.w && same(end)) end++;
      if (bridge) out.push({ kind: 'bridge', pick: 0, x: Math.round(((tx + end) / 2) * MAP_TILE), y: ty * MAP_TILE + FOOT + 2, flip: false });
      else {
        let at = tx;
        // Picks count up along a run, so neighbours differ; where they start is the run's own.
        const start = Math.floor(cellRandom(seed, tx, ty, 39) * 1000);
        mountainPieces(end - tx).forEach((n, i) => {
          out.push({ kind: n >= 3 ? 'mountain' : 'peak', pick: start + i, x: Math.round((at + n / 2) * MAP_TILE), y: ty * MAP_TILE + FOOT + 2, flip: cellRandom(seed, at, ty, 40 + i) < 0.5 });
          at += n;
        });
      }
      tx = end;
    }
  }
  return out;
}
