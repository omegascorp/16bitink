import { hash } from '../logic/noise';
import { TILE, tileAt, volatileAt, type Terrain } from '../logic/terrain';
import { VOLATILES } from '../logic/volatiles';
import { INK, PAPER, PAPER_FILL, RED } from './palette';

/**
 * Mycel's things in the ground, drawn into its chunks (ground.ts) as
 * firedamp is: caps standing on the surface and on cave floors (springy: a
 * jump off one throws you high; drilled, they give carbon and water), and
 * spore pockets in the peat.
 * Seeded by tile, so a chunk redrawn after a dig changes nothing else.
 */

/** The chunk being drawn, in tiles (as ground.ts has it). */
interface Chunk {
  readonly tx: number;
  readonly ty: number;
  readonly tiles: number;
}

/** Cap colours: bladders mostly a rosy violet, some teal, some amber, as a stand of them varies; each with the glow its threads carry. */
const CAPS = [
  { skin: '#b65a93', glow: '#8ff0d8' },
  { skin: '#b65a93', glow: '#8ff0d8' },
  { skin: '#8f62b8', glow: '#ffd68a' },
  { skin: '#4f9a96', glow: '#f3a6e6' },
  { skin: '#d09a4c', glow: '#9fe8ff' },
] as const;
const STALK = '#efe4cf';

/** Draws `pts` as one closed path. */
function path(ctx: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[]): void {
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.closePath();
}

/** A leg: a tapering root curling out from under the bladder to the ground, inked, with a pale lit edge and knuckles along it. */
function leg(ctx: CanvasRenderingContext2D, from: readonly [number, number], to: readonly [number, number], bend: number, w: number, skin: string): void {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const cxp = (x0 + x1) / 2 + bend;
  const cyp = (y0 + y1) / 2 - Math.abs(bend) * 0.4;
  const at = (t: number): [number, number] => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cxp + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cyp + t * t * y1];
  for (let k = 0; k < 6; k++) {
    const [ax, ay] = at(k / 6);
    const [bx, by] = at((k + 1) / 6);
    const lw = w * (1 - k / 7);
    ctx.lineWidth = lw + 1.4;
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.lineWidth = lw;
    ctx.strokeStyle = mixed(skin);
    ctx.globalAlpha = 1;
    ctx.stroke();
  }
  for (let k = 1; k < 4; k++) {
    const [kx, ky] = at(k / 4);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = STALK;
    ctx.beginPath();
    ctx.arc(kx - w * 0.15, ky - w * 0.1, w * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A cap's legs: its skin paled towards the stalk colour. */
const mixed = (skin: string): string => {
  const a = parseInt(skin.slice(1), 16);
  const b = parseInt(STALK.slice(1), 16);
  const ch = (sh: number): number => Math.round(((a >> sh) & 255) * 0.45 + ((b >> sh) & 255) * 0.55);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};

/**
 * A cap filling its tile, nothing like a mushroom at home: a swollen,
 * see-through bladder of water (veined inside, a waterline sloshing in
 * it), drawn up to a crown of fleshy horns, standing on three root-legs
 * that curl out to the ground, with fine threads hanging from its belly,
 * each tipped with a bead of light. Lit from the upper left, with a firm
 * pen line round the bladder.
 */
function cap(ctx: CanvasRenderingContext2D, x: number, y: number, T: number): void {
  const h = (k: number): number => hash(x, y, 820 + k);
  const look = CAPS[Math.floor(h(0) * CAPS.length)]!;
  const cx = (x + 0.5 + (h(1) - 0.5) * 0.08) * T;
  const bottom = (y + 1) * T;
  const top = y * T + T * (0.06 + h(2) * 0.06);
  const R = T * (0.3 + h(3) * 0.05);
  // The bladder's widest, a little below its middle; its belly hangs lower.
  const waist = top + T * 0.42;
  const belly = waist + R * 0.55;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Three legs: the far one first, thinner.
  for (const [k, w] of [[0, 0.07], [-1, 0.09], [1, 0.09]] as const) {
    const foot: [number, number] = [cx + k * R * 1.25 + (h(70 + k + 1) - 0.5) * T * 0.1, bottom];
    leg(ctx, [cx + k * R * 0.35, belly - R * 0.15], foot, k * T * 0.12, T * w, look.skin);
  }
  // Threads hanging from the belly, each with its bead of light.
  for (let k = 0; k < 4; k++) {
    const fx = cx + (k - 1.5) * R * 0.5;
    const len = T * (0.1 + h(50 + k) * 0.14);
    const fy = belly - R * 0.1 * Math.abs(k - 1.5);
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = look.skin;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(fx + T * 0.03, fy + len * 0.5, fx - T * 0.01, fy + len);
    ctx.stroke();
    const glow = ctx.createRadialGradient(fx, fy + len, 0, fx, fy + len, T * 0.09);
    glow.addColorStop(0, look.glow);
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = glow;
    ctx.fillRect(fx - T * 0.1, fy + len - T * 0.1, T * 0.2, T * 0.2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = look.glow;
    ctx.beginPath();
    ctx.arc(fx - T * 0.01, fy + len, T * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  // The bladder: a round belly, widest below its middle, drawn up to a blunt, narrow crown.
  const body: [number, number][] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 - Math.PI / 2;
    const up = Math.sin(a) < 0;
    const u = up ? -Math.sin(a) : 0;
    const wide = up ? 1 - 0.5 * u ** 2.2 : 1;
    body.push([cx + Math.cos(a) * R * wide, up ? waist - u * (waist - top) : waist + Math.sin(a) * (belly - waist)]);
  }
  path(ctx, body);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = look.skin;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Water inside: a paler band up to a waterline, and the veins that carry it.
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = '#d8f1f4';
  ctx.fillRect(cx - R, waist - (waist - top) * (0.15 + h(5) * 0.2), R * 2, belly);
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#3d2650';
  ctx.lineWidth = 0.45;
  for (let k = 0; k < 4; k++) {
    const vx = cx + (k - 1.5) * R * 0.45;
    ctx.beginPath();
    ctx.moveTo(vx, belly);
    ctx.quadraticCurveTo(vx + (h(10 + k) - 0.5) * R * 0.6, waist, cx + (k - 1.5) * R * 0.1, top + T * 0.05);
    ctx.stroke();
  }
  const lg = ctx.createRadialGradient(cx - R * 0.4, top + T * 0.18, 0, cx - R * 0.2, waist, R * 1.5);
  lg.addColorStop(0, 'rgba(255, 244, 228, 0.75)');
  lg.addColorStop(0.45, 'rgba(255, 244, 228, 0.08)');
  lg.addColorStop(1, 'rgba(40, 20, 60, 0.45)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = lg;
  ctx.fillRect(cx - R - 2, top - 2, R * 2 + 4, belly - top + 4);
  ctx.restore();
  // A glassy glint on the bladder.
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = PAPER_FILL;
  ctx.beginPath();
  ctx.ellipse(cx - R * 0.45, waist - T * 0.06, T * 0.03, T * 0.08, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  path(ctx, body);
  ctx.stroke();
  // Fleshy horns budding from the crown.
  for (let k = 0; k < 3; k++) {
    const bx = cx + (k - 1) * R * 0.28;
    const by = top + Math.abs(k - 1) * T * 0.045 + T * 0.02;
    const bh = T * (0.07 + h(60 + k) * 0.06) * (k === 1 ? 1.4 : 1);
    const lean = (k - 1) * T * 0.06;
    const horn: [number, number][] = [[bx - T * 0.03, by + T * 0.02], [bx + lean, by - bh], [bx + T * 0.03, by + T * 0.02]];
    path(ctx, horn);
    ctx.globalAlpha = 1;
    ctx.fillStyle = look.skin;
    ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = look.glow;
    ctx.beginPath();
    ctx.arc(bx + lean, by - bh, T * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }
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
