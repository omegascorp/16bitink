import type { Rgba } from '../battle/pixelRaster';
import type { Pixels } from '../battle/pixelScenery';
import { CITY, isGarden, toGrid, toStage, type Plot } from './townStage';

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
const FACE_LIT: Rgba = [198, 182, 150, 255];
const FACE_SHADE: Rgba = [140, 124, 100, 255];
const MORTAR = 0.78;
const LIP: Rgba = [226, 214, 186, 255];
const EDGE: Rgba = [52, 40, 28, 255];
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

/** Whether tile (i, j) is on one of the plots in `bare`. */
function onPlot(bare: readonly Plot[], i: number, j: number): boolean {
  return bare.some((p) => i >= p.a && j >= p.b && i < p.a + p.n && j < p.b + p.n);
}

/** Paints the city's ground over `out` (the countryside for `area`); `bare` are the plots not built on. */
export function paintCity(out: Pixels, area: Area, sw: GroundSwatches, bare: readonly Plot[]): void {
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
      const base = lit ? FACE_LIT : FACE_SHADE;
      const c = down === 0 ? LIP : down >= WALL.h ? EDGE : down % WALL.course === 0 || joint ? scale(base, MORTAR) : base;
      put(out, d, c);
    }
  }
}
