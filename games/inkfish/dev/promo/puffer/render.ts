import { INK, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawMarks, makeBackdrop, makeMarks } from '../backdrop';
import type { Pose } from '../chain';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { drawExclaim, drawSuction } from '../effects';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderPufferAudio } from './audio';
import { ballRadius, drawPuffer, pufferPose } from './fish';
import { drawPeople, drawTally } from './people';
import { drawAntidote, drawCard, drawKnife, drawPlate, drawScale, drawVial } from './props';
import { FLOOR_Y, holePath, makeFloor, makeRock, ROCK_OUTLINE } from './scenery';
import {
  antidoteAt, beamAt, boilAt, burstAt, captionAt, cardAt, drawnLen, knifeAt, LOOP_S, MORAY_LEN, type Moray, morayAlarmAt, morayAt, noseOf, panAt,
  panLabelsAt, plateAt, type Puffer, pufferAlarmAt, pufferAt, rockAt, scaleShown, shakeAt, suctionAt, ttxLabelAt, vialAt, wrap,
} from './story';

/** Draws the "one pufferfish can kill thirty people" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const SPOKEN = { fill: '#d9541e', halo: PAPER } as const;
const UNSPOKEN = { fill: INK, halo: PAPER } as const;
const LABEL_SIZE = 74;
const VIAL_SIZE = 74;
const PLATE_AT = { x: 540, y: 850 } as const;
const CARD_AT = { x: 540, y: 925 } as const;

/** The spoken line, word by word, the word being said in orange. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : UNSPOKEN);
    x += (natural[i]! + space) * k;
  });
}

/** An inked arrow along a quadratic curve, with a head at the end. */
function drawArrow(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, via: { x: number; y: number }, to: { x: number; y: number }, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(via.x, via.y, to.x, to.y);
  const a = Math.atan2(to.y - via.y, to.x - via.x);
  ctx.moveTo(to.x - 26 * Math.cos(a - 0.45), to.y - 26 * Math.sin(a - 0.45));
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(to.x - 26 * Math.cos(a + 0.45), to.y - 26 * Math.sin(a + 0.45));
  ctx.stroke();
  ctx.restore();
}

/** Everything but the rock, to clip the moray to. */
const OUTSIDE_ROCK = (() => {
  const region = new Path2D();
  region.rect(-50, -50, VIDEO.width + 100, VIDEO.height + 100);
  const rock = new Path2D();
  ROCK_OUTLINE.forEach((q, i) => (i === 0 ? rock.moveTo(q.x, q.y) : rock.lineTo(q.x, q.y)));
  rock.closePath();
  region.addPath(rock);
  return region;
})();

/** The moray, drawn only where it is out of the rock: over open water, or in the mouth of its hole. */
function drawMoray(ctx: CanvasRenderingContext2D, sprite: Sprite, m: Moray, boil: number, alpha: number): void {
  const pose: Pose = { j: 0, shape: 'moray', age: 0, x: m.x, y: m.y, length: MORAY_LEN, facing: 1, tilt: m.tilt, beat: m.beat, effort: m.effort };
  for (const clip of ['open', 'hole'] as const) {
    ctx.save();
    if (clip === 'open') {
      ctx.clip(OUTSIDE_ROCK, 'evenodd');
    } else {
      holePath(ctx);
      ctx.clip();
    }
    drawSwimmer(ctx, sprite, pose, boil, { jaw: m.jaw, alpha });
    if (clip === 'hole') {
      // In the shadow of its hole.
      ctx.fillStyle = 'rgba(20,16,18,0.55)';
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    }
    ctx.restore();
  }
}

/** An ink ring and pop lines bursting out round the ball as it reaches full size. */
function drawBurst(ctx: CanvasRenderingContext2D, p: Puffer, u: number): void {
  if (u < 0 || u > 1) return;
  const r = ballRadius(p) * (1.02 + 0.25 * u);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = (1 - u) ** 1.5;
  ctx.lineWidth = 6;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
    ctx.lineTo(p.x + Math.cos(a) * (r + 40 + 30 * u), p.y + Math.sin(a) * (r + 40 + 30 * u));
    ctx.stroke();
  }
  ctx.restore();
}

/** The labels on the scale's pans. */
function drawPanLabels(ctx: CanvasRenderingContext2D, t: number): void {
  const l = panLabelsAt(t);
  const beam = beamAt(t);
  const left = panAt(-1, beam);
  const right = panAt(1, beam);
  drawTextLine(ctx, 'tetrodotoxin', left.x, left.y + 100, 60, 700, l.ttx);
  drawTextLine(ctx, 'cyanide', right.x, right.y + 100, 60, 700, l.cyanide);
}

export function createPuffer(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(90,195,215,0.08)', bottom: 'rgba(55,160,190,0.3)' });
  const marks = makeMarks(30, 57);
  const floor = makeFloor();
  const rock = makeRock();
  const puffer = makeSprite('puffer', 5);
  const moray = makeSprite('moray', 5);

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.drawImage(backdrop, 0, 0);
    drawMarks(ctx, marks, t / LOOP_S);
    ctx.drawImage(floor, 0, 0);

    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const rockShown = rockAt(t);
    if (rockShown > 0) {
      ctx.save();
      ctx.globalAlpha = rockShown;
      ctx.drawImage(rock, 0, 0);
      ctx.restore();
    }
    const m = morayAt(t);
    if (m) drawMoray(ctx, moray, m, boil, rockShown);

    drawPeople(ctx, t);
    drawScale(ctx, beamAt(t), scaleShown(t), FLOOR_Y + 10);
    drawPanLabels(ctx, t);
    drawAntidote(ctx, antidoteAt(t), 540, 860);
    const plate = plateAt(t);
    drawPlate(ctx, PLATE_AT.x, PLATE_AT.y, plate);
    drawTextLine(ctx, 'fugu', 880, 630, 84, 700, plate.label);
    drawCard(ctx, CARD_AT.x, CARD_AT.y, cardAt(t));
    drawKnife(ctx, knifeAt(t));

    const p = pufferAt(t);
    drawPuffer(ctx, puffer, p, boil);
    const vial = vialAt(t);
    if (vial) drawVial(ctx, vial, VIAL_SIZE);
    const ttx = ttxLabelAt(t);
    if (ttx > 0 && vial) {
      drawTextLine(ctx, 'tetrodotoxin', 540, 365, LABEL_SIZE + 10, 700, ttx);
      drawArrow(ctx, { x: 430, y: 392 }, { x: 330, y: 560 }, { x: vial.x - 48, y: vial.y - 10 }, ttx);
    }
    const pose = pufferPose(p);
    drawSuction(ctx, pose, suctionAt(t), t / 3);
    drawBurst(ctx, p, burstAt(t));

    const alarm = pufferAlarmAt(t);
    if (alarm > 0) {
      const l = drawnLen(p);
      drawExclaim(ctx, p.x + l * 0.42, p.y - l * 0.5, 110 * alarm, 0.15);
    }
    const mAlarm = morayAlarmAt(t);
    if (m && mAlarm > 0) {
      const nose = noseOf(m);
      drawExclaim(ctx, nose.x - 60, nose.y - 120, 120 * mAlarm, -0.15);
    }
    drawTally(ctx, t, 935, 610);
    ctx.restore();

    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderPufferAudio };
}
