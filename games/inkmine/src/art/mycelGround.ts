import { hash } from '../logic/noise';
import { TILE, tileAt, volatileAt, type Terrain } from '../logic/terrain';
import { VOLATILES } from '../logic/volatiles';
import { INK, PAPER, PAPER_FILL, RED } from './palette';

/**
 * Mycel's things in the ground, drawn into its chunks (ground.ts) as
 * firedamp is: cap mushrooms standing on the surface and on cave floors
 * (springy: a jump off one throws you high), and spore pockets in the peat.
 * Seeded by tile, so a chunk redrawn after a dig changes nothing else.
 */

/** The chunk being drawn, in tiles (as ground.ts has it). */
interface Chunk {
  readonly tx: number;
  readonly ty: number;
  readonly tiles: number;
}

/** Cap colours: mostly a rosy violet, some teal, some ochre, as a stand of fungi varies. */
const CAPS = ['#b65a93', '#b65a93', '#9c5fb0', '#4f9a96', '#d09a4c'] as const;
const STALK = '#efe4cf';

/**
 * A cap mushroom filling its tile: a pale stalk and a domed cap a little
 * wider than the tile, lit from the upper left, spotted, with its gills in
 * shadow under the rim and a firm pen line round it.
 */
function cap(ctx: CanvasRenderingContext2D, x: number, y: number, T: number): void {
  const h = (k: number): number => hash(x, y, 820 + k);
  const color = CAPS[Math.floor(h(0) * CAPS.length)]!;
  const cx = (x + 0.5 + (h(1) - 0.5) * 0.08) * T;
  const bottom = (y + 1) * T;
  const top = y * T + T * (0.04 + h(2) * 0.08);
  const R = T * (0.5 + h(3) * 0.08);
  const rimY = top + T * 0.42;
  const sw = T * (0.15 + h(4) * 0.05);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // The stalk, its shadow side on the right.
  ctx.beginPath();
  ctx.moveTo(cx - sw * 1.15, bottom);
  ctx.quadraticCurveTo(cx - sw * 0.8, (bottom + rimY) / 2, cx - sw * 0.85, rimY);
  ctx.lineTo(cx + sw * 0.85, rimY);
  ctx.quadraticCurveTo(cx + sw * 0.8, (bottom + rimY) / 2, cx + sw * 1.15, bottom);
  ctx.closePath();
  ctx.fillStyle = STALK;
  ctx.fill();
  const sg = ctx.createLinearGradient(cx - sw, 0, cx + sw, 0);
  sg.addColorStop(0, 'rgba(255, 248, 230, 0.5)');
  sg.addColorStop(0.6, 'rgba(60, 40, 80, 0)');
  sg.addColorStop(1, 'rgba(60, 40, 80, 0.35)');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.85;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // The cap: a dome over a gently drooping rim.
  const dome = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - R, rimY);
    ctx.bezierCurveTo(cx - R, top - T * 0.08, cx + R, top - T * 0.08, cx + R, rimY);
    ctx.quadraticCurveTo(cx, rimY + T * 0.1, cx - R, rimY);
    ctx.closePath();
  };
  dome();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const lg = ctx.createRadialGradient(cx - R * 0.4, top + T * 0.08, 0, cx - R * 0.2, top + T * 0.15, R * 1.3);
  lg.addColorStop(0, 'rgba(255, 244, 228, 0.7)');
  lg.addColorStop(0.45, 'rgba(255, 244, 228, 0.1)');
  lg.addColorStop(1, 'rgba(40, 20, 60, 0.4)');
  ctx.fillStyle = lg;
  ctx.fillRect(cx - R - 2, top - T * 0.1, R * 2 + 4, T * 0.7);
  // Pale spots on the dome.
  for (let k = 0; k < 4; k++) {
    const sx = cx + (h(10 + k) - 0.5) * R * 1.4;
    const sy = top + T * (0.1 + h(20 + k) * 0.22);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = PAPER_FILL;
    ctx.beginPath();
    ctx.ellipse(sx, sy, T * (0.035 + h(30 + k) * 0.03), T * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // The gills: a dark band under the rim, ruled with fine lines.
  ctx.beginPath();
  ctx.moveTo(cx - R * 0.96, rimY);
  ctx.quadraticCurveTo(cx, rimY + T * 0.1, cx + R * 0.96, rimY);
  ctx.quadraticCurveTo(cx, rimY + T * 0.17, cx - R * 0.96, rimY);
  ctx.closePath();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#3a2a4a';
  ctx.fill();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = PAPER_FILL;
  ctx.lineWidth = 0.4;
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(cx + k * R * 0.13, rimY + T * 0.04);
    ctx.lineTo(cx + k * R * 0.2, rimY + T * 0.09);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  dome();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.95;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Every cap mushroom in and round the chunk. */
export function capsIn(ctx: CanvasRenderingContext2D, t: Terrain, c: Chunk, T: number): void {
  for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) if (tileAt(t, x, y) === TILE.cap) cap(ctx, x, y, T);
  }
}

/** Dry spore dust, the colour of old pollen. */
const DUST = '#e6d3a0';

/**
 * A spore pocket: a rounded hollow packed with dry dust, drawn into the
 * peat like firedamp, with spores speckled through it (a few red ones: a
 * blast sets it alight) and fine threads of mycelium running off into the
 * soil round it.
 */
export function sporesIn(ctx: CanvasRenderingContext2D, t: Terrain, c: Chunk, T: number): void {
  ctx.lineCap = 'round';
  for (let y = c.ty - 1; y <= c.ty + c.tiles; y++) {
    for (let x = c.tx - 1; x <= c.tx + c.tiles; x++) {
      if (volatileAt(t, x, y) !== VOLATILES.spores.id) continue;
      const h = (k: number): number => hash(x, y, 860 + k);
      const rx = T * (0.32 + h(0) * 0.08);
      const ry = T * (0.24 + h(1) * 0.07);
      ctx.save();
      ctx.translate((x + 0.5 + (h(2) - 0.5) * 0.15) * T, (y + 0.5 + (h(3) - 0.5) * 0.15) * T);
      // Threads of mycelium into the soil.
      ctx.strokeStyle = PAPER_FILL;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 0.6;
      for (let k = 0; k < 5; k++) {
        const a = h(10 + k) * Math.PI * 2;
        const len = T * (0.35 + h(20 + k) * 0.25);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * rx * 0.8, Math.sin(a) * ry * 0.8);
        ctx.quadraticCurveTo(Math.cos(a + 0.4) * len * 0.7, Math.sin(a + 0.4) * len * 0.7, Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
      }
      const rim = (): void => {
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const k = 0.82 + h(30 + i) * 0.3;
          if (i === 0) ctx.moveTo(Math.cos(a) * rx * k, Math.sin(a) * ry * k);
          else ctx.lineTo(Math.cos(a) * rx * k, Math.sin(a) * ry * k);
        }
        ctx.closePath();
      };
      rim();
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAPER;
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = DUST;
      ctx.fill();
      ctx.save();
      ctx.clip();
      // The upper lip's shadow, then the spores: violet specks, and a few red.
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = INK;
      ctx.lineWidth = ry * 0.8;
      ctx.beginPath();
      ctx.ellipse(0, -ry * 0.9, rx * 1.05, ry * 0.6, 0, 0, Math.PI);
      ctx.stroke();
      for (let k = 0; k < 18; k++) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = k % 6 === 0 ? RED : '#8a5f8f';
        ctx.beginPath();
        ctx.arc((h(40 + k) - 0.5) * rx * 1.7, (h(60 + k) - 0.4) * ry * 1.5, 0.55 + h(80 + k) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      rim();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
