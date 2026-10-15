import { clouds, LAGOON_H, lagoon, resort, shore, SHORE_H, sky, SKY_H } from '../../../src/art/backdrop/atoll';
import { BACKDROP_W } from '../../../src/art/backdrop/common';
import { closed, cub, type Draw, edge, glint, makeDraw, oval, pt, shade, skin, tint } from '../../../src/art/kit';
import { INK, PAPER, PAPER_FILL, SAND_DRY, SAND_GRAIN } from '../../../src/art/palette';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { bakeSprite, type Sprite } from '../sprites';
import { clamp01, VIDEO } from '../short';
import { LOOP_S } from './story';

/**
 * The set: beach 1's coral island (the game's atoll backdrop: sky, lagoon,
 * palms) behind a bank of sand, and the props drawn with the game's pen
 * kit: the coconut (whole, and split in two), the scale the crab is weighed
 * on, and the CRACK burst.
 */
/** Backdrop px per design px: the atoll's 1024 px tile across the 1080 px frame. */
const K = VIDEO.width / BACKDROP_W;
/** Where the backdrop's top sits: its shore line just behind the crabs' sand. */
const SHORE_LINE = 990;
const SHORE_GROUND_IN_LAYERS = SKY_H + LAGOON_H + 280;
const TOP = SHORE_LINE - SHORE_GROUND_IN_LAYERS * K;
/** The near sand starts here, a little above where the crabs stand. */
export const SAND_TOP = 1000;

export interface Stage {
  readonly base: HTMLCanvasElement;
  readonly clouds: HTMLCanvasElement;
}

function layer(ctx: CanvasRenderingContext2D, y: number, seed: number, draw: (d: Draw) => void): void {
  ctx.save();
  ctx.translate(0, TOP + y * K);
  ctx.scale(K, K);
  draw(makeDraw(ctx, seed, 0, 0));
  ctx.restore();
}

/** The still part of the set, baked once: paper, the atoll's lagoon and palms, the near sand. */
export function makeSet(): Stage {
  const { canvas: base, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  layer(ctx, 0, 1, sky);
  layer(ctx, SKY_H, 2, lagoon);
  layer(ctx, SKY_H, 3, resort);
  layer(ctx, SKY_H + LAGOON_H, 4, shore);
  const d = makeDraw(ctx, 77, 0, 0);
  const top: Pt[] = Array.from({ length: 46 }, (_, i) => pt(-20 + i * 25, SAND_TOP + 6 * Math.sin(i * 0.7) + 3 * Math.sin(i * 1.9)));
  const sand = [...top, pt(1110, VIDEO.height + 10), pt(-30, VIDEO.height + 10)];
  d.pen.fill(sand, PAPER_FILL, 1);
  d.pen.fill(sand, SAND_DRY, 0.75);
  d.pen.stipple(sand, 2600, (_, y) => Math.max(0.15, 1 - (y - SAND_TOP) / 700) * 0.6, 1.3, SAND_GRAIN);
  d.pen.stroke(top, 3, INK, 0.7, false);
  // Ripple marks in the sand below the crabs, faint, clear of the captions' halo.
  for (const [x, y, w] of [[150, 1460, 160], [700, 1500, 220], [380, 1620, 200], [860, 1700, 140], [120, 1780, 180]] as const) {
    d.pen.hair(cub(pt(x, y), pt(x + w * 0.3, y - 8), pt(x + w * 0.7, y + 8), pt(x + w, y), 12), 2, INK, 0.25);
  }
  const { canvas: sky2, ctx: cctx } = makeCanvas(VIDEO.width + 80, Math.ceil(SKY_H * K) + 20);
  cctx.translate(40, 0);
  cctx.scale(K, K);
  clouds(makeDraw(cctx, 5, 0, 0));
  return { base, clouds: sky2 };
}

/** The set at time t: the clouds sway a little on the wind, coming round with the loop. */
export function drawSet(ctx: CanvasRenderingContext2D, set: Stage, t: number): void {
  ctx.drawImage(set.base, 0, 0);
  const sway = 22 * Math.sin((2 * Math.PI * 2 * t) / LOOP_S);
  ctx.drawImage(set.clouds, -40 + sway, TOP);
}

// ---------------------------------------------------------------- the coconut

const HUSK = '#7b4d2b';
const FLESH = '#fffdf6';
const MILK = '#f1ead8';
/** The coconut's drawing: ±NUT_RX by NUT_RY units, resting on the ground line. */
export const NUT_RX = 20;
export const NUT_RY = 18;
const NUT_FRAME = 60;
const NUT_GROUND = 22;

/** The hairy brown nut: fibres all over, three dark eyes at its end. */
function nut(d: Draw, half: 'whole' | 'left' | 'right'): void {
  const { pen } = d;
  const cy = d.g - NUT_RY;
  const full = oval(0, cy, NUT_RX, NUT_RY, 32);
  const shape = half === 'whole' ? full : half === 'left' ? full.filter((p) => p.x <= 0.5) : full.filter((p) => p.x >= -0.5);
  pen.fill(oval(0, d.g - 0.5, NUT_RX * 0.9, 2.2, 20), d.ink, 0.12);
  skin(d, shape, HUSK, 0.85);
  pen.clipped(shape, () => {
    for (let i = 0; i < 70; i++) {
      const x = -NUT_RX + pen.rng() * NUT_RX * 2;
      const y = cy - NUT_RY + pen.rng() * NUT_RY * 2;
      const a = Math.atan2(y - cy, x) + Math.PI / 2 + pen.jitter(0.5);
      pen.hair([pt(x, y), pt(x + Math.cos(a) * 4, y + Math.sin(a) * 4)], 0.45, '#3d2414', 0.55);
    }
    tint(d, oval(-6, cy - 8, 10, 5, 14), PAPER_FILL, 0.18);
  });
  if (half !== 'left') for (const [x, y] of [[14, cy - 4], [16.5, cy + 1], [12.5, cy + 2.5]] as const) pen.dot(x, y, 1.3, '#2a170c', 0.9);
  shade(d, shape, 0.5, true);
  glint(d, cub(pt(-14, cy - 9), pt(-9, cy - 15), pt(-2, cy - 17), pt(5, cy - 16), 8), 1.1, 0.5);
  edge(d, shape, 1.3);
  if (half === 'whole') return;
  // The cut face: a white rim of flesh round the hollow, seen edge-on.
  const side = half === 'left' ? 1 : -1;
  const face = oval(side * 0.5, cy, 4, NUT_RY - 0.6, 20);
  skin(d, face, FLESH, 1);
  pen.fill(oval(side * 0.9, cy, 2.2, NUT_RY - 4, 16), MILK, 1);
  edge(d, face, 1);
}

/** The right half rolled onto its back: the white bowl of flesh facing up. */
function bowl(d: Draw): void {
  const { pen } = d;
  const cy = d.g - 9;
  pen.fill(oval(0, d.g - 0.5, NUT_RX * 0.95, 2.2, 20), d.ink, 0.12);
  const cup = [...oval(0, cy, NUT_RX, NUT_RY * 0.55, 32).filter((p) => p.y >= cy - 0.2)];
  const under = [...cup, pt(-NUT_RX, cy)];
  skin(d, under, HUSK, 0.85);
  pen.clipped(under, () => {
    for (let i = 0; i < 30; i++) {
      const x = -NUT_RX + pen.rng() * NUT_RX * 2;
      const y = cy + pen.rng() * 9;
      pen.hair([pt(x, y), pt(x + 3, y + 1.5)], 0.45, '#3d2414', 0.55);
    }
  });
  shade(d, under, 0.45, true);
  edge(d, under, 1.2);
  const rim = oval(0, cy, NUT_RX, 6, 28);
  skin(d, rim, FLESH, 1);
  pen.fill(oval(0, cy + 0.6, NUT_RX - 4, 4, 24), MILK, 1);
  pen.hair(oval(0, cy + 0.6, NUT_RX - 4, 4, 24), 0.6, d.ink, 0.6);
  edge(d, closed(rim).slice(0, -1), 1.1);
}

export interface NutSprites {
  readonly whole: Sprite;
  readonly left: Sprite;
  readonly bowl: Sprite;
}
export const makeNut = (): NutSprites => ({
  whole: bakeSprite(NUT_FRAME, 5, NUT_GROUND, 410, (d) => nut(d, 'whole')),
  left: bakeSprite(NUT_FRAME, 5, NUT_GROUND, 410, (d) => nut(d, 'left')),
  bowl: bakeSprite(NUT_FRAME, 5, NUT_GROUND, 420, bowl),
});

/** The crack's branches across the nut's face, in its units from its centre: drawn on in order as `crack` grows. */
const CRACKS: readonly (readonly Pt[])[] = [
  [pt(-1, -17), pt(1, -11), pt(-1.5, -6), pt(1.5, -1), pt(-0.5, 4), pt(1, 10), pt(-0.5, 17)],
  [pt(1, -11), pt(5, -9), pt(8, -11.5)],
  [pt(-1.5, -6), pt(-6, -4), pt(-9, -7)],
  [pt(1.5, -1), pt(6, 2), pt(9, 0), pt(12, 3)],
  [pt(-0.5, 4), pt(-5, 7), pt(-8, 6)],
];

/** Cracks spreading over the whole nut, `crack` 0 .. 1, at screen scale `s` with its centre at (cx, cy). */
export function drawCracks(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, crack: number): void {
  if (crack <= 0) return;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  CRACKS.forEach((path, i) => {
    const u = clamp01(crack * CRACKS.length * 0.9 - i * 0.8);
    if (u <= 0) return;
    const n = (path.length - 1) * u;
    ctx.lineWidth = i === 0 ? 5 : 3.5;
    ctx.beginPath();
    ctx.moveTo(cx + path[0]!.x * s, cy + path[0]!.y * s);
    for (let k = 1; k < path.length && k - 1 < n; k++) {
      const a = path[k - 1]!;
      const b = path[k]!;
      const f = Math.min(1, n - (k - 1));
      ctx.lineTo(cx + (a.x + (b.x - a.x) * f) * s, cy + (a.y + (b.y - a.y) * f) * s);
    }
    ctx.stroke();
  });
  ctx.restore();
}

/** The CRACK: spikes flying out from the split and the word, `u` 0 .. 1 of its life. */
export function drawBurst(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, word: string, size: number, wordAt: Pt): void {
  if (u <= 0 || u >= 1) return;
  const fade = 1 - clamp01((u - 0.6) / 0.4);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.globalAlpha = fade;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.34;
    const r0 = 60 + 120 * u;
    const r1 = r0 + 70 * (1 - u * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
  const pop = u < 0.15 ? 0.6 + (0.6 * u) / 0.15 : 1.2 - 0.2 * clamp01((u - 0.15) / 0.2);
  ctx.save();
  ctx.translate(wordAt.x, wordAt.y);
  ctx.rotate(-0.12);
  ctx.scale(pop, pop);
  ctx.font = `700 ${size}px Caveat`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = fade;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = size * 0.18;
  ctx.strokeText(word, 0, 0);
  ctx.fillStyle = INK;
  ctx.fillText(word, 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- the scale

const STEEL = '#b9c2cc';
/** The platform the crab is weighed on: a wide steel plate on a box, `SCALE_W` px across. */
export const SCALE_W = 560;
const SCALE_UNITS = 120;
const makePlatform = (): Sprite =>
  bakeSprite(SCALE_UNITS, 5, 12, 430, (d) => {
    const g = d.g;
    const box = [pt(-52, g), pt(-52, g - 9), pt(52, g - 9), pt(52, g)];
    skin(d, box, STEEL, 0.6);
    shade(d, box, 0.4);
    edge(d, box, 1);
    const plate = [pt(-58, g - 9), pt(-58, g - 13.5), pt(58, g - 13.5), pt(58, g - 9)];
    skin(d, plate, STEEL, 0.8);
    edge(d, plate, 1.2);
    d.pen.hair([pt(-30, g - 4.5), pt(30, g - 4.5)], 0.6, d.ink, 0.5);
  });
export { makePlatform };
