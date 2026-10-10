import { cellCase, cellGeometry } from '../logic/contour';
import { createRng } from '../logic/rng';
import { groundRow, tileAt, TILE, type Terrain } from '../logic/terrain';
import { DUNE, type GroundStyle, INK, MUD, MUD_SHEEN, PALE_SAND, PAPER } from './palette';

/**
 * Diggable sand drawn as ballpoint hatching. Seamless hatch tiles are used
 * as canvas patterns anchored to the world, filled through the marching-
 * squares shape of the terrain, and every dug surface is outlined in pen.
 * All jitter is seeded by world position, so redrawing a chunk after a dig
 * only changes the strokes next to the hole.
 */
const PATTERN_PX = 128;
/** Overlap drawn around each chunk so neighbouring chunk sprites leave no seam. */
export const CHUNK_PAD = 2;

export interface SandPatterns {
  readonly sand: CanvasPattern;
  readonly deep: CanvasPattern;
  readonly rock: CanvasPattern;
  readonly grain: CanvasPattern;
  /** Wind ripples on loose dune sand. */
  readonly ripple: CanvasPattern;
}

/** Deterministic 0..1 noise for a lattice point. */
function hash(x: number, y: number, salt = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * A tile of short ballpoint strokes in patches, wrapped so it repeats without
 * seams. Patches sit on a jittered grid so the shading is even, not blotchy.
 */
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
    const count = 5 + Math.floor(rng() * 3);
    const len = cell * (0.9 + rng() * 0.5);
    for (let i = 0; i < count; i++) {
      const off = (i - count / 2) * 2.1;
      const l = len * (0.7 + rng() * 0.3);
      const bend = (rng() - 0.5) * 1.2;
      const w = 0.45 + rng() * 0.3;
      const al = alpha * (0.8 + rng() * 0.2);
      const x0 = cx + nrm.x * off - (dir.x * l) / 2;
      const y0 = cy + nrm.y * off - (dir.y * l) / 2;
      // Draw at every wrapped offset so strokes crossing an edge continue on the far side.
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
  return canvas;
}

/** Sand grains, wrapped like the hatching. */
function grainTile(res: number, color: string): HTMLCanvasElement {
  const size = PATTERN_PX * res;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.scale(res, res);
  const rng = createRng(31);
  const wrapped = (draw: (ox: number, oy: number) => void): void => {
    for (const ox of [-PATTERN_PX, 0, PATTERN_PX]) for (const oy of [-PATTERN_PX, 0, PATTERN_PX]) draw(ox, oy);
  };
  for (let i = 0; i < 900; i++) {
    const x = rng() * PATTERN_PX;
    const y = rng() * PATTERN_PX;
    const r = 0.25 + rng() * 0.55;
    const a = 0.25 + rng() * 0.45;
    wrapped((ox, oy) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
  return canvas;
}

function rockTile(res: number): HTMLCanvasElement {
  const canvas = hatchTile(res, 77, -Math.PI / 4, 12, 0.42);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(hatchTile(res, 78, Math.PI / 4, 11, 0.28), 0, 0);
  return canvas;
}

export function makeSandPatterns(ctx: CanvasRenderingContext2D, res: number, style: GroundStyle = PALE_SAND): SandPatterns {
  const pattern = (c: HTMLCanvasElement): CanvasPattern => {
    const p = ctx.createPattern(c, 'repeat');
    if (!p) throw new Error('Canvas patterns are not available');
    // Pattern pixels are texture pixels; the chunk context already scales world px by `res`.
    p.setTransform(new DOMMatrix().scale(1 / res));
    return p;
  };
  return {
    sand: pattern(hatchTile(res, 11, -Math.PI / 3, 10, 0.26)),
    deep: pattern(hatchTile(res, 12, Math.PI / 5, 9, 0.3)),
    rock: pattern(rockTile(res)),
    grain: pattern(grainTile(res, style.grain)),
    ripple: pattern(hatchTile(res, 13, 0.06, 9, 0.12)),
  };
}

export interface ChunkRect {
  /** First tile column and row. */
  readonly tx: number;
  readonly ty: number;
  /** Size in tiles. */
  readonly tiles: number;
}

type Mask = (x: number, y: number) => boolean;

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
function inkEdges(ctx: CanvasRenderingContext2D, mask: Mask, c: ChunkRect, T: number, width: number, salt: number): void {
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  const wob = T * 0.12;
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
          ctx.globalAlpha = pass === 0 ? 0.92 : 0.3;
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

/** Every outline segment of a mask over the chunk, in world px. */
function edgeSegments(mask: Mask, c: ChunkRect, T: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let j = c.ty - 1; j < c.ty + c.tiles; j++) {
    for (let i = c.tx - 1; i < c.tx + c.tiles; i++) {
      const code = cellCase(mask(i, j), mask(i + 1, j), mask(i + 1, j + 1), mask(i, j + 1));
      for (const [a, b] of cellGeometry(code).edges) out.push([(i + 0.5 + a.x) * T, (j + 0.5 + a.y) * T, (i + 0.5 + b.x) * T, (j + 0.5 + b.y) * T]);
    }
  }
  return out;
}

/** Shadow just inside every surface, so tunnels read as hollowed out of the sand. */
function wallShadow(ctx: CanvasRenderingContext2D, segs: readonly [number, number, number, number][], T: number, style: GroundStyle): void {
  ctx.strokeStyle = style.shade;
  ctx.lineCap = 'round';
  for (const [w, a] of [[T * 0.9, 0.08], [T * 0.45, 0.12]] as const) {
    ctx.globalAlpha = a;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of segs) {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Mangrove mud: a dark, wet wash over the sand, and a sheen of sky on its
 * top surface (short pale glints along the edge it shows to the air).
 */
function mud(ctx: CanvasRenderingContext2D, t: Terrain, c: ChunkRect, T: number): void {
  const mask: Mask = (x, y) => tileAt(t, x, y) === TILE.mud;
  const path = maskPath(mask, c, T);
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = MUD;
  ctx.fill(path);
  ctx.strokeStyle = MUD_SHEEN;
  ctx.lineCap = 'round';
  for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) {
      if (!mask(x, y) || tileAt(t, x, y - 1) !== TILE.air) continue;
      for (let k = 0; k < 2; k++) {
        const x0 = (x + hash(x, y, 60 + k) * 0.7) * T;
        const y0 = (y + 0.25 + hash(x, y, 62 + k) * 0.35) * T;
        ctx.globalAlpha = 0.55 + hash(x, y, 64 + k) * 0.3;
        ctx.lineWidth = 0.8 + hash(x, y, 66 + k) * 0.6;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + T * (0.2 + hash(x, y, 68 + k) * 0.25), y0 + 0.3);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}


/**
 * The odd pebble or shell chip, scattered per tile by a world-position hash
 * (no pattern repeat, identical across chunk borders).
 */
function pebbles(ctx: CanvasRenderingContext2D, t: Terrain, c: ChunkRect, T: number, style: GroundStyle): void {
  for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) {
      if (tileAt(t, x, y) !== TILE.sand || hash(x, y, 7) > 0.07) continue;
      // Only where the pebble sits wholly inside sand.
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tileAt(t, x + dx!, y + dy!) === TILE.air)) continue;
      const rx = 1.4 + hash(x, y, 8) * 2.6;
      const ry = rx * (0.55 + hash(x, y, 9) * 0.25);
      ctx.beginPath();
      ctx.ellipse((x + hash(x, y, 10)) * T, (y + hash(x, y, 11)) * T, rx, ry, hash(x, y, 12) * Math.PI, 0, Math.PI * 2);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = style.pebbles[Math.floor(hash(x, y, 13) * style.pebbles.length)]!;
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 0.45;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** How dark the cross-hatching of deep sand is on this row: none near the top, more with depth. */
function deepAlpha(row: number, height: number): number {
  return Math.max(0, Math.min(0.6, (row - height * 0.4) / (height * 0.5)));
}

/** Redraws one chunk of terrain into `ctx`: a canvas of (tiles·T + 2·CHUNK_PAD)·res pixels. */
export function drawChunk(ctx: CanvasRenderingContext2D, t: Terrain, c: ChunkRect, T: number, res: number, patterns: SandPatterns, style: GroundStyle = PALE_SAND): void {
  const size = c.tiles * T;
  ctx.setTransform(res, 0, 0, res, (CHUNK_PAD - c.tx * T) * res, (CHUNK_PAD - c.ty * T) * res);
  ctx.clearRect(c.tx * T - CHUNK_PAD, c.ty * T - CHUNK_PAD, size + CHUNK_PAD * 2, size + CHUNK_PAD * 2);
  // A boat's or stilt house's wooden floor is drawn with the deck (see DecksView), not as sand.
  const solid: Mask = (x, y) => {
    const tile = tileAt(t, x, y);
    return tile !== TILE.air && tile !== TILE.wood;
  };
  const rock: Mask = (x, y) => tileAt(t, x, y) === TILE.rock;
  // Burrows: open tiles with sand still overhead (not just a deck). They get a shadowy wash so a tunnel never reads as sky.
  const roof = new Map<number, number>();
  const covered: Mask = (x, y) => {
    if (tileAt(t, x, y) !== TILE.air) return false;
    if (!roof.has(x)) roof.set(x, groundRow(t, x));
    return y > roof.get(x)!;
  };
  const tunnelPath = maskPath(covered, c, T);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = style.tunnel;
  ctx.fill(tunnelPath);
  ctx.globalAlpha = 1;
  const sandPath = maskPath(solid, c, T);
  ctx.fillStyle = PAPER;
  ctx.fill(sandPath);
  // Watercolour: dry pale sand near the top of the beach, wet and dark below.
  const wash = ctx.createLinearGradient(0, 0, 0, t.height * T);
  wash.addColorStop(0.15, style.dry);
  wash.addColorStop(0.55, style.wet);
  wash.addColorStop(1, style.deep);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = wash;
  ctx.fill(sandPath);
  ctx.globalAlpha = 1;
  ctx.fillStyle = patterns.grain;
  ctx.fill(sandPath);
  ctx.fillStyle = patterns.sand;
  ctx.fill(sandPath);
  // Loose dune sand: a warm, dry wash with wind ripples, so it reads apart from the packed sand under it.
  const loose: Mask = (x, y) => tileAt(t, x, y) === TILE.loose;
  const loosePath = maskPath(loose, c, T);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = DUNE;
  ctx.fill(loosePath);
  ctx.globalAlpha = 1;
  ctx.fillStyle = patterns.ripple;
  ctx.fill(loosePath);
  mud(ctx, t, c, T);
  ctx.save();
  ctx.clip(sandPath);
  pebbles(ctx, t, c, T, style);
  wallShadow(ctx, edgeSegments(solid, c, T), T, style);
  ctx.fillStyle = patterns.deep;
  for (let row = c.ty - 1; row <= c.ty + c.tiles; row++) {
    const a = deepAlpha(row, t.height);
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.fillRect(c.tx * T - CHUNK_PAD, row * T, size + CHUNK_PAD * 2, T);
  }
  ctx.restore();
  const rockPath = maskPath(rock, c, T);
  ctx.fillStyle = PAPER;
  ctx.fill(rockPath);
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = style.rock;
  ctx.fill(rockPath);
  ctx.globalAlpha = 1;
  ctx.fillStyle = patterns.grain;
  ctx.fill(rockPath);
  ctx.fillStyle = patterns.rock;
  ctx.fill(rockPath);
  if (style.joints) joints(ctx, t, rockPath, c, T);
  inkEdges(ctx, solid, c, T, 1.7, 0);
  inkEdges(ctx, rock, c, T, 2.1, 100);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Basalt cooled into columns: a vertical joint between neighbouring rock
 * columns every tile or two, and the odd cross-crack, wobbling by world
 * position so chunks meet without seams.
 */
function joints(ctx: CanvasRenderingContext2D, t: Terrain, rockPath: Path2D, c: ChunkRect, T: number): void {
  ctx.save();
  ctx.clip(rockPath);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) {
    for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) {
      if (tileAt(t, x, y) !== TILE.rock) continue;
      const jx = (x + 0.5 + (hash(x, 0, 81) - 0.5) * 0.3) * T;
      if (hash(x, 0, 80) < 0.7) {
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(jx + (hash(x, y, 82) - 0.5) * 1.2, y * T);
        ctx.lineTo(jx + (hash(x, y + 1, 82) - 0.5) * 1.2, (y + 1) * T);
        ctx.stroke();
      }
      if (hash(x, y, 83) < 0.18) {
        const cy = (y + hash(x, y, 84)) * T;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x * T, cy);
        ctx.lineTo((x + 0.5) * T, cy + (hash(x, y, 85) - 0.5) * 3);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Whether any tile in or bordering the chunk is solid (all-air chunks need no texture). */
export function chunkHasGround(t: Terrain, c: ChunkRect): boolean {
  for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) if (y >= 0 && tileAt(t, x, y) !== TILE.air) return true;
  return false;
}
