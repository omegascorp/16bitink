import { anemone, barnacles, limpet, pebbles, starfish, wrack } from '../../../src/art/backdrop/shoreLife';
import { rock, woolsack } from '../../../src/art/backdrop/granite';
import { bezier, type Draw, makeDraw, oval, pt } from '../../../src/art/kit';
import { PAPER, PAPER_FILL, SAND_DEEP, SAND_GRAIN, SAND_WET } from '../../../src/art/palette';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { VIDEO } from '../short';
import { HOLES, type P, sandY } from './motion';
import { LOOP_S } from './story';

/**
 * The rock pool (the game's third beach, a granite shore, seen under the
 * water): a strip of sky and the pool's surface at the top, granite walls
 * either side hung with wrack, barnacles and limpets, a boulder on the right
 * and a stone in the middle with dark holes in them for the arms to search,
 * and wet sand with pebbles and a starfish. Drawn once with the game's
 * shore-life pens at U screen px per unit; bubbles and the light's shimmer
 * move over it every frame.
 */
const U = 2;
const SKY = '#9ec0d8';
const POOL = '#5f97a0';
const HOLE = '#24222b';
export const SURFACE_Y = 236;

/** A dark crevice in the rock: the mouth of a hole, hatched inside (units). */
function hole(t: Draw, at: P, rx: number, ry: number): void {
  const mouth = oval(at.x, at.y, rx, ry, 18).map((p, i) => pt(p.x + t.pen.jitter(rx * 0.08) + (i % 3) * 0.2, p.y + t.pen.jitter(ry * 0.1)));
  t.pen.fill(mouth, HOLE, 0.92);
  t.pen.clipped(mouth, () => t.pen.hatch(mouth, 1.5, 0.6, 0.45, { color: t.ink, alpha: 0.6 }));
  t.pen.stroke([...mouth, mouth[0]!], 1, t.ink, 1, false);
}

const units = (p: P): P => ({ x: p.x / U, y: p.y / U });

/** Everything that doesn't move, made once. */
export function makePool(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.scale(U, U);
  const t = makeDraw(ctx, 3301, 0, 0);
  const { pen } = t;
  const W = VIDEO.width / U;
  const H = VIDEO.height / U;
  const surface = SURFACE_Y / U;
  // Sky above the pool, then the water, deepening towards the bottom.
  const sky = ctx.createLinearGradient(0, 0, 0, surface);
  sky.addColorStop(0, 'rgba(158,192,216,0.35)');
  sky.addColorStop(1, 'rgba(223,233,238,0.3)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, surface);
  const water = ctx.createLinearGradient(0, surface, 0, H);
  water.addColorStop(0, 'rgba(95,151,160,0.16)');
  water.addColorStop(0.55, 'rgba(95,151,160,0.3)');
  water.addColorStop(1, 'rgba(70,120,140,0.36)');
  ctx.fillStyle = water;
  ctx.fillRect(0, surface, W, H - surface);
  // Light slanting down from the surface.
  for (const [x, w] of [[120, 40], [250, 26], [330, 50], [450, 30]] as const) {
    pen.fill([pt(x, surface), pt(x + w, surface), pt(x + w - 110, H * 0.6), pt(x - 140, H * 0.6)], PAPER_FILL, 0.13);
  }
  // The surface: a wavy line seen from just under it.
  const line = Array.from({ length: 70 }, (_, i) => pt((i / 69) * W, surface + 1.6 * Math.sin(i * 0.9) + 0.8 * Math.sin(i * 2.3)));
  pen.stroke(line, 1.3, t.ink, 0.8, false);
  pen.hair(line.map((p) => pt(p.x, p.y + 2.5)), 0.6, PAPER_FILL, 0.8);
  pen.fill([pt(0, surface - 30), pt(W, surface - 34), pt(W, surface - 4), pt(0, surface - 2)], SKY, 0.12);

  // The pool's granite walls, wrack hanging into the water, and the rocks on the bottom.
  const walls = [
    woolsack(t, -12, 205, 56, 120), woolsack(t, -6, 420, 62, 130), woolsack(t, 4, 560, 82, 70, 3, sandY(80) / U + 8),
    woolsack(t, 552, 220, 52, 125), woolsack(t, 548, 420, 46, 110),
  ];
  for (const w of walls) rock(t, w, { lichen: 0 });
  for (const [x, y, a] of [[30, 130, 1.75], [42, 300, 1.45], [508, 140, 1.4], [512, 330, 1.7]] as const) wrack(t, pt(x, y), 26, a, 3, 3);
  barnacles(t, walls[1]!, -10, 50, 330, 480, 40);
  barnacles(t, walls[4]!, 505, 560, 350, 500, 36);
  for (const [x, y] of [[44, 250], [36, 455], [514, 280], [506, 470]] as const) limpet(t, x, y, 2.2);
  const boulder = woolsack(t, 535, 480, 82, 92, 3, sandY(1000) / U + 6);
  rock(t, boulder, { lichen: 0 });
  const stone = woolsack(t, 214, 528, 42, 26, 3, sandY(430) / U + 6);
  rock(t, stone, { lichen: 0 });
  hole(t, units(HOLES.r1), 16, 10);
  hole(t, units(HOLES.r2), 13, 8.5);
  hole(t, units(HOLES.m), 10, 6.5);
  anemone(t, 470, 410, 2.6, true);
  anemone(t, 60, 535, 2.4, true);
  anemone(t, 24, 345, 2, true);

  // The sand: wet and darker with depth, grained and pebbled.
  const edge: Pt[] = Array.from({ length: 61 }, (_, i) => pt((i / 60) * W, sandY((i / 60) * VIDEO.width) / U));
  const sand = [...edge, pt(W, H), pt(0, H)];
  pen.fill(sand, PAPER_FILL, 0.9);
  pen.fill(sand, SAND_WET, 0.62);
  const deep = ctx.createLinearGradient(0, 560, 0, H);
  deep.addColorStop(0, 'rgba(169,143,104,0)');
  deep.addColorStop(1, 'rgba(169,143,104,0.45)');
  ctx.fillStyle = deep;
  ctx.fillRect(0, 520, W, H - 520);
  pen.stroke(edge, 1.1, t.ink, 0.85, false);
  pen.stipple(sand, 1400, () => 0.6, 0.45, SAND_GRAIN);
  pen.stipple(sand, 300, () => 0.6, 0.5, PAPER_FILL);
  pebbles(t, 20, 520, (x) => sandY(x * U) / U + 2, 26);
  starfish(t, 132, sandY(264) / U + 10, 11, 0.4);
  pen.fill(sand, SAND_DEEP, 0.04);
  return canvas;
}

/** Bubbles rising from the rocks: each comes round a whole number of times a loop. */
const BUBBLES: readonly { readonly x: number; readonly from: number; readonly n: number; readonly r: number; readonly phase: number }[] = [
  { x: 1010, from: 860, n: 4, r: 7, phase: 0.1 },
  { x: 1030, from: 880, n: 4, r: 4, phase: 0.55 },
  { x: 70, from: 900, n: 3, r: 6, phase: 0.3 },
  { x: 90, from: 920, n: 5, r: 4, phase: 0.8 },
  { x: 450, from: 1010, n: 3, r: 5, phase: 0.45 },
];

export function drawAmbient(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.lineWidth = 2.5;
  for (const b of BUBBLES) {
    const u = (((t * b.n) / LOOP_S + b.phase) % 1 + 1) % 1;
    const y = b.from - u * (b.from - SURFACE_Y - 10);
    const x = b.x + 10 * Math.sin(u * 12 + b.phase * 6);
    ctx.globalAlpha = 0.7 * Math.min(1, u * 8, (1 - u) * 6);
    ctx.fillStyle = PAPER_FILL;
    ctx.strokeStyle = '#26316a';
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // The light's shimmer on the sand: a few bright threads drifting to and fro.
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = PAPER_FILL;
  ctx.lineWidth = 3;
  for (let k = 0; k < 7; k++) {
    const x0 = 140 + k * 125 + 30 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S + k);
    const y0 = sandY(x0) + 24 + (k % 3) * 22;
    const pts = bezier(pt(x0, y0), pt(x0 + 35, y0 - 8 + 6 * Math.sin((2 * Math.PI * 5 * t) / LOOP_S + k * 2)), pt(x0 + 75, y0 + 2), 8);
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}
