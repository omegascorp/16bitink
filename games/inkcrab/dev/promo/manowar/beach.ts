import { shells, sandMarks, driftwood } from '../../../src/art/backdrop/beach';
import { cloud, motu } from '../../../src/art/backdrop/tropic';
import { swells } from '../../../src/art/backdrop/water';
import { bezier, makeDraw, pt } from '../../../src/art/kit';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { INK, PAPER, PAPER_FILL, SAND_DRY, SAND_GRAIN, SAND_WET } from '../../../src/art/palette';
import { VIDEO } from '../short';
import { drawSprite } from '../sprites';
import { drawHermit, CLAW, type HermitSprites } from './hermit';
import { drawTentacle, type FloatSprites, ROOT_SPAN, wavyPath } from './manowarArt';
import { drawBolt, drawZapBurst } from './marks';
import { ANCHOR, type Cam, camAt, crabAt, FLOAT, TIP, washAt, zapAt, sparkAt, CRAB_GROUND } from './story';

/**
 * The beach: a pale coral-sand shore under a high sky, the man o' war
 * stranded on the wet sand where the surf has left it, its tentacles
 * trailing across the beach, and the game's hermit crab. The still part is
 * baked once at twice the video's size (the camera dives in to ×3.4) with a
 * margin round it for the camera's jolts. Screen px.
 */
const { width: W, height: H } = VIDEO;
/** Baked px per screen px, and the margin baked round the frame. */
const RES = 2;
const M = 70;
export const HORIZON = 560;
/** The water's edge, where the surf washes up and back. */
export const SHORE = 742;
/** The design scale the game's backdrop helpers are drawn at (they're made for a half-size world). */
const K = 2;

const SKY_TOP = '#93c9e3';
const SKY_LOW = '#d6ecef';
const SEA_FAR = '#5ea6cf';
const SEA_NEAR = '#8fd0d4';

function paint(ctx: CanvasRenderingContext2D): void {
  const d = makeDraw(ctx, 5400, 0, 0);
  const { pen } = d;
  ctx.fillStyle = PAPER;
  ctx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
  // The sky, washed deeper towards the top, and a few fair-weather clouds.
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(0.75, SKY_LOW);
  sky.addColorStop(1, '#f1ecdc');
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = sky;
  ctx.fillRect(-M, -M, W + 2 * M, HORIZON + M);
  ctx.restore();
  ctx.save();
  ctx.scale(K, K);
  const far = makeDraw(ctx, 5401, 0, 0);
  for (const [x, y, w, n] of [[90, 205, 120, 5], [330, 172, 150, 6], [470, 236, 70, 4]] as const) cloud(far, x, y, w, n);
  motu(far, 120, HORIZON / K, 70);
  motu(far, 452, HORIZON / K, 30);
  ctx.restore();
  // The sea: deep blue at the horizon, turquoise over the shallows.
  const sea = ctx.createLinearGradient(0, HORIZON, 0, SHORE);
  sea.addColorStop(0, SEA_FAR);
  sea.addColorStop(1, SEA_NEAR);
  ctx.fillStyle = sea;
  ctx.fillRect(-M, HORIZON, W + 2 * M, SHORE - HORIZON + 20);
  pen.stroke([pt(-M, HORIZON), pt(W + M, HORIZON)], 1.6, INK, 0.5, false);
  ctx.save();
  ctx.scale(K, K);
  swells(makeDraw(ctx, 5402, 0, 0), HORIZON / K + 6, SHORE / K - 8);
  ctx.restore();
  // The sand: wet and glossy at the water's edge, drying paler towards us.
  const top: Pt[] = Array.from({ length: 50 }, (_, i) => pt(-M + i * 27, SHORE + 4 * Math.sin(i * 0.8) + 2 * Math.sin(i * 2.1)));
  const sand = [...top, pt(W + M, H + M), pt(-M, H + M)];
  pen.fill(sand, PAPER_FILL, 1);
  const g = ctx.createLinearGradient(0, SHORE, 0, 1320);
  g.addColorStop(0, SAND_WET);
  g.addColorStop(0.55, '#dcc89a');
  g.addColorStop(1, SAND_DRY);
  pen.clipped(sand, () => {
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-M, SHORE - 10, W + 2 * M, H + M - SHORE + 10);
    ctx.globalAlpha = 1;
    // The sky's light in the wet sand: long pale streaks.
    for (let k = 0; k < 26; k++) {
      const y = SHORE + 14 + k * 11 + 4 * Math.sin(k * 3.1);
      const x = ((k * 263) % 1100) - 60;
      pen.hair(bezier(pt(x, y), pt(x + 120, y - 1.5), pt(x + 260 + (k % 3) * 60, y), 10), 2.2, PAPER_FILL, 0.32 * (1 - k / 30));
    }
  });
  pen.stipple(sand, 5200, (_, y) => Math.max(0.15, Math.min(1, (y - SHORE) / 600)) * 0.65, 1.2, SAND_GRAIN);
  pen.stroke(top, 2.4, INK, 0.55, false);
  ctx.save();
  ctx.scale(K, K);
  const near = makeDraw(ctx, 5403, 0, 0);
  sandMarks(near, -M / K, (W + M) / K, () => 1180 / K);
  shells(near, 20, 520, (x) => 1260 / K + 30 * Math.sin(x * 0.05));
  driftwood(near, 470, 1340 / K, 120);
  ctx.restore();
}

/** The still beach, baked once. */
export function makeBeach(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas((W + 2 * M) * RES, (H + 2 * M) * RES);
  ctx.scale(RES, RES);
  ctx.translate(M, M);
  paint(ctx);
  return canvas;
}

/** The tentacles trailing from under the float across the sand: [root (units along the float), two controls, end, wave, waves]. */
const TRAILS: readonly (readonly [number, Pt, Pt, Pt, number, number])[] = [
  [-30, pt(520, 970), pt(440, 1050), pt(TIP.x, TIP.y), 6, 3],
  [-26, pt(480, 930), pt(300, 925), pt(-70, 955), 8, 5],
  [-20, pt(520, 1010), pt(200, 1110), pt(-70, 1080), 9, 6],
  [-12, pt(520, 1040), pt(390, 1100), pt(180, 1108), 7, 4],
  [-4, pt(660, 990), pt(740, 1080), pt(600, 1070), 5, 3],
  [8, pt(760, 935), pt(860, 1000), pt(990, 1060), 6, 3],
  [20, pt(830, 930), pt(980, 990), pt(1160, 1000), 6, 4],
  [-34, pt(470, 915), pt(380, 892), pt(250, 912), 6, 3],
];
const rootAt = (lx: number): Pt => pt(FLOAT.x + lx * FLOAT.scale, FLOAT.ground + ROOT_SPAN.y * FLOAT.scale);
export const BEACH_TENTACLES: readonly Pt[][] = TRAILS.map(([lx, c0, c1, end, amp, waves], i) => wavyPath(rootAt(lx), c0, c1, end, amp, waves, i * 1.7, 60));

/** A world point on screen through the camera. */
export const onScreen = (cam: Cam, p: Pt): Pt => pt(ANCHOR.x + cam.z * (p.x - cam.x), ANCHOR.y + cam.z * (p.y - cam.y));

export function applyCam(ctx: CanvasRenderingContext2D, cam: Cam): void {
  ctx.translate(ANCHOR.x, ANCHOR.y);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
}

/** The surf's last reach: a sheet of water sliding up the wet sand and back, its foam edge inked. */
function drawWash(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const reach = SHORE + 10 + 46 * washAt(t);
  const edge: Pt[] = [];
  for (let x = -M; x <= W + M; x += 20) edge.push(pt(x, reach + 7 * Math.sin(x * 0.013 + 1.3) + 4 * Math.sin(x * 0.041)));
  const d = makeDraw(ctx, 5420 + boil, boil, 0);
  d.pen.fill([pt(-M, SHORE - 6), pt(W + M, SHORE - 6), ...[...edge].reverse()], SEA_NEAR, 0.35);
  d.pen.stroke(edge, 4, PAPER_FILL, 0.9, false);
  d.pen.hair(edge.map((p) => pt(p.x, p.y + 4)), 0.9, INK, 0.35);
}

export interface BeachArt {
  readonly base: HTMLCanvasElement;
  readonly floats: FloatSprites;
  readonly hermit: HermitSprites;
}

/** The beach through the camera: the set, the surf, the man o' war, the crab and the zap. */
export function drawBeach(ctx: CanvasRenderingContext2D, art: BeachArt, t: number, boil: number): Cam {
  const cam = camAt(t);
  ctx.save();
  applyCam(ctx, cam);
  ctx.drawImage(art.base, -M, -M, W + 2 * M, H + 2 * M);
  drawWash(ctx, t, boil);
  BEACH_TENTACLES.forEach((path, i) => drawTentacle(ctx, path, i === 0 ? 8 : 7, boil, i, 1, 10));
  drawSprite(ctx, art.floats.beached, boil, { x: FLOAT.x, y: FLOAT.ground, scale: FLOAT.scale });
  const crab = crabAt(t);
  drawHermit(ctx, art.hermit, crab, boil);
  ctx.restore();
  return cam;
}

/** ZAP: bolts from the tentacle's tip into the crab's claws, over the flash; sparks again on "sting!". */
export function drawZap(ctx: CanvasRenderingContext2D, cam: Cam, t: number, boil: number): void {
  const zap = zapAt(t);
  const spark = sparkAt(t);
  if (zap <= 0 && spark <= 0) return;
  ctx.save();
  applyCam(ctx, cam);
  if (zap > 0) {
    const crab = crabAt(t);
    const claw = pt(crab.x + CLAW.x, CRAB_GROUND + CLAW.y);
    for (let k = 0; k < 3; k++) drawBolt(ctx, pt(TIP.x + 4, TIP.y - 4), pt(claw.x - 30 + k * 26, claw.y - 40 + k * 22), boil * 3 + k, 7, zap);
    drawZapBurst(ctx, pt(TIP.x, TIP.y), 110, boil, zap, 8);
  }
  if (spark > 0) drawZapBurst(ctx, pt(TIP.x, TIP.y), 56, boil + 5, spark, 5);
  ctx.restore();
}
