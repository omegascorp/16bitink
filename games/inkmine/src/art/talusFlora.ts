import { hash } from '../logic/noise';
import { isSolid, TILE, tileAt, wrapX, type Terrain } from '../logic/terrain';
import { INK, PAPER_FILL } from './palette';

/**
 * Talus's plants, drawn into its ground chunks (ground.ts) as Mycel's caps
 * are (spec, "Talus: flora"). Life on a dry world saves every drop, and on
 * Earth cacti and euphorbias, unrelated, found the same answer: a fat,
 * leafless, pleated stem that swells to store water and shrinks as it uses
 * it, ribs to shade itself, spines for leaves, and a waxy bloom that turns
 * back the sun. Talus's are:
 * - barrel plants: pleated columns a tile or three high (TILE.plant), each
 *   tile a segment, the top one crowned with rust-red flowers; drilled,
 *   each segment gives the water it holds;
 * - their tap roots, running down through the ground under them towards
 *   the water far below, as a desert mesquite's do;
 * - living stones: pairs of fat leaves sunk in the crust beside them, each
 *   with a clear window on top to let light in, passing for pebbles (as
 *   Earth's lithops do).
 * Plain canvas paths, seeded by tile, so a chunk redrawn after a dig
 * changes nothing else.
 */

/** The chunk being drawn, in tiles (as ground.ts has it). */
interface Chunk {
  readonly tx: number;
  readonly ty: number;
  readonly tiles: number;
}

/** A barrel's colours: a dusty sage stem, its grooves deep, the waxy bloom on its ribs; the spines and the flowers. */
const STEM = ['#7f9a86', '#86977a', '#77938f'] as const;
const GROOVE = '#3f5a50';
const BLOOM = '#d6e4d6';
const SPINE = '#f6efe2';
const FLOWER = '#c8553d';
const FLOWER_HEART = '#f2c25a';
const ROOT = '#5b3a2a';

/** How many tiles high a barrel plant may stand (carve.ts PlantRule), so chunks above the ground still draw one. */
export const PLANT_MAX = 3;

type P = readonly [number, number];

function path(ctx: CanvasRenderingContext2D, pts: readonly P[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** The bottom tile of the plant whose segment is at (x, y). */
function baseOf(t: Terrain, x: number, y: number): number {
  let b = y;
  while (tileAt(t, x, b + 1) === TILE.plant) b++;
  return b;
}

/**
 * The stem's half-width at height `v` up the whole plant (0 its foot, 1
 * its top, `tall` tiles high): one column, a barrel fullest a little below
 * its middle, rounded off into a dome over its last half-tile.
 */
function halfWidth(v: number, tall: number, T: number, fat: number): number {
  const barrel = 0.26 + 0.05 * Math.sin(Math.PI * Math.min(1, v * 1.1)) * fat;
  const into = (1 - v) * tall;
  const dome = into < 0.45 ? Math.sqrt(Math.max(0, 1 - ((0.45 - into) / 0.47) ** 2)) : 1;
  return T * barrel * dome;
}

/**
 * One segment of a barrel plant: its outline, then the pleats (five ribs
 * showing, each lit on its left and grooved dark between), the bloom on
 * the ribs, spines in tufts along each rib's crest, and a firm pen line.
 * The top segment is domed and woolly at its crown, with flowers.
 */
function segment(ctx: CanvasRenderingContext2D, t: Terrain, x: number, y: number, T: number): void {
  const steps = 14;
  const base = baseOf(t, x, y);
  const top = tileAt(t, x, y - 1) !== TILE.plant;
  let crownRow = y;
  while (tileAt(t, x, crownRow - 1) === TILE.plant) crownRow--;
  const tall = base - crownRow + 1;
  // Height up the whole plant at step i of this segment.
  const vAt = (i: number): number => (base - y + i / steps) / tall;
  const h = (k: number): number => hash(x, base, 930 + k);
  const stem = STEM[Math.floor(h(0) * STEM.length)]!;
  const fat = 0.6 + h(1) * 0.8;
  const cx = (x + 0.5) * T + (h(2) - 0.5) * T * 0.06;
  const y0 = (y + 1) * T;
  const at = (i: number): number => y0 - (i / steps) * T * (top ? 0.96 : 1);
  const right: P[] = [];
  const left: P[] = [];
  for (let i = 0; i <= steps; i++) {
    const w = halfWidth(vAt(i), tall, T, fat);
    right.push([cx + w, at(i)]);
    left.push([cx - w, at(i)]);
  }
  const outline = [...left, ...right.reverse()];
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  path(ctx, outline);
  ctx.fillStyle = stem;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Light from the upper left across the round of it.
  const lit = ctx.createLinearGradient(cx - T * 0.32, 0, cx + T * 0.32, 0);
  lit.addColorStop(0, 'rgba(255, 246, 226, 0.45)');
  lit.addColorStop(0.35, 'rgba(255, 246, 226, 0.08)');
  lit.addColorStop(0.75, 'rgba(30, 50, 50, 0.25)');
  lit.addColorStop(1, 'rgba(20, 30, 40, 0.5)');
  ctx.fillStyle = lit;
  ctx.fillRect(cx - T * 0.4, y * T - 2, T * 0.8, T + 4);
  // The pleats: grooves running up the stem, bunched towards the edges as a ribbed column turns away.
  for (let r = 0; r < 4; r++) {
    const k = -0.75 + r * 0.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const gx = cx + Math.sin(k * 1.15) * halfWidth(vAt(i), tall, T, fat);
      if (i === 0) ctx.moveTo(gx, at(i));
      else ctx.lineTo(gx, at(i));
    }
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = GROOVE;
    ctx.lineWidth = Math.max(0.6, T * 0.035);
    ctx.stroke();
    // The waxy bloom catching the light on the rib just left of each groove.
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = BLOOM;
    ctx.lineWidth = Math.max(0.5, T * 0.025);
    ctx.beginPath();
    for (let i = 1; i < steps; i++) {
      const gx = cx + Math.sin(k * 1.15) * halfWidth(vAt(i), tall, T, fat) - T * 0.04;
      if (i === 1) ctx.moveTo(gx, at(i));
      else ctx.lineTo(gx, at(i));
    }
    ctx.stroke();
  }
  ctx.restore();
  // Spines: a tuft at each areole along the rib crests.
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = SPINE;
  ctx.lineWidth = Math.max(0.4, T * 0.012);
  for (let r = 0; r < 5; r++) {
    const k = -1 + r * 0.5;
    for (let i = 2; i < steps - 1; i += 3) {
      const ax = cx + Math.sin(k * 1.15) * halfWidth(vAt(i), tall, T, fat) * 0.98;
      const ay = at(i) + (r % 2) * T * 0.05;
      const out = Math.sign(k) || (h(10 + i) < 0.5 ? -1 : 1);
      for (let s = -1; s <= 1; s++) {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + out * T * (0.05 + Math.abs(s) * 0.01) + s * T * 0.02, ay - T * 0.04 + s * T * 0.035);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, T * 0.035);
  path(ctx, outline);
  ctx.stroke();
  if (top) crown(ctx, cx, at(steps), T, h);
  ctx.restore();
}

/** The crown of a barrel plant: a pale woolly cap, and two or three rust-red flowers open on it (or a fruit). */
function crown(ctx: CanvasRenderingContext2D, cx: number, cy: number, T: number, h: (k: number) => number): void {
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = PAPER_FILL;
  ctx.beginPath();
  ctx.ellipse(cx, cy + T * 0.04, T * 0.11, T * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  const n = 2 + Math.floor(h(20) * 2);
  for (let k = 0; k < n; k++) {
    const fx = cx + (k - (n - 1) / 2) * T * 0.11;
    const fy = cy - T * 0.02 - (k === Math.floor(n / 2) ? T * 0.03 : 0);
    const r = T * (0.045 + h(21 + k) * 0.02);
    ctx.globalAlpha = 1;
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2 + h(30 + k);
      ctx.fillStyle = FLOWER;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(a) * r * 0.6, fy + Math.sin(a) * r * 0.45 - r * 0.2, r * 0.55, r * 0.3, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = FLOWER_HEART;
    ctx.beginPath();
    ctx.arc(fx, fy - r * 0.2, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(0.5, T * 0.015);
    ctx.beginPath();
    ctx.arc(fx, fy - r * 0.2, r * 0.75, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * A barrel plant's tap roots: a few thin roots from its foot down through
 * the ground beneath it, forking as they go, through solid ground only (a
 * tunnel cuts them, and they stop there).
 */
function roots(ctx: CanvasRenderingContext2D, t: Terrain, x: number, y: number, T: number): void {
  const h = (k: number): number => hash(x, y, 960 + k);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = ROOT;
  for (let r = 0; r < 3; r++) {
    let px = (x + 0.5 + (r - 1) * 0.12) * T;
    let py = (y + 1) * T;
    const depth = 1.6 + h(r) * 1.6;
    let w = Math.max(0.6, T * 0.04) * (r === 1 ? 1.3 : 1);
    for (let s = 1; s <= 8; s++) {
      const nx = px + (h(10 + r * 8 + s) - 0.5) * T * 0.22 + (r - 1) * T * 0.04;
      const ny = (y + 1) * T + (s / 8) * depth * T;
      if (!isSolid(t, Math.floor(nx / T), Math.floor(ny / T))) break;
      ctx.globalAlpha = 0.45 - s * 0.035;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      // Now and then a rootlet off to the side.
      if (h(40 + r * 8 + s) < 0.3) {
        ctx.lineWidth = w * 0.5;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(nx + (h(60 + s) < 0.5 ? -1 : 1) * T * 0.16, ny + T * 0.1);
        ctx.stroke();
      }
      px = nx;
      py = ny;
      w *= 0.85;
    }
  }
  ctx.restore();
}

/**
 * A pair of living stones sunk in the crust at (px, py), the ground line:
 * two fat leaves pressed together, rounded like a pebble split down the
 * middle, the colour of the dust, each with a clear window on top veined
 * with darker lines; now and then a yellow flower in the cleft.
 */
function livingStone(ctx: CanvasRenderingContext2D, px: number, py: number, T: number, seed: number): void {
  const h = (k: number): number => hash(seed, k, 990);
  const s = T * (0.09 + h(0) * 0.05);
  const tint = h(1) < 0.5 ? '#c7a493' : '#b9a08c';
  ctx.save();
  for (const side of [-1, 1]) {
    const lx = px + side * s * 0.52;
    ctx.beginPath();
    ctx.ellipse(lx, py - s * 0.35, s * 0.55, s * 0.5, side * 0.15, Math.PI, Math.PI * 2);
    ctx.lineTo(lx + s * 0.55, py);
    ctx.lineTo(lx - s * 0.55, py);
    ctx.closePath();
    ctx.fillStyle = tint;
    ctx.globalAlpha = 1;
    ctx.fill();
    // The window: a paler, glassy top with darker lines in it.
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#efe0cf';
    ctx.beginPath();
    ctx.ellipse(lx - side * s * 0.05, py - s * 0.62, s * 0.36, s * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#7a5a4c';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(lx - s * 0.25, py - s * 0.62);
    ctx.lineTo(lx + s * 0.05, py - s * 0.68);
    ctx.lineTo(lx + s * 0.2, py - s * 0.58);
    ctx.stroke();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.ellipse(lx, py - s * 0.35, s * 0.55, s * 0.5, side * 0.15, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  if (h(2) < 0.25) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = FLOWER_HEART;
    ctx.beginPath();
    ctx.arc(px, py - s * 0.85, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Whether a barrel plant stands within `r` columns of column x. */
function plantNear(t: Terrain, roof: Int32Array, x: number, r: number): boolean {
  for (let dx = -r; dx <= r; dx++) {
    const c = wrapX(t, x + dx);
    if (tileAt(t, c, (roof[c] ?? 0) - 1) === TILE.plant) return true;
  }
  return false;
}

/**
 * Every barrel plant in and round the chunk, with its roots under it, and
 * the living stones in the bare crust near them (they grow where the
 * barrels do).
 */
export function floraIn(ctx: CanvasRenderingContext2D, t: Terrain, roof: Int32Array, c: Chunk, T: number): void {
  for (let y = c.ty - 3; y <= c.ty + c.tiles + 1; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) {
      if (tileAt(t, x, y) === TILE.plant && tileAt(t, x, y + 1) !== TILE.plant) roots(ctx, t, x, y, T);
    }
  }
  for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) {
    const fx = wrapX(t, x);
    const y = roof[fx] ?? 0;
    if (y < c.ty - 1 || y > c.ty + c.tiles + 1 || tileAt(t, x, y) !== TILE.soil || isSolid(t, x, y - 1) || !plantNear(t, roof, x, 5)) continue;
    for (let k = 0; k < 2; k++) if (hash(fx, k, 995) < 0.32) livingStone(ctx, (x + 0.2 + k * 0.55 + hash(fx, k, 996) * 0.2) * T, y * T + T * 0.04, T, fx * 7 + k);
  }
  for (let y = c.ty - PLANT_MAX; y <= c.ty + c.tiles; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) if (tileAt(t, x, y) === TILE.plant) segment(ctx, t, x, y, T);
  }
}
