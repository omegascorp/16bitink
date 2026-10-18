import { cloud, palm } from '../../../src/art/backdrop/tropic';
import { edges } from '../../../src/art/backdrop/common';
import { makeDraw, pt } from '../../../src/art/kit';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { INK, PAPER, PAPER_FILL, RED, SAND_DRY, SAND_GRAIN } from '../../../src/art/palette';
import { VIDEO } from '../short';
import { drawSprite } from '../sprites';
import { applyCam } from './beach';
import { drawBus } from './bus';
import { drawTentacle, type FloatSprites, ROOT_SPAN } from './manowarArt';
import { drawSpikes, vignette } from './marks';
import { BUS, guidesAt, passBurstAt, passedAt, reachAt, roadCamAt, SMALL_FLOAT } from './story';

/**
 * The beach road: an overcast sky, palms behind a road with a bus parked
 * on it, the sea wall, and on the sand below, the same man o' war, small
 * now, its tentacles stretching out along the sand beside the bus and on
 * past its front. Baked once with a margin for the camera; screen px.
 */
const { width: W, height: H } = VIDEO;
const M = 70;
const ROAD_TOP = 700;
const WALL_TOP = 772;
const SAND_TOP = 814;
const K = 2;

function paint(ctx: CanvasRenderingContext2D): void {
  const d = makeDraw(ctx, 5700, 0, 0);
  const { pen } = d;
  ctx.fillStyle = PAPER;
  ctx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
  // A heavier sky than the beach's: grey-blue, a lid of cloud.
  const sky = ctx.createLinearGradient(0, 0, 0, ROAD_TOP);
  sky.addColorStop(0, '#9fb0c2');
  sky.addColorStop(1, '#e3e2d8');
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = sky;
  ctx.fillRect(-M, -M, W + 2 * M, ROAD_TOP + M);
  ctx.restore();
  ctx.save();
  ctx.scale(K, K);
  const far = makeDraw(ctx, 5701, 0, 0);
  for (const [x, y, w, n] of [[60, 190, 160, 6], [300, 160, 200, 7], [520, 210, 130, 5]] as const) cloud(far, x, y, w, n);
  for (const [x, h, lean] of [[40, 150, 0.2], [235, 170, -0.15], [470, 160, 0.25], [520, 120, -0.1]] as const) palm(far, x, ROAD_TOP / K, h, lean, 0.9);
  ctx.restore();
  // The road, its kerb and the sea wall's blocks.
  const road: Pt[] = edges([pt(-M, ROAD_TOP), pt(W + M, ROAD_TOP), pt(W + M, WALL_TOP), pt(-M, WALL_TOP)], 8);
  pen.fill(road, '#8f8d88', 0.75);
  for (let x = -M + 20; x < W + M; x += 90) pen.stroke([pt(x, 738), pt(x + 46, 738)], 3, PAPER_FILL, 0.8, false);
  pen.stroke([pt(-M, ROAD_TOP), pt(W + M, ROAD_TOP)], 1.6, INK, 0.6, false);
  const wall: Pt[] = edges([pt(-M, WALL_TOP), pt(W + M, WALL_TOP), pt(W + M, SAND_TOP), pt(-M, SAND_TOP)], 8);
  pen.fill(wall, PAPER_FILL, 1);
  pen.fill(wall, '#c7bca4', 0.8);
  for (let x = -M; x < W + M; x += 64) pen.hair([pt(x, WALL_TOP + 22), pt(x, SAND_TOP)], 0.9, INK, 0.45);
  for (let x = -M + 32; x < W + M; x += 64) pen.hair([pt(x, WALL_TOP + 4), pt(x, WALL_TOP + 22)], 0.9, INK, 0.45);
  pen.hair([pt(-M, WALL_TOP + 22), pt(W + M, WALL_TOP + 22)], 0.9, INK, 0.45);
  pen.stroke([pt(-M, WALL_TOP), pt(W + M, WALL_TOP)], 2.4, INK, 0.8, false);
  drawBus(makeDraw(ctx, 5702, 0, 0), BUS.x0, BUS.x1, BUS.bottom);
  // The sand below the wall.
  const sand: Pt[] = [pt(-M, SAND_TOP), pt(W + M, SAND_TOP), pt(W + M, H + M), pt(-M, H + M)];
  pen.fill(sand, SAND_DRY, 0.9);
  pen.fill([pt(-M, SAND_TOP), pt(W + M, SAND_TOP), pt(W + M, SAND_TOP + 26), pt(-M, SAND_TOP + 26)], INK, 0.08);
  pen.stipple(sand, 4200, (_, y) => Math.max(0.2, 1 - (y - SAND_TOP) / 900) * 0.6, 1.2, SAND_GRAIN);
  pen.stroke([pt(-M, SAND_TOP), pt(W + M, SAND_TOP)], 2.6, INK, 0.75, false);
}

export function makeRoad(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W + 2 * M, H + 2 * M);
  ctx.translate(M, M);
  paint(ctx);
  return canvas;
}

/** The three tentacles stretching right along the sand, the longest reaching `reach`. */
function strands(reach: number, t: number): Pt[][] {
  const root = pt(SMALL_FLOAT.x + ROOT_SPAN.x1 * SMALL_FLOAT.scale * 0.6, SMALL_FLOAT.ground + ROOT_SPAN.y * SMALL_FLOAT.scale);
  return [[1, 6, 0], [0.74, 26, 1.7], [0.5, 44, 3.1]].map(([share, dy, ph]) => {
    const tip = root.x + (reach - root.x) * share!;
    const out: Pt[] = [];
    for (let k = 0; k <= 60; k++) {
      const u = k / 60;
      const x = root.x + (tip - root.x) * u;
      out.push(pt(x, root.y + dy! * Math.min(1, u * 5) + 7 * Math.sin(x * 0.03 + ph! + t * 0.8) * Math.min(1, u * 3)));
    }
    return out;
  });
}

/** The road scene through its camera. */
export function drawRoad(ctx: CanvasRenderingContext2D, base: HTMLCanvasElement, floats: FloatSprites, t: number, boil: number): void {
  ctx.save();
  applyCam(ctx, roadCamAt(t));
  ctx.drawImage(base, -M, -M);
  const reach = reachAt(t);
  strands(reach, t).forEach((path, i) => drawTentacle(ctx, path, 5.5, boil, 20 + i, 1, 10));
  drawSprite(ctx, floats.beached, boil, { x: SMALL_FLOAT.x, y: SMALL_FLOAT.ground, scale: SMALL_FLOAT.scale });
  // Dashed lines down from the bus's back and its front: the tentacle passes the front on "BUS!".
  const guide = guidesAt(t);
  if (guide > 0) {
    const passed = passedAt(t);
    ctx.save();
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.setLineDash([16, 14]);
    for (const [x, hot] of [[BUS.x0, 0], [BUS.x1, passed]] as const) {
      ctx.globalAlpha = guide * 0.85;
      ctx.strokeStyle = hot > 0.5 ? RED : INK;
      ctx.beginPath();
      ctx.moveTo(x, BUS.bottom + 6);
      ctx.lineTo(x, 1050);
      ctx.stroke();
    }
    ctx.restore();
  }
  const burst = passBurstAt(t);
  if (burst > 0 && burst < 1) drawSpikes(ctx, BUS.x1, 978, 34 + 70 * burst, 34, 1 - burst, 10, RED);
  ctx.restore();
  vignette(ctx, 0.3, '40,46,70');
}
