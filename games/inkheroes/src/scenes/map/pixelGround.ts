import type { Grid, Terrain } from '../../logic/map';
import { cellRandom, type Pixels } from '../battle/pixelScenery';

/**
 * The adventure map's ground as one pixel image, at the battle's pixel size
 * (a tile is 48 px): each terrain's swatch laid in irregular patches (so a
 * swatch never repeats in a grid and need not tile), borders between
 * terrains wandering instead of following the tile edges, a shadow along
 * the lower ground's edge, muddy banks and code-drawn water deepening away
 * from the shore, packed-earth roads along the road tiles, and a margin of
 * ground round the map's edge. No Phaser here, so it can be tested.
 */

export const MAP_TILE = 48;
/** Tiles of ground drawn beyond each edge of the map (the camera may show past it). */
export const GROUND_BORDER = 2;

export interface GroundSpec {
  readonly grid: Grid;
  /** Top-down swatches by terrain; terrains without one (water, snow) are drawn in code. */
  readonly swatches: Partial<Record<Terrain, Pixels>>;
  readonly seed: number;
}

type Rgb = readonly [number, number, number];

const TERRAINS: readonly Terrain[] = ['water', 'swamp', 'sand', 'dirt', 'grass', 'rough', 'snow'];
const WATER = 0;
/** Patch cells, px: each takes the swatch from its own random spot. */
const CELL = 64;
/** How far borders wander from the tile edges, px (broad swell + fine ripple). */
const WARP = { broad: 10, broadScale: 30, fine: 2.5, fineScale: 7 } as const;
/** How far, in tiles, a tile's centre still has a say in the terrain round it. */
const VOTE_REACH = 1.15;
/** How far patch seams wander, px. */
const SEAM_WARP = 7;
/** Road half width and its darker rim, px. */
const ROAD = { half: 11, rim: 1.6 } as const;

const WATER_BANDS: readonly { d: number; c: Rgb }[] = [
  { d: 0, c: [178, 210, 196] },
  { d: 2.5, c: [86, 146, 150] },
  { d: 7, c: [52, 108, 128] },
  { d: 16, c: [38, 80, 108] },
];
const RIPPLE: Rgb = [96, 156, 170];
const SPARKLE: Rgb = [224, 242, 236];
const BANK: Rgb = [92, 74, 48];
const WET: Rgb = [150, 128, 88];
const SNOW: readonly Rgb[] = [[236, 238, 240], [220, 228, 236], [198, 210, 226], [176, 190, 212]];
const ROAD_RIM: Rgb = [98, 78, 52];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

const bayer = (x: number, y: number): number => (BAYER[((y & 3) << 2) | (x & 3)]! + 0.5) / 16;
const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Smooth value noise in [0, 1): random values on a unit lattice, eased between. */
export function valueNoise(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const a = cellRandom(seed, x0, y0);
  const b = cellRandom(seed, x0 + 1, y0);
  const c = cellRandom(seed, x0, y0 + 1);
  const d = cellRandom(seed, x0 + 1, y0 + 1);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

/** Signed noise in (−1, 1). */
const signed = (seed: number, x: number, y: number, scale: number): number => valueNoise(seed, x / scale, y / scale) * 2 - 1;

/** A height order for terrains: the lower one of two that meet is shaded along their border. */
const RANK: Readonly<Record<Terrain, number>> = { water: 0, swamp: 1, sand: 2, dirt: 3, grass: 4, rough: 5, snow: 6 };

/** The ground image's size, px: the map plus its border all round. */
/** A block of ground pixels. */
export interface PixelRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export function groundSize(g: Grid): { w: number; h: number } {
  return { w: (g.w + GROUND_BORDER * 2) * MAP_TILE, h: (g.h + GROUND_BORDER * 2) * MAP_TILE };
}

/**
 * Each pixel's terrain (an index into TERRAINS): a vote of the 3 × 3 tiles
 * round it, each weighing less the further its centre is (so corners round
 * off and inside corners fill in, as H3's transitions do), the pixel itself
 * nudged by a wandering warp so borders meander. The border carries on the
 * edge tiles.
 */
function terrainField(spec: GroundSpec, w: number, h: number): Uint8Array {
  const { grid: g, seed } = spec;
  const out = new Uint8Array(w * h);
  const off = GROUND_BORDER * MAP_TILE;
  const codes = g.terrain.map((t) => TERRAINS.indexOf(t));
  const at = (tx: number, ty: number): number => codes[Math.min(g.w - 1, Math.max(0, tx)) + Math.min(g.h - 1, Math.max(0, ty)) * g.w]!;
  const score = new Float32Array(TERRAINS.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = signed(seed + 1, x, y, WARP.broadScale) * WARP.broad + signed(seed + 3, x, y, WARP.fineScale) * WARP.fine;
      const wy = signed(seed + 2, x, y, WARP.broadScale) * WARP.broad + signed(seed + 4, x, y, WARP.fineScale) * WARP.fine;
      const fx = (x - off + wx) / MAP_TILE;
      const fy = (y - off + wy) / MAP_TILE;
      const tx = Math.floor(fx);
      const ty = Math.floor(fy);
      const own = at(tx, ty);
      // Inside a tile whose neighbours all match, nothing to vote on.
      let mixed = false;
      for (let dy = -1; dy <= 1 && !mixed; dy++) for (let dx = -1; dx <= 1; dx++) if (at(tx + dx, ty + dy) !== own) mixed = true;
      if (!mixed) {
        out[y * w + x] = own;
        continue;
      }
      score.fill(0);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const d = Math.hypot(fx - (tx + dx + 0.5), fy - (ty + dy + 0.5));
          score[at(tx + dx, ty + dy)]! += Math.max(0, VOTE_REACH - d);
        }
      }
      // The tile's own terrain wins ties, so one-tile features keep their place.
      score[own]! += 0.02;
      let best = own;
      for (let t = 0; t < score.length; t++) if (score[t]! > score[best]!) best = t;
      out[y * w + x] = best;
    }
  }
  return out;
}

/** Each pixel's distance to the nearest pixel on the other side of `inside` (0 outside it), by a two-pass chamfer. */
export function distanceInside(inside: (i: number) => boolean, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h);
  const far = w + h;
  for (let i = 0; i < w * h; i++) d[i] = inside(i) ? far : 0;
  const D = Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      let v = d[i]!;
      if (x > 0) v = Math.min(v, d[i - 1]! + 1);
      if (y > 0) {
        v = Math.min(v, d[i - w]! + 1);
        if (x > 0) v = Math.min(v, d[i - w - 1]! + D);
        if (x < w - 1) v = Math.min(v, d[i - w + 1]! + D);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      let v = d[i]!;
      if (x < w - 1) v = Math.min(v, d[i + 1]! + 1);
      if (y < h - 1) {
        v = Math.min(v, d[i + w]! + 1);
        if (x < w - 1) v = Math.min(v, d[i + w + 1]! + D);
        if (x > 0) v = Math.min(v, d[i + w - 1]! + D);
      }
      d[i] = v;
    }
  }
  return d;
}

/** Which patch cell a pixel falls in (seams wander a little), as the cell's point and its random draw. */
function patchOf(seed: number, x: number, y: number): { px: number; py: number; r: number } {
  const jx = x + signed(seed + 5, x, y, 11) * SEAM_WARP;
  const jy = y + signed(seed + 6, x, y, 11) * SEAM_WARP;
  const cx = Math.floor(jx / CELL);
  const cy = Math.floor(jy / CELL);
  let best = { px: 0, py: 0, r: 0 };
  let bestD = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const kx = cx + dx;
      const ky = cy + dy;
      const px = (kx + 0.15 + cellRandom(seed + 7, kx, ky) * 0.7) * CELL;
      const py = (ky + 0.15 + cellRandom(seed + 8, kx, ky) * 0.7) * CELL;
      const d = (jx - px) ** 2 + (jy - py) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { px, py, r: cellRandom(seed + 9, kx, ky) };
      }
    }
  }
  return best;
}

/** A swatch pixel for (x, y): the patch's own spot in the swatch, so neighbouring patches show different parts of it. */
function swatchAt(s: Pixels, seed: number, x: number, y: number): Rgb {
  const p = patchOf(seed, x, y);
  const spanX = Math.max(1, s.w - CELL * 2);
  const spanY = Math.max(1, s.h - CELL * 2);
  const ox = CELL + Math.floor(p.r * spanX);
  const oy = CELL + Math.floor(cellRandom(seed + 10, Math.floor(p.px), Math.floor(p.py)) * spanY);
  const sx = Math.min(s.w - 1, Math.max(0, Math.round(x - p.px + ox)));
  const sy = Math.min(s.h - 1, Math.max(0, Math.round(y - p.py + oy)));
  const i = (sy * s.w + sx) * 4;
  return [s.data[i]!, s.data[i + 1]!, s.data[i + 2]!];
}

function snowAt(seed: number, x: number, y: number): Rgb {
  const n = valueNoise(seed + 11, x / 18, y / 12) * 0.7 + valueNoise(seed + 12, x / 5, y / 5) * 0.3;
  const k = Math.min(SNOW.length - 1, Math.floor(n * 1.6 * SNOW.length + bayer(x, y) - 0.6));
  return SNOW[Math.max(0, k)]!;
}

/** Water by its distance from the shore: foam, then shallows deepening to blue, dithered between bands, with ripples and sparkles. */
function waterAt(seed: number, x: number, y: number, d: number): Rgb {
  let k = 0;
  while (k < WATER_BANDS.length - 1 && d >= WATER_BANDS[k + 1]!.d) k++;
  let c = WATER_BANDS[k]!.c;
  const next = WATER_BANDS[k + 1];
  if (next && (d - WATER_BANDS[k]!.d) / (next.d - WATER_BANDS[k]!.d) > bayer(x, y)) c = next.c;
  if (d > 3) {
    if (cellRandom(seed + 13, x, y) > 0.9985) return SPARKLE;
    if (valueNoise(seed + 14, x / 10, y / 2.5) > 0.83) return RIPPLE;
  }
  return c;
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (a: Rgb, f: number): Rgb => [a[0] * f, a[1] * f, a[2] * f];

/** Distance from (x, y) to the segment a–b. */
function segDist(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
}

/** For each pixel near a road, its distance to the road's centre line (tile centres joined to their road neighbours); Infinity elsewhere. */
function roadDistance(g: Grid, seed: number, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h).fill(Infinity);
  const road = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < g.w && y < g.h && g.cover[x + y * g.w] === 'road';
  const off = GROUND_BORDER * MAP_TILE;
  const c = (t: number): number => off + (t + 0.5) * MAP_TILE;
  for (let ty = 0; ty < g.h; ty++) {
    for (let tx = 0; tx < g.w; tx++) {
      if (!road(tx, ty)) continue;
      // Each road tile draws its dot and its links to the right and below (a link off the map's edge runs on into the border).
      const links: [number, number][] = [];
      if (road(tx + 1, ty) || tx === g.w - 1) links.push([tx + 1, ty]);
      if (road(tx, ty + 1) || ty === g.h - 1) links.push([tx, ty + 1]);
      if (tx === 0) links.push([-1, ty]);
      if (ty === 0) links.push([tx, -1]);
      const x0 = Math.max(0, Math.floor(c(tx) - MAP_TILE * 1.5));
      const y0 = Math.max(0, Math.floor(c(ty) - MAP_TILE * 1.5));
      for (let y = y0; y < Math.min(h, y0 + MAP_TILE * 3); y++) {
        for (let x = x0; x < Math.min(w, x0 + MAP_TILE * 3); x++) {
          // A slight wobble so the road's edges aren't ruled lines.
          const wx = x + signed(seed + 15, x, y, 9) * 2.5;
          const wy = y + signed(seed + 16, x, y, 9) * 2.5;
          let d = Math.hypot(wx - c(tx), wy - c(ty));
          for (const [lx, ly] of links) d = Math.min(d, segDist(wx, wy, c(tx), c(ty), c(lx), c(ly)));
          const i = y * w + x;
          if (d < out[i]!) out[i] = d;
        }
      }
    }
  }
  return out;
}

/** The whole map's ground, RGBA, groundSize(grid) big. */
export function composeGround(spec: GroundSpec): Pixels {
  const { grid: g, seed } = spec;
  const { w, h } = groundSize(g);
  const field = terrainField(spec, w, h);
  const toLand = distanceInside((i) => field[i] === WATER, w, h);
  const toWater = distanceInside((i) => field[i] !== WATER, w, h);
  const roads = roadDistance(g, seed, w, h);
  const data = new Uint8ClampedArray(w * h * 4);
  const swatchFor = TERRAINS.map((t) => spec.swatches[t] ?? null);
  const rankOf = TERRAINS.map((t) => RANK[t]);
  const dirt = spec.swatches.dirt ?? null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const t = field[i]!;
      let c: Rgb;
      if (t === WATER) c = waterAt(seed, x, y, toLand[i]!);
      else {
        const s = swatchFor[t];
        c = s ? swatchAt(s, seed + t * 101, x, y) : snowAt(seed, x, y);
        // The lower ground darkens along a higher one's edge, as if the higher stood a little proud.
        const r = rankOf[t]!;
        let up = 0;
        for (const [dx, dy, k] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [2, 0, 2], [0, 2, 2], [-2, 0, 2], [0, -2, 2]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = field[ny * w + nx]!;
          if (n !== WATER && rankOf[n]! > r) up = up === 0 ? k : Math.min(up, k);
        }
        if (up === 1) c = shade(c, 0.74);
        else if (up === 2) c = shade(c, 0.88);
        // A road: packed earth from the dirt swatch, a shade lighter, with a darker rim.
        const rd = roads[i]!;
        if (rd < ROAD.half) {
          const base = dirt ? swatchAt(dirt, seed + 777, x, y) : ([150, 120, 80] as Rgb);
          c = rd > ROAD.half - ROAD.rim ? ROAD_RIM : mix(base, [214, 188, 140], 0.32);
        }
        // Banks: a dark line at the water's edge, wet earth just behind it.
        const dw = toWater[i]!;
        if (dw < 1.5) c = BANK;
        else if (dw < 3.5 && rd >= ROAD.half) c = mix(c, WET, 0.55);
      }
      const o = i * 4;
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
      data[o + 3] = 255;
    }
  }
  return { data, w, h };
}

/**
 * The fog over unexplored tiles: dark, its edge a dithered fade across half
 * a tile (explored-ness eased between tile centres, then thresholded by a
 * Bayer pattern so every pixel is either fog or clear).
 */
export function composeFog(g: Grid, explored: string, colour: Rgb, rect?: PixelRect): Pixels {
  const { x: x0, y: y0, w, h } = rect ?? { x: 0, y: 0, ...groundSize(g) };
  const data = new Uint8ClampedArray(w * h * 4);
  const off = GROUND_BORDER * MAP_TILE;
  const seen = (tx: number, ty: number): number => (tx >= 0 && ty >= 0 && tx < g.w && ty < g.h && explored[tx + ty * g.w] === '1' ? 1 : 0);
  for (let y = y0; y < y0 + h; y++) {
    const fy = (y - off) / MAP_TILE - 0.5;
    const ty = Math.floor(fy);
    const ay = fy - ty;
    for (let x = x0; x < x0 + w; x++) {
      const fx = (x - off) / MAP_TILE - 0.5;
      const tx = Math.floor(fx);
      const ax = fx - tx;
      const a = seen(tx, ty);
      const b = seen(tx + 1, ty);
      const c = seen(tx, ty + 1);
      const d = seen(tx + 1, ty + 1);
      if (a + b + c + d === 4) continue;
      const v = (a + (b - a) * ax) * (1 - ay) + (c + (d - c) * ax) * ay;
      // Sharpen the ramp so the fade spans about half a tile.
      const s = Math.max(0, Math.min(1, (v - 0.25) * 2));
      if (s > bayer(x, y)) continue;
      const o = ((y - y0) * w + x - x0) * 4;
      data[o] = colour[0];
      data[o + 1] = colour[1];
      data[o + 2] = colour[2];
      data[o + 3] = 255;
    }
  }
  return { data, w, h };
}

/** The ground cut into squares of `size` pixels, so the fog can be redrawn a piece at a time. */
export function fogPieces(g: Grid, size: number): PixelRect[] {
  const { w, h } = groundSize(g);
  const out: PixelRect[] = [];
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) out.push({ x, y, w: Math.min(size, w - x), h: Math.min(size, h - y) });
  }
  return out;
}

/** Each piece a change of what is explored reaches, with the part of it to redraw: a tile's edge fades over half the tile beside it. */
export function touchedPieces(g: Grid, pieces: readonly PixelRect[], before: string, after: string): { piece: PixelRect; part: PixelRect }[] {
  if (before.length !== after.length) return pieces.map((piece) => ({ piece, part: piece }));
  const parts = new Map<PixelRect, PixelRect>();
  for (let i = 0; i < after.length; i++) {
    if (before[i] === after[i]) continue;
    const left = (i % g.w + GROUND_BORDER - 1) * MAP_TILE;
    const top = (Math.floor(i / g.w) + GROUND_BORDER - 1) * MAP_TILE;
    const reach = MAP_TILE * 3;
    for (const p of pieces) {
      const x0 = Math.max(left, p.x);
      const y0 = Math.max(top, p.y);
      const x1 = Math.min(left + reach, p.x + p.w);
      const y1 = Math.min(top + reach, p.y + p.h);
      if (x0 >= x1 || y0 >= y1) continue;
      const had = parts.get(p);
      const hx = had ? Math.min(had.x, x0) : x0;
      const hy = had ? Math.min(had.y, y0) : y0;
      parts.set(p, { x: hx, y: hy, w: Math.max(had ? had.x + had.w : x1, x1) - hx, h: Math.max(had ? had.y + had.h : y1, y1) - hy });
    }
  }
  return [...parts].map(([piece, part]) => ({ piece, part }));
}
