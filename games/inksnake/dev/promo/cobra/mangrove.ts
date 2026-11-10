import { createRng } from '../../../src/logic/rng';
import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { mix, rgba } from '../../../src/art/wash';

/**
 * Sungei Buloh's mangrove edge, painted once per light: the sky, a far line
 * of mangroves standing on their arching prop roots, the tidal channel
 * catching the sky, and the mudflat in front, wet and glossy, pricked with
 * breathing roots and crab holes. 'day' for the bite, 'late' for the long
 * wait and the monitor, 'dusk' for the swallow (17:45 – 18:25).
 */
export type Light = 'day' | 'late' | 'dusk';

interface Sky {
  readonly top: string;
  readonly mid: string;
  readonly low: string;
  readonly trees: string;
  readonly far: string;
  readonly water: string;
  readonly mud: string;
  readonly mudDeep: string;
  readonly sheen: string;
}

const SKY: Record<Light, Sky> = {
  day: { top: '#8fb3c4', mid: '#c4d8d6', low: '#ece6c8', trees: '#2c4630', far: '#5f7a62', water: '#a9c2c0', mud: '#6f6250', mudDeep: '#3b3328', sheen: '#e6efe6' },
  late: { top: '#7f9fb4', mid: '#d2c9a6', low: '#f2d395', trees: '#26392a', far: '#5b6c55', water: '#d4c49a', mud: '#665644', mudDeep: '#342b21', sheen: '#f6e2b0' },
  dusk: { top: '#28324d', mid: '#8a5a5c', low: '#f0a25a', trees: '#141c17', far: '#3a3b38', water: '#e6995a', mud: '#4a3a2e', mudDeep: '#1e1712', sheen: '#ffc37a' },
};

const fillPts = (ctx: CanvasRenderingContext2D, pts: readonly Pt[], colour: string, alpha = 1): void => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

/** One mangrove: a rounded crown of leaf clumps on a short trunk, prop roots arching down into the mud. */
function mangrove(ctx: CanvasRenderingContext2D, pen: Pen, x: number, base: number, size: number, colour: string, rng: () => number): void {
  const crownY = base - size * 1.25;
  for (let k = 0; k < 5 + Math.round(size / 40); k++) {
    const r = (0.22 + 0.2 * rng()) * size;
    const p = { x: x + (rng() - 0.5) * size * 1.1, y: crownY + (rng() - 0.6) * size * 0.45 };
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 1.3, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, crownY);
  ctx.lineTo(x + size * 0.03, base - size * 0.42);
  ctx.stroke();
  // The stilt roots, each an arch from the trunk out to the mud.
  for (let k = 0; k < 6; k++) {
    const s = (k / 5 - 0.5) * 2;
    const foot = { x: x + s * size * 0.55 + (rng() - 0.5) * size * 0.1, y: base + rng() * 4 };
    ctx.lineWidth = Math.max(1.2, size * 0.022);
    ctx.beginPath();
    ctx.moveTo(x, base - size * 0.42 - rng() * size * 0.15);
    ctx.quadraticCurveTo(x + s * size * 0.32, base - size * 0.62, foot.x, foot.y);
    ctx.stroke();
  }
  pen.hair([{ x: x - size * 0.5, y: crownY - size * 0.05 }, { x: x + size * 0.4, y: crownY - size * 0.25 }], 1.2, mix(colour, '#ffffff', 0.25), 0.25);
}

export interface Shore {
  readonly width: number;
  readonly height: number;
  /** Where the far mangroves stand on the water. */
  readonly horizon: number;
  /** Where the channel gives way to the mudflat. */
  readonly bank: number;
}

/** Paints the shore at `k` canvas px per shore px (a camera pushing in draws it k times bigger, still crisp). */
export function paintMangrove(s: Shore, light: Light, seed: number, k = 1): HTMLCanvasElement {
  const c = SKY[light];
  const { canvas, ctx } = makeCanvas(Math.ceil(s.width * k), Math.ceil(s.height * k));
  ctx.scale(k, k);
  const rng = createRng(seed);
  const pen = new Pen(ctx, seed + 1, 1);
  const sky = ctx.createLinearGradient(0, 0, 0, s.horizon);
  sky.addColorStop(0, c.top);
  sky.addColorStop(0.6, c.mid);
  sky.addColorStop(1, c.low);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, s.width, s.horizon + 4);
  // Soft cloud washes, and for dusk the low sun's glow.
  for (let i = 0; i < 7; i++) glaze(ctx, rng() * s.width, s.horizon * (0.3 + 0.5 * rng()), 220 + 200 * rng(), 26 + 20 * rng(), 0, light === 'dusk' ? '#f6b06e' : '#ffffff', 0.18);
  if (light !== 'day') glaze(ctx, s.width * 0.62, s.horizon - 40, 520, 260, 0, light === 'dusk' ? '#ffcf86' : '#fff0c0', light === 'dusk' ? 0.7 : 0.45);
  // The far mangrove line, two rows, the nearer darker.
  for (const [row, colour, size] of [[0, c.far, 70], [1, c.trees, 105]] as const) {
    for (let x = -60; x < s.width + 80; x += size * (0.7 + 0.4 * rng())) mangrove(ctx, pen, x, s.horizon + row * 10, size * (0.8 + 0.4 * rng()), colour, rng);
  }
  // The channel: the sky's light laid across it, broken by ripples.
  const water = ctx.createLinearGradient(0, s.horizon, 0, s.bank);
  water.addColorStop(0, mix(c.water, c.trees, 0.35));
  water.addColorStop(0.3, c.water);
  water.addColorStop(1, mix(c.water, c.mudDeep, 0.45));
  ctx.fillStyle = water;
  ctx.fillRect(0, s.horizon + 8, s.width, s.bank - s.horizon);
  for (let i = 0; i < 90; i++) {
    const y = s.horizon + 14 + rng() * (s.bank - s.horizon - 14);
    const x = rng() * s.width;
    const w = 30 + rng() * 120;
    ctx.fillStyle = rgba(rng() < 0.5 ? c.sheen : c.trees, 0.25 + 0.2 * rng());
    ctx.fillRect(x, y, w, 2 + rng() * 2.5);
  }
  // The mudflat: wet and glossy, the bank's edge wavering.
  const edge: Pt[] = [];
  for (let x = -10; x <= s.width + 10; x += 20) edge.push({ x, y: s.bank + 10 * Math.sin(x * 0.011 + seed) + 6 * Math.sin(x * 0.031) });
  const mud = ctx.createLinearGradient(0, s.bank, 0, s.height);
  mud.addColorStop(0, c.mud);
  mud.addColorStop(0.5, mix(c.mud, c.mudDeep, 0.5));
  mud.addColorStop(1, c.mudDeep);
  fillPts(ctx, [...edge, { x: s.width + 10, y: s.height }, { x: -10, y: s.height }], 'black');
  ctx.save();
  ctx.beginPath();
  [...edge, { x: s.width + 10, y: s.height }, { x: -10, y: s.height }].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = mud;
  ctx.fillRect(0, s.bank - 30, s.width, s.height - s.bank + 30);
  // Puddles holding the sky, the gloss streaks of wet mud, the ripple marks.
  for (let i = 0; i < 26; i++) {
    const y = s.bank + 30 + rng() * (s.height - s.bank);
    const depth = (y - s.bank) / (s.height - s.bank);
    glaze(ctx, rng() * s.width, y, 60 + 160 * rng() * (0.5 + depth), 5 + 10 * depth, 0, c.sheen, 0.22 + 0.15 * rng());
  }
  for (let i = 0; i < 60; i++) {
    const y = s.bank + 20 + rng() * (s.height - s.bank);
    const x = rng() * s.width;
    const w = 40 + rng() * 160;
    pen.hair([{ x, y }, { x: x + w * 0.5, y: y - 2 }, { x: x + w, y: y + 1 }], 2 + rng() * 2, c.mudDeep, 0.35);
  }
  // Breathing roots poking up, crab holes.
  for (let i = 0; i < 110; i++) {
    const y = s.bank + 10 + rng() * (s.height - s.bank) * 0.9;
    const depth = (y - s.bank) / (s.height - s.bank);
    const x = rng() * s.width;
    const h = (8 + 18 * rng()) * (0.6 + depth * 1.6);
    ctx.strokeStyle = rgba(mix(c.trees, c.mudDeep, 0.4), 0.9);
    ctx.lineWidth = 2 + depth * 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * 4, y - h);
    ctx.stroke();
    ctx.fillStyle = rgba(c.mudDeep, 0.7);
    ctx.beginPath();
    ctx.ellipse(x + 30 * (rng() - 0.5), y + 6, 3 + depth * 5, 1.5 + depth * 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  pen.hair(edge, 3, c.mudDeep, 0.6);
  return canvas;
}
