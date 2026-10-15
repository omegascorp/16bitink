import { THEMES } from '../../../src/art/backdrop';
import { BACKDROP_W } from '../../../src/art/backdrop/common';
import { makeDraw } from '../../../src/art/kit';
import { INK, PALE_SAND, PAPER, SAND_DRY, SAND_WET } from '../../../src/art/palette';
import { makeCanvas, Pen } from '../../../src/art/pen';
import { makeSandPatterns } from '../../../src/art/sand';
import { VIDEO } from '../short';
import { ROWS } from './layout';
import { LOOP_S } from './story';

/**
 * Wreck Cove, the game's seventh beach (a Gulf shelling beach, where its
 * hermit crabs make vacancy chains): its far-off backdrop layers, drawn as
 * the game draws them but bigger, over the paper; the clouds drifting a
 * little back and forth; and the sand the queue stands on, hatched with the
 * game's sand patterns. And the wave that brings the next big shell.
 */
/** Screen px per backdrop design px. */
const B = 1.45;
/** Where the backdrop's tiles start, so the wreck sits behind the line. */
const OFFSET_X = -330;

/** The beach's waterline on screen: the backdrop stands on it, our sand runs down from it to the bottom of the frame. */
const SHORE_Y = 548;
/** The first row's ground, where the wave runs. */
const WAVE_Y = ROWS[0]!.y;
/** Our sand starts this far above the shore line. */
const SAND_LIP = 32;

export interface Beach {
  readonly still: HTMLCanvasElement;
  readonly clouds: HTMLCanvasElement;
  readonly cloudsTop: number;
}

/** Where a layer's top goes on screen, as backdropView.ts stacks them above the sand. */
const topOf = (height: number, lift: number): number => SHORE_Y - (2 * lift + height) * B;

function drawLayer(ctx: CanvasRenderingContext2D, draw: (d: ReturnType<typeof makeDraw>) => void, seed: number, top: number): void {
  ctx.save();
  ctx.translate(OFFSET_X, top);
  ctx.scale(B, B);
  draw(makeDraw(ctx, seed, 0, 0));
  ctx.translate(BACKDROP_W, 0);
  draw(makeDraw(ctx, seed, 0, 0));
  ctx.restore();
}

/** The sand the line stands on: the game's hatched sand, a darker wet band along the water's edge, and its edge in pen. */
function drawSand(ctx: CanvasRenderingContext2D): void {
  const patterns = makeSandPatterns(ctx, 2, PALE_SAND);
  const top = SHORE_Y - SAND_LIP;
  ctx.save();
  ctx.fillStyle = SAND_DRY;
  ctx.fillRect(0, top, VIDEO.width, VIDEO.height - top);
  const wet = ctx.createLinearGradient(0, top, 0, top + 46);
  wet.addColorStop(0, SAND_WET);
  wet.addColorStop(1, 'rgba(205,179,130,0)');
  ctx.fillStyle = wet;
  ctx.fillRect(0, top, VIDEO.width, 46);
  ctx.translate(0, top);
  ctx.scale(2, 2);
  // Faint, so the crabs and the marks over them read first.
  for (const [p, alpha] of [[patterns.grain, 0.4], [patterns.sand, 0.3]] as const) {
    ctx.fillStyle = p;
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, 0, VIDEO.width / 2, (VIDEO.height - top) / 2);
  }
  ctx.restore();
  const pen = new Pen(ctx, 41, 1);
  pen.stroke(Array.from({ length: 28 }, (_, i) => ({ x: -10 + i * 41, y: top + 2 * Math.sin(i * 1.7) })), 2.2, INK, 0.75);
  // A lace of old foam left on the wet sand.
  pen.hair(Array.from({ length: 28 }, (_, i) => ({ x: -10 + i * 41, y: top + 16 + 4 * Math.sin(i * 0.9) })), 1.3, INK, 0.35);
}

/** The sky's colour just under its layer's top, carried on up to the top of the frame without a seam. */
function skyAbove(ctx: CanvasRenderingContext2D, skyTop: number): void {
  if (skyTop <= 0) return;
  const row = ctx.getImageData(0, Math.ceil(skyTop) + 2, VIDEO.width, 1).data;
  const avg = [0, 1, 2].map((c) => {
    let sum = 0;
    for (let x = 0; x < VIDEO.width; x++) sum += row[x * 4 + c]!;
    return Math.round(sum / VIDEO.width);
  });
  ctx.fillStyle = `rgb(${avg.join(',')})`;
  ctx.fillRect(0, 0, VIDEO.width, Math.ceil(skyTop) + 2);
}

export function makeBeach(): Beach {
  const { canvas: still, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // The far layers only: the shore's driftwood and wrack of shells would muddle the line of crabs in front of them.
  const layers = THEMES.wreck;
  // Each on its own sheet first: a layer erases its own foot (fadeBottom), which must not punch through the paper.
  layers.forEach((layer, i) => {
    if (layer.id === 'clouds' || layer.id === 'shore') return;
    const sheet = makeCanvas(VIDEO.width, VIDEO.height);
    drawLayer(sheet.ctx, layer.draw, 900 + i, topOf(layer.height, layer.lift));
    ctx.drawImage(sheet.canvas, 0, 0);
  });
  const sky = layers.find((l) => l.id === 'sky')!;
  skyAbove(ctx, topOf(sky.height, sky.lift));
  drawSand(ctx);
  const clouds = layers.find((l) => l.id === 'clouds')!;
  const { canvas: cloudCanvas, ctx: cctx } = makeCanvas(VIDEO.width + 80, Math.ceil(clouds.height * B));
  drawLayer(cctx, clouds.draw, 900 + layers.indexOf(clouds), 0);
  return { still, clouds: cloudCanvas, cloudsTop: topOf(clouds.height, clouds.lift) };
}

/** The beach at loop time t: the still scene, the clouds drifting a little and back. */
export function drawBeach(ctx: CanvasRenderingContext2D, beach: Beach, t: number): void {
  ctx.drawImage(beach.still, 0, 0);
  ctx.drawImage(beach.clouds, -40 + 30 * Math.sin((2 * Math.PI * t) / LOOP_S), beach.cloudsTop);
}

/**
 * The wave, from the left, seen side on: a shallow swash of water over the
 * sand from `left` to `reach` px in, deepest at the left and thinning to
 * nothing at its front, with its surface and a lacy foam front in pen.
 */
export function drawWave(ctx: CanvasRenderingContext2D, left: number, reach: number, alpha: number, boil: number): void {
  if (reach <= 1 || alpha <= 0) return;
  const DEPTH = 58;
  const front = left + reach;
  const steps = 24;
  const surface = Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps;
    const x = left + reach * u;
    return { x, y: WAVE_Y - DEPTH * Math.sqrt(1 - u) - 4 * Math.sin(x * 0.03 + boil) * (1 - u) };
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(left, WAVE_Y + 10);
  for (const p of surface) ctx.lineTo(p.x, p.y);
  ctx.lineTo(front, WAVE_Y + 10);
  ctx.closePath();
  const g = ctx.createLinearGradient(left, 0, front, 0);
  g.addColorStop(0, 'rgba(90,165,185,0.6)');
  g.addColorStop(1, 'rgba(150,205,215,0.35)');
  ctx.fillStyle = g;
  ctx.fill();
  const pen = new Pen(ctx, 77 + boil, 1);
  pen.stroke(surface, 3, INK, 0.8, false);
  // Foam: curls tumbling along the front.
  for (let k = 0; k < 4; k++) {
    const x = front - 14 - k * 22;
    const y = WAVE_Y - 6 - k * 6;
    pen.stroke(Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI * (0.2 + 1.4 * (i / 8));
      return { x: x + Math.cos(a) * (9 + k * 2), y: y - Math.sin(a) * (7 + k * 2) };
    }), 2, INK, 0.6, false);
  }
  ctx.restore();
}
