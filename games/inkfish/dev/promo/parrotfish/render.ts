import { INK } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawMarks, makeMarks, makePaper } from '../backdrop';
import type { Pose } from '../chain';
import { drawChomp, drawExclaim } from '../effects';
import type { Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderParrotfishAudio } from './audio';
import { drawArrow, drawCaption, drawCounter, drawLabel, drawXray } from './marks';
import { plumeAt } from './sand';
import {
  drawChunk, drawCoral, drawLand, drawPalm, drawSweep, drawTowel, drawUmbrella, drawWater, drawWaterline, makeCoral, makeSky, WHITE_SAND,
} from './scenery';
import { BEACH_Y, type Camera, ISLAND_X, PALMS, SEABED_Y, WATER_Y } from './stage';
import {
  alarmAt, BITES, biteShown, boilAt, cameraAt, chompAt, chunkAt, counterAt, type Fish, fishAt, labelsAt, LOOP_S, mouthAt, palmAt, shakeAt, sitAt,
  sweepAt, throatOf, xrayAt,
} from './story';
import { drawSunbather, headOf } from './sunbather';

/** Draws the "White sand beaches are fish poop" short (story.ts has the choreography). */

interface Pt { readonly x: number; readonly y: number }

const toScreen = (p: Pt, cam: Camera): Pt => ({ x: (p.x - cam.cx) * cam.zoom + 540, y: (p.y - cam.cy) * cam.zoom + 960 });

const poseOf = (f: Fish): Pose => ({
  j: 0, shape: 'parrotfish', age: 0, x: f.x, y: f.y, length: f.len, facing: f.face >= 0 ? 1 : -1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

/** The parrotfish, turned by its `face` (through edge-on). */
function drawFish(ctx: CanvasRenderingContext2D, sprite: Sprite, f: Fish, boil: number): void {
  if (Math.abs(f.face) < 0.01) return;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  drawSwimmer(ctx, sprite, { ...poseOf(f), x: 0, y: 0, facing: 1 }, boil, { jaw: f.jaw });
  ctx.restore();
}

/** The sand it poops: soft clouds billowing, then grains sinking and settling. */
function drawPlume(ctx: CanvasRenderingContext2D, t: number): void {
  const { clouds, grains } = plumeAt(t);
  ctx.save();
  ctx.strokeStyle = INK;
  // Outlines first, then the fills over them: overlapping puffs merge into one billowing cloud.
  ctx.lineWidth = 5;
  for (const c of clouds) {
    ctx.globalAlpha = c.alpha ** 1.5 * 0.85;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = WHITE_SAND;
  for (const c of clouds) {
    ctx.globalAlpha = Math.min(1, c.alpha * 1.4);
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r - 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 1.2;
  for (const g of grains) {
    ctx.globalAlpha = g.alpha;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fillStyle = WHITE_SAND;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Each crunch: the chunk carried into its mouth, crumbs falling, the ink burst. */
function drawBites(ctx: CanvasRenderingContext2D, f: Fish, t: number): void {
  const mouth = mouthAt(f);
  BITES.forEach((b, i) => {
    const u = chunkAt(i, t);
    if (u >= 0 && u < 1) {
      const e = u ** 0.7;
      drawChunk(ctx, b.x + (mouth.x - b.x) * e, b.y + (mouth.y - b.y) * e, 40 * (1 - 0.5 * u), u * 3 + i);
    }
    const fall = (t - b.at) / 1.3;
    if (fall >= 0 && fall < 1) {
      for (let k = 0; k < 6; k++) {
        const x = b.x + (k - 2.5) * 9 + fall * (k % 2 ? 30 : -20);
        const y = b.y + 10 + fall * (SEABED_Y - b.y - 10) * (0.6 + 0.08 * k);
        ctx.save();
        ctx.globalAlpha = 1 - fall;
        drawChunk(ctx, x, y, 9 + (k % 3) * 3, k + fall * 4);
        ctx.restore();
      }
    }
    drawChomp(ctx, { ...poseOf(f), x: f.x, y: f.y }, chompAt(i, t));
  });
}

/** The labels, the "!" and the "you" arrow, the X-ray and the counter: over the picture, in video px. */
function drawNotes(ctx: CanvasRenderingContext2D, cam: Camera, f: Fish, t: number): void {
  const labels = labelsAt(t);
  const fish = toScreen(f, cam);
  if (labels.parrotfish > 0) drawLabel(ctx, 'parrotfish', fish.x, fish.y - f.len * cam.zoom * 0.42 - 26, 76, labels.parrotfish);
  const sit = sitAt(t);
  const head = toScreen(headOf(sit), cam);
  if (labels.you > 0) {
    drawLabel(ctx, 'you', head.x - 250, head.y - 30, 88, labels.you);
    drawArrow(ctx, { x: head.x - 195, y: head.y - 52 }, { x: head.x - 34, y: head.y - 12 }, -0.18, labels.you);
  }
  const pop = alarmAt(t);
  if (pop > 0) drawExclaim(ctx, head.x + 6, head.y - 78, 84 * pop, 0.15);

  drawXray(ctx, toScreen(throatOf(f), cam), 560, 440, 165, xrayAt(t), t);

  const counter = counterAt(t);
  drawCounter(ctx, 560, 440, counter.kg, counter.month, counter.alpha);

  if (labels.maldives > 0) {
    drawLabel(ctx, 'Maldives', 540, 470, 120, labels.maldives);
    drawArrow(ctx, { x: 560, y: 500 }, toScreen({ x: ISLAND_X - 180, y: BEACH_Y - 30 }, cam), 0.15, labels.maldives, 6);
  }
  if (labels.poop > 0) {
    const at = toScreen({ x: ISLAND_X - 150, y: (BEACH_Y + SEABED_Y) / 2 + 40 }, cam);
    drawLabel(ctx, 'fish poop', at.x, at.y, 72, labels.poop);
  }
}

export function createParrotfish(ctx: CanvasRenderingContext2D): Short {
  const paper = makePaper();
  const marks = makeMarks(26, 117);
  const sky = makeSky();
  const coral = makeCoral();
  const sprite = makeSprite('parrotfish', 6);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = cameraAt(t);
    const jolt = shakeAt(t);
    const f = fishAt(t);
    ctx.drawImage(paper, 0, 0);

    ctx.save();
    ctx.translate(540 + jolt.x, 960 + jolt.y);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.cx, -cam.cy);
    sky.draw(ctx);
    drawWater(ctx, t);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-700, WATER_Y + 30, 3800, 900);
    ctx.clip();
    drawMarks(ctx, marks, t / LOOP_S);
    ctx.restore();
    drawLand(ctx, t);
    const sweep = sweepAt(t);
    drawSweep(ctx, sweep.across, sweep.alpha);
    drawCoral(ctx, coral, BITES.map((b, i) => ({ x: b.x, y: b.y, shown: biteShown(i, t) })));
    PALMS.forEach((p, i) => drawPalm(ctx, p.x, p.h, p.lean, palmAt(i, t)));
    drawTowel(ctx);
    drawUmbrella(ctx);
    drawSunbather(ctx, sitAt(t));
    drawFish(ctx, sprite, f, boil);
    drawPlume(ctx, t);
    drawBites(ctx, f, t);
    drawWaterline(ctx, t);
    ctx.restore();

    drawNotes(ctx, cam, f, t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderParrotfishAudio };
}
