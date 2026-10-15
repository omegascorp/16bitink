import { Pen, type Pt } from '../../../src/art/pen';
import { INK, PAPER, PAPER_FILL, SAND_DRY, SAND_GRAIN } from '../../../src/art/palette';
import { drawSprite, type Sprite } from '../sprites';
import { clamp01, VIDEO } from '../short';
import {
  BRIDGE, bridgeProfile, DECK, depthScale, depthY, FUNNEL, GROUND, laneDepth, roadHalf, shoreX, WORLD,
} from './layout';

/**
 * The island strip behind and under the crowd, at camera x `cam`: sky, the
 * forest's trees, the far ridge and the sea's horizon, the house and the
 * garden fence, the ground (forest floor, grass, sand), three roads running
 * into the distance, the sea, the funnel fences and the crab bridge. Ink and
 * washes as in the game; the ground's colours blend from one place to the
 * next along the way.
 */
const W = VIDEO.width;
const H = VIDEO.height;
const SKY = '#cfe0e6';
const RIDGE = '#7f9a62';
const FLOOR = '#7d6a48';
const GRASS = '#9fb46a';
const ASPHALT = '#8e8f96';
const WATER = '#5e8fb3';
const CONCRETE = '#c4bdae';

/** Where the ground changes along the way: forest floor, grass in town, sand at the beach. */
const GROUND_STOPS: readonly (readonly [number, string])[] = [
  [-400, FLOOR], [WORLD.forestEnd - 100, FLOOR], [WORLD.forestEnd + 150, GRASS], [WORLD.beach - 150, GRASS], [WORLD.beach + 60, SAND_DRY], [5000, SAND_DRY],
];
const TREES: readonly (readonly [number, number])[] = [[-80, 1], [120, 0], [330, 2], [520, 1], [700, 0], [880, 2], [1010, 0]];

export interface Scenery {
  readonly trees: readonly Sprite[];
  readonly house: Sprite;
  readonly fence: Sprite;
}

/** The sky, the far ridge inland and the sea's horizon at the beach. */
export function drawSky(ctx: CanvasRenderingContext2D, cam: number, boil: number): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, W, GROUND.horizon);
  ctx.restore();
  const pen = new Pen(ctx, 7300 + boil, 0.8);
  // The far ridge inland, ending where the coast begins; the sea's horizon beyond it.
  const seaFrom = WORLD.beach - 120 - cam;
  const ridge: Pt[] = [];
  for (let x = -40; x <= Math.min(W + 40, seaFrom); x += 40) {
    const wx = x + cam * 0.6;
    ridge.push({ x, y: 585 + 18 * Math.sin(wx / 170) + 10 * Math.sin(wx / 53) });
  }
  if (ridge.length > 1) {
    const last = ridge[ridge.length - 1]!;
    pen.fill([...ridge, { x: last.x, y: GROUND.horizon + 2 }, { x: ridge[0]!.x, y: GROUND.horizon + 2 }], RIDGE, 0.45);
    pen.stroke(ridge, 1.6, INK, 0.7, false);
  }
  if (seaFrom < W) {
    const x0 = Math.max(-10, seaFrom);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = WATER;
    ctx.fillRect(x0, 600, W - x0 + 10, GROUND.horizon - 598);
    ctx.restore();
    pen.stroke([{ x: x0, y: 600 }, { x: W + 10, y: 600 }], 1.6, INK, 0.75, false);
  }
}

/** What stands on the far edge of the ground: the forest's trees, the house and the garden fence. */
export function drawStanding(ctx: CanvasRenderingContext2D, cam: number, boil: number, scenery: Scenery): void {
  for (const [x, v] of TREES) {
    const sx = x - cam;
    if (sx > -260 && sx < W + 260) drawSprite(ctx, scenery.trees[v]!, boil, { x: sx, y: GROUND.far + 6, scale: 1 });
  }
  const hx = WORLD.house - cam;
  if (hx > -300 && hx < W + 300) drawSprite(ctx, scenery.house, boil, { x: hx, y: GROUND.far + 4, scale: 1 });
  for (const fx of [WORLD.garden[0] + 75, WORLD.garden[0] + 185]) {
    const sx = fx - cam;
    if (sx > -120 && sx < W + 120) drawSprite(ctx, scenery.fence, boil, { x: sx, y: GROUND.far + 2, scale: 1 });
  }
}

/** A road's outline from the horizon to the bottom of the frame, around screen x `cx`. */
const roadShape = (cx: number): Pt[] => [
  { x: cx - roadHalf(GROUND.horizon), y: GROUND.horizon }, { x: cx + roadHalf(GROUND.horizon), y: GROUND.horizon },
  { x: cx + roadHalf(H), y: H }, { x: cx - roadHalf(H), y: H },
];

/** The shoreline, horizon to frame bottom, at screen coordinates. */
function shoreline(cam: number, surge: number): Pt[] {
  return Array.from({ length: 25 }, (_, i) => {
    const y = GROUND.horizon + ((H - GROUND.horizon) * i) / 24;
    const depth = (y - GROUND.far) / (GROUND.near - GROUND.far);
    return { x: shoreX(depth, surge) - cam + 6 * Math.sin(i * 1.3 + surge * 0.05), y };
  });
}

/** The ground plane: its colours, grit and leaf litter, the roads and the sea. */
export function drawGround(ctx: CanvasRenderingContext2D, cam: number, boil: number, surge: number, t: number): void {
  const grad = ctx.createLinearGradient(-cam - 400, 0, -cam + 5000, 0);
  for (const [x, c] of GROUND_STOPS) grad.addColorStop(clamp01((x + 400) / 5400), c);
  ctx.save();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, GROUND.horizon, W, H - GROUND.horizon);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = grad;
  ctx.fillRect(0, GROUND.horizon, W, H - GROUND.horizon);
  ctx.restore();
  // Grit and litter, fixed to the ground so it pans with it.
  ctx.save();
  ctx.fillStyle = SAND_GRAIN;
  for (let wx = Math.floor((cam - 40) / 46) * 46; wx < cam + W + 40; wx += 46) {
    for (let row = 0; row < 26; row++) {
      const h = Math.sin(wx * 0.137 + row * 12.7) * 43758.5;
      const f = h - Math.floor(h);
      const y = GROUND.horizon + 12 + row * 49 + f * 30;
      ctx.globalAlpha = 0.18 + 0.2 * f;
      ctx.fillRect(wx - cam + f * 30, y, 2 + f * 3, 2);
    }
  }
  ctx.restore();
  const pen = new Pen(ctx, 7400 + boil, 0.8);
  for (const rx of [WORLD.roadA, WORLD.roadB, WORLD.roadC]) {
    const cx = rx - cam;
    if (cx < -400 || cx > W + 400) continue;
    const road = roadShape(cx);
    pen.fill(road, PAPER_FILL, 1);
    pen.fill(road, ASPHALT, 0.55);
    pen.stroke([road[0]!, road[3]!], 2, INK, 0.9, false);
    pen.stroke([road[1]!, road[2]!], 2, INK, 0.9, false);
    // The centre line, dashes growing as they come nearer.
    ctx.save();
    ctx.strokeStyle = PAPER_FILL;
    ctx.globalAlpha = 0.85;
    for (let y = GROUND.horizon + 10; y < H; y += 26 + (y - GROUND.horizon) * 0.12) {
      ctx.lineWidth = 3 + (y - GROUND.horizon) * 0.01;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx, y + 12 + (y - GROUND.horizon) * 0.06);
      ctx.stroke();
    }
    ctx.restore();
  }
  const shore = shoreline(cam, surge);
  if (shore.some((p) => p.x < W + 20)) {
    const sea = [...shore, { x: W + 40, y: H }, { x: W + 40, y: GROUND.horizon }];
    pen.fill(sea, PAPER_FILL, 1);
    pen.fill(sea, WATER, 0.55);
    // Wet sand just above the line, foam on it, and ripples out in the water.
    pen.stroke(shore.map((p) => ({ x: p.x - 14, y: p.y })), 10, '#b9a27a', 0.3, false);
    pen.stroke(shore, 5, PAPER_FILL, 0.9, false);
    pen.stroke(shore, 1.6, INK, 0.8, false);
    for (let k = 0; k < 9; k++) {
      const y = GROUND.horizon + 30 + k * 130;
      const depth = (y - GROUND.far) / (GROUND.near - GROUND.far);
      const x = shoreX(depth, surge) - cam + 60 + ((k * 97 + t * 40) % 420);
      pen.stroke([{ x, y }, { x: x + 26 + k * 3, y: y - 3 }, { x: x + 52 + k * 6, y }], 1.3, INK, 0.45, false);
    }
  }
}

/** One mesh fence along a lane edge (world x from a to b at lane `edge` 0 far .. 1 near), posts and two wires. */
function meshFence(ctx: CanvasRenderingContext2D, pen: Pen, cam: number, a: number, b: number, edge: number, lift: (x: number) => number): void {
  const pts = Array.from({ length: Math.max(2, Math.round((b - a) / 26) + 1) }, (_, i) => {
    const x = a + ((b - a) * i) / Math.max(1, Math.round((b - a) / 26));
    const depth = laneDepth(x, edge);
    return { x: x - cam, y: depthY(depth) - lift(x), h: 34 * depthScale(depth) };
  });
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = INK;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  [...pts].reverse().forEach((p) => ctx.lineTo(p.x, p.y - p.h));
  ctx.fill();
  ctx.restore();
  for (const p of pts) pen.stroke([{ x: p.x, y: p.y }, { x: p.x, y: p.y - p.h - 4 }], 1.6, INK, 0.85, false);
  pen.stroke(pts.map((p) => ({ x: p.x, y: p.y - p.h })), 1.4, INK, 0.85, false);
  pen.stroke(pts.map((p) => ({ x: p.x, y: p.y - p.h * 0.45 })), 1, INK, 0.6, false);
}

/** Behind the crowd: the far fences and railing, the deck, its pillars (drawn by `under` before the deck when a car is beneath). */
export function drawBridgeBack(ctx: CanvasRenderingContext2D, cam: number, boil: number, built: number, under: () => void): void {
  if (BRIDGE.to - cam < -60 && FUNNEL.out - cam < -60) return;
  if (FUNNEL.in - cam > W + 60) return;
  const pen = new Pen(ctx, 7500 + boil, 0.7);
  const lift = (x: number): number => bridgeProfile(x) * BRIDGE.height * built;
  meshFence(ctx, pen, cam, FUNNEL.in, FUNNEL.on, 0, lift);
  meshFence(ctx, pen, cam, FUNNEL.off, FUNNEL.out, 0, lift);
  meshFence(ctx, pen, cam, BRIDGE.from, BRIDGE.to, 0, lift);
  // Pillars under the flat span, from the deck down to the road's edges.
  for (const x of [BRIDGE.up + 10, BRIDGE.down - 10]) {
    for (const depth of [DECK.far, DECK.near]) {
      const top = depthY(depth) - lift(x) + 14;
      const foot = depthY(depth);
      if (foot - top < 4) continue;
      const pillar = [{ x: x - cam - 9, y: top }, { x: x - cam + 9, y: top }, { x: x - cam + 9, y: foot }, { x: x - cam - 9, y: foot }];
      pen.fill(pillar, PAPER_FILL, 1);
      pen.fill(pillar, CONCRETE, 0.8);
      pen.stroke([...pillar, pillar[0]!], 1.4, INK, 0.9, false);
    }
  }
  under();
  const xs = Array.from({ length: 41 }, (_, i) => BRIDGE.from + ((BRIDGE.to - BRIDGE.from) * i) / 40);
  const far = xs.map((x) => ({ x: x - cam, y: depthY(DECK.far) - lift(x) }));
  const near = xs.map((x) => ({ x: x - cam, y: depthY(DECK.near) - lift(x) }));
  const face = near.map((p, i) => ({ x: p.x, y: p.y + Math.min(16, lift(xs[i]!)) }));
  const deck = [...far, ...[...near].reverse()];
  pen.fill(deck, PAPER_FILL, 1);
  pen.fill(deck, CONCRETE, 0.6);
  const side = [...near, ...[...face].reverse()];
  pen.fill(side, CONCRETE, 0.9);
  pen.fill(side, INK, 0.25);
  pen.stroke(far, 1.6, INK, 0.9, false);
  pen.stroke(near, 1.8, INK, 1, false);
  pen.stroke(face, 1.4, INK, 0.8, false);
}

/** In front of the crowd: the near fences and the near railing (a see-through mesh). */
export function drawBridgeFront(ctx: CanvasRenderingContext2D, cam: number, boil: number, built: number): void {
  if (FUNNEL.out - cam < -60 || FUNNEL.in - cam > W + 60) return;
  const pen = new Pen(ctx, 7600 + boil, 0.7);
  const lift = (x: number): number => bridgeProfile(x) * BRIDGE.height * built;
  meshFence(ctx, pen, cam, FUNNEL.in, FUNNEL.on, 1, lift);
  meshFence(ctx, pen, cam, FUNNEL.off, FUNNEL.out, 1, lift);
  meshFence(ctx, pen, cam, BRIDGE.from, BRIDGE.to, 1, lift);
}

/** The deck flushing red as the crabs pour over it, `flash` 0 .. 1. */
export function drawBridgeFlash(ctx: CanvasRenderingContext2D, cam: number, flash: number, color: string): void {
  if (flash <= 0) return;
  const xs = Array.from({ length: 31 }, (_, i) => BRIDGE.up + ((BRIDGE.down - BRIDGE.up) * i) / 30);
  ctx.save();
  ctx.globalAlpha = 0.22 * flash;
  ctx.fillStyle = color;
  ctx.beginPath();
  xs.forEach((x, i) => (i === 0 ? ctx.moveTo(x - cam, depthY(DECK.far) - BRIDGE.height) : ctx.lineTo(x - cam, depthY(DECK.far) - BRIDGE.height)));
  [...xs].reverse().forEach((x) => ctx.lineTo(x - cam, depthY(DECK.near) - BRIDGE.height));
  ctx.fill();
  ctx.restore();
}

