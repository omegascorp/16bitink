import type { Rect, SceneryArt, SceneryKind } from '../../art/pixel/scenery';
import { FIELD_RECT, HERO_FEET, WORLD } from './pixelLayout';

/**
 * Lays out a battle's backdrop from a terrain's separate parts (sky, clouds,
 * mountains, hills, trees, a landmark, ground patches, tufts, stones,
 * bushes) for any stretch of the world, so a background is never a fixed
 * picture: it covers whatever the screen shows and differs every battle.
 *
 * Each layer is a grid of cells; whether a cell holds a part, which one and
 * where come from a hash of (seed, layer, cell). The same seed therefore
 * gives the same scene for any area, and a wider screen only adds cells at
 * the edges. Parts are copied pixel for pixel (binary alpha, no scaling).
 */

/** World row where the ground meets the hills and trees, just above the field. */
export const HORIZON_Y = 72;

/** An RGBA pixel buffer. */
export interface Pixels {
  readonly data: Uint8ClampedArray;
  readonly w: number;
  readonly h: number;
}

/** A stretch of the world, in world pixels (it may reach past 0 or the world's size). */
export interface Area {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

interface Layer {
  readonly kind: SceneryKind;
  /** Cell size; one part at most per cell. */
  readonly cell: { readonly w: number; readonly h: number };
  /** World rows the cells cover (a part's bottom lands inside). */
  readonly rows: readonly [number, number];
  /** Chance a cell holds a part (outside the hex field). */
  readonly p: number;
  /** The chance inside the hex field, kept low so the ground there stays calm (default p). */
  readonly pField?: number;
  /** How far a part's bottom-centre may wander from its cell's centre. */
  readonly jitter: { readonly x: number; readonly y: number };
  /** Keep the hex field and the heroes clear (big parts that would read as obstacles). */
  readonly clearOfPlay?: boolean;
  /** The highest a part's top edge may reach (ground patches stay under the hills). */
  readonly minTop?: number;
}

const H = HORIZON_Y;
/** Back to front: the ground first, then the horizon standing on it, then what lies on the ground. */
const LAYERS: readonly Layer[] = [
  { kind: 'cloud', cell: { w: 170, h: 60 }, rows: [H - 400, H - 70], p: 0.45, jitter: { x: 60, y: 20 } },
  { kind: 'patch', cell: { w: 76, h: 64 }, rows: [H, Number.MAX_SAFE_INTEGER], p: 1, jitter: { x: 26, y: 22 }, minTop: H - 4 },
  { kind: 'far', cell: { w: 300, h: 1 }, rows: [H - 1, H], p: 1, jitter: { x: 70, y: 3 } },
  { kind: 'mountain', cell: { w: 420, h: 1 }, rows: [H - 4, H - 3], p: 0.4, jitter: { x: 110, y: 4 } },
  { kind: 'hill', cell: { w: 230, h: 1 }, rows: [H + 3, H + 4], p: 0.9, jitter: { x: 60, y: 2 } },
  { kind: 'tree', cell: { w: 20, h: 1 }, rows: [H + 5, H + 6], p: 0.7, jitter: { x: 6, y: 3 } },
  { kind: 'tuft', cell: { w: 34, h: 28 }, rows: [H + 10, Number.MAX_SAFE_INTEGER], p: 0.22, pField: 0.08, jitter: { x: 14, y: 11 } },
  { kind: 'stone', cell: { w: 80, h: 64 }, rows: [H + 10, Number.MAX_SAFE_INTEGER], p: 0.12, jitter: { x: 34, y: 26 }, clearOfPlay: true },
  { kind: 'bush', cell: { w: 96, h: 80 }, rows: [H + 30, Number.MAX_SAFE_INTEGER], p: 0.4, jitter: { x: 36, y: 30 }, clearOfPlay: true },
];
/** Cloud cells repeat after this many, so the cloud strip loops (wider than any normal screen) and can drift. */
const CLOUD_CELLS = 12;
const CLOUD_LAYER = LAYERS.findIndex((l) => l.kind === 'cloud');
/** Width of one loop of the cloud strip, world pixels. */
export const CLOUD_PERIOD = LAYERS[CLOUD_LAYER]!.cell.w * CLOUD_CELLS;
/** World rows the cloud strip covers (its clouds' bottoms land in the cloud layer's rows). */
export const CLOUD_BAND = { top: H - 480, bottom: H - 40 } as const;
/** The landmark stands once, behind the trees at the middle of the world. */
const LANDMARK_AT = { x: WORLD.w / 2, y: H + 1 } as const;
/** Parts wider or taller than this still reach the area from a cell outside it. */
const REACH = 400;

/** A hash of the seed and a few integers, in [0, 1). */
export function cellRandom(seed: number, ...n: number[]): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (const v of n) {
    h = Math.imul(h ^ (v | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

function hexRgb(c: string): readonly [number, number, number] {
  const v = parseInt(c.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Copies the opaque pixels of `r` in `atlas` so the sprite's top-left lands on world (x, y). */
function blit(out: Pixels, area: Area, atlas: Pixels, r: Rect, x: number, y: number): void {
  const [sx, sy, w, h] = r;
  const ox = x - area.x;
  const oy = y - area.y;
  const x0 = Math.max(0, -ox);
  const y0 = Math.max(0, -oy);
  const x1 = Math.min(w, out.w - ox);
  const y1 = Math.min(h, out.h - oy);
  for (let j = y0; j < y1; j++) {
    let s = ((sy + j) * atlas.w + sx + x0) * 4;
    let d = ((oy + j) * out.w + ox + x0) * 4;
    for (let i = x0; i < x1; i++, s += 4, d += 4) {
      if (atlas.data[s + 3]! < 128) continue;
      out.data[d] = atlas.data[s]!;
      out.data[d + 1] = atlas.data[s + 1]!;
      out.data[d + 2] = atlas.data[s + 2]!;
      out.data[d + 3] = 255;
    }
  }
}

/** The two sky colours a row lies between and how far it is from the first to the second. */
function skyRow(stops: readonly (readonly [number, readonly [number, number, number]])[], above: number): {
  a: readonly [number, number, number]; b: readonly [number, number, number]; t: number;
} {
  if (above >= stops[0]![0]) return { a: stops[0]![1], b: stops[0]![1], t: 0 };
  for (let i = 1; i < stops.length; i++) {
    const [hi, a] = stops[i - 1]!;
    const [lo, b] = stops[i]!;
    if (above >= lo) return { a, b, t: (hi - above) / (hi - lo) };
  }
  const last = stops[stops.length - 1]![1];
  return { a: last, b: last, t: 0 };
}

/** A row's sky colour: its two stops blended, so each row is a small step from the next (user: a smooth sky). */
const blend = (row: { a: readonly [number, number, number]; b: readonly [number, number, number]; t: number }): readonly [number, number, number] =>
  [0, 1, 2].map((k) => Math.round(row.a[k]! + (row.b[k]! - row.a[k]!) * row.t)) as unknown as readonly [number, number, number];

/** The sky above the horizon (a smooth blend between its colour stops, one colour a row), bare ground below;
 * with `sky` false the sky rows stay clear (the sky and clouds are drawn behind). */
function paintBase(out: Pixels, area: Area, art: SceneryArt, sky = true): void {
  const stops = art.sky.map(([h, c]) => [h, hexRgb(c)] as const);
  const ground = hexRgb(art.ground);
  for (let j = 0; j < out.h; j++) {
    const y = area.y + j;
    if (!sky && y < H) continue;
    const c = y >= H ? ground : blend(skyRow(stops, H - y));
    for (let i = 0, d = j * out.w * 4; i < out.w; i++, d += 4) {
      out.data[d] = c[0];
      out.data[d + 1] = c[1];
      out.data[d + 2] = c[2];
      out.data[d + 3] = 255;
    }
  }
}

/** Whether a part with bottom-centre (x, y) and size w × h would cover the field or a hero. */
function inPlay(x: number, y: number, w: number, h: number): boolean {
  const pad = 10;
  const overlaps = (r: { x: number; y: number; w: number; h: number }): boolean =>
    x - w / 2 < r.x + r.w + pad && x + w / 2 > r.x - pad && y > r.y - pad && y - h < r.y + r.h + pad;
  return overlaps(FIELD_RECT) || HERO_FEET.some((f) => overlaps({ x: f.x - 76, y: f.y - 140, w: 152, h: 150 }));
}

function paintLayer(out: Pixels, area: Area, atlas: Pixels, art: SceneryArt, layer: Layer, index: number, seed: number): void {
  const parts = art.parts[layer.kind];
  if (!parts?.length) return;
  const { w: cw, h: ch } = layer.cell;
  const top = Math.max(layer.rows[0], area.y - layer.jitter.y);
  const bottom = Math.min(layer.rows[1], area.y + area.h + REACH);
  const landmark = art.parts.landmark?.[0];
  const density = art.density?.[layer.kind] ?? 1;
  for (let cy = Math.floor(top / ch); cy * ch < bottom; cy++) {
    const mid = cy * ch + ch / 2;
    if (mid < layer.rows[0] || mid >= layer.rows[1]) continue;
    for (let cx = Math.floor((area.x - REACH) / cw); cx * cw < area.x + area.w + REACH; cx++) {
      // Clouds hash their cell modulo the loop, so the strip repeats exactly every CLOUD_PERIOD.
      const hx = layer.kind === 'cloud' ? ((cx % CLOUD_CELLS) + CLOUD_CELLS) % CLOUD_CELLS : cx;
      const rnd = (k: number): number => cellRandom(seed, index, hx, cy, k);
      const centre = { x: cx * cw + cw / 2, y: mid };
      const inField = centre.x >= FIELD_RECT.x && centre.x < FIELD_RECT.x + FIELD_RECT.w && centre.y >= FIELD_RECT.y && centre.y < FIELD_RECT.y + FIELD_RECT.h;
      if (rnd(0) >= (inField ? layer.pField ?? layer.p : layer.p) * density) continue;
      const r = parts[Math.floor(rnd(1) * parts.length)]!;
      const fx = Math.round(cx * cw + cw / 2 + (rnd(2) * 2 - 1) * layer.jitter.x);
      const fy = Math.max(layer.rows[0], (layer.minTop ?? -Infinity) + r[3], Math.round(mid + (rnd(3) * 2 - 1) * layer.jitter.y));
      if (layer.clearOfPlay && inPlay(fx, fy, r[2], r[3])) continue;
      if (layer.kind === 'tree' && landmark && Math.abs(fx - LANDMARK_AT.x) < landmark[2] / 2) continue;
      blit(out, area, atlas, r, fx - Math.floor(r[2] / 2), fy - r[3]);
    }
  }
  if (layer.kind === 'hill' && landmark) {
    blit(out, area, atlas, landmark, LANDMARK_AT.x - Math.floor(landmark[2] / 2), LANDMARK_AT.y - landmark[3]);
  }
}

function blank(area: Area): Pixels {
  return { data: new Uint8ClampedArray(area.w * area.h * 4), w: area.w, h: area.h };
}

/**
 * The backdrop for `area` of the world, composed from `art`'s parts (atlas
 * pixels) for `seed`: everything, flattened (`'all'`, clouds where they are
 * at the start), or everything but the sky and clouds (`'front'`, clear
 * above the horizon), to lay over composeSky and a drifting composeClouds.
 */
export function composeScenery(atlas: Pixels, art: SceneryArt, area: Area, seed: number, part: 'all' | 'front' = 'all'): Pixels {
  const out = blank(area);
  paintBase(out, area, art, part === 'all');
  LAYERS.forEach((layer, i) => {
    if (part === 'front' && layer.kind === 'cloud') return;
    paintLayer(out, area, atlas, art, layer, i, seed);
  });
  return out;
}

/** The bare sky (and ground colour below the horizon) for `area`: the back of a layered backdrop. */
export function composeSky(art: SceneryArt, area: Area): Pixels {
  const out = blank(area);
  paintBase(out, area, art);
  return out;
}

/** One loop of the cloud strip: CLOUD_PERIOD wide over CLOUD_BAND's rows, clear between clouds,
 * its right edge running on into its left (tile it and slide it to make the clouds drift). */
export function composeClouds(atlas: Pixels, art: SceneryArt, seed: number): Pixels {
  const area = { x: 0, y: CLOUD_BAND.top, w: CLOUD_PERIOD, h: CLOUD_BAND.bottom - CLOUD_BAND.top };
  const out = blank(area);
  paintLayer(out, area, atlas, art, LAYERS[CLOUD_LAYER]!, CLOUD_LAYER, seed);
  return out;
}
