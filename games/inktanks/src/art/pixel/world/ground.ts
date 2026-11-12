/**
 * The Meadowlands ground: painted seamless textures laid by a terrain map, with organic edges.
 *
 * A terrain map gives one ground per cell (say 32 px). Each pixel takes the ground that wins there: the cells' coverage,
 * smoothed between cell centres, plus a wobble (value noise, so an edge never runs along the grid) plus the ground's own
 * painted breakup (its `-edge.png`, so grass meets dirt along its blades). The cut is hard, as pixel art wants; the lower
 * ground gets a thin contact shadow where a higher one overlaps it. Grass also switches between two placements of its
 * texture along the same kind of edge, which hides the 512 px repeat.
 *
 * Pure: it fills an RGBA buffer for any world rectangle, and neighbouring chunks meet without a seam.
 */

export interface GroundTexture {
  readonly name: string;
  /** Higher draws over lower at an edge (grass over dirt over sand over water). */
  readonly order: number;
  readonly size: number;
  /** RGBA, size x size. */
  readonly pixels: Uint8ClampedArray;
  /** The texture's breakup, 0..255, size x size. */
  readonly edge: Uint8Array;
}

export interface GroundOptions {
  /** World px per terrain cell. */
  readonly cell: number;
  /** How far an edge wanders from the cell boundary, in cells (its slow sweep; the ripple and fray are smaller). */
  readonly wobble: number;
  /** How strongly a ground's painted breakup bites into its neighbour. */
  readonly bite: number;
  /** How dark the contact shadow under an overlapping edge is (1 = none). */
  readonly contact: number;
}

export const GROUND_DEFAULTS: GroundOptions = { cell: 32, wobble: 0.85, bite: 0.22, contact: 0.8 };

/** A hash of integer lattice points to 0..1. */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Value noise, 0..1, at world px with a lattice of `scale` px. */
export function valueNoise(x: number, y: number, scale: number, seed: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = smooth(fx - ix);
  const ty = smooth(fy - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

function wrap(v: number, n: number): number {
  return ((v % n) + n) % n;
}

/**
 * Fills `out` (RGBA, w x h) with the ground of the world rectangle at (x0, y0).
 * `terrainAt(cx, cy)` names the ground of a cell; every name it returns must be in `textures`.
 */
export function composeGround(
  out: Uint8ClampedArray,
  x0: number,
  y0: number,
  w: number,
  h: number,
  terrainAt: (cx: number, cy: number) => string,
  textures: ReadonlyMap<string, GroundTexture>,
  opts: GroundOptions = GROUND_DEFAULTS,
): void {
  const { cell } = opts;
  // The winner of every pixel, with a one-pixel rim so the contact shadow can look at its neighbours.
  const W = w + 1;
  const H = h + 1;
  const win: (GroundTexture | undefined)[] = new Array(W * H);
  const names = new Map<string, GroundTexture>();
  const tex = (name: string): GroundTexture => {
    let t = names.get(name);
    if (!t) {
      t = textures.get(name);
      if (!t) throw new Error(`ground: no texture "${name}"`);
      names.set(name, t);
    }
    return t;
  };
  const cand: GroundTexture[] = [];
  const score: number[] = [];
  for (let j = 0; j < H; j++) {
    const gy = y0 + j - 1;
    for (let i = 0; i < W; i++) {
      const gx = x0 + i - 1;
      // The edge wanders: shift the point at which the cells are read.
      // Three scales: a slow sweep (bays and spits, so a field never looks like a rectangle), a ripple, a fray.
      const wob = opts.wobble * cell;
      const sx = gx + (valueNoise(gx, gy, 97, 1) - 0.5) * 2 * wob + (valueNoise(gx, gy, 23, 2) - 0.5) * wob * 0.7 + (valueNoise(gx, gy, 7, 5) - 0.5) * wob * 0.25;
      const sy = gy + (valueNoise(gx, gy, 97, 3) - 0.5) * 2 * wob + (valueNoise(gx, gy, 23, 4) - 0.5) * wob * 0.7 + (valueNoise(gx, gy, 7, 6) - 0.5) * wob * 0.25;
      const fx = sx / cell - 0.5;
      const fy = sy / cell - 0.5;
      const cx = Math.floor(fx);
      const cy = Math.floor(fy);
      const tx = fx - cx;
      const ty = fy - cy;
      cand.length = 0;
      score.length = 0;
      const corners: [number, number, number][] = [
        [cx, cy, (1 - tx) * (1 - ty)],
        [cx + 1, cy, tx * (1 - ty)],
        [cx, cy + 1, (1 - tx) * ty],
        [cx + 1, cy + 1, tx * ty],
      ];
      for (const [ax, ay, wt] of corners) {
        const t = tex(terrainAt(ax, ay));
        const k = cand.indexOf(t);
        if (k < 0) {
          cand.push(t);
          score.push(wt);
        } else score[k] = score[k]! + wt;
      }
      let best = cand[0]!;
      if (cand.length > 1) {
        let top = -Infinity;
        for (let k = 0; k < cand.length; k++) {
          const t = cand[k]!;
          const e = t.edge[wrap(gy, t.size) * t.size + wrap(gx, t.size)]! / 255 - 0.5;
          const s = score[k]! + opts.bite * e + t.order * 1e-3;
          if (s > top) {
            top = s;
            best = t;
          }
        }
      }
      win[j * W + i] = best;
    }
  }
  for (let j = 0; j < h; j++) {
    const gy = y0 + j;
    for (let i = 0; i < w; i++) {
      const gx = x0 + i;
      const t = win[(j + 1) * W + i + 1]!;
      let u = gx;
      let v = gy;
      // A second placement of the texture, turned half round and shifted, where a slow noise says so.
      const e = t.edge[wrap(gy, t.size) * t.size + wrap(gx, t.size)]! / 255 - 0.5;
      if (valueNoise(gx, gy, 190, 9) + 0.18 * e > 0.5) {
        u = -gx + 173;
        v = -gy + 91;
      }
      const p = (wrap(v, t.size) * t.size + wrap(u, t.size)) * 4;
      // Contact shadow: a higher ground just above or left of this pixel overlaps it.
      const up = win[j * W + i + 1]!;
      const left = win[(j + 1) * W + i]!;
      const shade = up.order > t.order || left.order > t.order ? opts.contact : 1;
      const o = (j * w + i) * 4;
      out[o] = t.pixels[p]! * shade;
      out[o + 1] = t.pixels[p + 1]! * shade;
      out[o + 2] = t.pixels[p + 2]! * shade;
      out[o + 3] = 255;
    }
  }
}
