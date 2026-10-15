import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawMarks, makeBackdrop, makeMarks } from '../backdrop';
import { mouthOf, type Pose } from '../chain';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { drawChomp, drawExclaim, drawSuction, suckedIn } from '../effects';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderLionfishAudio } from './audio';
import { bodyPoint, drawFishAt, type Fish, screenPoseOf, spinesOf } from './fish';
import { captionAt } from './lines';
import { drawMap } from './map';
import {
  drawCalendar, drawCallout, drawCounter, drawDashedRing, drawQuestion, drawSign, drawSpineGlow, GREEN, ON_PAPER, RED, RED_INK,
} from './marks';
import {
  fiveWeeksAt, MEALS, oneLabel, percentAt, readoutAt, reefLabel, shakeAt, stampAt, weekAt, YOUNG, youngAt, youngEatenAt,
} from './school';
import { drawFronds, makeReef } from './scenery';
import {
  boilAt, chompAt, grouperAt, grouperLabel, jabAt, lionfishAt, LOOP_S, mealAlarm, mealAt, mealEatenAt, meatAt, puzzledAt, signAt, spinesAt,
  suctionAt, venomLabel,
} from './story';

/** Draws the "To save the reef… EAT this fish" short (story.ts has the choreography). */

const SPOKEN: TextInk = { fill: RED, halo: '#f4eddc' };
const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const SIGN = { x: 285, y: 420 } as const;

/** The spoken line, word by word, the word being said in lionfish red. */
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
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : ON_PAPER);
    x += (natural[i]! + space) * k;
  });
}

interface Sprites {
  readonly lion: Sprite;
  readonly chromis: Sprite;
  readonly grouper: Sprite;
}

/** The lionfish, with whatever it's sucking in drawn between the inside of its mouth and the rest of it. */
function drawLionfish(ctx: CanvasRenderingContext2D, s: Sprites, lion: Fish, t: number, boil: number): void {
  const pose = screenPoseOf('lionfish', lion);
  const look = { jaw: lion.jaw, ...(lion.lump > 0 ? { lump: { size: lion.lump, at: 0.35 } } : {}) };
  const going: [Pose, { stretch: number; squash: number }][] = [];
  const meal = mealAt(t);
  const mealIn = mealEatenAt(t);
  if (meal && mealIn !== null) going.push(suckedIn(screenPoseOf('chromis', meal), pose, mealIn));
  YOUNG.forEach((_, i) => {
    const u = youngEatenAt(i, t);
    const y = youngAt(i, t);
    if (u !== null && y) going.push(suckedIn(screenPoseOf('chromis', y), pose, u));
  });
  if (going.length === 0) {
    drawFishAt(ctx, s.lion, 'lionfish', lion, boil, look);
    return;
  }
  drawFishAt(ctx, s.lion, 'lionfish', lion, boil, { ...look, part: 'mouth' });
  for (const [prey, shape] of going) drawSwimmer(ctx, s.chromis, prey, boil, shape);
  drawFishAt(ctx, s.lion, 'lionfish', lion, boil, { ...look, part: 'body' });
}

/** The experiment's readouts and notes. */
function drawExperiment(ctx: CanvasRenderingContext2D, lion: Fish, t: number): void {
  const shown = readoutAt(t);
  drawCalendar(ctx, 210, 400, weekAt(t), fiveWeeksAt(t), shown);
  drawCounter(ctx, 810, 425, percentAt(t), stampAt(t), shown);
  drawCallout(ctx, '1 lionfish', { x: 520, y: 340 }, bodyPoint('lionfish', lion, 0.2, -1.1), oneLabel(t), 62, RED_INK);
  const reef = reefLabel(t);
  drawDashedRing(ctx, { x: 540, y: 985 }, 360, 125, reef, RED);
  // Under the calendar, clear of the fish and the ring.
  drawCallout(ctx, 'small reef,', { x: 140, y: 565 }, null, reef, 54);
  drawCallout(ctx, 'Bahamas', { x: 140, y: 618 }, null, reef, 54);
}

/** The ending's notes: the venomous spines and the meat that's safe to eat. */
function drawSpinesAndMeat(ctx: CanvasRenderingContext2D, lion: Fish, t: number): void {
  const spines = spinesOf(lion);
  drawSpineGlow(ctx, spines, spinesAt(t), t);
  const tip = spines[4]!.tip;
  drawCallout(ctx, 'venomous spines', { x: 830, y: 360 }, tip, venomLabel(t), 66, RED_INK);
  const belly = bodyPoint('lionfish', lion, 0.42, 0);
  drawDashedRing(ctx, belly, lion.len * 0.5, lion.len * 0.2, meatAt(t), GREEN);
}

export function createLionfish(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(60,170,200,0.08)', bottom: 'rgba(30,130,170,0.3)' });
  const marks = makeMarks(30, 1985);
  const reef = makeReef();
  const s: Sprites = { lion: makeSprite('lionfish', 5), chromis: makeSprite('chromis', 2), grouper: makeSprite('grouper', 4, 'heavy') };
  const mapLion = makeSprite('lionfish', 1);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.drawImage(backdrop, 0, 0);
    drawMarks(ctx, marks, t / LOOP_S);
    ctx.drawImage(reef, 0, 0);
    drawFronds(ctx, t);

    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    const lion = lionfishAt(t, MEALS);
    YOUNG.forEach((_, i) => {
      const y = youngAt(i, t);
      if (y && youngEatenAt(i, t) === null) drawFishAt(ctx, s.chromis, 'chromis', y, boil);
    });
    const g = grouperAt(t);
    if (g) drawFishAt(ctx, s.grouper, 'grouper', g, boil, { jaw: g.jaw });
    const meal = mealAt(t);
    if (meal && mealEatenAt(t) === null) drawFishAt(ctx, s.chromis, 'chromis', meal, boil);
    drawLionfish(ctx, s, lion, t, boil);
    const pose = screenPoseOf('lionfish', lion);
    drawSuction(ctx, pose, suctionAt(t), t / 3);
    drawChomp(ctx, pose, chompAt(t));
    drawSpinesAndMeat(ctx, lion, t);
    if (meal) {
      const pop = mealAlarm(t);
      if (pop > 0) drawExclaim(ctx, meal.x - 10, meal.y - 110, 110 * pop, -0.15);
    }
    if (g) {
      drawCallout(ctx, 'grouper', { x: Math.max(130, g.x + 20), y: g.y - 175 }, null, grouperLabel(t), 62);
      drawQuestion(ctx, g.x + 250, g.y - 150, puzzledAt(t));
    }
    drawExperiment(ctx, lion, t);
    ctx.restore();

    drawMap(ctx, t, mapLion, boil);
    const sign = signAt(t);
    const mouth = mouthOf(pose);
    drawSign(ctx, SIGN, { x: mouth.x + 30, y: mouth.y - 95 }, sign.face, sign.shown, sign.width, jabAt(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderLionfishAudio };
}
