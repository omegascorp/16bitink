import { createRng } from '../logic/rng';
import { GRASS_H, GRASS_TILE_W, ROCK_TILE, SKY_H, SKY_TILE_W } from './board';
import { ART_RES, ASH, ASH_DARK, BASALT_DARK, EMBER, EMBER_LIGHT, INK, PAPER } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The world around the Volcano Shrine, as seamless tiles the same sizes as
 * the jungle's (see board.ts): dark volcanic rock, a smoky dusk sky with a
 * far cone and its plume, and a strip of ash and cinders with a few coals
 * still glowing where the jungle has its grass.
 */

/** The sky's colour above its tile: the tile's top edge, a smoky violet dusk. */
export const VOLCANO_SKY_TOP = '#5e5468';
export const VOLCANO_SKY_TOP_HEX = 0x5e5468;

const ROCK_V = '#5c5157';
const ROCK_V_DARK = '#3f363c';

/** Draws `draw` at every offset by the tile size, so anything crossing an edge wraps round. */
function wrapped(w: number, h: number, draw: (dx: number, dy: number) => void): void {
  for (const dx of [-w, 0, w]) for (const dy of h > 0 ? [-h, 0, h] : [0]) draw(dx, dy);
}

export function paintVolcanoRockTile(): HTMLCanvasElement {
  const T = ROCK_TILE;
  const { canvas, ctx } = makeCanvas(T * ART_RES, T * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  const rng = createRng(12);
  ctx.fillStyle = mix(PAPER, ROCK_V, 0.93);
  ctx.fillRect(0, 0, T, T);
  // Lava flows, layer on layer: long tilted bands of a darker and a warmer wash.
  for (let i = 0; i < 9; i++) {
    const y = rng() * T;
    const h = 14 + rng() * 34;
    const a = 0.08 + rng() * 0.1;
    const c = rng() < 0.3 ? '#7a4a3e' : ROCK_V_DARK;
    wrapped(T, T, (dx, dy) => {
      const g = ctx.createLinearGradient(0, y + dy - h, 0, y + dy + h);
      g.addColorStop(0, rgba(c, 0));
      g.addColorStop(0.5, rgba(c, a));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(dx, y + dy - h, T, h * 2);
    });
  }
  for (let i = 0; i < 34; i++) {
    const x = rng() * T;
    const y = rng() * T;
    const r = 30 + rng() * 80;
    const dark = rng() < 0.75;
    const a = dark ? 0.12 + rng() * 0.14 : 0.12;
    const c = dark ? BASALT_DARK : '#c9b9b0';
    wrapped(T, T, (dx, dy) => {
      const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0, rgba(c, a));
      g.addColorStop(0.75, rgba(c, a * 0.4));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    });
  }
  const pen = new Pen(ctx, 29, 0.6);
  // Angular clinkers of cooled lava, lit from the top left.
  for (let i = 0; i < 40; i++) {
    const x = rng() * T;
    const y = rng() * T;
    const r = 3 + rng() * 9;
    const sides = 5 + Math.floor(rng() * 3);
    const turn = rng() * Math.PI;
    const pts: Pt[] = Array.from({ length: sides }, (_, k) => {
      const a = turn + (k / sides) * Math.PI * 2;
      const rr = r * (0.7 + rng() * 0.45);
      return { x: Math.cos(a) * rr, y: Math.sin(a) * rr * 0.75 };
    });
    const tint = mix(ROCK_V, ROCK_V_DARK, 0.3 + rng() * 0.5);
    wrapped(T, T, (dx, dy) => clinker(pen, ctx, x + dx, y + dy, r, pts, tint));
  }
  // Fine grit and ash.
  for (let i = 0; i < 1500; i++) {
    const x = rng() * T;
    const y = rng() * T;
    ctx.fillStyle = rng() < 0.8 ? rgba(INK, 0.2 + rng() * 0.25) : rgba('#e6dccf', 0.4);
    ctx.beginPath();
    ctx.arc(x, y, 0.35 + rng() * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hairline cracks, two of them with a faint ember glow deep inside.
  for (let i = 0; i < 7; i++) {
    const pts: Pt[] = [];
    let x = rng() * T;
    let y = rng() * T;
    for (let k = 0; k < 6; k++) {
      pts.push({ x, y });
      x += 6 + rng() * 10;
      y += (rng() - 0.5) * 12;
    }
    const hot = i < 2;
    wrapped(T, T, (dx, dy) => {
      const moved = pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      if (hot) pen.hair(moved, 2.2, EMBER, 0.35);
      pen.hair(moved, 0.8, INK, 0.45);
    });
  }
  return canvas;
}

function clinker(pen: Pen, ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pts: readonly Pt[], tint: string): void {
  const shape = pts.map((p) => ({ x: x + p.x, y: y + p.y }));
  ctx.fillStyle = rgba(ROCK_V_DARK, 0.4);
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + r * 0.25, p.y + r * 0.35) : ctx.lineTo(p.x + r * 0.25, p.y + r * 0.35)));
  ctx.closePath();
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r * 1.2);
  g.addColorStop(0, mix(tint, '#ffffff', 0.25));
  g.addColorStop(1, mix(tint, ROCK_V_DARK, 0.5));
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.stroke([...shape, shape[0]!], 0.9, INK, 0.6, false);
}

/**
 * The sky over the shrine: dusk through smoke, violet above and a sullen
 * orange glow along the horizon, a far volcano with its plume leaning away,
 * and ash drifting down. Drawn at 1 texel per board px: it's all soft.
 */
export function paintVolcanoSkyTile(): HTMLCanvasElement {
  const W = SKY_TILE_W;
  const H = SKY_H;
  const { canvas, ctx } = makeCanvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, VOLCANO_SKY_TOP);
  g.addColorStop(0.45, '#8a7480');
  g.addColorStop(0.8, '#c99278');
  g.addColorStop(1, '#e4ae7e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rng = createRng(78);
  // Long smoky banks, darker than the sky.
  for (let i = 0; i < 10; i++) {
    const cx = rng() * W;
    const cy = H * 0.1 + rng() * H * 0.6;
    const w = 90 + rng() * 140;
    const seed = Math.floor(rng() * 1e6);
    wrapped(W, 0, (dx) => smoke(ctx, createRng(seed), cx + dx, cy, w, '#4a4050', 0.22));
  }
  // The far volcano, low on the horizon, and its plume.
  const vx = W * 0.62;
  const base = H + 4;
  const cone: Pt[] = [{ x: vx - 260, y: base }, { x: vx - 70, y: H - 120 }, { x: vx - 28, y: H - 132 }, { x: vx + 26, y: H - 128 }, { x: vx + 80, y: H - 112 }, { x: vx + 280, y: base }];
  const cg = ctx.createLinearGradient(0, H - 135, 0, base);
  cg.addColorStop(0, rgba('#5a4656', 0.85));
  cg.addColorStop(1, rgba('#7a5a5c', 0.75));
  ctx.fillStyle = cg;
  ctx.beginPath();
  cone.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // A glow in the crater, lighting the plume's foot from below.
  const glow = ctx.createRadialGradient(vx, H - 132, 0, vx, H - 132, 70);
  glow.addColorStop(0, rgba(EMBER_LIGHT, 0.55));
  glow.addColorStop(1, rgba(EMBER, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(vx - 70, H - 202, 140, 140);
  // A thin lava runnel down its flank.
  ctx.strokeStyle = rgba(EMBER, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(vx + 10, H - 128);
  ctx.quadraticCurveTo(vx + 30, H - 80, vx + 70, H - 30);
  ctx.stroke();
  const pen = new Pen(ctx, 81, 0.8);
  pen.hair(cone.slice(0, 5), 1.2, INK, 0.35);
  // The plume: billows stacked up and leaning with the wind.
  for (let k = 0; k < 9; k++) {
    const t = k / 8;
    const px = vx - 10 + t * 150 + Math.sin(k * 1.7) * 12;
    const py = H - 150 - t * 380;
    const r = 34 + t * 70;
    const seed = 400 + k;
    smoke(ctx, createRng(seed), px, py, r, k < 2 ? '#7a5050' : '#55495a', 0.38 - t * 0.12);
  }
  // Ash flakes drifting down.
  for (let i = 0; i < 260; i++) {
    const x = rng() * W;
    const y = rng() * H;
    ctx.fillStyle = rng() < 0.7 ? rgba('#e9e1d6', 0.35 + rng() * 0.3) : rgba('#3a3038', 0.35);
    ctx.beginPath();
    ctx.ellipse(x, y, 0.8 + rng() * 0.8, 0.5 + rng() * 0.4, rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function smoke(ctx: CanvasRenderingContext2D, rng: () => number, cx: number, cy: number, w: number, color: string, a: number): void {
  for (let k = 0; k < 6; k++) {
    const x = cx + (rng() - 0.5) * w;
    const y = cy + (rng() - 0.5) * w * 0.3;
    const r = w * (0.25 + rng() * 0.22);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/** The ground along the shrine: ash drifts and cinders, a few coals still glowing, a charred stump. Centred on the ground line. */
export function paintCinderTile(): HTMLCanvasElement {
  const W = GRASS_TILE_W;
  const H = GRASS_H;
  const { canvas, ctx } = makeCanvas(W * ART_RES, H * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  const pen = new Pen(ctx, 43, 0.5);
  const mid = H / 2;
  const rng = createRng(33);
  // The ash bed: a pale grey drift over darker cinders.
  const g = ctx.createLinearGradient(0, mid - 6, 0, mid + 12);
  g.addColorStop(0, rgba(mix(ASH, '#ffffff', 0.15), 0.95));
  g.addColorStop(1, rgba(mix(ASH_DARK, BASALT_DARK, 0.4), 0.9));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, mid + 10);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, mid - 4 - Math.sin((x / W) * Math.PI * 4) * 2 - Math.sin((x / W) * Math.PI * 2) * 1.5);
  ctx.lineTo(W, mid + 10);
  ctx.closePath();
  ctx.fill();
  // Cinders: little dark lumps along the top of the drift.
  for (let i = 0; i < 46; i++) {
    const x = rng() * W;
    const y = mid - 3 + rng() * 9;
    const r = 1 + rng() * 2.4;
    wrapped(W, 0, (dx) => {
      pen.fill(ellipse(x + dx, y, r, r * 0.75, 8), mix(BASALT_DARK, ASH_DARK, rng() * 0.5), 0.95);
    });
  }
  // Glowing coals, each with its own soft halo.
  for (let i = 0; i < 4; i++) {
    const x = 24 + i * 60 + rng() * 30;
    const y = mid - 1 + rng() * 4;
    wrapped(W, 0, (dx) => {
      const halo = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, 9);
      halo.addColorStop(0, rgba(EMBER_LIGHT, 0.6));
      halo.addColorStop(1, rgba(EMBER, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(x + dx - 9, y - 9, 18, 18);
      pen.fill(ellipse(x + dx, y, 2.6, 1.9, 9), EMBER, 1);
      pen.dot(x + dx - 0.6, y - 0.5, 1, EMBER_LIGHT, 1);
    });
  }
  // A charred stump and a few dry, burnt stalks: what's left of the plants.
  const sx = 170;
  const stump = [{ x: sx - 5, y: mid + 3 }, { x: sx - 4, y: mid - 12 }, { x: sx - 1, y: mid - 9 }, { x: sx + 1, y: mid - 15 }, { x: sx + 4, y: mid - 10 }, { x: sx + 5, y: mid + 3 }];
  pen.fill(stump, '#2e2427', 1);
  pen.stroke([...stump, stump[0]!], 0.9, INK, 0.85, false);
  pen.hair([{ x: sx - 1, y: mid - 7 }, { x: sx + 2, y: mid - 2 }], 0.6, EMBER, 0.7);
  for (let i = 0; i < 6; i++) {
    const x = 20 + rng() * (W - 40);
    const lean = (rng() - 0.5) * 6;
    const tall = 5 + rng() * 8;
    pen.hair([{ x, y: mid + 2 }, { x: x + lean * 0.5, y: mid - tall * 0.5 }, { x: x + lean, y: mid - tall }], 0.8, '#3d3236', 0.85);
  }
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, mid + 9);
  ctx.lineTo(W, mid + 9);
  ctx.stroke();
  return canvas;
}
