import type { Rgba } from '../battle/pixelRaster';
import type { Pixels } from '../battle/pixelScenery';
import type { TownFaction } from '../../logic/creatures';
import { CITY, isCanal, isGarden, toGrid, toStage, type Plot } from './townStage';

/**
 * The city's ground, painted into the countryside behind it: the paving
 * (the swatch is drawn at the town's isometric angle, so it is tiled as it
 * is), garden grass round the edge and on the plots not built on,
 * and the raised square's two front walls of limestone blocks. No Phaser
 * here, so it can be tested.
 */

/** A stretch of the stage, stage pixels. */
export interface Area {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface GroundSwatches {
  readonly paving: Pixels;
  readonly grass: Pixels;
}

/** The raised square's walls: how tall, their two faces (lit from the left), the mortar and the lip along the top. */
const WALL = { h: 14, course: 5, block: 13 } as const;
const MORTAR = 0.78;
/** The raised square's wall colours: each people's own stone. */
interface WallStone {
  readonly lit: Rgba;
  readonly shade: Rgba;
  readonly lip: Rgba;
  readonly edge: Rgba;
}
const STONE: Readonly<Record<TownFaction, WallStone>> = {
  crown: { lit: [198, 182, 150, 255], shade: [140, 124, 100, 255], lip: [226, 214, 186, 255], edge: [52, 40, 28, 255] },
  kemet: { lit: [214, 170, 112, 255], shade: [150, 108, 70, 255], lip: [240, 206, 146, 255], edge: [58, 38, 24, 255] },
};
/** Egypt's canal: the water's two blues and the bank's width in tile fractions. */
const WATER: readonly Rgba[] = [[44, 120, 150, 255], [60, 146, 170, 255], [86, 176, 192, 255], [190, 226, 222, 255]];
const BANK = 0.14;
const BANK_STONE: Rgba = [232, 204, 150, 255];
/** The paving's swatch is lifted to the pale limestone the buildings stand on. */
const PAVE_LIFT = 1.12;

function sample(s: Pixels, x: number, y: number, by = 1): Rgba {
  const sx = ((x % s.w) + s.w) % s.w;
  const sy = ((y % s.h) + s.h) % s.h;
  const i = (sy * s.w + sx) * 4;
  return [Math.min(255, Math.round(s.data[i]! * by)), Math.min(255, Math.round(s.data[i + 1]! * by)), Math.min(255, Math.round(s.data[i + 2]! * by)), 255];
}

function put(out: Pixels, i: number, c: Rgba): void {
  out.data[i] = c[0];
  out.data[i + 1] = c[1];
  out.data[i + 2] = c[2];
  out.data[i + 3] = 255;
}

const scale = (c: Rgba, by: number): Rgba => [Math.round(c[0] * by), Math.round(c[1] * by), Math.round(c[2] * by), 255];

/** A pixel of the canal: a stone bank along each side, water between, ripples drifting across it. */
function canal(x: number, y: number, across: number): Rgba {
  if (across < BANK || across > 1 - BANK) return across < BANK / 2 || across > 1 - BANK / 2 ? scale(BANK_STONE, 0.8) : BANK_STONE;
  const wave = Math.sin((x - y * 2) * 0.55) + Math.sin((x + y * 2) * 0.31 + 1.7);
  const shade = wave > 1.5 ? 3 : wave > 0.6 ? 2 : wave > -0.7 ? 1 : 0;
  return WATER[shade]!;
}

/** Whether tile (i, j) is on one of the plots in `bare`. */
function onPlot(bare: readonly Plot[], i: number, j: number): boolean {
  return bare.some((p) => i >= p.a && j >= p.b && i < p.a + p.n && j < p.b + p.n);
}

/** Paints the city's ground over `out` (the countryside for `area`); `bare` are the plots not built on. */
export function paintCity(out: Pixels, area: Area, sw: GroundSwatches, bare: readonly Plot[], faction: TownFaction = 'crown'): void {
  const stone = STONE[faction];
  const left = toStage(0, CITY);
  const front = toStage(CITY, CITY);
  const right = toStage(CITY, 0);
  for (let py = 0; py < out.h; py++) {
    const y = area.y + py;
    for (let px = 0; px < out.w; px++) {
      const x = area.x + px;
      const g = toGrid(x + 0.5, y + 0.5);
      const d = (py * out.w + px) * 4;
      if (g.i >= 0 && g.j >= 0 && g.i < CITY && g.j < CITY) {
        const i = Math.floor(g.i);
        const j = Math.floor(g.j);
        if (isCanal(i, j, faction)) {
          put(out, d, canal(x, y, g.i - i));
          continue;
        }
        const c = isGarden(i, j) || onPlot(bare, i, j) ? sample(sw.grass, x, y) : sample(sw.paving, x, y, PAVE_LIFT);
        put(out, d, c);
        continue;
      }
      // Below the two front edges: the walls of the raised square.
      let top: number | null = null;
      let lit = true;
      if (x >= left.x && x <= front.x) top = left.y + (x - left.x) / 2;
      else if (x > front.x && x <= right.x) {
        top = front.y - (x - front.x) / 2;
        lit = false;
      }
      if (top === null || y < top || y > top + WALL.h) continue;
      const down = Math.floor(y - top);
      const row = Math.floor(down / WALL.course);
      const joint = (Math.floor(x / WALL.block) + row) % 2 === 0 && x % WALL.block === 0;
      const base = lit ? stone.lit : stone.shade;
      const c = down === 0 ? stone.lip : down >= WALL.h ? stone.edge : down % WALL.course === 0 || joint ? scale(base, MORTAR) : base;
      put(out, d, c);
    }
  }
}
