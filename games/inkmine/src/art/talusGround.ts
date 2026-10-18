import { hash } from '../logic/noise';
import { TILE, tileAt, type Terrain } from '../logic/terrain';
import { mix } from './paint';
import { INK, type GroundStyle } from './palette';

/**
 * Talus's loose rock (spec, "Talus: its new mechanic"), drawn in front of
 * the ground as caps are on Mycel: each loose tile a rounded, broken
 * boulder of the mesa's stone, lit from the upper left, cracked, with a firm
 * pen line, sitting a little into its neighbours so a slope reads as one
 * heap. Plain canvas paths, as a chunk may hold dozens.
 */
type P = readonly [number, number];

/** A boulder's outline: rounded, with a few flat broken faces, `s` across its widest, its foot on `cy + s/2`. */
function outline(cx: number, cy: number, s: number, seed: number): P[] {
  const n = 11;
  const turn = hash(seed, 1, 7) * Math.PI * 2;
  // Two or three corners knocked flat: where it broke off the cliff.
  const flat = [Math.floor(hash(seed, 2, 7) * n), Math.floor(hash(seed, 3, 7) * n)];
  return Array.from({ length: n }, (_, i) => {
    const a = turn + (i / n) * Math.PI * 2;
    const r = (s / 2) * (0.84 + hash(seed, i, 11) * 0.22) * (flat.includes(i) ? 0.86 : 1);
    // Squat, sitting on its broad side.
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8];
  });
}

function path(ctx: CanvasRenderingContext2D, pts: readonly P[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/**
 * One boulder: its stone's colour, a warm light on its upper left and a
 * cool shadow on its lower right, a crack or two, flecks of grit, a soft
 * contact shadow under it and the pen round it.
 */
export function boulder(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: number, style: GroundStyle): void {
  const pts = outline(cx, cy, s, seed);
  const rock = mix(style.stone, style.soil, 0.25 + hash(seed, 4, 7) * 0.3);
  // Its shadow on whatever it rests on.
  ctx.save();
  ctx.translate(cx + s * 0.06, cy + s * 0.38);
  ctx.scale(1, 0.3);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.55);
  shadow.addColorStop(0, 'rgba(40, 20, 20, 0.35)');
  shadow.addColorStop(1, 'rgba(40, 20, 20, 0)');
  ctx.fillStyle = shadow;
  ctx.fillRect(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2);
  ctx.restore();
  path(ctx, pts);
  ctx.fillStyle = rock;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const light = ctx.createLinearGradient(cx - s * 0.5, cy - s * 0.45, cx + s * 0.5, cy + s * 0.45);
  light.addColorStop(0, 'rgba(255, 236, 210, 0.55)');
  light.addColorStop(0.4, 'rgba(255, 236, 210, 0)');
  light.addColorStop(0.7, 'rgba(70, 40, 60, 0.18)');
  light.addColorStop(1, 'rgba(50, 30, 60, 0.45)');
  ctx.fillStyle = light;
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
  // A broken face catching the light more flatly.
  const fx = cx - s * (0.1 + hash(seed, 5, 7) * 0.15);
  const fy = cy - s * 0.18;
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#fff3e0';
  ctx.beginPath();
  ctx.moveTo(fx - s * 0.22, fy - s * 0.05);
  ctx.lineTo(fx + s * 0.08, fy - s * 0.22);
  ctx.lineTo(fx + s * 0.16, fy + s * 0.04);
  ctx.lineTo(fx - s * 0.1, fy + s * 0.12);
  ctx.closePath();
  ctx.fill();
  // Grit, and rust where iron weathers out of it.
  for (let k = 0; k < 6; k++) {
    ctx.globalAlpha = 0.25 + hash(seed, 20 + k, 7) * 0.3;
    ctx.fillStyle = k % 2 ? style.grain : '#b4553a';
    ctx.beginPath();
    ctx.arc(cx + (hash(seed, 30 + k, 7) - 0.5) * s * 0.7, cy + (hash(seed, 40 + k, 7) - 0.4) * s * 0.5, s * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // A crack running in from the edge.
  if (hash(seed, 6, 7) < 0.7) {
    const a = hash(seed, 7, 7) * Math.PI * 2;
    const x0 = cx + Math.cos(a) * s * 0.42;
    const y0 = cy + Math.sin(a) * s * 0.33;
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(0.5, s * 0.025);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(cx + Math.cos(a + 0.4) * s * 0.18, cy + Math.sin(a + 0.4) * s * 0.12);
    ctx.lineTo(cx + Math.cos(a + 0.1) * s * 0.02, cy + Math.sin(a - 0.3) * s * 0.06);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  path(ctx, pts);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, s * 0.045);
  ctx.lineJoin = 'round';
  ctx.stroke();
  // A rim of light along the top edge.
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#fff1dc';
  ctx.lineWidth = Math.max(0.5, s * 0.03);
  ctx.beginPath();
  const top = pts.filter(([, y]) => y < cy - s * 0.1).sort((a, b) => a[0] - b[0]);
  top.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y + s * 0.04) : ctx.lineTo(x, y + s * 0.04)));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * One loose tile's rock: broken stone of every size, as a real talus is,
 * so a slope never reads as a stacked wall: usually one boulder (its size
 * and where it sits in the tile vary), with smaller stones wedged round
 * it, or now and then a heap of small ones instead.
 */
export function looseRock(ctx: CanvasRenderingContext2D, x: number, y: number, T: number, style: GroundStyle): void {
  const seed = x * 7919 + y * 104729;
  const h = (k: number): number => hash(x, y, 850 + k);
  const stones: [number, number, number][] = [];
  if (h(0) < 0.18) {
    // A heap of small stones.
    for (let k = 0; k < 4; k++) stones.push([x + 0.2 + h(10 + k) * 0.6, y + 1 - (k < 2 ? 0 : 0.35), T * (0.36 + h(20 + k) * 0.14)]);
  } else {
    stones.push([x + 0.5 + (h(1) - 0.5) * 0.3, y + 1, T * (0.78 + h(2) * 0.3)]);
    const extra = h(3) < 0.55 ? 2 : 1;
    for (let k = 0; k < extra; k++) stones.push([x + (h(4 + k) < 0.5 ? 0.12 : 0.88), y + 1 - h(6 + k) * 0.25, T * (0.3 + h(8 + k) * 0.16)]);
  }
  // Big ones behind, small ones in front.
  stones.sort((a, b) => b[2] - a[2]);
  stones.forEach(([sx, foot, s], i) => boulder(ctx, sx * T, foot * T - s * 0.42, s, seed + i * 13, style));
}

/**
 * The gravel and grit packed between a loose tile's stones, so the slope
 * is one heap and not stones on paper: the whole tile under the surface of
 * the heap, and a low mound on a tile that's the heap's top.
 */
function gravel(ctx: CanvasRenderingContext2D, t: Terrain, x: number, y: number, T: number, style: GroundStyle): void {
  const top = tileAt(t, x, y - 1) === TILE.air;
  const color = mix(style.soil, style.shade, 0.3);
  ctx.fillStyle = color;
  ctx.beginPath();
  if (top) {
    // A mound: low at the tile's sides where it meets open air, fuller where it meets more of the heap.
    const left = tileAt(t, x - 1, y) !== TILE.air ? 0.55 : 0.25;
    const right = tileAt(t, x + 1, y) !== TILE.air ? 0.55 : 0.25;
    ctx.moveTo(x * T - 1, (y + 1) * T);
    ctx.lineTo(x * T - 1, (y + 1 - left) * T);
    ctx.quadraticCurveTo((x + 0.5) * T, (y + 0.15) * T, (x + 1) * T + 1, (y + 1 - right) * T);
    ctx.lineTo((x + 1) * T + 1, (y + 1) * T);
  } else ctx.rect(x * T - 0.5, y * T - 0.5, T + 1, T + 1);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let k = 0; k < 9; k++) {
    ctx.globalAlpha = 0.35 + hash(x, y, 870 + k) * 0.35;
    ctx.fillStyle = k % 3 ? style.grain : mix(style.soil, '#fff0dc', 0.4);
    ctx.beginPath();
    ctx.arc((x + hash(x, y, 880 + k)) * T, (y + hash(x, y, 890 + k)) * T, T * (0.03 + hash(x, y, 900 + k) * 0.03), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Every loose rock in and round the chunk: the gravel first, then the stones, top rows first, so a heap's lower rocks sit in front. */
export function looseIn(ctx: CanvasRenderingContext2D, t: Terrain, c: { readonly tx: number; readonly ty: number; readonly tiles: number }, T: number, style: GroundStyle): void {
  for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) if (tileAt(t, x, y) === TILE.loose) gravel(ctx, t, x, y, T, style);
  }
  for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) if (tileAt(t, x, y) === TILE.loose) looseRock(ctx, x, y, T, style);
  }
}
