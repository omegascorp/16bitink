import { BOIL_FRAMES } from '../../../src/art/textures';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderGoliathAudio } from './audio';
import { drawMurky, GROUPER_LID, makeCast, poseOf, sharkSpan } from './cast';
import { drawBubbles, drawChomp, drawRewind, drawSuction } from './effects';
import {
  drawBentRod, drawDoor, drawFishingLine, drawHookAt, drawNote, drawSilt, drawSizeBar, drawSkiff, drawVignette, drawWater, INK_BG, makeBoatFrames, makeHookFrames,
  PAPER_ON_INK, SPOKEN,
} from './scene';
import { captionAt, doorAt, placeLabel, sizeBar } from './script';
import {
  bellyAt, boilAt, bubblesAt, cameraAt, chompAt, eyesAt, grouperAt, hookAt, jawAt, lineBowAt, lipsAt, LOOP_S, murkAt, rewindAt, shakeAt, sharkAt, snapAt, storyAt,
  suctionAt, toScreen, tugAt,
} from './story';
import { clipToGape, drawSwimmer, type SwimLook } from './swimmer';

/** Draws the "this fish swallowed a shark in one bite" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;

/** The spoken line, word by word, the word being said in yellow. */
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
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

export function createGoliath(ctx: CanvasRenderingContext2D): Short {
  const paper = makePaper();
  const cast = makeCast();
  const boat = makeBoatFrames();
  const hook = makeHookFrames();

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const s = storyAt(t);
    const v = cameraAt(s);
    drawWater(ctx, paper, v, t);
    drawSilt(ctx, v, t);

    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    drawSkiff(ctx, boat, v, t, boil);
    const hookNow = hookAt(s, t);
    drawBentRod(ctx, v, t, hookNow.at);
    drawFishingLine(ctx, v, t, hookNow.at, lineBowAt(s));
    drawDoor(ctx, v, doorAt(t), boil);

    const g = grouperAt(s, t);
    const tug = tugAt(s);
    const gPose = poseOf({ ...g, tilt: g.tilt + 0.04 * tug }, v);
    const snap = snapAt(s);
    const look: SwimLook = { jaw: jawAt(s), belly: bellyAt(s), eyes: eyesAt(s), lid: GROUPER_LID, squash: 1 - 0.08 * snap, stretch: 1 + 0.04 * snap };
    const shark = sharkAt(s, t);
    if (shark.kind === 'swallowed') {
      // The inside of the mouth, the shark going in (only where the open mouth and the water in front of it are), then the grouper over it.
      drawSwimmer(ctx, cast.grouper, gPose, boil, { ...look, part: 'mouth' });
      ctx.save();
      clipToGape(ctx, cast.grouper, gPose, look);
      drawSwimmer(ctx, cast.shark, poseOf(shark.fish, v), boil, { squash: shark.squash, stretch: shark.stretch });
      ctx.restore();
      drawSwimmer(ctx, cast.grouper, gPose, boil, { ...look, part: 'body' });
    } else {
      drawMurky(ctx, cast, cast.grouper, gPose, boil, look, murkAt(s));
      if (shark.kind === 'hooked') drawSwimmer(ctx, cast.shark, poseOf(shark.fish, v), boil);
    }
    if (hookNow.shown) drawHookAt(ctx, hook, v, t, boil, hookNow.at);

    const lips = toScreen(v, lipsAt(s, t));
    drawSuction(ctx, lips, -gPose.tilt, gPose.length, suctionAt(s), t / 3);
    for (const u of chompAt(t)) drawChomp(ctx, lips, -gPose.tilt, gPose.length, u);
    drawBubbles(ctx, v, bubblesAt(s));
    ctx.restore();

    drawVignette(ctx);
    const bar = sizeBar(t);
    if (bar > 0 && shark.kind === 'hooked') {
      const span = sharkSpan(poseOf(shark.fish, v));
      const below = Math.max(span.nose.y, span.tail.y) + 0.14 * shark.fish.length * v.zoom;
      drawSizeBar(ctx, { x: span.nose.x, y: below }, { x: span.tail.x, y: below }, bar);
    }
    drawNote(ctx, 'Florida, 2014', VIDEO.width / 2 + 60, 400, 88, placeLabel(t));
    drawRewind(ctx, rewindAt(t), t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderGoliathAudio };
}
