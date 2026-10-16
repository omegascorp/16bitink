import { cellCase, cellGeometry } from '../logic/contour';
import { hash } from '../logic/noise';
import { createRng } from '../logic/rng';
import { contentAt, gradeOf, inside, TILE, tileAt, volatileAt, wrapX, type Grade, type Terrain } from '../logic/terrain';
import { VOLATILES } from '../logic/volatiles';
import { oreById } from '../logic/ore';
import { depthTone, facesOf, lightHollows, lightRock, pebble, washTile, type Face } from './groundPaint';
import { drawOreGlyph } from './oreArt';
import { INK, PAPER, RED, type GroundStyle } from './palette';

/**
 * A dig site's ground in ballpoint, after InkCrab's sand renderer: seamless
 * hatch tiles used as world-anchored canvas patterns, filled through the
 * marching-squares shape of each grade, with every dug surface outlined in
 * pen. How densely a grade is hatched shows how hard it is (spec, "Art
 * direction"): soil is stippled, stone cross-hatched, deep rock densely
 * cross-hatched, bedrock solid ink. Grades the drill can't break yet get a
 * heavier outline. All jitter is seeded by world position, so redrawing a
 * chunk after a dig only changes the strokes next to the hole.
 */
const PATTERN_PX = 128;
/** Overlap drawn around each chunk so neighbouring chunk sprites leave no seam. */
export const CHUNK_PAD = 2;

export interface GroundPatterns {
  readonly grain: CanvasPattern;
  readonly soil: CanvasPattern;
  readonly stone: CanvasPattern;
  readonly deep: CanvasPattern;
  /** The faint back wall seen through tunnels. */
  readonly wall: CanvasPattern;
  /** Dense cross-hatching for core shadows under overhangs. */
  readonly shadow: CanvasPattern;
  /** Watercolour washes: each grade's, and the back wall's. */
  readonly washes: { readonly soil: CanvasPattern; readonly stone: CanvasPattern; readonly deep: CanvasPattern; readonly back: CanvasPattern };
}

export interface ChunkRect {
  readonly tx: number;
  readonly ty: number;
  readonly tiles: number;
}

/** Which grades the drill can't break yet (drawn heavier). */
export type TooHard = (grade: Grade) => boolean;

type Mask = (x: number, y: number) => boolean;

/** A tile of short ballpoint strokes in patches, wrapped so it repeats without seams. */
function hatchTile(res: number, seed: number, angle: number, grid: number, alpha: number): HTMLCanvasElement {
  const size = PATTERN_PX * res;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.scale(res, res);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  const rng = createRng(seed);
  const cell = PATTERN_PX / grid;
  for (let p = 0; p < grid * grid; p++) {
    const cx = ((p % grid) + 0.15 + rng() * 0.7) * cell;
    const cy = (Math.floor(p / grid) + 0.15 + rng() * 0.7) * cell;
    const a = angle + (rng() - 0.5) * 0.18;
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    const nrm = { x: -dir.y, y: dir.x };
    const count = 4 + Math.floor(rng() * 3);
    const len = cell * (0.8 + rng() * 0.5);
    for (let i = 0; i < count; i++) {
      const off = (i - count / 2) * 2.2;
      const l = len * (0.7 + rng() * 0.3);
      const bend = (rng() - 0.5) * 1.2;
      const x0 = cx + nrm.x * off - (dir.x * l) / 2;
      const y0 = cy + nrm.y * off - (dir.y * l) / 2;
      const w = 0.45 + rng() * 0.3;
      const al = alpha * (0.8 + rng() * 0.2);
      for (const ox of [-PATTERN_PX, 0, PATTERN_PX]) {
        for (const oy of [-PATTERN_PX, 0, PATTERN_PX]) {
          ctx.globalAlpha = al;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(x0 + ox, y0 + oy);
          ctx.quadraticCurveTo(x0 + ox + (dir.x * l) / 2 + nrm.x * bend, y0 + oy + (dir.y * l) / 2 + nrm.y * bend, x0 + ox + dir.x * l, y0 + oy + dir.y * l);
          ctx.stroke();
        }
      }
    }
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/** Stipple, wrapped like the hatching. */
function grainTile(res: number, color: string, count: number, seed: number): HTMLCanvasElement {
  const size = PATTERN_PX * res;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.scale(res, res);
  const rng = createRng(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = rng() * PATTERN_PX;
    const y = rng() * PATTERN_PX;
    const r = 0.3 + rng() * 0.6;
    ctx.globalAlpha = 0.3 + rng() * 0.45;
    for (const ox of [-PATTERN_PX, 0, PATTERN_PX]) {
      for (const oy of [-PATTERN_PX, 0, PATTERN_PX]) {
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/** Hatch tiles stacked into one (cross-hatching). */
function layered(layers: readonly HTMLCanvasElement[]): HTMLCanvasElement {
  const base = layers[0]!;
  const ctx = base.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const l of layers.slice(1)) ctx.drawImage(l, 0, 0);
  return base;
}

export function makeGroundPatterns(ctx: CanvasRenderingContext2D, res: number, style: GroundStyle): GroundPatterns {
  const pattern = (c: HTMLCanvasElement): CanvasPattern => {
    const p = ctx.createPattern(c, 'repeat');
    if (!p) throw new Error('Canvas patterns are not available');
    // Pattern pixels are texture pixels; the chunk context already scales world px by `res`.
    p.setTransform(new DOMMatrix().scale(1 / res));
    return p;
  };
  return {
    grain: pattern(grainTile(res, style.grain, 420, 31)),
    // Hatching stays light in the open rock: the shadows carry it.
    soil: pattern(hatchTile(res, 11, -Math.PI / 3, 6, 0.1)),
    stone: pattern(layered([hatchTile(res, 21, -Math.PI / 4, 9, 0.2), hatchTile(res, 22, Math.PI / 4, 8, 0.1)])),
    deep: pattern(layered([hatchTile(res, 31, -Math.PI / 4, 12, 0.3), hatchTile(res, 32, Math.PI / 4, 11, 0.22), hatchTile(res, 33, 0.05, 10, 0.12)])),
    wall: pattern(hatchTile(res, 41, Math.PI / 5, 6, 0.07)),
    shadow: pattern(layered([hatchTile(res, 51, -Math.PI / 4, 16, 0.55), hatchTile(res, 52, Math.PI / 4, 14, 0.4)])),
    washes: {
      soil: pattern(washTile(res, style.soil, 61)),
      stone: pattern(washTile(res, style.stone, 62)),
      deep: pattern(washTile(res, style.deep, 63)),
      back: pattern(washTile(res, style.tunnel, 64, 0.7)),
    },
  };
}

/** Fill path of a mask over the cells that touch a chunk; cell (i, j) spans tile centres i..i+1, j..j+1. */
function maskPath(mask: Mask, c: ChunkRect, T: number): Path2D {
  const path = new Path2D();
  for (let j = c.ty - 1; j < c.ty + c.tiles; j++) {
    for (let i = c.tx - 1; i < c.tx + c.tiles; i++) {
      const code = cellCase(mask(i, j), mask(i + 1, j), mask(i + 1, j + 1), mask(i, j + 1));
      for (const poly of cellGeometry(code).fill) {
        poly.forEach((p, k) => {
          const x = (i + 0.5 + p.x) * T;
          const y = (j + 0.5 + p.y) * T;
          if (k === 0) path.moveTo(x, y);
          else path.lineTo(x, y);
        });
        path.closePath();
      }
    }
  }
  return path;
}

/** Outlines a mask in pen: endpoints jitter by world position so neighbouring cells join up. */
function inkEdges(ctx: CanvasRenderingContext2D, mask: Mask, c: ChunkRect, T: number, width: number, salt: number, alpha = 0.92): void {
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  const wob = T * 0.1;
  const jit = (wx: number, wy: number, k: number): number => (hash(Math.round(wx * 2), Math.round(wy * 2), salt + k) - 0.5) * 2 * wob;
  for (let j = c.ty - 1; j < c.ty + c.tiles; j++) {
    for (let i = c.tx - 1; i < c.tx + c.tiles; i++) {
      const code = cellCase(mask(i, j), mask(i + 1, j), mask(i + 1, j + 1), mask(i, j + 1));
      for (const [a, b] of cellGeometry(code).edges) {
        const ax = (i + 0.5 + a.x) * T;
        const ay = (j + 0.5 + a.y) * T;
        const bx = (i + 0.5 + b.x) * T;
        const by = (j + 0.5 + b.y) * T;
        const pa = { x: ax + jit(ax, ay, 1), y: ay + jit(ax, ay, 2) };
        const pb = { x: bx + jit(bx, by, 1), y: by + jit(bx, by, 2) };
        for (let pass = 0; pass < 2; pass++) {
          const m = hash(i, j, salt + 10 + pass + code) - 0.5;
          ctx.globalAlpha = pass === 0 ? alpha : alpha * 0.33;
          ctx.lineWidth = pass === 0 ? width * (0.8 + hash(i, j, salt + 5) * 0.4) : width * 0.5;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.quadraticCurveTo((pa.x + pb.x) / 2 + m * wob * 2, (pa.y + pb.y) / 2 - m * wob * 2, pb.x, pb.y);
          ctx.stroke();
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

/** Every outline segment of a mask over the chunk and `margin` tiles round it, in world px. */
function edgeSegments(mask: Mask, c: ChunkRect, T: number, margin = 1): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let j = c.ty - margin; j < c.ty + c.tiles + margin - 1; j++) {
    for (let i = c.tx - margin; i < c.tx + c.tiles + margin - 1; i++) {
      const code = cellCase(mask(i, j), mask(i + 1, j), mask(i + 1, j + 1), mask(i, j + 1));
      for (const [a, b] of cellGeometry(code).edges) out.push([(i + 0.5 + a.x) * T, (j + 0.5 + a.y) * T, (i + 0.5 + b.x) * T, (j + 0.5 + b.y) * T]);
    }
  }
  return out;
}

/** A second, heavier line along every ceiling: line weight follows the shadow. */
function shadowLine(ctx: CanvasRenderingContext2D, faces: readonly Face[]): void {
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const f of faces) {
    if (f.facing !== 'down') continue;
    ctx.moveTo(f.x0, f.y0 + 1);
    ctx.lineTo(f.x1, f.y1 + 1);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** The first solid row of each column (taken as the level begins): anything open below it is inside the planet. */
export function roofRows(t: Terrain): Int32Array {
  const rows = new Int32Array(t.width);
  for (let x = 0; x < t.width; x++) {
    let y = 0;
    while (y < t.height && tileAt(t, x, y) === TILE.air) y++;
    rows[x] = y;
  }
  return rows;
}

/** Bedrock: solid ink with pale cracks wandering through it. */
function bedrockCracks(ctx: CanvasRenderingContext2D, t: Terrain, c: ChunkRect, T: number): void {
  ctx.strokeStyle = PAPER;
  ctx.lineCap = 'round';
  for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) {
      if (tileAt(t, x, y) !== TILE.bedrock || hash(x, y, 300) > 0.45) continue;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      let px = (x + hash(x, y, 301)) * T;
      let py = (y + hash(x, y, 302) * 0.3) * T;
      ctx.moveTo(px, py);
      for (let k = 0; k < 3; k++) {
        px += (hash(x, y, 303 + k) - 0.5) * T * 0.7;
        py += T * 0.3;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** The odd pebble or fleck sitting in soil and stone, scattered by world position. */
function flecks(ctx: CanvasRenderingContext2D, t: Terrain, c: ChunkRect, T: number, style: GroundStyle): void {
  for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) {
      const tile = tileAt(t, x, y);
      if ((tile !== TILE.soil && tile !== TILE.stone) || contentAt(t, x, y) || hash(x, y, 7) > 0.18) continue;
      const rx = 1.8 + hash(x, y, 8) * 3;
      const ry = rx * (0.55 + hash(x, y, 9) * 0.3);
      pebble(ctx, (x + 0.15 + hash(x, y, 10) * 0.7) * T, (y + 0.15 + hash(x, y, 11) * 0.7) * T, rx, ry, (hash(x, y, 12) - 0.5) * 0.8, tile === TILE.soil ? style.stone : style.deep);
    }
  }
}

/** Ore in the rock: each kind's glyph in its highlighter colour. */
function ores(ctx: CanvasRenderingContext2D, t: Terrain, c: ChunkRect, T: number): void {
  for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) {
      const tile = tileAt(t, x, y);
      if (tile === TILE.air || tile === TILE.bedrock || !inside(t, x, y)) continue;
      const ore = oreById(contentAt(t, x, y));
      if (!ore) continue;
      ctx.save();
      ctx.translate((x + 0.5) * T, (y + 0.5) * T);
      drawOreGlyph(ctx, ore, T, Math.floor(hash(x, y, 400) * 1e6));
      ctx.restore();
    }
  }
}

/** Pale wash of trapped gas. */
const GAS = '#e4e3b6';

/**
 * Firedamp: a pocket of gas trapped in the rock, drawn into the ground
 * itself (not a sprite): an irregular hollow washed pale with a shadow
 * under its upper lip, a couple of faint red wisps for the gas (it can hurt
 * you), and hairline pressure cracks running off into the rock.
 */
function firedamp(ctx: CanvasRenderingContext2D, t: Terrain, c: ChunkRect, T: number): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) {
      if (volatileAt(t, x, y) !== VOLATILES.firedamp.id) continue;
      const h = (k: number): number => hash(x, y, 500 + k);
      const rx = T * (0.3 + h(0) * 0.1);
      const ry = T * (0.17 + h(1) * 0.08);
      const rim = Array.from({ length: 11 }, (_, i) => {
        const a = (i / 11) * Math.PI * 2;
        const k = 0.75 + h(10 + i) * 0.45;
        return [Math.cos(a) * rx * k, Math.sin(a) * ry * k] as const;
      });
      const path = (): void => {
        ctx.beginPath();
        rim.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
        ctx.closePath();
      };
      ctx.save();
      ctx.translate((x + 0.5 + (h(2) - 0.5) * 0.2) * T, (y + 0.5 + (h(3) - 0.5) * 0.2) * T);
      ctx.rotate((h(4) - 0.5) * 0.7);
      // Pressure cracks into the rock.
      ctx.strokeStyle = INK;
      for (let k = 0; k < 4; k++) {
        const [sx, sy] = rim[Math.floor(h(30 + k) * rim.length)]!;
        const a = Math.atan2(sy, sx) + (h(40 + k) - 0.5) * 0.8;
        const len = T * (0.12 + h(50 + k) * 0.18);
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a) * len * 0.5 + (h(60 + k) - 0.5) * 2, sy + Math.sin(a) * len * 0.5);
        ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
        ctx.stroke();
      }
      path();
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAPER;
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = GAS;
      ctx.fill();
      ctx.save();
      ctx.clip();
      // The hollow's upper lip throws a shadow into it.
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = INK;
      ctx.lineWidth = ry * 0.9;
      ctx.beginPath();
      ctx.ellipse(0, -ry * 0.85, rx * 1.05, ry * 0.7, 0, 0, Math.PI);
      ctx.stroke();
      // Wisps of gas, faint and red.
      ctx.strokeStyle = RED;
      ctx.lineWidth = 0.7;
      for (let k = 0; k < 2; k++) {
        const oy = (k - 0.3) * ry * 0.6;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-rx * 0.6, oy);
        ctx.bezierCurveTo(-rx * 0.2, oy - ry * 0.5, rx * 0.1, oy + ry * 0.5, rx * (0.45 + h(70 + k) * 0.2), oy - ry * 0.15);
        ctx.stroke();
      }
      ctx.restore();
      path();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

/** How dark the back wall is at this row: near-blank paper at the top, a little greyer the deeper you go. */
function wallShade(row: number, height: number): number {
  return Math.min(0.2, Math.max(0, row / height) * 0.24);
}

/** Redraws one chunk of ground into `ctx`: a canvas of (tiles·T + 2·CHUNK_PAD)·res pixels. */
export function drawChunk(ctx: CanvasRenderingContext2D, t: Terrain, roof: Int32Array, c: ChunkRect, T: number, res: number, patterns: GroundPatterns, style: GroundStyle, tooHard: TooHard): void {
  const size = c.tiles * T;
  ctx.setTransform(res, 0, 0, res, (CHUNK_PAD - c.tx * T) * res, (CHUNK_PAD - c.ty * T) * res);
  ctx.clearRect(c.tx * T - CHUNK_PAD, c.ty * T - CHUNK_PAD, size + CHUNK_PAD * 2, size + CHUNK_PAD * 2);
  const ground: Mask = (x, y) => tileAt(t, x, y) !== TILE.air;
  const of = (tile: number): Mask => (x, y) => tileAt(t, x, y) === tile;
  // Hollows inside the planet (open tiles under its first surface): the back wall.
  const inner: Mask = (x, y) => !ground(x, y) && inside(t, x, 0) && y >= (roof[wrapX(t, x)] ?? 0);
  const innerPath = maskPath(inner, c, T);
  // Paper first, so the sky layers behind never show through a hole in the ground.
  ctx.fillStyle = PAPER;
  ctx.fill(innerPath);
  ctx.fillStyle = patterns.washes.back;
  ctx.globalAlpha = 0.75;
  ctx.fill(innerPath);
  ctx.globalAlpha = 1;
  ctx.fillStyle = patterns.wall;
  ctx.fill(innerPath);
  // Faces a few tiles past the chunk too: their shading reaches into it, and neighbouring chunks must agree.
  const groundSegs = edgeSegments(ground, c, T, 3);
  const faces = facesOf(groundSegs, (wx, wy) => ground(Math.floor(wx / T), Math.floor(wy / T)), T);
  ctx.save();
  ctx.clip(innerPath);
  for (let row = c.ty - 1; row <= c.ty + c.tiles; row++) {
    ctx.globalAlpha = wallShade(row, t.height);
    ctx.fillStyle = style.shade;
    ctx.fillRect(c.tx * T - CHUNK_PAD, row * T, size + CHUNK_PAD * 2, T);
  }
  ctx.globalAlpha = 1;
  lightHollows(ctx, faces, T, style.shade);
  ctx.restore();
  // The ground: paper, the soil wash and stipple everywhere, then each harder grade over it.
  const groundPath = maskPath(ground, c, T);
  ctx.fillStyle = PAPER;
  ctx.fill(groundPath);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = patterns.washes.soil;
  ctx.fill(groundPath);
  ctx.globalAlpha = 1;
  ctx.fillStyle = patterns.grain;
  ctx.fill(groundPath);
  ctx.fillStyle = patterns.soil;
  ctx.fill(groundPath);
  const grades: readonly [number, CanvasPattern, CanvasPattern][] = [[TILE.stone, patterns.washes.stone, patterns.stone], [TILE.deep, patterns.washes.deep, patterns.deep]];
  for (const [tile, wash, pattern] of grades) {
    const path = maskPath(of(tile), c, T);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = wash;
    ctx.fill(path);
    ctx.globalAlpha = 1;
    ctx.fillStyle = pattern;
    ctx.fill(path);
  }
  const bedrockPath = maskPath(of(TILE.bedrock), c, T);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = style.bedrock;
  ctx.fill(bedrockPath);
  ctx.globalAlpha = 1;
  bedrockCracks(ctx, t, c, T);
  ctx.save();
  ctx.clip(groundPath);
  const [y0, h0] = [c.ty * T - CHUNK_PAD, size + CHUNK_PAD * 2];
  // Column by column, so the sunlit band under the surface follows it (and chunks agree at their edges).
  for (let col = c.tx - 1; col <= c.tx + c.tiles; col++) depthTone(ctx, col * T, y0, T, h0, (roof[wrapX(t, col)] ?? 0) * T, t.height * T);
  flecks(ctx, t, c, T, style);
  lightRock(ctx, faces, T, style.shade, patterns.shadow);
  ctx.restore();
  ores(ctx, t, c, T);
  firedamp(ctx, t, c, T);
  // Faint lines where one grade gives way to the next; heavy ink where you can't drill.
  inkEdges(ctx, of(TILE.stone), c, T, 0.9, 100, 0.45);
  inkEdges(ctx, of(TILE.deep), c, T, 0.9, 200, 0.45);
  inkEdges(ctx, ground, c, T, 1.5, 0);
  // Heavier ink under every overhang, where the shadow is.
  shadowLine(ctx, faces);
  const hard: Mask = (x, y) => {
    const tile = tileAt(t, x, y);
    const grade = gradeOf(tile);
    return tile === TILE.bedrock || (grade !== null && tooHard(grade));
  };
  inkEdges(ctx, hard, c, T, 2.8, 300);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** Whether a chunk has anything to draw (open sky needs no texture). */
export function chunkHasGround(t: Terrain, roof: Int32Array, c: ChunkRect): boolean {
  const x0 = t.wrap ? c.tx - 1 : Math.max(0, c.tx - 1);
  const x1 = t.wrap ? c.tx + c.tiles : Math.min(t.width - 1, c.tx + c.tiles);
  for (let x = x0; x <= x1; x++) if (roof[wrapX(t, x)]! <= c.ty + c.tiles) return true;
  return false;
}
